import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { validateObjectId } from "@/utils/validators";
import { sanitizeUser } from "@/lib/sanitize";
import { cacheWithFallback, cacheDelPattern } from "@/lib/redis-cache";

export async function GET(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        const { postId } = await params;

        if (!validateObjectId(postId)) {
            return NextResponse.json(
                { message: "Invalid Post ID" },
                { status: 400 },
            );
        }

        const cacheKey = `post:${postId}:${currentUser?._id || "anonymous"}`;

        const postResponse = await cacheWithFallback(
            cacheKey,
            120,
            async () => {
                await connectDB();

                const post = await Post.findById(postId)
                    .populate(
                        "author",
                        "name username avatar college isVerified verificationType isBot botType",
                    )
                    .select("-__v") // Exclude unnecessary fields
                    .lean();

                if (!post) {
                    return { notFound: true };
                }

                const isLiked = currentUser
                    ? post.likes?.some(
                          (id) => id.toString() === currentUser._id.toString(),
                      )
                    : false;

                const { likes, author, ...postData } = post;

                return {
                    ...postData,
                    likesCount: post.likesCount ?? post.likes?.length ?? 0,
                    shareCount: post.shareCount ?? 0,
                    author: author ? sanitizeUser(author) : null,
                    _isLiked: isLiked,
                };
            },
        );

        if (postResponse.notFound) {
            return NextResponse.json(
                { message: "Post not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(postResponse, {
            headers: {
                "Cache-Control":
                    "public, s-maxage=120, stale-while-revalidate=60",
                Vary: "Cookie",
            },
        });
    } catch (error) {
        console.error("Post fetch error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const currentUser = await getCurrentUser(request);

        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const { postId } = await params;
        const body = await request.json();
        const { content } = body;

        if (!content || typeof content !== "string") {
            return NextResponse.json(
                { message: "Content is required" },
                { status: 400 },
            );
        }

        const sanitizedContent = sanitizeMongoInput(content.trim());

        if (sanitizedContent.length > 2000) {
            return NextResponse.json(
                { message: "Content exceeds 2000 characters" },
                { status: 400 },
            );
        }

        const post = await Post.findById(postId);

        if (!post) {
            return NextResponse.json(
                { message: "Post not found" },
                { status: 404 },
            );
        }

        if (post.author.toString() !== currentUser._id.toString()) {
            return NextResponse.json(
                { message: "Not authorized to edit this post" },
                { status: 403 },
            );
        }

        post.content = sanitizedContent;
        await post.save();

        // Invalidate post cache
        await cacheDelPattern(`post:${postId}:*`);

        return NextResponse.json({
            message: "Post updated successfully",
            post: {
                _id: post._id,
                content: post.content,
                updatedAt: post.updatedAt,
            },
        });
    } catch (error) {
        console.error("[EditPostPATCH] Error:", error.message);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
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
                { message: "Invalid post ID" },
                { status: 400 },
            );
        }

        const post = await Post.findById(postId);

        if (!post) {
            return NextResponse.json(
                { message: "Post not found" },
                { status: 404 },
            );
        }

        if (post.author.toString() !== currentUser._id.toString()) {
            return NextResponse.json(
                { message: "Not authorized to delete this post" },
                { status: 403 },
            );
        }

        await Post.findByIdAndDelete(postId);

        // Invalidate post cache
        await cacheDelPattern(`post:${postId}:*`);

        return NextResponse.json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("[DeletePostDELETE] Error:", error.message);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
