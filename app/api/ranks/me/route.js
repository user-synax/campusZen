import { NextResponse } from "next/server";
import User from "@/models/User";
import { getLevelProgress, getRankForLevel } from "@/lib/ranks";
import connectDB from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
    await connectDB();

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Get full user
        const fullUser = await User.findById(user._id);
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

        return NextResponse.json({
            user: {
                id: fullUser._id,
                level: fullUser.level,
                xp: fullUser.xp,
                totalXP: fullUser.totalXP,
                rank: currentRank,
            },
            progress,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
