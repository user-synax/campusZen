import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { refreshUserProStatus } from "@/lib/subscription";
import { sanitizeString } from "@/utils/validators";
import { extractHashtags } from "@/utils/hashtags";
import { indexHashtags } from "@/lib/hashtag-utils";
import { awardXP } from "@/lib/gamification";
import { awardVP } from "@/lib/coins";
import { deleteCachePattern } from "@/lib/cache";
import { applyRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import Community from "@/models/Community";

export async function POST(request) {
    try {
        // Rate limit post creation - 10 posts per hour per IP
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "post_create",
            10,
            60 * 60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        // Check Pro status for restricted features
        const isPro = await refreshUserProStatus(currentUser._id);

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const {
            content,
            community,
            poll,
            linkPreview,
            images,
            isMarkdown,
            contentBlocks,
            tags,
        } = body;

        await connectDB();
        // Auto-create community agar exist nahi karti
        if (community && community.trim()) {
            const slug = community.trim().toLowerCase().replace(/\s+/g, "-");
            const existing = await Community.findOne({ slug });
            if (!existing) {
                await Community.create({
                    name: community.trim(),
                    slug,
                    createdBy: currentUser._id,
                    members: [currentUser._id],
                    postCount: 1,
                });
            } else {
                // Member add karo aur post count badao
                await Community.findOneAndUpdate(
                    { slug },
                    {
                        $addToSet: { members: currentUser._id },
                        $inc: { postCount: 1 },
                    },
                );
            }
        }

        const sanitizedContent = sanitizeText(content);
        const hashtags = extractHashtags(sanitizedContent);

        // Poll validation
        let pollData = null;
        if (poll && Array.isArray(poll) && poll.length > 0) {
            const trimmedOptions = poll
                .map((opt) =>
                    typeof opt === "string" ? sanitizeText(opt) : "",
                )
                .filter((opt) => opt.length > 0);

            const uniqueOptions = [...new Set(trimmedOptions)];

            pollData = {
                options: uniqueOptions.map((text) => ({ text, votes: [] })),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                active: true,
            };
        }

        // Validate tags
        let validTags = [];
        if (tags && Array.isArray(tags)) {
            validTags = tags
                .map((tag) => sanitizeText(tag))
                .filter((tag) => tag.length > 0)
                .slice(0, 5); // Max 5 tags
        }

        const postData = {
            content: sanitizedContent,
            community: sanitizeText(community) || "",
            poll: pollData,
            hashtags,
            tags: validTags,
            images: Array.isArray(images) ? images : [],
            linkPreview: linkPreview?.url ? { url: linkPreview.url } : null,
            isMarkdown: isMarkdown === true,
            contentBlocks: Array.isArray(contentBlocks) ? contentBlocks : [],
            author: currentUser._id,
        };

        const post = await Post.create(postData);

        await post.populate("author", "name username avatar college");

        // Invalidate community-related caches
        deleteCachePattern("communities_");

        // Index hashtags in background
        indexHashtags(hashtags).catch((err) =>
            console.error("Background hashtag indexing error:", err),
        );

        // Award XP for posting
        const xpResult = await awardXP(currentUser._id, "post");

        // Award VP for posting (background, idempotent)
        awardVP(currentUser._id, "post", post._id).catch((err) =>
            console.error("VP award error:", err),
        );

        return NextResponse.json(
            {
                ...post.toObject(),
                xpAwarded: xpResult.xpAwarded,
                newXP: xpResult.newXP,
                newLevel: xpResult.newLevel,
                leveledUp: xpResult.leveledUp,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Post creation error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
