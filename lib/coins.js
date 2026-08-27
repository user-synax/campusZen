import mongoose from "mongoose";
import User from "@/models/User";
import WalletTransaction from "@/models/WalletTransaction";
import { createNotification } from "./notifications";
import { getRedis, isRedisAvailable } from "./redis";
import { VP_AWARDS, DAILY_VP_LIMITS } from "./ranks";
import { CURRENCY } from "./currency";
import connectDB from "./db";

// ============================================
// VP (Viper Coins) ECONOMY ENGINE
// Server-authoritative. All balance changes go through here.
// ============================================

// Debounce window for coin-earn notifications (ms)
const NOTIFY_WINDOW_MS = 60 * 1000;

// ── Helpers ──

function todayKey(date = new Date()) {
    // UTC calendar day — stable server-side, no client input
    return date.toISOString().split("T")[0];
}

// ── Daily cap (anti-farming) ──
// Tracks cumulative VP earned per (user, reason) per calendar day.
//
// IMPLEMENTATION: a single atomic Redis INCRBY reserves the allowance up
// front, so two concurrent awardVP calls can never both believe they are
// under the cap (the old read-then-write path had a TOCTOU race). If the
// increment overshoots the cap we decrement back to exactly the cap and
// return only the remaining (partial) allowance.
//
// If Redis is unavailable we FAIL CLOSED: with no way to enforce the cap we
// deny the award rather than granting VP uncapped.
async function applyDailyCap(userId, reason, requested) {
    const cap = DAILY_VP_LIMITS[reason];
    if (!cap || cap <= 0) return requested; // no cap configured
    if (!isRedisAvailable()) return 0; // fail closed — no Redis, no uncapped award

    const redis = getRedis();
    const key = `vp_daily_cap:${userId}:${reason}:${todayKey()}`;

    const result = await redis.incrby(key, requested);
    // First touch of the key today → arm the daily expiry.
    if (result === requested) {
        await redis.expire(key, 86400);
    }

    if (result <= cap) return requested;

    // Overshot: roll the counter back to exactly the cap and grant the
    // remaining partial allowance only.
    const overshoot = result - cap;
    await redis.decrby(key, overshoot);
    const allowed = requested - overshoot;
    return allowed > 0 ? allowed : 0;
}

// ── Follow/unfollow loop guard ──
async function followWindowActive(userId, targetUserId) {
    if (!isRedisAvailable()) return false;
    const redis = getRedis();
    const key = `vp_follow_window:${userId}:${targetUserId}`;
    return (await redis.get(key)) !== null;
}

async function setFollowWindow(
    userId,
    targetUserId,
    ttlSeconds = 7 * 24 * 3600,
) {
    if (!isRedisAvailable()) return;
    const redis = getRedis();
    const key = `vp_follow_window:${userId}:${targetUserId}`;
    await redis.set(key, "1");
    await redis.expire(key, ttlSeconds);
}

// ── Notification debounce ──
async function queueVPNotification(userId, amount, reason) {
    const dedupeKey = `vp_earned_${userId}_${todayKey()}`;
    const buildPayload = (total, lastReason) => ({
        recipient: userId,
        sender: null, // system / self-reward
        type: "vp_earned",
        dedupeKey,
        meta: { total, lastReason },
        read: false,
    });

    if (!isRedisAvailable()) {
        // Fallback: notify immediately (no debounce)
        await createNotification(buildPayload(amount, reason)).catch(
            console.error,
        );
        return;
    }

    const redis = getRedis();
    const key = `vp_notify:${userId}`;
    const raw = await redis.get(key);
    const now = Date.now();

    if (raw) {
        const buf = JSON.parse(raw);
        if (now - buf.createdAt < NOTIFY_WINDOW_MS) {
            // Still inside window — accumulate silently
            buf.total += amount;
            buf.lastReason = reason;
            await redis.set(key, JSON.stringify(buf));
            await redis.expire(key, Math.ceil(NOTIFY_WINDOW_MS / 1000));
            return;
        }
        // Window expired — flush previous buffer first
        await flushVPNotifications(userId);
    }

    // Start a fresh buffer
    const buf = { total: amount, lastReason: reason, createdAt: now };
    await redis.set(key, JSON.stringify(buf));
    await redis.expire(key, Math.ceil(NOTIFY_WINDOW_MS / 1000));
}

// Flush any pending debounce buffer into a single notification
export async function flushVPNotifications(userId) {
    if (!isRedisAvailable()) return;
    const redis = getRedis();
    const key = `vp_notify:${userId}`;
    const raw = await redis.get(key);
    if (!raw) return;
    const buf = JSON.parse(raw);
    await redis.del(key);
    await createNotification({
        recipient: userId,
        sender: null,
        type: "vp_earned",
        dedupeKey: `vp_earned_${userId}_${todayKey()}`,
        meta: { total: buf.total, lastReason: buf.lastReason },
        read: false,
    }).catch(console.error);
}

// ============================================
// CORE: AWARD VP (idempotent, atomic, capped)
// ============================================
export async function awardVP(
    userId,
    reason,
    sourceId,
    { ownerId = null, bypassCap = false } = {},
) {
    try {
        const amount = VP_AWARDS[reason] || 0;
        if (amount === 0) return { awarded: false, reason: "zero_amount" };

        // Self-action guard (no earning from your own content)
        if (ownerId && userId && ownerId.toString() === userId.toString()) {
            return { awarded: false, reason: "self_action" };
        }

        // Follow/unfollow farming loop guard
        if (reason === "follow" && sourceId) {
            if (await followWindowActive(userId, sourceId.toString())) {
                return { awarded: false, reason: "follow_loop" };
            }
        }

        // Daily cap (value-based, enforced atomically in Redis)
        let allowed = amount;
        if (!bypassCap) {
            allowed = await applyDailyCap(userId, reason, amount);
            if (allowed <= 0) return { awarded: false, reason: "daily_cap" };
        }

        await connectDB();

        // IDEMPOTENCY: insert ledger FIRST (unique index rejects duplicates).
        // Only on success do we $inc the cached balance — so a duplicate
        // insert can never double-credit.
        const txn = await WalletTransaction.create({
            userId,
            amount: allowed,
            type: "earn",
            reason,
            sourceId: sourceId ?? null,
            meta: { ownerId: ownerId ? ownerId.toString() : null },
        });

        const updated = await User.findByIdAndUpdate(
            userId,
            { $inc: { vp: allowed } },
            { new: true },
        ).select("vp");

        const balanceAfter = updated ? updated.vp : allowed;

        // Persist snapshot onto the ledger entry
        txn.balanceAfter = balanceAfter;
        await txn.save().catch(() => {});

        // Bookkeeping (the daily-cap counter was already incremented inside
        // applyDailyCap, so nothing to record here). The follow-loop window
        // is still set after a successful award.
        if (reason === "follow" && sourceId) {
            await setFollowWindow(userId, sourceId.toString());
        }

        // Real-time notification (debounced)
        await queueVPNotification(userId, allowed, reason);

        return { awarded: true, amount: allowed, balanceAfter };
    } catch (error) {
        // Duplicate key (11000) = already earned this action → safe to ignore
        if (error.code === 11000) {
            return { awarded: false, reason: "duplicate" };
        }
        console.error("[VP] awardVP error:", error);
        return { awarded: false, reason: "error" };
    }
}

// ============================================
// CORE: SPEND VP (atomic, conditional)
// Client sends ONLY { reason, sourceId }. Amount is server-resolved.
// ============================================
export async function spendVP(userId, reason, sourceId, amount, { session = null } = {}) {
    try {
        if (!amount || amount <= 0) {
            return { spent: false, reason: "invalid_amount" };
        }

        await connectDB();

        // Conditional atomic decrement — only if balance suffices.
        // NOTE: findOneAndUpdate (NOT findByIdAndUpdate) accepts a full
        // filter document, so the { vp: { $gte: amount } } guard is actually
        // enforced by MongoDB atomically. findByIdAndUpdate(id, ...) takes
        // only a scalar id and silently discards any additional filter keys.
        const opts = session ? { session } : {};
        const updated = await User.findOneAndUpdate(
            { _id: userId, vp: { $gte: amount } },
            { $inc: { vp: -amount } },
            { new: true, ...opts },
        ).select("vp");

        if (!updated) {
            return { spent: false, reason: "insufficient_balance" };
        }

        const txn = await WalletTransaction.create(
            [
                {
                    userId,
                    amount: -amount,
                    type: "spend",
                    reason,
                    sourceId: sourceId ?? null,
                    balanceAfter: updated.vp,
                },
            ],
            opts,
        );

        return { spent: true, amount, balanceAfter: updated.vp };
    } catch (error) {
        if (error.code === 11000) {
            return { spent: false, reason: "duplicate" };
        }
        console.error("[VP] spendVP error:", error);
        return { spent: false, reason: "error" };
    }
}

// ============================================
// ADMIN GIFT (bypasses caps + config — explicit amount)
// Used by admin "award coins" action. Always creates a ledger entry
// with reason "admin_gift", atomic $inc balance update, and a
// notification for the recipient.
//
// sourceId convention: "<adminUserId>_<timestamp>" — the admin userId
// leads for auditability; the suffix ensures the unique composite
// index (userId + reason + sourceId) permits multiple gifts from the
// same admin to the same user.
// ============================================
export async function adminGrantVP(userId, amount, { sourceId = null } = {}) {
    try {
        if (!amount || amount <= 0) {
            return { granted: false, reason: "invalid_amount" };
        }
        await connectDB();

        // Parse a raw admin userId from the provided sourceId prefix.
        // sourceId may be a raw admin userId (ObjectId or string) or an
        // already-composed "<id>_<ts>" string. Extract the leading id
        // part so meta.adminId is always a plain reference.
        const rawSource =
            sourceId ||
            `unknown_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const rawSourceStr = String(rawSource);
        const adminUserId = rawSourceStr.includes("_")
            ? rawSourceStr.split("_")[0]
            : rawSourceStr;

        // Compose the final unique sourceId — "<adminId>_<tsMs>_<rand>".
        // If caller already provided a composed string with a timestamp,
        // preserve it; otherwise add one.
        const id =
            sourceId && /_/.test(String(sourceId))
                ? String(sourceId)
                : `${rawSourceStr}_${Date.now()}_${Math.random()
                      .toString(36)
                      .slice(2, 8)}`;

        const txn = await WalletTransaction.create({
            userId,
            amount,
            type: "earn",
            reason: "admin_gift",
            sourceId: id,
            meta: { adminGrant: true, adminId: adminUserId },
        });

        // Atomic $inc on the User balance (single update, same path as awardVP).
        const updated = await User.findByIdAndUpdate(
            userId,
            { $inc: { vp: amount } },
            { new: true },
        ).select("vp");

        const balanceAfter = updated ? updated.vp : amount;
        txn.balanceAfter = balanceAfter;
        await txn.save().catch(() => {});

        // Notification: "Admin gifted you {amount} VP" — currency short
        // name comes from CURRENCY.shortName, never hardcoded.
        const shortName = CURRENCY?.shortName || "VP";
        await createNotification({
            recipient: userId,
            sender:
                adminUserId && adminUserId !== "unknown" ? adminUserId : null,
            type: "vp_earned",
            meta: {
                total: amount,
                lastReason: "admin_gift",
                message: `Admin gifted you ${amount} ${shortName}`,
            },
            read: false,
        }).catch((e) => {
            console.error("[VP] adminGrantVP notification error:", e);
        });

        return { granted: true, amount, balanceAfter };
    } catch (error) {
        console.error("[VP] adminGrantVP error:", error);
        return { granted: false, reason: "error" };
    }
}

// ============================================
// DAILY LOGIN REWARD (idempotent per calendar day)
// ============================================
export async function awardDailyLoginVP(userId) {
    try {
        await connectDB();
        // Always stamp login day (idempotency handled by unique sourceId)
        await User.findByIdAndUpdate(userId, {
            lastLoginRewardAt: new Date(),
        });
        const dateStr = todayKey();
        return await awardVP(userId, "daily_login", dateStr, {
            bypassCap: true,
        });
    } catch (error) {
        console.error("[VP] daily login error:", error);
        return { awarded: false, reason: "error" };
    }
}

// ============================================
// READS
// ============================================
export async function getBalance(userId) {
    try {
        await connectDB();
        const user = await User.findById(userId).select("vp").lean();
        return user ? user.vp || 0 : 0;
    } catch (error) {
        console.error("[VP] getBalance error:", error);
        return 0;
    }
}

// Paginated ledger history — never full scan.
// cursor = createdAt ISO string of last item from previous page.
export async function getWalletHistory(
    userId,
    { limit = 20, cursor = null } = {},
) {
    try {
        await connectDB();
        const query = { userId };
        if (cursor) {
            const cursorDate = new Date(cursor);
            if (!isNaN(cursorDate.getTime())) {
                query.createdAt = { $lt: cursorDate };
            }
        }
        const txns = await WalletTransaction.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        let hasNextPage = false;
        let nextCursor = null;
        if (txns.length > limit) {
            hasNextPage = true;
            txns.pop();
            nextCursor = txns[txns.length - 1].createdAt.toISOString();
        }
        return { transactions: txns, hasNextPage, nextCursor };
    } catch (error) {
        console.error("[VP] getWalletHistory error:", error);
        return { transactions: [], hasNextPage: false, nextCursor: null };
    }
}
