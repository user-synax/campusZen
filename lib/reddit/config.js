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
    maxPostAgeHours: 24,
    userAgent:
        "CampusZen/1.0 (by /u/YourRedditUsername; https://campuszen.app)",
};
