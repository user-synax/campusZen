import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeMongoInput, sanitizeUser } from "@/lib/sanitize";

export async function GET(request) {
    try {
        // Rate limit search - 30 searches per minute per IP
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "search_users",
            30,
            60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        // Identify the requester so we can decide whether to expose emails.
        const currentUser = await getCurrentUser(request);
        const requesterIsAdmin = currentUser ? isAdmin(currentUser) : false;

        const { searchParams } = new URL(request.url);
        let q = sanitizeMongoInput(searchParams.get("q") || "");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 30);
        const skip = (page - 1) * limit;

        if (!q || q.trim().length < 2) {
            return NextResponse.json(
                { message: "Query too short" },
                { status: 400 },
            );
        }

        if (q.length > 100) {
            q = q.substring(0, 100);
        }

        await connectDB();

        let users = [];
        let total = 0;

        if (q.startsWith("@")) {
            const sanitizedUsername = q
                .substring(1)
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const query = {
                username: { $regex: `^${sanitizedUsername}`, $options: "i" },
            };

            [users, total] = await Promise.all([
                User.find(query)
                    .lean()
                    .select(
                        "name username avatar college bio followers following isPro isVerified verificationType role email",
                    )
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(query),
            ]);
        } else {
            const sanitizedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // Strategy A: MongoDB $text search
            const textQuery = { $text: { $search: sanitizedQuery } };
            [users, total] = await Promise.all([
                User.find(textQuery, { score: { $meta: "textScore" } })
                    .lean()
                    .sort({ score: { $meta: "textScore" } })
                    .select(
                        "name username avatar college bio followers following isPro isVerified verificationType role email",
                    )
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                User.countDocuments(textQuery),
            ]);

            if (users.length === 0) {
                // Strategy B: Fallback regex on name or username
                const regexQuery = { $regex: sanitizedQuery, $options: "i" };
                const fallbackQuery = {
                    $or: [{ name: regexQuery }, { username: regexQuery }],
                };

                [users, total] = await Promise.all([
                    User.find(fallbackQuery)
                        .lean()
                        .select(
                            "name username avatar college bio followers following isPro isVerified verificationType role email",
                        )
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    User.countDocuments(fallbackQuery),
                ]);
            }
        }

        // Clean user objects (ensure no sensitive data is returned)
        const cleanedUsers = users.map((user) => {
            const sanitized = sanitizeUser(user);
            const isSelf =
                currentUser && currentUser._id.toString() === user._id.toString();
            return {
                ...sanitized,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                isPro: user.isPro || false,
                isVerified: user.isVerified || false,
                verificationType: user.verificationType,
                role: user.role,
                // Email is PII: only expose to the user themselves or an admin.
                email:
                    isSelf || requesterIsAdmin ? user.email : undefined,
            };
        });

        return NextResponse.json({
            users: cleanedUsers,
            total,
            hasMore: skip + cleanedUsers.length < total,
        });
    } catch (error) {
        console.error("Search users error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
