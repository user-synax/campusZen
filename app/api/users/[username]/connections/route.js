import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput, sanitizeUser } from "@/lib/sanitize";

export async function GET(request, { params }) {
    try {
        const { username } = sanitizeMongoInput(await params);
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;

        await connectDB();

        // 1. Find user by username
        const user = await User.findOne({
            username: {
                $regex: new RegExp(
                    `^${username
                        .toString()
                        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                    "i",
                ),
            },
        })
            .select("connections")
            .lean();

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );
        }

        // 2. Get total count
        const total = user.connections?.length || 0;

        // 3. Paginate the connections array
        const skip = (page - 1) * limit;
        const paginatedIds = (user.connections || []).slice(
            skip,
            skip + limit,
        );

        // 4. Fetch user details for those IDs
        const connections = await User.find({ _id: { $in: paginatedIds } })
            .select("name username avatar college bio followers")
            .lean();

        // Filter out any null entries (deleted users)
        const validConnections = connections.filter(Boolean);

        // 5. Add isFollowedByCurrentUser field
        const currentUser = await getCurrentUser(request);
        const connectionsWithStatus = validConnections.map((conn) => {
            const isFollowedByCurrentUser = currentUser
                ? currentUser.following?.some(
                      (id) => id.toString() === conn._id.toString(),
                  )
                : false;

            return {
                ...sanitizeUser(conn),
                followersCount: (conn.followers || []).length,
                isFollowedByCurrentUser,
            };
        });

        // 6. Return
        return NextResponse.json({
            users: connectionsWithStatus,
            total,
            hasMore: skip + connectionsWithStatus.length < total,
        });
    } catch (error) {
        console.error("Connections GET error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 },
        );
    }
}
