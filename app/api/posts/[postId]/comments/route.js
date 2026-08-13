import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";
import { createNotification } from "@/lib/notifications";
import { awardXP } from "@/lib/gamification";
import { awardVP } from "@/lib/coins";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { cacheWithFallback, cacheDelPattern } from "@/lib/redis-cache";

// GET /api/posts/[postId]/comments
export async function GET(request, { params }) {
    try {
        const { postId } = await params;

        if (!validateObjectId(postId)) {
            return NextResponse.json(
                { message: "Invalid Post ID" },
                { status: 400 },
            );
        }

        // Get query params for pagination
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit")) || 10;
        const cursor = searchParams.get("cursor") || null;

        // Create cache key including pagination params
        const cacheKey = `comments:${postId}:${limit}:${cursor || "first"}`;

        const data = await cacheWithFallback(cacheKey, 60, async () => {
            await connectDB();

            const query = { post: postId };

            // If we have a cursor, get comments created after the cursor's createdAt
            if (cursor) {
                const cursorComment = await Comment.findById(cursor)
                    .select("createdAt")
                    .lean();
                if (cursorComment) {
                    query.createdAt = { $gt: cursorComment.createdAt };
                }
            }

            // Get comments + 1 to check if there's more
            const comments = await Comment.find(query)
                .sort({ createdAt: 1 })
                .limit(limit + 1)
                .populate("author", "name username avatar college")
                .lean();

            // Check if there are more comments
            let hasNextPage = false;
            let nextCursor = null;
            if (comments.length > limit) {
                hasNextPage = true;
                comments.pop(); // Remove the extra one
                nextCursor = comments[comments.length - 1]._id;
            }

            return { comments, hasNextPage, nextCursor };
        });

        return NextResponse.json(data, {
            headers: {
                "Cache-Control":
                    "public, s-maxage=60, stale-while-revalidate=30",
            },
        });
    } catch (error) {
        console.error("Comment fetching error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}

// POST /api/posts/[postId]/comments
export async function POST(request, { params }) {
    try {
        const { postId } = await params;
        if (!validateObjectId(postId)) {
            return NextResponse.json(
                { message: "Invalid Post ID" },
                { status: 400 },
            );
        }

        // Rate limit comments - 20 comments per 10 minutes per IP
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "post_comment",
            20,
            10 * 60 * 1000,
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

        const { content } = body;
        if (!content || !content.trim()) {
            return NextResponse.json(
                { message: "Comment content is required" },
                { status: 400 },
            );
        }

        const sanitizedContent = sanitizeText(content);
        if (sanitizedContent.length > 280) {
            return NextResponse.json(
                { message: "Comment too long" },
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

        const comment = await Comment.create({
            post: postId,
            author: currentUser._id,
            content: sanitizedContent,
        });

        const populated = {
            ...comment.toObject(),
            author: {
                _id: currentUser._id,
                name: currentUser.name,
                username: currentUser.username,
                avatar: currentUser.avatar,
            },
        };

        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

        // Invalidate all comment cache keys for this post
        await cacheDelPattern(`comments:${postId}*`);

        // Notification - ONLY if not anonymous
        if (
            post &&
            !post.isAnonymous &&
            post.author &&
            post.author.toString() !== currentUser._id.toString()
        ) {
            createNotification({
                recipient: post.author,
                sender: currentUser._id,
                type: "comment",
                postId: postId,
                commentId: comment._id,
                meta: {
                    postPreview: post.content?.substring(0, 50),
                    commentPreview: sanitizedContent.substring(0, 50),
                },
            }).catch((err) => console.error("Operation failed:", err));
        }

        // Award XP for commenting (background)
        awardXP(currentUser._id, "comment").catch((err) =>
            console.error("XP award error:", err),
        );

        // Award VP for adding a comment (actor earns). Self-guard:
        // don't reward commenting on your own post.
        awardVP(currentUser._id, "comment", comment._id, {
            ownerId: post.author,
        }).catch((err) => console.error("VP award error:", err));

        return NextResponse.json(populated, { status: 201 });
    } catch (error) {
        console.error("Comment creation error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}

// DELETE /api/posts/[postId]/comments
export async function DELETE(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const { postId } = await params;
        if (!validateObjectId(postId)) {
            return NextResponse.json(
                { message: "Invalid Post ID" },
                { status: 400 },
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

        const { commentId } = body;

        if (!validateObjectId(commentId)) {
            return NextResponse.json(
                { message: "Invalid Comment ID" },
                { status: 400 },
            );
        }

        await connectDB();

        const comment = await Comment.findById(commentId).lean();
        if (!comment) {
            return NextResponse.json(
                { message: "Comment not found" },
                { status: 404 },
            );
        }

        const post = await Post.findById(postId).lean();
        if (!post) {
            return NextResponse.json(
                { message: "Post not found" },
                { status: 404 },
            );
        }

        // Auth: Comment author OR Post author can delete
        const isCommentAuthor =
            comment.author.toString() === currentUser._id.toString();
        const isPostAuthor =
            post.author.toString() === currentUser._id.toString();

        if (!isCommentAuthor && !isPostAuthor) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await Comment.findByIdAndDelete(commentId);
        await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });

        // Invalidate all comment cache keys for this post
        await cacheDelPattern(`comments:${postId}*`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Comment deletion error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
