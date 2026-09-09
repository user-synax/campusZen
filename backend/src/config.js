import "dotenv/config";

const config = {
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    port: parseInt(process.env.PORT || "4000", 10),
    clientOrigin: process.env.CLIENT_ORIGIN || "https://campuszen.tech",
    devOrigin: process.env.DEV_ORIGIN || "http://localhost:3000",
    backendUrl: process.env.CHAT_BACKEND_URL || "http://localhost:4000",
    notifySecret: process.env.CHAT_BACKEND_SECRET || "",
    // Internal secret guarding POST /api/emit.
    // MUST match CHAT_BACKEND_SECRET on the Next.js side.
    internalSecret: process.env.CHAT_BACKEND_SECRET || "",
    nextAppUrl: process.env.NEXT_APP_URL || "https://campuszen.tech",
    // Extra allowed browser origins (comma-separated), e.g. Vercel preview
    // domains: https://campuszen-git-main.vercel.app,https://campuszen-xyz.vercel.app
    extraOrigins: (process.env.EXTRA_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
};

if (!config.mongoUri) {
    throw new Error("MONGODB_URI is required");
}
if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is required (must match the Next.js app)");
}

export default config;
