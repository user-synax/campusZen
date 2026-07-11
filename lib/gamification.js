import mongoose from "mongoose";
import User from "@/models/User";
import { createNotification } from "./notifications";
import { getRedis, isRedisAvailable } from "./redis";
import { RANK_MAPPING, getRankForLevel } from "./ranks";

const XP_VALUES = {
    post: 300,
    follow: 100,
    like: 20,
    comment: 50,
    daily_login: 50,
    event_rsvp: 500,
    resource_upload: 1000,
};

const LEADERBOARD_KEYS = {
    GLOBAL: "leaderboard:global",
    COLLEGE: (college) => `leaderboard:college:${college}`,
    WEEKLY: "leaderboard:weekly",
};

/**
 * Awards XP to a user, handles leveling up, and updates Redis leaderboards.
 */
export async function awardXP(userId, type) {
    try {
        const amount = XP_VALUES[type] || 0;
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

        // Simple leveling logic: level = floor(newXP / 1000) + 1
        const newLevel = Math.floor(newXP / 1000) + 1;
        const leveledUp = newLevel > oldLevel;

        user.xp = newXP;
        user.level = newLevel;
        user.totalXP = newTotalXP;
        user.weeklyXP = newWeeklyXP;
        await user.save();

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
                meta: { newLevel },
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
 * Updates user's daily streak.
 */
export async function updateStreak(userId) {
    try {
        const user = await User.findById(userId).select(
            "currentStreak longestStreak lastActiveDate",
        );
        if (!user) return { success: false };

        const now = new Date();
        const lastActive = user.lastActiveDate;

        if (!lastActive) {
            user.currentStreak = 1;
            user.longestStreak = Math.max(user.longestStreak || 0, 1);
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
            } else if (diffDays > 1) {
                // Streak broken
                user.currentStreak = 1;
            }
            // If diffDays is 0, they already logged in today, do nothing to streak
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

// Re-export for backward compatibility
export { RANK_MAPPING, getRankForLevel };
