import mongoose from "mongoose";
import User from "@/models/User";
import { createNotification } from "./notifications";
import { getRedis, isRedisAvailable } from "./redis";
import {
    RANK_MAPPING,
    getRankForLevel,
    calculateLevelFromXP,
    XP_AWARDS,
    DAILY_XP_LIMITS,
} from "./ranks";

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
            "xp level college username name avatar totalXP weeklyXP isVerified verificationType",
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
        };
    } catch (error) {
        console.error("Error awarding XP:", error);
        return { xpAwarded: false };
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

// Re-export for backward compatibility
export { RANK_MAPPING, getRankForLevel };
