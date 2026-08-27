import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeUser } from "@/lib/sanitize";

export async function GET(request) {
    try {
        await connectDB();
        const currentUser = await getCurrentUser(request);
        // Require an authenticated session — this endpoint must not be public.
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 50);
        const skip = (page - 1) * limit;

        const query = { _id: { $ne: currentUser._id } };

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 }) // Newest first
                .select(
                    "name username avatar college bio followers following isPro isVerified verificationType",
                )
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        const cleanedUsers = users.map((user) => {
            const sanitized = sanitizeUser(user);
            return {
                ...sanitized,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                isPro: user.isPro || false,
                isVerified: user.isVerified || false,
                verificationType: user.verificationType,
            };
        });

        return NextResponse.json({
            users: cleanedUsers,
            total,
            hasMore: skip + cleanedUsers.length < total,
            page,
        });
    } catch (error) {
        console.error("All users API error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
