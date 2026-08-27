import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeUser, sanitizeMongoInput } from "@/lib/sanitize";

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        await connectDB();

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Number(searchParams.get("limit")) || 12, 50);
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const skip = (page - 1) * limit;
        const query = searchParams.get("q");

        // Build exclusion set: self + already connected + blocked
        const excludeIds = [currentUser?._id].filter(Boolean);
        if (currentUser?.connections?.length) {
            excludeIds.push(...currentUser.connections);
        }
        if (currentUser?.blockedUsers?.length) {
            excludeIds.push(...currentUser.blockedUsers);
        }

        let filter = { _id: { $nin: excludeIds } };

        // Search by username, name, or college
        if (query && query.trim()) {
            // Escape regex metacharacters to prevent ReDoS / injection.
            const safeQuery = sanitizeMongoInput(query.trim());
            const regex = { $regex: new RegExp(safeQuery, "i") };
            filter.$or = [
                { username: regex },
                { name: regex },
                { college: regex },
            ];
        }

        let suggestions = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select(
                "name username avatar college course branch bio interests isVerified verificationType isPro role",
            )
            .lean();

        // If query returned few results, fill remaining slots with newest users
        if (suggestions.length < limit) {
            const existingIds = suggestions.map((s) => s._id);
            const fillQuery = {
                _id: { $nin: [...excludeIds, ...existingIds] },
            };
            const fillUsers = await User.find(fillQuery)
                .sort({ createdAt: -1 })
                .limit(limit - suggestions.length)
                .select(
                    "name username avatar college course branch bio interests isVerified verificationType isPro role",
                )
                .lean();
            suggestions = [...suggestions, ...fillUsers];
        }

        const sanitized = suggestions.map((user) => sanitizeUser(user));

        return NextResponse.json(sanitized);
    } catch (error) {
        console.error("Connect suggestions API error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
