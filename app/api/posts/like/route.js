import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";
import { createNotification, deleteNotification } from "@/lib/notifications";
import { awardXP } from "@/lib/gamification";
import { awardVP } from "@/lib/coins";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { cacheSet, cacheDel } from "@/lib/redis-cache";

export async function POST(request) {
    try {
        // Rate limit likes - 60 likes per minute per IP
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "post_like",
            60,
            60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const cleanBody = sanitizeMongoInput(body);
        const { postId } = cleanBody;

        if (!validateObjectId(postId)) {
            return NextResponse.json(
                { message: "Invalid Post ID" },
                { status: 400 },
            );
        }

        await connectDB();

        const post = await Post.findById(postId);
        if (!post) {
            return NextResponse.json(
                { message: "Post not found" },
                { status: 404 },
            );
        }

        const currentUserIdStr = currentUser._id.toString();
        const isLiked = post.likes.some(
            (id) => id.toString() === currentUserIdStr,
        );

        let updatedPost;
        if (isLiked) {
            // Unlike optimized: $pull and $inc -1
            updatedPost = await Post.findOneAndUpdate(
                { _id: postId },
                {
                    $pull: { likes: currentUser._id },
                    $inc: { likesCount: -1 },
                },
                { new: true },
            );

            // Delete notification
            await deleteNotification({
                sender: currentUser._id,
                recipient: post.author,
                type: "like",
                postId: postId,
            }).catch((err) => console.error("Notification error:", err));
        } else {
            // Like optimized: $addToSet and $inc +1
            updatedPost = await Post.findOneAndUpdate(
                { _id: postId },
                {
                    $addToSet: { likes: currentUser._id },
                    $inc: { likesCount: 1 },
                },
                { new: true },
            );

            // Create notification - only if author is not the current user
            if (post.author && post.author.toString() !== currentUserIdStr) {
                await createNotification({
                    recipient: post.author,
                    sender: currentUser._id,
                    type: "like",
                    postId: postId,
                    meta: { postPreview: post.content?.substring(0, 50) },
                }).catch((err) => console.error("Notification error:", err));
            }

            // Award XP for liking (background)
            awardXP(currentUser._id, "like").catch((err) =>
                console.error("XP award error:", err),
            );

            // Award VP for giving a like (actor earns). Self-guard:
            // don't reward liking your own post.
            awardVP(currentUser._id, "like", postId, {
                ownerId: post.author,
            }).catch((err) => console.error("VP award error:", err));
        }

        // Double check count safety (to prevent negative likes if something goes wrong)
        if (updatedPost.likesCount < 0) {
            updatedPost.likesCount = 0;
            await updatedPost.save();
        }

        // Invalidate and update like count cache
        const likeCacheKey = `likes:${postId}`;
        await cacheDel(likeCacheKey); // Delete old cache
        await cacheSet(likeCacheKey, updatedPost.likesCount, 300); // Cache for 5 minutes

        return NextResponse.json({
            success: true,
            liked: !isLiked,
            likesCount: updatedPost.likesCount,
        });
    } catch (error) {
        console.error("Like API error:", error);
        return NextResponse.json(
            {
                message: "Internal Server Error",
                error: error.message,
            },
            { status: 500 },
        );
    }
}
