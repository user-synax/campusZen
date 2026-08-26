import { NextResponse } from "next/server";

export const dynamic = "force-static";

const PUBLIC_ENDPOINTS = [
    {
        method: "GET",
        path: "/api/communities",
        description: "List communities or fetch one by name (public).",
    },
    {
        method: "GET",
        path: "/api/public/stats",
        description: "Platform user/post/resource counts (public).",
    },
    {
        method: "GET",
        path: "/api/health",
        description: "Liveness probe (public).",
    },
    {
        method: "GET",
        path: "/api/leaderboard",
        description: "Top contributors by reputation (public).",
    },
    {
        method: "GET",
        path: "/api/events",
        description: "Upcoming campus events (public).",
    },
    {
        method: "POST",
        path: "/api/auth/login",
        description: "Authenticate and obtain a session cookie.",
    },
    {
        method: "POST",
        path: "/api/auth/signup",
        description: "Register a new account.",
    },
    {
        method: "POST",
        path: "/api/auth/send-otp",
        description: "Send a one-time password for verification.",
    },
    {
        method: "POST",
        path: "/api/auth/verify-otp",
        description: "Verify a one-time password.",
    },
    {
        method: "GET",
        path: "/api/posts/cursor-feed",
        description: "Cursor-paginated feed (authenticated).",
    },
    {
        method: "POST",
        path: "/api/posts/create",
        description: "Create a post (authenticated).",
    },
    {
        method: "GET",
        path: "/api/users/me",
        description: "Current authenticated user (authenticated).",
    },
];

export function GET() {
    return NextResponse.json(
        {
            name: "CampusZen API",
            version: "1.0.0",
            openapi: "https://campuszen.tech/openapi.json",
            developerPortal: "https://campuszen.tech/developers",
            llmsTxt: "https://campuszen.tech/llms.txt",
            publicEndpoints: PUBLIC_ENDPOINTS,
        },
        {
            status: 200,
            headers: { "Cache-Control": "public, max-age=3600" },
        },
    );
}
