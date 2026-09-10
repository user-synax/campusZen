import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
    verified: 8,       // stronger verified boost
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

// ── Cursor helpers for global ranking (score + _id) ──
function encodeScoreCursor(score, id) {
    return Buffer.from(JSON.stringify({ s: Number(score.toFixed(4)), id: id.toString() })).toString("base64");
}
function decodeScoreCursor(cursor) {
    try {
        const raw = Buffer.from(cursor, "base64").toString("utf-8");
        // Try new format {s, id}
        const obj = JSON.parse(raw);
        if (obj && typeof obj.s === "number" && typeof obj.id === "string" && /^[a-f0-9]{24}$/i.test(obj.id)) {
            return { score: obj.s, id: obj.id, isScoreCursor: true };
        }
        // Fallback: old _id only
        if (/^[a-f0-9]{24}$/i.test(raw)) return { id: raw, isScoreCursor: false };
        return null;
    } catch {
        try {
            const raw = Buffer.from(cursor, "base64").toString("utf-8");
            if (/^[a-f0-9]{24}$/i.test(raw)) return { id: raw, isScoreCursor: false };
        } catch {}
        return null;
    }
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
        const verifiedOnly = searchParams.get("verifiedOnly") === "true";

        // Create a cache key based on query params and current user (if logged in)
        const cacheKey = `feed:${community || "global"}:${author || username || "all"}:${mode}:${feedType}:${cursor || "start"}:${limit}:${verifiedOnly ? "verified" : "all"}:${currentUser?._id || "guest"}`;

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

            // P1 fix: verifiedOnly no longer does User.find({isVerified}) per request (N+1).
            // Instead we handle it in aggregation via author lookup or denormalized authorIsVerified.
            // Keep query clean here; aggregation will filter.
            // For non-aggregation paths (interests/latest8h) we use denormalized field with fallback.
            let verifiedOnlyQuery = null;
            if (verifiedOnly) {
                // Prefer denormalized Post.authorIsVerified (indexed) — fast path, uses {authorIsVerified:1, createdAt:-1}
                // Fallback via aggregation $lookup for old docs without denormalized field is handled below.
                verifiedOnlyQuery = { authorIsVerified: true };
                // For find-based paths (interests), we add to query
                // For aggregation path, we handle via $match after $lookup
            }

            // Mode-specific queries
            if (mode === "latest8h") {
                const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
                query.createdAt = { $gte: eightHoursAgo };
            }

            // Legacy _id cursor for non-ranked modes (latest8h, interests)
            // For default ranked mode we use score cursor (handled in aggregation)
            let legacyCursorId = null;
            if (cursor && mode !== "default") {
                try {
                    const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
                    if (/^[a-f0-9]{24}$/i.test(decodedCursor)) {
                        legacyCursorId = decodedCursor;
                        query._id = { $lt: decodedCursor };
                    }
                } catch {}
            }

            let posts = [];
            let useAggregation = false;

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
                        ...(verifiedOnly ? verifiedOnlyQuery : {}),
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
                    useAggregation = true;
                    const userInterests = currentUser?.interests || [];
                    const userCollege = currentUser?.college || "";
                    const userCommunities = currentUser?._id
                        ? (await Community.find({ members: currentUser._id }).select("name slug").lean()).map((c) => (c.slug || c.name).toLowerCase())
                        : [];

                    // ── P1 fix: Global ranking via Mongo aggregation, not page-local window ──
                    // Instead of fetching 20 docs by _id then ranking locally, we:
                    // 1. Match base query (isDeleted, community, author, etc.)
                    // 2. Candidate pool: recent 800 docs (avoids full collection scan, still global within window)
                    // 3. Lookup author for verified/college
                    // 4. Compute finalScore (popularity*decay + personal boosts) in DB
                    // 5. Sort by finalScore globally, then apply score cursor
                    // 6. Fallback to popularityScore index when author lookup missing

                    const baseMatch = { ...query };
                    // Remove _id cursor from baseMatch for aggregation (handled via score cursor)
                    delete baseMatch._id;
                    // P1: verifiedOnly uses denormalized authorIsVerified when available (indexed),
                    // but we also support old docs via $lookup filter below. Keep baseMatch clean
                    // and filter after lookup for correctness; candidate pool enlarged for verifiedOnly.

                    const decoded = cursor ? decodeScoreCursor(cursor) : null;
                    const now = new Date();

                    // Candidate pool size: larger for verifiedOnly (verified posts are sparser)
                    const candidatePoolSize = verifiedOnly ? 2000 : 800;

                    // Build pipeline
                    const pipeline = [
                        { $match: baseMatch },
                        // Candidate pool — keeps global ranking tractable without scanning entire collection
                        { $sort: { _id: -1 } },
                        { $limit: candidatePoolSize },
                        {
                            $lookup: {
                                from: "users",
                                localField: "author",
                                foreignField: "_id",
                                as: "authorDoc",
                                pipeline: [{ $project: { isVerified: 1, college: 1, name: 1, username: 1, avatar: 1, verificationType: 1, isBot: 1, botType: 1 } }],
                            },
                        },
                        { $unwind: { path: "$authorDoc", preserveNullAndEmptyArrays: true } },
                        // For old posts where denormalized authorIsVerified is missing, use authorDoc.isVerified
                        {
                            $addFields: {
                                resolvedIsVerified: {
                                    $ifNull: ["$authorIsVerified", { $ifNull: ["$authorDoc.isVerified", false] }],
                                },
                                resolvedAuthorCollege: {
                                    $ifNull: ["$authorCollege", { $ifNull: ["$authorDoc.college", ""] }],
                                },
                                // hoursAgo for decay
                                hoursAgo: {
                                    $divide: [{ $subtract: [now, "$createdAt"] }, 1000 * 60 * 60],
                                },
                            },
                        },
                        // verifiedOnly filter — after resolving verified flag, drop unverified (covers both denormalized and old docs)
                        ...(verifiedOnly
                            ? [
                                  {
                                      $match: { resolvedIsVerified: true },
                                  },
                              ]
                            : []),
                        {
                            $addFields: {
                                basePopularity: {
                                    $add: [
                                        { $ifNull: ["$likesCount", 0] },
                                        { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 2] },
                                        { $multiply: [{ $ifNull: ["$shareCount", 0] }, 1.5] },
                                        { $multiply: [{ $ifNull: ["$repostsCount", 0] }, 1.5] },
                                        { $cond: [{ $eq: ["$resolvedIsVerified", true] }, FEED_WEIGHTS.verified, 0] },
                                    ],
                                },
                            },
                        },
                        {
                            $addFields: {
                                decayedPopularity: {
                                    $multiply: ["$basePopularity", { $pow: [0.95, "$hoursAgo"] }],
                                },
                            },
                        },
                        // Personal boosts
                        {
                            $addFields: {
                                interestMatches: {
                                    $cond: [
                                        { $gt: [{ $size: { $ifNull: ["$tags", []] } }, 0] },
                                        { $size: { $setIntersection: [{ $ifNull: ["$tags", []] }, userInterests] } },
                                        0,
                                    ],
                                },
                                interestBoost: {
                                    $multiply: [
                                        {
                                            $size: { $setIntersection: [{ $ifNull: ["$tags", []] }, userInterests] },
                                        },
                                        FEED_WEIGHTS.interest,
                                    ],
                                },
                                sameCollegeBoost: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: [userCollege, ""] },
                                                { $eq: ["$resolvedAuthorCollege", userCollege] },
                                            ],
                                        },
                                        FEED_WEIGHTS.sameCollege,
                                        0,
                                    ],
                                },
                                communityBoost: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gt: [{ $size: userCommunities }, 0] },
                                                { $ne: ["$community", ""] },
                                                {
                                                    $in: [
                                                        { $toLower: { $ifNull: ["$community", ""] } },
                                                        userCommunities,
                                                    ],
                                                },
                                            ],
                                        },
                                        FEED_WEIGHTS.community,
                                        0,
                                    ],
                                },
                            },
                        },
                        {
                            $addFields: {
                                finalScore: {
                                    $add: ["$decayedPopularity", "$interestBoost", "$sameCollegeBoost", "$communityBoost"],
                                },
                            },
                        },
                        // Cursor pagination on finalScore (global ranking)
                        ...(decoded?.isScoreCursor
                            ? [
                                  {
                                      $match: {
                                          $or: [
                                              { finalScore: { $lt: decoded.score } },
                                              {
                                                  finalScore: decoded.score,
                                                  _id: { $lt: new mongoose.Types.ObjectId(decoded.id) },
                                              },
                                          ],
                                      },
                                  },
                              ]
                            : decoded && !decoded.isScoreCursor && decoded.id
                              ? [
                                    {
                                        $match: { _id: { $lt: new mongoose.Types.ObjectId(decoded.id) } },
                                    },
                                ]
                              : []),
                        { $sort: { finalScore: -1, _id: -1 } },
                        { $limit: limit + 1 },
                        // Project to shape like lean Post with author populated
                        {
                            $addFields: {
                                author: {
                                    _id: "$authorDoc._id",
                                    name: "$authorDoc.name",
                                    username: "$authorDoc.username",
                                    avatar: "$authorDoc.avatar",
                                    college: "$authorDoc.college",
                                    isVerified: "$resolvedIsVerified",
                                    verificationType: "$authorDoc.verificationType",
                                    isBot: "$authorDoc.isBot",
                                    botType: "$authorDoc.botType",
                                },
                            },
                        },
                        {
                            $project: {
                                authorDoc: 0,
                                resolvedIsVerified: 0,
                                resolvedAuthorCollege: 0,
                                hoursAgo: 0,
                                basePopularity: 0,
                                decayedPopularity: 0,
                                interestMatches: 0,
                                interestBoost: 0,
                                sameCollegeBoost: 0,
                                communityBoost: 0,
                                __v: 0,
                                updatedAt: 0,
                                likes: 0,
                            },
                        },
                    ];

                    const aggResults = await Post.aggregate(pipeline).allowDiskUse(true);

                    // Add tiny jitter in app layer (Mongo $rand not stable across shards)
                    const withJitter = aggResults.map((p) => ({
                        ...p,
                        _score: (p.finalScore || 0) + (Math.random() - 0.5) * FEED_WEIGHTS.random,
                    }));
                    // Re-sort after jitter (small, keeps global order mostly intact but breaks ties)
                    withJitter.sort((a, b) => b._score - a._score);

                    // Preserve hasMore via limit+1; keep finalScore for cursor
                    posts = withJitter.map((p) => {
                        const { finalScore, ...rest } = p;
                        return { ...rest, _score: p._score, _finalScore: finalScore };
                    });
                } else {
                    // Other modes (latest8h, etc.)
                    const finalQuery = verifiedOnly ? { ...query, ...verifiedOnlyQuery } : query;
                    // Handle legacy _id cursor for latest8h
                    if (legacyCursorId) finalQuery._id = { $lt: legacyCursorId };
                    posts = await Post.find(finalQuery)
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

            // Single query to fix N+1 — fetch all liked post ids at once
            let likedSet = new Set();
            if (currentUser?._id && resultPosts.length > 0) {
                const likedPosts = await Post.find({ _id: { $in: resultPosts.map((p) => p._id) }, likes: currentUser._id }).select("_id").lean();
                likedSet = new Set(likedPosts.map((p) => p._id.toString()));
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

                const { likes, author: postAuthor, _score, _finalScore, finalScore, ...postData } = post;
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
                    // Expose score for debugging (non-prod only)
                    ...(process.env.NODE_ENV !== "production" && _score !== undefined ? { _score } : {}),
                };
            });

            let nextCursor = null;
            if (hasMore) {
                if (useAggregation) {
                    // Score-based cursor for global ranking
                    const last = resultPosts[resultPosts.length - 1];
                    const scoreForCursor = last._finalScore ?? last._score ?? 0;
                    nextCursor = encodeScoreCursor(scoreForCursor, last._id);
                } else {
                    nextCursor = Buffer.from(
                        resultPosts
                            .reduce(
                                (minId, post) =>
                                    post._id.toString() < minId.toString()
                                        ? post._id
                                        : minId,
                                resultPosts[0]._id,
                            )
                            .toString(),
                    ).toString("base64");
                }
            }

            if (process.env.NODE_ENV !== "production") {
                console.log("[cursor-feed]", {
                    mode,
                    feedType,
                    cursor,
                    resultCount: processedPosts.length,
                    hasMore,
                    nextCursor,
                    useAggregation,
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
                    "Cache-Control": verifiedOnly
                        ? "private, max-age=0, must-revalidate"
                        : "public, s-maxage=90, stale-while-revalidate=60",
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
