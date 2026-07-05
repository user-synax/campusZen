import { redditConfig } from "./config.js";

export async function fetchRedditPosts(subredditName) {
    try {
        // Use rss2json.com to convert Reddit RSS to JSON
        const rssUrl = encodeURIComponent(
            `https://www.reddit.com/r/${subredditName}/hot.rss?limit=25`,
        );
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

        const response = await fetch(apiUrl, {
            headers: {
                "User-Agent": redditConfig.userAgent,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch from RSS2JSON: ${response.statusText}`,
            );
        }

        const data = await response.json();

        if (!data.items) {
            return [];
        }

        return data.items.map((item, index) => {
            return {
                title: item.title,
                selftext: item.description || item.content || "",
                score: 50 + index * 10,
                author: item.author || "unknown",
                created_utc: new Date(item.pubDate).getTime() / 1000,
                permalink: item.link,
                over_18: false,
                removed_by_category: null,
                id: item.guid || `rss-${subredditName}-${index}`,
                images: [],
            };
        });
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

    // Also filter out job-related posts
    const jobKeywords = [
        "hiring",
        "job",
        "opening",
        "vacancy",
        "internship",
        "apply",
        "recruitment",
    ];

    const filtered = posts.filter((post) => {
        if (post.over_18) {
            filteredStats.over18++;
            return false;
        }
        if (post.removed_by_category) {
            filteredStats.removed++;
            return false;
        }
        if (
            post.selftext?.includes("[deleted]") ||
            post.title?.includes("[deleted]")
        ) {
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
        // Filter out job-related posts
        const lowerTitle = post.title.toLowerCase();
        const lowerSelftext = post.selftext.toLowerCase();
        const isJobPost = jobKeywords.some(
            (keyword) =>
                lowerTitle.includes(keyword) || lowerSelftext.includes(keyword),
        );
        if (isJobPost) {
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
        sourceUrl: post.permalink || "",
        subreddit: subreddit,
        sourceAuthor: post.author,
        sourceCreatedAt: new Date(post.created_utc * 1000),
        title: post.title,
        selftext: post.selftext || "",
        score: post.score,
        botType: botType,
        url: post.permalink,
        postHint: null,
        images: [],
    };
}
