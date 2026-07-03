import config from "../config.js";

async function callOpenRouter(messages) {
    if (!config.ai.openrouter.apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }

    const response = await fetch(
        `${config.ai.openrouter.baseUrl}/chat/completions`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.ai.openrouter.apiKey}`,
                "HTTP-Referer": "https://campuszen.app",
                "X-Title": "CampusZen",
            },
            body: JSON.stringify({
                model: config.ai.openrouter.model,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export async function rewritePostContent(title, selftext, botType) {
    const prompt = `
You are a social media content writer for a college campus app called CampusZen.
Rewrite the following Reddit post content to make it native to CampusZen.
Do NOT include any references to Reddit, subreddits, or usernames.
Keep it concise, engaging, and appropriate for college students.
Return ONLY the rewritten caption (max 500 characters).

Bot Type: ${botType}
Original Title: ${title}
Original Content: ${selftext || ""}
`;

    try {
        const messages = [
            {
                role: "system",
                content:
                    "You are a helpful content creator for CampusZen, a college campus app.",
            },
            { role: "user", content: prompt },
        ];
        const result = await callOpenRouter(messages);
        return result.trim();
    } catch (error) {
        console.error("Error rewriting post content:", error);
        const fallback = selftext ? `${title}\n\n${selftext}` : title;
        return fallback.slice(0, 500);
    }
}

export async function generateHashtags(title, selftext, botType) {
    const prompt = `
Generate 3-5 relevant hashtags for a CampusZen post based on the following content.
Return ONLY the hashtags separated by commas, no other text.

Bot Type: ${botType}
Title: ${title}
Content: ${selftext || ""}
`;

    try {
        const messages = [
            {
                role: "system",
                content:
                    "You generate relevant hashtags for social media posts.",
            },
            { role: "user", content: prompt },
        ];
        const result = await callOpenRouter(messages);
        return result
            .split(",")
            .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
            .filter(Boolean);
    } catch (error) {
        console.error("Error generating hashtags:", error);
        return [];
    }
}
