import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import ClipLike from "@/models/ClipLike";
import ClipSave from "@/models/ClipSave";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeUser } from "@/lib/sanitize";

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 20);
        const username = searchParams.get("username");

        await connectDB();

        let query = {};

        if (username) {
            const user = await User.findOne({
                username: username.toLowerCase(),
            })
                .select("_id")
                .lean();
            if (user) {
                query.userId = user._id;
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        clips: [],
                        pagination: {
                            nextCursor: null,
                            hasNextPage: false,
                            limit,
                        },
                    },
                    { status: 200 },
                );
            }
        }

        if (cursor) {
            const decodedCursor = Buffer.from(cursor, "base64").toString(
                "utf-8",
            );
            query._id = { $lt: decodedCursor };
        }

        const clips = await Clip.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate({
                path: "userId",
                select: "name username avatar isVerified",
                options: { lean: true },
            })
            .lean();

        const hasMore = clips.length > limit;
        const resultClips = hasMore ? clips.slice(0, limit) : clips;

        // Fetch like and save status for current user
        let likedClipIds = [];
        let savedClipIds = [];
        let followingUserIds = [];
        if (currentUser) {
            const [likedClips, savedClips] = await Promise.all([
                ClipLike.find({
                    userId: currentUser._id,
                    clipId: { $in: resultClips.map((c) => c._id) },
                })
                    .select("clipId")
                    .lean(),
                ClipSave.find({
                    userId: currentUser._id,
                    clipId: { $in: resultClips.map((c) => c._id) },
                })
                    .select("clipId")
                    .lean(),
            ]);
            likedClipIds = likedClips.map((l) => l.clipId.toString());
            savedClipIds = savedClips.map((s) => s.clipId.toString());
            followingUserIds = currentUser.following.map((id) => id.toString());
        }

        const processedClips = resultClips.map((clip) => {
            const sanitizedUser = sanitizeUser(clip.userId);
            return {
                ...clip,
                user: sanitizedUser,
                _isLiked: likedClipIds.includes(clip._id.toString()),
                _isSaved: savedClipIds.includes(clip._id.toString()),
                _userIsFollowing: followingUserIds.includes(
                    clip.userId?._id?.toString() || clip.userId.toString(),
                ),
            };
        });

        const nextCursor = hasMore
            ? Buffer.from(
                  resultClips[resultClips.length - 1]._id.toString(),
              ).toString("base64")
            : null;

        const response = NextResponse.json({
            success: true,
            clips: processedClips,
            pagination: {
                nextCursor,
                hasNextPage: hasMore,
                limit,
            },
        });
        // Guest (unauthenticated) feed is fully public and not personalized,
        // so it can be edge-cached. Authenticated responses carry per-user
        // like/save/follow flags and must stay no-store (inherited blanket).
        if (!currentUser) {
            response.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
        }
        return response;
    } catch (error) {
        console.error("Clips feed error:", error);
        return NextResponse.json(
            {
                success: false,
                error: { message: "Internal Server Error" },
            },
            { status: 500 },
        );
    }
}
