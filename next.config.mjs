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
