import mongoose from "mongoose";
import User from "@/models/User";
import Badge from "@/models/Badge";
import { createNotification } from "./notifications";
import { getRedis, isRedisAvailable } from "./redis";
import {
    RANK_MAPPING,
    getRankForLevel,
    calculateLevelFromXP,
    XP_AWARDS,
    DAILY_XP_LIMITS,
} from "./ranks";

// ============================================
// CONFIGURABLE BADGE SYSTEM
// Edit predefined badges in this section
// ============================================

/**
 * Predefined badge definitions
 * Add/remove badges here, or modify existing ones
 * Badge properties:
 * - id: Unique identifier (required)
 * - name: Display name (unique, required)
 * - description: Short description
 * - instructions: How to unlock
 * - icon: Emoji or path to image
 * - category: "activity" | "community" | "special" | "milestone"
 * - criteria: { action: "post"|"like"|"follow"|"streak"|"level", count: number }
 * - color: Hex color for badge styling
 */
export const PREDEFINED_BADGES = [
    {
        id: "first_post",
        name: "First Steps",
        description: "Create your first post",
        instructions: "Create your first post to unlock this badge",
        icon: "📝",
        category: "activity",
        criteria: { action: "post", count: 1 },
        color: "#3B82F6",
    },
    {
        id: "social_butterfly",
        name: "Social Butterfly",
        description: "Follow 50 users",
        instructions: "Follow 50 users to unlock",
        icon: "🦋",
        category: "community",
        criteria: { action: "follow", count: 50 },
        color: "#10B981",
    },
    {
        id: "streak_master",
        name: "Streak Master",
        description: "Maintain a 7-day login streak",
        instructions: "Log in for 7 days in a row",
        icon: "🔥",
        category: "milestone",
        criteria: { action: "streak", count: 7 },
        color: "#F59E0B",
    },
    {
        id: "content_creator",
        name: "Content Creator",
        description: "Create 10 posts",
        instructions: "Create 10 posts to unlock",
        icon: "🎨",
        category: "activity",
        criteria: { action: "post", count: 10 },
        color: "#8B5CF6",
    },
    {
        id: "community_hero",
        name: "Community Hero",
        description: "Reach level 10",
        instructions: "Reach level 10 to unlock this badge",
        icon: "🦸",
        category: "milestone",
        criteria: { action: "level", count: 10 },
        color: "#EC4899",
    },
];

// ============================================
// END OF CONFIGURABLE BADGE SECTION
// ============================================

// Track daily XP actions to enforce limits
const DAILY_ACTION_TRACKER_KEY = (userId, type) =>
    `daily_actions:${userId}:${type}:${new Date().toISOString().split("T")[0]}`;

const LEADERBOARD_KEYS = {
    GLOBAL: "leaderboard:global",
    COLLEGE: (college) => `leaderboard:college:${college}`,
    WEEKLY: "leaderboard:weekly",
};

/**
 * Check if a user can perform an action (daily limits check for XP (anti-exploitation)
 */
async function canPerformAction(userId, type) {
    if (!DAILY_XP_LIMITS[type]) return true;
    if (!isRedisAvailable()) return true; // Skip limits if Redis is down
    const redis = getRedis();
    const key = DAILY_ACTION_TRACKER_KEY(userId, type);
    const currentCount = await redis.get(key);
    if (currentCount && parseInt(currentCount) >= DAILY_XP_LIMITS[type])
        return false;
    return true;
}

/**
 * Increment daily action counter (anti-exploitation)
 */
async function incrementDailyAction(userId, type) {
    if (!DAILY_XP_LIMITS[type]) return;
    if (!isRedisAvailable()) return;
    const redis = getRedis();
    const key = DAILY_ACTION_TRACKER_KEY(userId, type);
    await redis.incr(key);
    await redis.expire(key, 86400); // Expire after 24h
}

/**
 * Awards XP to a user, handles leveling up, and updates Redis leaderboards.
 */
export async function awardXP(userId, type, metadata = {}) {
    try {
        // Check daily action limits
        if (!(await canPerformAction(userId, type))) {
            return { xpAwarded: false, reason: "Daily limit reached" };
        }
        const amount = XP_AWARDS[type] || 0;
        if (amount === 0) return { xpAwarded: false };

        const user = await User.findById(userId).select(
            "xp level college username name avatar totalXP weeklyXP isVerified verificationType badges",
        );
        if (!user) return { xpAwarded: false };

        const oldLevel = user.level || 1;
        const currentXP = user.xp || 0;
        const newXP = currentXP + amount;
        const newTotalXP = (user.totalXP || 0) + amount;
        const newWeeklyXP = (user.weeklyXP || 0) + amount;
        const newLevel = calculateLevelFromXP(newXP);
        const leveledUp = newLevel > oldLevel;

        user.xp = newXP;
        user.level = newLevel;
        user.totalXP = newTotalXP;
        user.weeklyXP = newWeeklyXP;

        // Check for badge unlocks
        const newBadges = [];
        const unlockedBadgeIds = user.badges.map((b) =>
            b.badgeId ? b.badgeId.toString() : b.toString(),
        );

        // Check predefined badges
        for (const badgeDef of PREDEFINED_BADGES) {
            if (
                unlockedBadgeIds.some(
                    (id) =>
                        id === badgeDef.id || badgeDef._id?.toString() === id,
                )
            )
                continue;
            const shouldUnlock = await shouldUnlockBadge(
                user,
                badgeDef,
                type,
                metadata,
            );
            if (shouldUnlock) {
                let badge = await Badge.findOne({ id: badgeDef.id });
                if (!badge) {
                    // Try to create, or find by name if duplicate
                    try {
                        badge = await Badge.create(badgeDef);
                    } catch (createErr) {
                        if (createErr.code === 11000) {
                            badge = await Badge.findOne({
                                name: badgeDef.name,
                            });
                        } else {
                            throw createErr;
                        }
                    }
                }
                if (badge) {
                    user.badges.push({
                        badgeId: badge._id,
                        awardedAt: new Date(),
                    });
                    newBadges.push(badge);
                    await createNotification({
                        recipient: userId,
                        sender: userId,
                        type: "badge_earned",
                        meta: { badge: badge.toObject() },
                    }).catch(console.error);
                }
            }
        }

        await user.save();
        await incrementDailyAction(userId, type);

        // Update Redis Leaderboards if available
        if (isRedisAvailable()) {
            const redis = getRedis();
            const member = JSON.stringify({
                id: user._id,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                college: user.college,
                isVerified: user.isVerified,
                verificationType: user.verificationType,
            });

            // Update Global Leaderboard
            await redis.zadd(LEADERBOARD_KEYS.GLOBAL, {
                score: newTotalXP,
                member,
            });

            // Update College Leaderboard
            if (user.college) {
                await redis.zadd(LEADERBOARD_KEYS.COLLEGE(user.college), {
                    score: newTotalXP,
                    member,
                });
            }

            // Update Weekly Leaderboard
            await redis.zadd(LEADERBOARD_KEYS.WEEKLY, {
                score: newWeeklyXP,
                member,
            });
        }

        if (leveledUp) {
            await createNotification({
                recipient: userId,
                sender: userId,
                type: "level_up",
                meta: { newLevel, rank: getRankForLevel(newLevel) },
            }).catch((err) =>
                console.error("Level up notification error:", err),
            );
        }

        return {
            xpAwarded: true,
            amount,
            newXP,
            newLevel,
            leveledUp,
            newBadges,
        };
    } catch (error) {
        console.error("Error awarding XP:", error);
        return { xpAwarded: false };
    }
}

/**
 * Check if user should unlock a badge
 */
async function shouldUnlockBadge(user, badgeDef, actionType, metadata) {
    const { action, count } = badgeDef.criteria;

    switch (action) {
        case "post":
            // Need to track post count (we'll need to track separately for accurate count but we'll use metadata for first post, or we can check user's level for now
            if (count === 1 && actionType === "post") return true;
            // For higher counts, we'd need a counter, let's handle first post, and level badges
            break;
        case "level":
            return user.level >= count;
        case "streak":
            return (user.currentStreak || 0) >= count;
        case "follow":
            return (user.following?.length || 0) >= count;
        default:
            return false;
    }
    return false;
}

/**
 * Updates user's daily streak.
 */
export async function updateStreak(userId) {
    try {
        const user = await User.findById(userId).select(
            "currentStreak longestStreak lastActiveDate badges",
        );
        if (!user) return { success: false };

        const now = new Date();
        const lastActive = user.lastActiveDate;
        let streakUpdated = false;

        if (!lastActive) {
            user.currentStreak = 1;
            user.longestStreak = Math.max(user.longestStreak || 0, 1);
            streakUpdated = true;
        } else {
            const diffTime = Math.abs(now - lastActive);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Continued streak
                user.currentStreak += 1;
                user.longestStreak = Math.max(
                    user.longestStreak,
                    user.currentStreak,
                );
                streakUpdated = true;
            } else if (diffDays > 1) {
                // Streak broken
                user.currentStreak = 1;
                streakUpdated = true;
            }
            // If diffDays is 0, they already logged in today, do nothing to streak
        }

        if (streakUpdated) {
            // Check for streak-based badges
            const newBadges = [];
            const unlockedBadgeIds = user.badges.map((b) =>
                b.badgeId ? b.badgeId.toString() : b.toString(),
            );
            for (const badgeDef of PREDEFINED_BADGES) {
                if (badgeDef.criteria.action !== "streak") continue;
                if (unlockedBadgeIds.some((id) => id === badgeDef.id)) continue;
                if (user.currentStreak >= badgeDef.criteria.count) {
                    let badge = await Badge.findOne({ id: badgeDef.id });
                    if (!badge) {
                        try {
                            badge = await Badge.create(badgeDef);
                        } catch (createErr) {
                            if (createErr.code === 11000) {
                                badge = await Badge.findOne({
                                    name: badgeDef.name,
                                });
                            } else {
                                throw createErr;
                            }
                        }
                    }
                    if (badge) {
                        user.badges.push({
                            badgeId: badge._id,
                            awardedAt: new Date(),
                        });
                        newBadges.push(badge);
                        await createNotification({
                            recipient: userId,
                            sender: userId,
                            type: "badge_earned",
                            meta: { badge: badge.toObject() },
                        }).catch(console.error);
                    }
                }
            }
        }

        user.lastActiveDate = now;
        await user.save();

        return {
            success: true,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
        };
    } catch (error) {
        console.error("Error updating streak:", error);
        return { success: false };
    }
}

/**
 * Fetches leaderboard data.
 */
export async function getLeaderboard(
    type = "global",
    college = null,
    limit = 10,
) {
    try {
        if (!isRedisAvailable()) {
            // Fallback to MongoDB if Redis is down
            const query = college ? { college } : {};
            const sortField = type === "weekly" ? "weeklyXP" : "totalXP";

            const users = await User.find(query)
                .sort({ [sortField]: -1 })
                .limit(limit)
                .select("username name avatar college totalXP weeklyXP level")
                .lean();

            return users.map((u) => ({
                ...u,
                score: u[sortField],
            }));
        }

        const redis = getRedis();
        let key = LEADERBOARD_KEYS.GLOBAL;
        if (type === "weekly") key = LEADERBOARD_KEYS.WEEKLY;
        if (college) key = LEADERBOARD_KEYS.COLLEGE(college);

        const results = await redis.zrevrange(key, 0, limit - 1, {
            withScores: true,
        });

        const leaderboard = [];
        for (let i = 0; i < results.length; i += 2) {
            const member = JSON.parse(results[i]);
            const score = results[i + 1];
            leaderboard.push({
                ...member,
                score,
            });
        }

        return leaderboard;
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}

/**
 * Initialize predefined badges in database
 */
export async function initPredefinedBadges() {
    for (const badgeDef of PREDEFINED_BADGES) {
        try {
            const exists = await Badge.findOne({ id: badgeDef.id });
            if (!exists) {
                // Try to create, if fails (duplicate name), try to update existing by name
                try {
                    await Badge.create(badgeDef);
                } catch (createErr) {
                    if (createErr.code === 11000) {
                        // Duplicate key error, update existing badge with matching name
                        await Badge.updateOne(
                            { name: badgeDef.name },
                            { $set: badgeDef },
                        );
                    } else {
                        throw createErr;
                    }
                }
            } else {
                // Update existing badge with latest definition
                await Badge.updateOne({ id: badgeDef.id }, { $set: badgeDef });
            }
        } catch (err) {
            console.error(`Error initializing badge ${badgeDef.id}:`, err);
        }
    }
}

// Re-export for backward compatibility
export { RANK_MAPPING, getRankForLevel };
