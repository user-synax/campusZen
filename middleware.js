import { NextResponse } from "next/server";
import { getMarkdownContent, getMdTwinContent } from "@/lib/markdown-content";

const protectedRoutes = [
    "/feed",
    "/search",
    "/leaderboard",
    "/notifications",
    "/communities",
    "/resources",
    "/settings",
    "/bookmarks",
    "/wallet",
    "/shop",
    "/chats",
    "/events",
    "/billing",
    "/clips",
    "/connect",
];

const BOT_UAS = [
    "gptbot",
    "chatgpt-user",
    "claudebot",
    "perplexitybot",
    "google-extended",
    "applebot-extended",
    "ora-agent",
    "deepseekbot",
    "ai2bot",
    "cohere",
    "meta-externalagent",
];

const PUBLIC_MARKDOWN_PATHS = new Set([
    "/",
    "/markdown",
    "/developers",
    "/terms",
    "/privacy",
    "/login",
    "/signup",
]);

function isAgentBot(request) {
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    return BOT_UAS.some((b) => ua.includes(b));
}

function isPublicMarkdownPath(pathname) {
    if (PUBLIC_MARKDOWN_PATHS.has(pathname)) return true;
    if (pathname.startsWith("/community/")) return true;
    return false;
}

function acceptsMarkdown(request) {
    const accept = request.headers.get("accept") || "";
    return /text\/markdown/i.test(accept);
}

function agentView() {
    return {
        name: "CampusZen",
        tagline: "The social network for Indian college students.",
        version: "1.0.0",
        capabilities: [
            "communities",
            "posts",
            "events",
            "leaderboard",
            "resources",
            "mcp",
        ],
        authentication: {
            type: "session-cookie or oauth2-bearer",
            login: "POST /api/auth/login",
            guide: "https://campuszen.tech/auth.md",
            wwwAuthenticate:
                'Bearer resource_metadata="https://campuszen.tech/.well-known/oauth-protected-resource"',
        },
        endpoints: {
            communities: "GET /api/communities",
            stats: "GET /api/public/stats",
            events: "GET /api/events",
            leaderboard: "GET /api/leaderboard",
            health: "GET /api/health",
            createPost: "POST /api/posts/create",
            openapi: "https://campuszen.tech/openapi.json",
        },
        machineResources: {
            llmsTxt: "https://campuszen.tech/llms.txt",
            mcp: "https://campuszen.tech/.well-known/mcp",
            mcpDocs: "https://campuszen.tech/.well-known/mcp-docs",
            agentCard: "https://campuszen.tech/.well-known/agent-card.json",
            agentSkills: "https://campuszen.tech/.well-known/agent-skills/index.json",
            apiCatalog: "https://campuszen.tech/.well-known/api-catalog",
        },
        openSource: {
            repository: "https://github.com/user-synax/campusX",
            agentsGuide: "https://github.com/user-synax/campusX/blob/main/AGENTS.md",
        },
    };
}

export default function middleware(request) {
    const { pathname } = request.nextUrl;

    // Markdown twins: an agent may append `.md` to fetch a markdown version of
    // a content or API page (e.g. /api/communities.md, /.well-known/api-catalog.md).
    if (pathname.endsWith(".md")) {
        const base = pathname.slice(0, -3);
        const md = getMdTwinContent(base);
        if (md) {
            const response = new NextResponse(md, {
                status: 200,
                headers: {
                    "Content-Type": "text/markdown; charset=utf-8",
                    "Cache-Control": "public, max-age=3600",
                },
            });
            addSecurityHeaders(response, request, false);
            return response;
        }
    }

    // Let the /.well-known/* rewrites resolve to the API handler untouched.
    if (pathname.startsWith("/.well-known")) {
        const response = NextResponse.next();
        addSecurityHeaders(response, request, false);
        return response;
    }

    if (pathname.startsWith("/api/auth")) {
        const response = NextResponse.next();
        addSecurityHeaders(response, request, false);
        return response;
    }

    // ?mode=agent → structured, machine-readable view instead of marketing HTML.
    if (pathname === "/" && request.nextUrl.searchParams.get("mode") === "agent") {
        const response = NextResponse.json(agentView(), {
            status: 200,
            headers: { "Cache-Control": "public, max-age=3600" },
        });
        addSecurityHeaders(response, request, false);
        return response;
    }

    const isApiPath = pathname.startsWith("/api");
    const isMachineFile =
        pathname === "/openapi.json" || pathname === "/llms.txt";

    // Serve Markdown to agents that explicitly request it, or to known AI bots
    // that fetch HTML but benefit from a markdown representation.
    const wantsMarkdown = acceptsMarkdown(request) || isAgentBot(request);
    if (
        !isApiPath &&
        !isMachineFile &&
        wantsMarkdown &&
        isPublicMarkdownPath(pathname)
    ) {
        const md = getMarkdownContent(pathname);
        const response = new NextResponse(md, {
            status: 200,
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": "public, max-age=3600",
            },
        });
        addSecurityHeaders(response, request, false);
        return response;
    }

    const legacySession = request.cookies.get("campusx_token")?.value;
    const appwriteSessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
    const appwriteSession = request.cookies.get(
        appwriteSessionCookieName,
    )?.value;
    const hasSession = !!legacySession || !!appwriteSession;

    // Redirect logged-in users away from auth pages
    if (hasSession && (pathname === "/login" || pathname === "/signup")) {
        const response = NextResponse.redirect(new URL("/feed", request.url));
        addSecurityHeaders(response, request);
        return response;
    }

    // Protect private routes
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route),
    );

    if (isProtectedRoute && !hasSession) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);

        const response = NextResponse.redirect(loginUrl);
        addSecurityHeaders(response, request);
        return response;
    }

    const response = NextResponse.next();
    addSecurityHeaders(response, request);

    return response;
}

function addSecurityHeaders(response, request, includeCSP = true) {
    // Tell CDNs/proxies that responses vary by Accept (markdown negotiation)
    // and Accept-Encoding so they never serve a cached HTML variant to an
    // agent asking for markdown (or vice versa).
    response.headers.set("Vary", "Accept, Accept-Encoding");

    // Declare the API version on every response so agents can rely on a
    // stable, documented surface (see /openapi.json and /developers).
    response.headers.set("X-API-Version", "1");

    // RFC 8288 Link headers advertise key machine-readable resources.
    const links = [
        "</sitemap.xml>; rel=\"sitemap\"",
        "</openapi.json>; rel=\"service-desc\"; type=\"application/json\"",
        "</.well-known/api-catalog>; rel=\"service-desc\"; type=\"application/linkset+json\"",
        "</.well-known/agent-card.json>; rel=\"service-desc\"; type=\"application/json\"",
    ];
    const pathname = request?.nextUrl?.pathname || "";
    if (pathname === "/") {
        links.push("</index.md>; rel=\"alternate\"; type=\"text/markdown\"");
    }
    response.headers.set("Link", links.join(", "));

    // Informational rate-limit policy (agents self-throttle against 429 +
    // Retry-After at runtime).
    response.headers.set(
        "RateLimit-Policy",
        "limit=1000, window=3600; comment=\"per IP/account; see 429 Retry-After\"",
    );

    if (includeCSP) {
        const csp =
            process.env.NODE_ENV === "production"
                ? getProductionCSP()
                : getDevelopmentCSP();

        response.headers.set("Content-Security-Policy", csp);
    }

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(self), geolocation=()",
    );
    response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
    );
    response.headers.set("Origin-Agent-Cluster", "?1");
}

// Build the connect-src allowlist, dynamically including whatever host the chat
// backend (Socket.IO) is deployed on, so the socket connection is never blocked
// by CSP. Falls back to a hardcoded Render URL for backward compatibility.
function connectSrc() {
    const base = [
        "'self'",
        "https://api.anthropic.com",
        "https://api.dicebear.com",
        "https://www.googleapis.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://*.uploadthing.com",
        "https://*.ingest.uploadthing.com",
        "https://cdn.jsdelivr.net",
        "https://cdn.tldraw.com",
        "https://*.tldraw.com",
        "https://*.pusher.com",
        "wss://*.pusher.com",
        "blob:",
        "data:",
        "https://*.cloud.appwrite.io",
        "https://*.livekit.cloud",
        "wss://*.livekit.cloud",
    ];
    if (process.env.NODE_ENV !== "production") {
        base.push("http://localhost:*", "ws://localhost:*");
    }
    const chat = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL;
    if (chat) {
        try {
            const u = new URL(chat);
            const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
            base.push(`${u.protocol}//${u.host}`, `${wsProto}//${u.host}`);
        } catch {
            // ignore malformed URL
        }
    }
    base.push(
        "https://campuszen-chat.onrender.com",
        "wss://campuszen-chat.onrender.com",
    );
    return base.join(" ");
}

function getDevelopmentCSP() {
    return [
        "default-src 'self'",

        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com http://localhost:* ws://localhost:*",

        "style-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com http://localhost:*",

        "img-src 'self' data: blob: https://*.giphy.com https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",

        // media-src covers <video> avatar-frame overlays (WebM/MP4). GIFs are
        // <img> and are covered by img-src. Self-host via UploadThing/Appwrite
        // (whitelisted here) for consistency with the rest of the app.
        "media-src 'self' data: blob: https://*.cloud.appwrite.io https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://*.livekit.cloud wss://*.livekit.cloud",

        "connect-src " + connectSrc(),

        "font-src 'self' data: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "frame-src 'self' https://www.youtube.com https://*.tldraw.com",

        "worker-src 'self' blob: https://*.tldraw.com",

        "child-src 'self' blob:",

        "object-src 'none'",

        "base-uri 'self'",

        "form-action 'self'",
    ].join("; ");
}

function getProductionCSP() {
    return [
        "default-src 'self'",

        // Production builds do not require eval; drop 'unsafe-eval' (it is kept
        // only in the dev CSP below, where Next's HMR relies on it). 'unsafe-inline'
        // remains because App Router injects inline scripts; removing it safely
        // requires a nonce/HASH-based CSP refactor.
        "script-src 'self' 'unsafe-inline' https://www.youtube.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "style-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "img-src 'self' data: blob: https://*.giphy.com https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",

        // media-src covers <video> avatar-frame overlays (WebM/MP4). GIFs are
        // <img> and are covered by img-src. Self-host via UploadThing/Appwrite
        // (whitelisted here) for consistency with the rest of the app.
        "media-src 'self' data: blob: https://*.cloud.appwrite.io https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://*.livekit.cloud wss://*.livekit.cloud",

        "connect-src " + connectSrc(),

        "font-src 'self' data: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "frame-src 'self' https://www.youtube.com https://*.tldraw.com",

        "worker-src 'self' blob: https://*.tldraw.com",

        "child-src 'self' blob:",

        "object-src 'none'",

        "base-uri 'self'",

        "form-action 'self'",

        "report-uri /api/csp-violation-report",
    ].join("; ");
}

export const config = {
    // NOTE: "/api/auth" is intentionally NOT excluded here so the dedicated
    // branch below still runs and applies security headers to auth endpoints.
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
