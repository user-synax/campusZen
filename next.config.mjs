import withBundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    reactCompiler: true,
    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: "attachment",
        contentSecurityPolicy:
            "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.giphy.com",
            },
            { protocol: "https", hostname: "**.appwrite.io" },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "api.dicebear.com",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "picsum.photos",
            },
            {
                protocol: "https",
                hostname: "campuszen.tech",
            },
            {
                protocol: "https",
                hostname: "media*.giphy.com",
            },
            {
                protocol: "https",
                hostname: "utfs.io",
            },
        ],
    },
    async headers() {
        return [
            // Images — cache for 1 day
            {
                source: "/images/(.*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, stale-while-revalidate=3600",
                    },
                ],
            },
            // API routes — no cache by default (important for gamification data accuracy)
            {
                source: "/api/(.*)",
                headers: [{ key: "Cache-Control", value: "no-store" }],
            },
            // ━━━ Additive edge-cache overrides ━━━
            // These target specific public/shared GET routes to cut Vercel Fast
            // Origin Transfer. Each is MORE SPECIFIC than the /api/(.*) blanket
            // rule above, so it wins only for that exact path and leaves every
            // other route on no-store. Non-GET methods at these paths are not
            // cached by the CDN regardless of this header. (Per-route edits for
            // users/[username], groups/[groupId], events/[eventId] live in their
            // route handlers to avoid colliding with static sibling routes.)
            {
                source: "/api/communities",
                headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=30" }],
            },
            {
                source: "/api/groups/discover",
                headers: [{ key: "Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=60" }],
            },
            {
                source: "/api/giphy/search",
                headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" }],
            },
            {
                source: "/api/giphy/trending",
                headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" }],
            },
            {
                source: "/api/founder/roadmap",
                headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" }],
            },
            {
                source: "/api/notifications/vapid-key",
                headers: [{ key: "Cache-Control", value: "public, max-age=86400, immutable" }],
            },
            {
                source: "/api/posts/trending",
                headers: [{ key: "Cache-Control", value: "public, s-maxage=600, stale-while-revalidate=120" }],
            },
            {
                source: "/api/shop",
                headers: [
                    { key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=300" },
                    { key: "Vary", value: "Cookie" },
                ],
            },
            {
                source: "/api/users/:username/followers",
                headers: [{ key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=300" }],
            },
            {
                source: "/api/users/:username/following",
                headers: [{ key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=300" }],
            },
            {
                source: "/api/users/:username/connections",
                headers: [{ key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=300" }],
            },
            {
                source: "/api/users/:username/follow-counts",
                headers: [{ key: "Cache-Control", value: "public, max-age=30, stale-while-revalidate=120" }],
            },
            {
                source: "/api/clips/:clipId/comments",
                headers: [{ key: "Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=60" }],
            },
        ];
    },
    async rewrites() {
        return [
            // Agentic Resource Discovery + well-known agent surfaces are served
            // by a single catch-all handler under /api/.well-known/*.
            {
                source: "/.well-known/:path*",
                destination: "/api/.well-known/:path*",
            },
            // NLWeb /ask surface reachable both at /api/ask and the bare /ask.
            { source: "/ask", destination: "/api/ask" },
            // Agent auth challenge endpoint reachable at the bare /agent/auth.
            { source: "/agent/auth", destination: "/api/agent/auth" },
        ];
    },
};

export default withBundleAnalyzer({
    enabled:
        process.env.ANALYZE === "true" && process.env.NODE_ENV !== "production",
})(nextConfig);
