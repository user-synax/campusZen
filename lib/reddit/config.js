export const redditConfig = {
    subreddits: [
        { name: "programming", botType: "Dev Daily" },
        { name: "developersIndia", botType: "Dev Daily" },
        { name: "Btechtards", botType: "Study Hub" },
        { name: "technology", botType: "AI News" },
        { name: "webdev", botType: "Dev Daily" },
        { name: "JobMarketIndia", botType: "Placement Alerts" },
        { name: "memes", botType: "Meme Bot" },
        { name: "IndianDankMemes", botType: "Meme Bot" },
    ],
    minScore: 10,
    maxPostsPerSubreddit: 50,
    maxPostsToProcess: 15,
    maxPostAgeHours: 72, // Increased to 3 days to get more posts
    userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};
