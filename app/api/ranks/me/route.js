import { NextResponse } from "next/server";
import User from "@/models/User";
import Badge from "@/models/Badge";
import { getLevelProgress, getRankForLevel } from "@/lib/ranks";
import { PREDEFINED_BADGES, initPredefinedBadges } from "@/lib/gamification";
import connectDB from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function isBadgeEarned(userBadges, badgeDef) {
    return userBadges?.some((b) => {
        const bId = b.badgeId?._id?.toString() || b.badgeId?.toString();
        return bId === badgeDef.id || bId === badgeDef._id?.toString();
    });
}

export async function GET(request) {
    await connectDB();
    await initPredefinedBadges(); // Ensure badges are in DB

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Get full user with badges
        const fullUser = await User.findById(user._id).populate(
            "badges.badgeId",
        );
        if (!fullUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        const progress = getLevelProgress(
            fullUser.xp || 0,
            fullUser.level || 1,
        );
        const currentRank = getRankForLevel(fullUser.level || 1);

        // Get all badges (including unearned ones)
        const allBadges = [];
        const dbBadges = await Badge.find({}).lean();

        // Combine predefined and DB badges
        const badgeMap = new Map();
        for (const def of PREDEFINED_BADGES) {
            badgeMap.set(def.id, def);
        }
        for (const dbBadge of dbBadges) {
            badgeMap.set(dbBadge.id || dbBadge._id.toString(), dbBadge);
        }

        for (const [id, badge] of badgeMap.entries()) {
            const userBadge = fullUser.badges?.find(
                (b) =>
                    b.badgeId?._id?.toString() === badge._id?.toString() ||
                    b.badgeId?.toString() === badge.id,
            );

            allBadges.push({
                ...badge,
                earned: !!userBadge,
                awardedAt: userBadge?.awardedAt,
            });
        }

        return NextResponse.json({
            user: {
                id: fullUser._id,
                level: fullUser.level,
                xp: fullUser.xp,
                totalXP: fullUser.totalXP,
                rank: currentRank,
            },
            progress,
            badges: allBadges,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
