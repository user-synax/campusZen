import { redditConfig } from "./config.js";

export async function fetchRedditPosts(subredditName) {
    try {
        // Use Reddit's RSS feed instead of JSON API to avoid blocking
        const url = `https://www.reddit.com/r/${subredditName}/hot.rss`;
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

        const text = await response.text();
        return parseRSS(text);
    } catch (error) {
        console.error(`Error fetching from r/${subredditName}:`, error);
        return [];
    }
}

// Simple RSS parser
function parseRSS(xml) {
    const posts = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1];
        const title = extractTag(item, "title");
        const link = extractTag(item, "link");
        const description = extractTag(item, "description");
        const pubDate = extractTag(item, "pubDate");
        const creator = extractTag(item, "dc:creator");
        const scoreMatch = item.match(
            /<media:rating scheme="urn:reddit:score">(\d+)<\/media:rating>/,
        );
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 10;

        const idMatch = link.match(/\/comments\/([a-z0-9]+)\//);
        const id = idMatch ? idMatch[1] : Date.now().toString();

        posts.push({
            title: title,
            selftext: description,
            score: score,
            author: creator || "unknown",
            created_utc: new Date(pubDate).getTime() / 1000,
            permalink: link,
            over_18: false,
            removed_by_category: null,
        });
    }

    return posts;
}

function extractTag(str, tag) {
    const regex = new RegExp(`<${tag}>([^<]*)<\/${tag}>`);
    const match = str.match(regex);
    return match ? match[1].trim() : "";
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
        sourceId: post.id || post.created_utc.toString(),
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
    };
}
