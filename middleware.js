import { NextResponse } from "next/server";

const protectedRoutes = [
    "/feed",
    "/search",
    "/leaderboard",
    "/notifications",
    "/communities",
    "/resources",
    "/settings",
    "/community",
    "/bookmarks",
    "/wallet",
    "/shop",
    "/chats",
    "/events",
    "/billing",
    "/clips",
];

export default function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api/auth")) {
        const response = NextResponse.next();
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
        "camera=(), microphone=(), geolocation=()",
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

        "img-src 'self' data: blob: https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",

        "media-src 'self' data: blob: https://*.cloud.appwrite.io",

        "connect-src 'self' https://api.anthropic.com https://api.dicebear.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com https://*.pusher.com wss://*.pusher.com blob: data: http://localhost:* ws://localhost:* https://*.cloud.appwrite.io",

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

        "img-src 'self' data: blob: https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",

        "media-src 'self' data: blob: https://*.cloud.appwrite.io",

        "connect-src 'self' https://api.anthropic.com https://api.dicebear.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://*.uploadthing.com https://*.ingest.uploadthing.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com https://*.pusher.com wss://*.pusher.com blob: data: https://*.cloud.appwrite.io",

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
