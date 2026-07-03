import { redditConfig } from "./config.js";

export async function fetchRedditPosts(subredditName) {
    try {
        const url = `https://www.reddit.com/r/${subredditName}/hot.json?limit=${redditConfig.maxPostsPerSubreddit}`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": redditConfig.userAgent,
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch from Reddit: ${response.statusText}`,
            );
        }

        const data = await response.json();
        return data.data.children.map((child) => child.data);
    } catch (error) {
        console.error(`Error fetching from r/${subredditName}:`, error);
        return [];
    }
}

export function filterRedditPosts(posts) {
    const now = Date.now() / 1000;
    const maxAge = redditConfig.maxPostAgeHours * 60 * 60;
    const filteredStats = {
        total: posts.length,
        over18: 0,
        removed: 0,
        deleted: 0,
        lowScore: 0,
        tooOld: 0,
        passed: 0,
    };

    const filtered = posts.filter((post) => {
        if (post.over_18) {
            filteredStats.over18++;
            return false;
        }
        if (post.removed_by_category) {
            filteredStats.removed++;
            return false;
        }
        if (post.selftext === "[deleted]" || post.title === "[deleted]") {
            filteredStats.deleted++;
            return false;
        }
        if (post.score < redditConfig.minScore) {
            filteredStats.lowScore++;
            return false;
        }
        if (now - post.created_utc > maxAge) {
            filteredStats.tooOld++;
            return false;
        }
        filteredStats.passed++;
        return true;
    });

    console.log("Filtering stats:", filteredStats);
    return filtered;
}

export function sanitizeRedditPost(post, subreddit, botType) {
    return {
        source: "reddit",
        sourceId: post.id,
        sourceUrl: `https://reddit.com${post.permalink}`,
        subreddit: subreddit,
        sourceAuthor: post.author,
        sourceCreatedAt: new Date(post.created_utc * 1000),
        title: post.title,
        selftext: post.selftext || "",
        score: post.score,
        botType: botType,
        url: post.url,
        postHint: post.post_hint,
    };
}
