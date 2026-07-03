import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import { sanitizeUser } from "@/lib/sanitize";

// Simple in-memory cache
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function GET(request) {
    try {
        const now = Date.now();

        // Return cached data if still valid
        if (cache && now - cacheTime < CACHE_DURATION) {
            return NextResponse.json({ posts: cache });
        }

        await connectDB();

        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

        const posts = await Post.find({
            createdAt: { $gte: dayAgo },
            isDeleted: { $ne: true },
        })
            .select(
                "content author likesCount commentsCount community createdAt",
            )
            .populate(
                "author",
                "name username avatar isVerified verificationType isBot botType",
            )
            .lean();

        // Calculate trending score
        const scoredPosts = posts.map((post) => {
            const likes = post.likesCount || 0;
            const comments = post.commentsCount || 0;
            const score = likes * 3 + comments * 2;
            return {
                ...post,
                score,
                preview: post.content?.slice(0, 80) || "",
            };
        });

        // Sort by score and take top 5
        const trending = scoredPosts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((post) => ({
                _id: post._id,
                content: post.content,
                preview: post.preview,
                author: post.author ? sanitizeUser(post.author) : null,
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                community: post.community || null,
            }));

        // Update cache
        cache = trending;
        cacheTime = now;

        return NextResponse.json({ posts: trending });
    } catch (error) {
        console.error("[TrendingGET] Error:", error.message);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
