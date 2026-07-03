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

                // Add small delay between subreddit requests
                await delay(1000);
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
