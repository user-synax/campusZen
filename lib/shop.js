import mongoose from "mongoose";
import connectDB from "./db";
import ShopItem, { SHOP_CATEGORIES } from "@/models/ShopItem";
import User from "@/models/User";
import { spendVP } from "./coins";
import { createNotification } from "./notifications";
import { sanitizeURL } from "./sanitize";
import { CODE_SHOP_ITEMS } from "./shopItems";

// ============================================
// SHOP COMMERCE LAYER
// Generic catalog + inventory + equip + purchase→grant.
// All prices resolved server-side from the catalog.
// ============================================

const PURCHASE_REASON = "shop_purchase";

// ── Helpers ──

function isItemAvailable(item) {
    if (!item.isActive) return false;
    if (item.isLimited && item.limitedUntil && item.limitedUntil < new Date()) {
        return false;
    }
    if (item.maxStock != null && item.soldCount >= item.maxStock) {
        return false;
    }
    return true;
}

function publicItemView(item, { owned = false, equipped = false } = {}) {
    return {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.price,
        rarity: item.rarity,
        visual: item.visual,
        isLimited: item.isLimited,
        limitedUntil: item.limitedUntil,
        maxStock: item.maxStock,
        soldCount: item.soldCount,
        createdAt: item.createdAt,
        owned,
        equipped,
    };
}

// ============================================
// CATALOG READS (admin + public)
// ============================================

// Upsert code-defined items (lib/shopItems.js) into the DB by `slug`.
// Code is the source of truth for definitions; the DB is the source of truth
// for runtime state (purchases, stock, soldCount, isActive). Guarded so it
// runs at most once per process (effectively a startup sync).
let codeSyncDone = false;
export async function syncCodeShopItems({ force = false } = {}) {
    if (codeSyncDone && !force) return;
    try {
        await connectDB();
        for (const item of CODE_SHOP_ITEMS) {
            const existing = await ShopItem.findOne({ slug: item.slug }).lean();
            // Don't clobber an admin-created item that shares a slug.
            if (existing && existing.source === "admin") {
                console.warn(
                    `[Shop] slug "${item.slug}" is owned by an admin item; skipping code item "${item.name}"`,
                );
                continue;
            }
            await ShopItem.findOneAndUpdate(
                { slug: item.slug },
                {
                    $set: {
                        name: item.name,
                        description: item.description || "",
                        category: item.category,
                        price: Number(item.price) || 0,
                        rarity: item.rarity || "common",
                        visual: sanitizeVisual(item.visual),
                        sortOrder: Number(item.sortOrder) || 0,
                        isLimited: !!item.isLimited,
                        limitedUntil: item.isLimited
                            ? item.limitedUntil || null
                            : null,
                        maxStock: item.maxStock ? Number(item.maxStock) : null,
                        source: "code",
                    },
                },
                { upsert: true, new: true },
            );
        }
        codeSyncDone = true;
    } catch (error) {
        console.error("[Shop] syncCodeShopItems error:", error.message);
    }
}

// Admin: all items (incl. inactive) for management UI.
export async function getAdminCatalog() {
    await connectDB();
    await syncCodeShopItems();
    const items = await ShopItem.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return items;
}

// Public: only purchasable items, with optional category filter and
// per-item ownership/equip flags for the current user.
export async function getShopCatalog(userId, { category = null } = {}) {
    await connectDB();
    await syncCodeShopItems();
    const query = { isActive: true };
    if (category && SHOP_CATEGORIES.includes(category)) {
        query.category = category;
    }
    const items = await ShopItem.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();

    // Available = not expired / not sold out.
    const available = items.filter(isItemAvailable);

    // Ownership / equip flags.
    let ownedIds = new Set();
    let equippedMap = {};
    if (userId) {
        const user = await User.findById(userId).lean();
        if (user) {
            ownedIds = new Set(
                (user.ownedShopItems || []).map((o) => o.itemId?.toString()),
            );
            equippedMap = user.equippedShopItems || {};
        }
    }

    return available.map((item) =>
        publicItemView(item, {
            owned: ownedIds.has(item._id.toString()),
            equipped: equippedMap[item.category]?.toString() === item._id.toString(),
        }),
    );
}

// ============================================
// PURCHASE (server-authoritative)
// ============================================
// Core purchase: debit VP and grant the item in a single unit of work.
// `session` is a Mongoose session for transactional atomicity (null = no txn).
// Throws with a domain reason (e.g. "insufficient_balance") on failure so the
// caller can both roll back the transaction and surface the right message.
async function doPurchaseCore(userId, item, session) {
    const spent = await spendVP(
        userId,
        PURCHASE_REASON,
        item._id.toString(),
        item.price,
        { session },
    );
    if (!spent.spent) {
        throw new Error(spent.reason || "spend_failed");
    }

    const opts = session ? { session } : {};
    await User.findByIdAndUpdate(
        userId,
        {
            $push: {
                ownedShopItems: {
                    itemId: item._id,
                    slug: item.slug,
                    name: item.name,
                    category: item.category,
                    rarity: item.rarity,
                    price: item.price,
                    visual: item.visual,
                    purchasedAt: new Date(),
                },
            },
            $set: { [`equippedShopItems.${item.category}`]: item._id },
        },
        opts,
    );

    await ShopItem.findByIdAndUpdate(
        item._id,
        { $inc: { soldCount: 1 } },
        opts,
    );

    return spent.balanceAfter;
}

export async function purchaseItem(userId, identifier) {
    try {
        if (!identifier) {
            return { purchased: false, reason: "missing_identifier" };
        }
        await connectDB();

        const item = await ShopItem.findOne({
            $or: [{ _id: isObjectId(identifier) ? identifier : null }, { slug: identifier }],
        }).lean();

        if (!item) return { purchased: false, reason: "not_found" };
        if (!isItemAvailable(item)) {
            return { purchased: false, reason: "unavailable" };
        }

        const user = await User.findById(userId).lean();
        if (!user) return { purchased: false, reason: "no_user" };

        const alreadyOwned = (user.ownedShopItems || []).some(
            (o) => o.itemId?.toString() === item._id.toString(),
        );
        if (alreadyOwned) return { purchased: false, reason: "already_owned" };

        let balanceAfter;
        let usedTransaction = false;
        try {
            // Wrap the debit + grant in one transaction so a crash between the
            // two writes can never leave a user debited without the item.
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    balanceAfter = await doPurchaseCore(userId, item, session);
                });
                usedTransaction = true;
            } finally {
                await session.endSession();
            }
        } catch (txErr) {
            // Standalone MongoDB (no replica set) cannot run transactions.
            // Fall back to the non-transactional path so purchases still work.
            if (!isTransactionUnsupported(txErr)) {
                const reason = domainReason(txErr);
                if (reason) return { purchased: false, reason };
                return { purchased: false, reason: "error" };
            }
            balanceAfter = await doPurchaseCore(userId, item, null);
        }

        await createNotification({
            recipient: userId,
            type: "shop_purchase",
            meta: { itemName: item.name, slug: item.slug },
        }).catch(() => {});

        return {
            purchased: true,
            item: publicItemView(item, { owned: true, equipped: true }),
            balanceAfter,
        };
    } catch (error) {
        const reason = domainReason(error);
        if (reason) return { purchased: false, reason };
        console.error("[Shop] purchaseItem error:", error);
        return { purchased: false, reason: "error" };
    }
}

// Transactions require a replica set. Detect the specific "not supported"
// errors so we can gracefully fall back on standalone deployments.
function isTransactionUnsupported(err) {
    const m = (err && err.message) || "";
    return /replica set member|transaction numbers are only allowed|Transactions are not supported|not supported on standalone/.test(
        m,
    );
}

// Extract one of our domain abort reasons from a thrown error.
function domainReason(err) {
    const m = (err && err.message) || "";
    if (m.includes("insufficient_balance")) return "insufficient_balance";
    if (m.includes("invalid_amount")) return "invalid_amount";
    return null;
}

// ============================================
// EQUIP / UNEQUIP
// ============================================
export async function equipItem(userId, itemId) {
    try {
        if (!itemId || !isObjectId(itemId)) {
            return { equipped: false, reason: "invalid_item" };
        }
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return { equipped: false, reason: "no_user" };

        const owned = (user.ownedShopItems || []).find(
            (o) => o.itemId?.toString() === itemId.toString(),
        );
        if (!owned) return { equipped: false, reason: "not_owned" };

        user.equippedShopItems = user.equippedShopItems || {};
        user.equippedShopItems[owned.category] = itemId;
        user.markModified("equippedShopItems");
        await user.save();

        return { equipped: true, category: owned.category, itemId };
    } catch (error) {
        console.error("[Shop] equipItem error:", error);
        return { equipped: false, reason: "error" };
    }
}

export async function unequipItem(userId, category) {
    try {
        if (!category || !SHOP_CATEGORIES.includes(category)) {
            return { unequipped: false, reason: "invalid_category" };
        }
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return { unequipped: false, reason: "no_user" };

        user.equippedShopItems = user.equippedShopItems || {};
        delete user.equippedShopItems[category];
        user.markModified("equippedShopItems");
        await user.save();

        return { unequipped: true, category };
    } catch (error) {
        console.error("[Shop] unequipItem error:", error);
        return { unequipped: false, reason: "error" };
    }
}

// ============================================
// INVENTORY READS
// ============================================
export async function getUserInventory(userId) {
    try {
        await connectDB();
        const user = await User.findById(userId).lean();
        if (!user) return { owned: [], equipped: {} };

        const owned = (user.ownedShopItems || []).map((o) => ({
            itemId: o.itemId,
            slug: o.slug,
            name: o.name,
            category: o.category,
            rarity: o.rarity,
            price: o.price,
            visual: o.visual,
            purchasedAt: o.purchasedAt,
            equipped:
                user.equippedShopItems?.[o.category]?.toString() ===
                o.itemId?.toString(),
        }));

        return { owned, equipped: user.equippedShopItems || {} };
    } catch (error) {
        console.error("[Shop] getUserInventory error:", error);
        return { owned: [], equipped: {} };
    }
}

// Returns a category -> equipped itemId map (used by renderers).
export async function getEquippedMap(userId) {
    try {
        await connectDB();
        const user = await User.findById(userId).lean();
        return user?.equippedShopItems || {};
    } catch (error) {
        console.error("[Shop] getEquippedMap error:", error);
        return {};
    }
}

// ============================================
// ADMIN CRUD
// ============================================
export async function createShopItem(data) {
    await connectDB();
    const visual = sanitizeVisual(data.visual);
    const item = await ShopItem.create({
        name: data.name,
        slug: (data.slug || "").toLowerCase().trim(),
        description: data.description || "",
        category: data.category,
        price: Number(data.price) || 0,
        rarity: data.rarity || "common",
        visual,
        sortOrder: Number(data.sortOrder) || 0,
        isLimited: !!data.isLimited,
        limitedUntil: data.isLimited ? data.limitedUntil || null : null,
        maxStock: data.maxStock ? Number(data.maxStock) : null,
        isActive: data.isActive !== false,
    });
    return item;
}

export async function updateShopItem(id, data) {
    await connectDB();
    const update = {};
    const fields = [
        "name",
        "description",
        "category",
        "price",
        "rarity",
        "sortOrder",
        "isLimited",
        "limitedUntil",
        "maxStock",
        "isActive",
    ];
    for (const f of fields) {
        if (data[f] !== undefined) update[f] = data[f];
    }
    if (data.visual !== undefined) update.visual = sanitizeVisual(data.visual);
    if (data.slug !== undefined) update.slug = data.slug.toLowerCase().trim();
    if (data.isLimited === false) update.limitedUntil = null;
    return ShopItem.findByIdAndUpdate(id, update, { new: true });
}

// Keep only known visual fields; sanitize the image URLs to http(s).
function sanitizeVisual(visual) {
    if (!visual || typeof visual !== "object") return {};
    return {
        icon: typeof visual.icon === "string" ? visual.icon : "Package",
        color: typeof visual.color === "string" ? visual.color : "#94a3b8",
        className:
            typeof visual.className === "string" ? visual.className : "",
        imageUrl: visual.imageUrl
            ? sanitizeURL(visual.imageUrl)
            : "",
        frameAssetUrl: visual.frameAssetUrl
            ? sanitizeURL(visual.frameAssetUrl)
            : "",
    };
}

export async function deleteShopItem(id) {
    await connectDB();
    return ShopItem.findByIdAndDelete(id);
}

// ── util ──
function isObjectId(v) {
    return typeof v === "string" && mongoose.Types.ObjectId.isValid(v);
}
