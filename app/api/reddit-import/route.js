import connectDB from "../../../lib/db.js";
import { redditConfig } from "../../../lib/reddit/config.js";
import {
    fetchRedditPosts,
    filterRedditPosts,
    sanitizeRedditPost,
} from "../../../lib/reddit/fetch.js";
import { findDuplicatePosts } from "../../../lib/reddit/duplicates.js";
import {
    rewritePostContent,
    generateHashtags,
} from "../../../lib/reddit/ai.js";
import { getBotUser } from "../../../lib/reddit/bots.js";
import Post from "../../../models/Post.js";

// Helper function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sample fallback posts if Reddit is blocked
function getSamplePosts() {
    return [
        {
            title: "Welcome to CampusZen!",
            selftext:
                "This is a sample post to keep the feed active while we work on fixing the Reddit import. Stay tuned for more content!",
            score: 100,
            botType: "Dev Daily",
            subreddit: "programming",
            sourceId: "sample-post-1",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000,
            images: [],
        },
        {
            title: "Top 10 Programming Tips for Students",
            selftext:
                "Check out these essential programming tips every student should know to excel in their coding journey!",
            score: 85,
            botType: "Dev Daily",
            subreddit: "developersIndia",
            sourceId: "sample-post-2",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 3600,
            images: [],
        },
        {
            title: "Study Hacks for Engineering Students",
            selftext:
                "Discover effective study techniques to help you ace your engineering exams and projects!",
            score: 90,
            botType: "Study Hub",
            subreddit: "Btechtards",
            sourceId: "sample-post-3",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 7200,
            images: [],
        },
        {
            title: "Latest Tech News: AI Breakthrough",
            selftext:
                "Exciting new developments in AI that are changing the way we interact with technology!",
            score: 95,
            botType: "AI News",
            subreddit: "technology",
            sourceId: "sample-post-4",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 10800,
            images: [],
        },
        {
            title: "5 Web Dev Projects to Add to Your Portfolio",
            selftext:
                "Build these projects to impress recruiters and showcase your skills!",
            score: 88,
            botType: "Dev Daily",
            subreddit: "webdev",
            sourceId: "sample-post-5",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 14400,
            images: [],
        },
        {
            title: "Funny Meme to Brighten Your Day 😂",
            selftext:
                "We all need a good laugh during exam season! Here's a funny meme to lighten the mood.",
            score: 98,
            botType: "Meme Bot",
            subreddit: "memes",
            sourceId: "sample-post-7",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 21600,
            images: [],
        },
        {
            title: "Desi Memes That Hit Too Hard 🇮🇳",
            selftext:
                "Relatable desi memes that every Indian student will understand!",
            score: 96,
            botType: "Meme Bot",
            subreddit: "IndianDankMemes",
            sourceId: "sample-post-8",
            sourceUrl: "https://campuszen.app",
            author: "campuszen",
            created_utc: Date.now() / 1000 - 25200,
            images: [],
        },
    ];
}

export async function GET(request) {
    console.log("=== Reddit Import Started ===");
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });
    }

    await connectDB();

    const results = {
        success: true,
        imported: 0,
        errors: [],
    };

    try {
        let allPosts = [];

        for (const subreddit of redditConfig.subreddits) {
            try {
                console.log(`\nFetching from r/${subreddit.name}...`);
                const posts = await fetchRedditPosts(subreddit.name);
                console.log(
                    `Fetched ${posts.length} posts from r/${subreddit.name}`,
                );

                const filtered = filterRedditPosts(posts);
                console.log(
                    `Filtered to ${filtered.length} posts from r/${subreddit.name}`,
                );

                const sanitized = filtered.map((post) =>
                    sanitizeRedditPost(post, subreddit.name, subreddit.botType),
                );
                allPosts = allPosts.concat(sanitized);

                // Add longer delay between subreddit requests to avoid rate limits
                await delay(5000);
            } catch (error) {
                console.error(
                    `Error fetching from r/${subreddit.name}:`,
                    error,
                );
                results.errors.push(
                    `Error fetching from r/${subreddit.name}: ${error.message}`,
                );
            }
        }

        // If no posts fetched from Reddit, use sample fallback posts
        if (allPosts.length === 0) {
            console.log("Using sample fallback posts");
            allPosts = getSamplePosts().map((post) => ({
                source: "sample",
                sourceId: post.sourceId,
                sourceUrl: post.sourceUrl,
                subreddit: post.subreddit,
                sourceAuthor: post.author,
                sourceCreatedAt: new Date(post.created_utc * 1000),
                title: post.title,
                selftext: post.selftext,
                score: post.score,
                botType: post.botType,
                url: post.sourceUrl,
                postHint: null,
                images: post.images,
            }));
        }

        console.log(`\nTotal posts before deduplication: ${allPosts.length}`);
        allPosts.sort((a, b) => b.score - a.score);

        const sourceIds = allPosts.map((p) => p.sourceId);
        const duplicateSet = await findDuplicatePosts(sourceIds);
        console.log(`Found ${duplicateSet.size} duplicate posts`);

        const uniquePosts = allPosts.filter(
            (p) => !duplicateSet.has(p.sourceId),
        );
        const postsToProcess = uniquePosts.slice(
            0,
            redditConfig.maxPostsToProcess,
        );
        console.log(`Posts to process: ${postsToProcess.length}`);

        const postsToInsert = [];

        for (const post of postsToProcess) {
            try {
                const botUser = await getBotUser(post.botType);
                const content = await rewritePostContent(
                    post.title,
                    post.selftext,
                    post.botType,
                );
                const hashtags = await generateHashtags(
                    post.title,
                    post.selftext,
                    post.botType,
                );

                postsToInsert.push({
                    author: botUser._id,
                    content: content,
                    hashtags: hashtags,
                    images: post.images || [],
                    source: post.source,
                    sourceId: post.sourceId,
                    sourceUrl: post.sourceUrl,
                    subreddit: post.subreddit,
                    sourceAuthor: post.sourceAuthor,
                    sourceCreatedAt: post.sourceCreatedAt,
                });
            } catch (error) {
                results.errors.push(
                    `Error processing post ${post.sourceId}: ${error.message}`,
                );
            }
        }

        if (postsToInsert.length > 0) {
            await Post.insertMany(postsToInsert);
            results.imported = postsToInsert.length;
        }
    } catch (error) {
        results.success = false;
        results.errors.push(`Fatal error: ${error.message}`);
    }

    return new Response(JSON.stringify(results), { status: 200 });
}
