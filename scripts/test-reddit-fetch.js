import { redditConfig } from "../lib/reddit/config.js";
import { fetchRedditPosts, filterRedditPosts } from "../lib/reddit/fetch.js";

console.log("Testing Reddit fetch...");
console.log("User-Agent:", redditConfig.userAgent);

async function test() {
    try {
        const posts = await fetchRedditPosts("programming");
        console.log(`Fetched ${posts.length} posts`);

        if (posts.length > 0) {
            console.log("First post:", {
                id: posts[0].id,
                title: posts[0].title,
                score: posts[0].score,
                created_utc: posts[0].created_utc,
            });

            const filtered = filterRedditPosts(posts);
            console.log(`Filtered to ${filtered.length} posts`);
        }
    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
