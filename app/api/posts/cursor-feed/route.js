import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import Community from "@/models/Community";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput, sanitizeUser } from "@/lib/sanitize";
import { cacheWithFallback } from "@/lib/redis-cache";

// X-like feed weights — tuned for relevance, not lottery
const FEED_WEIGHTS = {
    interest: 40,      // per matching tag
    sameCollege: 15,
    community: 12,     // same community as user follows
    likes: 1,          // per like
    comments: 2,       // per comment (2× likes)
    shares: 1.5,
    reposts: 1.5,
    verified: 3,       // small boost for verified
    random: 3,         // was 12 — keep fresh but not chaotic
};

function calculatePostScore(post, userInterests, userCollege, userCommunities = []) {
    let score = 0;
    if (userInterests?.length && post.tags?.length) {
        const matches = post.tags.filter((t) => userInterests.includes(t));
        score += matches.length * FEED_WEIGHTS.interest;
    }
    if (userCollege && post.author?.college === userCollege) score += FEED_WEIGHTS.sameCollege;
    if (userCommunities.length && post.community && userCommunities.includes(post.community.toLowerCase())) score += FEED_WEIGHTS.community;
    if (post.author?.isVerified) score += FEED_WEIGHTS.verified;

    score += (post.likesCount || 0) * FEED_WEIGHTS.likes;
    score += (post.commentsCount || 0) * FEED_WEIGHTS.comments;
    score += (post.shareCount || 0) * FEED_WEIGHTS.shares;
    score += (post.repostsCount || 0) * FEED_WEIGHTS.reposts;

    const hoursAgo = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
    // half-life ~14h: 0.95^14 ≈ 0.49
    score *= Math.pow(0.95, hoursAgo);

    // tiny jitter — prevents ties, not a lottery
    score += (Math.random() - 0.5) * FEED_WEIGHTS.random;
    return score;
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        const { searchParams } = new URL(request.url);

        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 50);
        const community = sanitizeMongoInput(searchParams.get("community"));
        const author = sanitizeMongoInput(searchParams.get("author"));
        const username = sanitizeMongoInput(searchParams.get("username"));
        const mode = sanitizeMongoInput(searchParams.get("mode")) || "default"; // default or latest8h
        const feedType =
            sanitizeMongoInput(searchParams.get("feedType")) || "discover"; // discover or interests

        // Create a cache key based on query params and current user (if logged in)
        const cacheKey = `feed:${community || "global"}:${author || username || "all"}:${mode}:${feedType}:${cursor || "start"}:${limit}:${currentUser?._id || "guest"}`;

        await connectDB();

        const postsData = await cacheWithFallback(cacheKey, 90, async () => {
            let query = { isDeleted: { $ne: true } };

            if (community) {
                query.community = {
                    $regex: new RegExp(
                        `^${community.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                        "i",
                    ),
                };
            }

            let resolvedAuthor = author;
            if (username) {
                const user = await User.findOne({
                    username: username.toString(),
                })
                    .select("_id")
                    .lean();
                if (user) {
                    resolvedAuthor = user._id;
                } else {
                    // User not found for username, return empty
                    return {
                        posts: [],
                        pagination: {
                            nextCursor: null,
                            hasNextPage: false,
                            limit,
                        },
                    };
                }
            }

            if (resolvedAuthor) {
                query.author = resolvedAuthor;
            }

            // Mode-specific queries
            if (mode === "latest8h") {
                const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
                query.createdAt = { $gte: eightHoursAgo };
            }

            if (cursor) {
                try {
                    const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
                    if (/^[a-f0-9]{24}$/i.test(decodedCursor)) query._id = { $lt: decodedCursor };
                } catch {}
            }

            let posts = [];

            if (feedType === "interests" && currentUser) {
                const userInterests = currentUser.interests || [];

                // Prioritize AI-related content
                const sortedInterests = [...userInterests].sort((a, b) => {
                    if (a === "AI") return -1;
                    if (b === "AI") return 1;
                    return 0;
                });

                if (sortedInterests.length > 0) {
                    const interestQuery = {
                        ...query,
                        tags: { $in: sortedInterests },
                    };

                    posts = await Post.find(interestQuery)
                        .sort({ createdAt: -1 })
                        .limit(limit + 1)
                        .select("-__v -updatedAt -likes")
                        .populate({
                            path: "author",
                            select: "name username avatar college isVerified verificationType isBot botType",
                            options: { lean: true },
                        })
                        .lean();
                }
            } else {
                if (mode === "default") {
                    const userInterests = currentUser?.interests || [];
                    const userCollege = currentUser?.college || "";
                    const userCommunities = currentUser?._id
                        ? (await Community.find({ members: currentUser._id }).select("name slug").lean()).map((c) => (c.slug || c.name).toLowerCase())
                        : [];

                    const pageWindow = await Post.find(query)
                        .sort({ _id: -1 })
                        .limit(limit + 1)
                        .select("-__v -updatedAt -likes")
                        .populate({
                            path: "author",
                            select: "name username avatar college isVerified verificationType isBot botType",
                            options: { lean: true },
                        })
                        .lean();

                    const hasWindowMore = pageWindow.length > limit;
                    const windowResultPosts = hasWindowMore
                        ? pageWindow.slice(0, limit)
                        : pageWindow;

                    const rankedWindow = windowResultPosts
                        .map((post) => ({
                            ...post,
                            _score: calculatePostScore(post, userInterests, userCollege, userCommunities),
                        }))
                        .sort((a, b) => b._score - a._score);

                    // Add lookahead item only to preserve existing hasMore computation.
                    posts = hasWindowMore
                        ? [...rankedWindow, pageWindow[limit]]
                        : rankedWindow;
                } else {
                    // Other modes (latest8h, etc.)
                    posts = await Post.find(query)
                        .sort({ _id: -1 })
                        .limit(limit + 1)
                        .select("-__v -updatedAt -likes")
                        .populate({
                            path: "author",
                            select: "name username avatar college isVerified verificationType isBot botType",
                            options: { lean: true },
                        })
                        .lean();
                }
            }

            const hasMore = posts.length > limit;
            const resultPosts = hasMore ? posts.slice(0, limit) : posts;

            // Fetch community details in parallel
            const communityNames = [
                ...new Set(resultPosts.map((p) => p.community).filter(Boolean)),
            ];
            const communities =
                communityNames.length > 0
                    ? await Community.find({
                          $or: [
                              { name: { $in: communityNames } },
                              {
                                  slug: {
                                      $in: communityNames.map((n) =>
                                          n.toLowerCase().replace(/\s+/g, "-"),
                                      ),
                                  },
                              },
                          ],
                      })
                          .select("name slug emoji")
                          .lean()
                    : [];

            const communityMap = communities.reduce((acc, c) => {
                acc[c.name.toLowerCase()] = c;
                acc[c.slug.toLowerCase()] = c;
                return acc;
            }, {});

            // Compute liked-state per post using index-backed existence
            // checks so we never materialize the full `likes` array.
            const likedSet = new Set();
            if (currentUser && resultPosts.length > 0) {
                await Promise.all(
                    resultPosts.map(async (post) => {
                        const liked = await Post.exists({
                            _id: post._id,
                            likes: currentUser._id,
                        });
                        if (liked) likedSet.add(post._id.toString());
                    }),
                );
            }

            const processedPosts = resultPosts.map((post) => {
                const isLiked = currentUser
                    ? likedSet.has(post._id.toString())
                    : false;
                const isBookmarked =
                    currentUser && currentUser.bookmarks
                        ? currentUser.bookmarks.some(
                              (id) => id.toString() === post._id.toString(),
                          )
                        : false;

                const communityInfo = post.community
                    ? communityMap[post.community.toLowerCase()]
                    : null;

                const { likes, author: postAuthor, _score, ...postData } = post;
                const sanitizedAuthor = sanitizeUser(postAuthor);
                const safeAuthor = sanitizedAuthor || {
                    _id: null,
                    name: "Unknown",
                    username: "unknown",
                    avatar: null,
                    isVerified: false,
                };

                return {
                    ...postData,
                    likesCount: post.likesCount ?? post.likes?.length ?? 0,
                    shareCount: post.shareCount ?? 0,
                    author: safeAuthor,
                    _isLiked: isLiked,
                    _isBookmarked: isBookmarked,
                    communityInfo: communityInfo
                        ? {
                              name: communityInfo.name,
                              slug: communityInfo.slug,
                              emoji: communityInfo.emoji,
                          }
                        : null,
                };
            });

            const nextCursor = hasMore
                ? Buffer.from(
                      resultPosts
                          .reduce(
                              (minId, post) =>
                                  post._id.toString() < minId.toString()
                                      ? post._id
                                      : minId,
                              resultPosts[0]._id,
                          )
                          .toString(),
                  ).toString("base64")
                : null;

            if (process.env.NODE_ENV !== "production") {
                console.log("[cursor-feed]", {
                    mode,
                    feedType,
                    cursor,
                    resultCount: processedPosts.length,
                    hasMore,
                    nextCursor,
                });
            }

            return {
                posts: processedPosts,
                pagination: {
                    nextCursor,
                    hasNextPage: hasMore,
                    limit,
                },
            };
        });

        return NextResponse.json(
            {
                success: true,
                ...postsData,
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=90, stale-while-revalidate=60",
                    Vary: "Cookie",
                },
            },
        );
    } catch (error) {
        console.error("Cursor feed error:", error);
        return NextResponse.json(
            {
                success: false,
                error: { message: "Internal Server Error" },
            },
            { status: 500 },
        );
    }
}
