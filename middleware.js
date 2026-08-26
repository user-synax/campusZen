import { NextResponse } from "next/server";
import { getMarkdownContent } from "@/lib/markdown-content";

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

export default function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api/auth")) {
        const response = NextResponse.next();
        addSecurityHeaders(response, false);
        return response;
    }

    // acceptmarkdown.com content negotiation: serve Markdown for public pages
    // when the client explicitly requests it. Browsers never send
    // Accept: text/markdown, so this only affects agents/crawlers.
    const isApiPath = pathname.startsWith("/api");
    const isMachineFile =
        pathname === "/openapi.json" || pathname === "/llms.txt";
    if (!isApiPath && !isMachineFile && acceptsMarkdown(request)) {
        const md = getMarkdownContent(pathname);
        const response = new NextResponse(md, {
            status: 200,
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": "public, max-age=3600",
            },
        });
        addSecurityHeaders(response, false);
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
        addSecurityHeaders(response);
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
        addSecurityHeaders(response);
        return response;
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);

    return response;
}

function addSecurityHeaders(response, includeCSP = true) {
    // Tell CDNs/proxies that responses vary by Accept (markdown negotiation)
    // and Accept-Encoding so they never serve a cached HTML variant to an
    // agent asking for markdown (or vice versa).
    response.headers.set("Vary", "Accept, Accept-Encoding");

    // Declare the API version on every response so agents can rely on a
    // stable, documented surface (see /openapi.json and /developers).
    response.headers.set("X-API-Version", "1");

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

        "connect-src 'self' https://api.anthropic.com https://api.dicebear.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com https://*.pusher.com wss://*.pusher.com blob: data: http://localhost:* ws://localhost:* https://*.cloud.appwrite.io https://*.livekit.cloud wss://*.livekit.cloud",

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

        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "style-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",

        "img-src 'self' data: blob: https://*.giphy.com https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",

        // media-src covers <video> avatar-frame overlays (WebM/MP4). GIFs are
        // <img> and are covered by img-src. Self-host via UploadThing/Appwrite
        // (whitelisted here) for consistency with the rest of the app.
        "media-src 'self' data: blob: https://*.cloud.appwrite.io https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://*.livekit.cloud wss://*.livekit.cloud",

        "connect-src 'self' https://api.anthropic.com https://api.dicebear.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com https://*.pusher.com wss://*.pusher.com blob: data: https://*.cloud.appwrite.io https://*.livekit.cloud wss://*.livekit.cloud",

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
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

function acceptsMarkdown(request) {
    const accept = request.headers.get("accept") || "";
    return /text\/markdown/i.test(accept);
}
