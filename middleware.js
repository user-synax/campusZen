import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = [
    "/feed",
    "/search",
    "/notifications",
    "/communities",
    "/settings",
    "/bookmarks",
    "/chats",
    "/connect",
];

// Edge-safe session check: presence AND validity (expiry, signature)
// This is the ONLY place that decides if a cookie counts as "logged in".
// Previous version checked only presence, so an expired/invalid JWT still
// redirected /login -> /feed while /api/users/me returned 401 -> stuck loop.
async function isValidSession(token) {
    if (!token) return false;
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    try {
        await jwtVerify(token, new TextEncoder().encode(secret), {
            algorithms: ["HS256"],
        });
        return true;
    } catch {
        return false;
    }
}

function clearSessionCookie(response) {
    response.cookies.set("campusx_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api/auth")) {
        const response = NextResponse.next();
        addSecurityHeaders(response);
        return response;
    }

    const rawToken = request.cookies.get("campusx_token")?.value || null;
    const hasValidSession = await isValidSession(rawToken);
    const hasCookie = !!rawToken;

    // Stale/invalid cookie present but token expired or forged:
    // proactively clear it so the user is not stuck in
    // "cookie exists -> /login redirects to /feed -> API 401" loop.
    // We add the clearing Set-Cookie to whichever redirect/response we send.

    if (hasValidSession && (pathname === "/login" || pathname === "/signup")) {
        const response = NextResponse.redirect(new URL("/feed", request.url));
        addSecurityHeaders(response);
        return response;
    }

    // Cookie present but invalid -> allow visiting /login /signup (clear it)
    // and force protected routes to /login (clear it)
    if (!hasValidSession && (pathname === "/login" || pathname === "/signup")) {
        if (hasCookie) {
            const response = NextResponse.next();
            clearSessionCookie(response);
            addSecurityHeaders(response);
            return response;
        }
        const response = NextResponse.next();
        addSecurityHeaders(response);
        return response;
    }

    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

    if (isProtectedRoute && !hasValidSession) {
        const loginUrl = new URL("/login", request.url);
        if (pathname !== "/feed") loginUrl.searchParams.set("redirect", pathname);
        // If session expired, hint the UI so it can show "session expired, please log in again"
        if (hasCookie) loginUrl.searchParams.set("reason", "expired");
        const response = NextResponse.redirect(loginUrl);
        if (hasCookie) clearSessionCookie(response);
        addSecurityHeaders(response);
        return response;
    }

    // Edge case: valid session was cleared due to expiry but user hits landing "/"
    // Let landing page's own server-side verifyToken handle the redirect; we just ensure
    // stale cookies don't linger on any other public route.
    if (hasCookie && !hasValidSession && pathname === "/") {
        const response = NextResponse.next();
        clearSessionCookie(response);
        addSecurityHeaders(response);
        return response;
    }

    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
}

function addSecurityHeaders(response) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response.headers.set("Origin-Agent-Cluster", "?1");
    response.headers.set("X-API-Version", "1");

    const csp =
        process.env.NODE_ENV === "production" ? getProductionCSP() : getDevelopmentCSP();
    response.headers.set("Content-Security-Policy", csp);
}

function connectSrc() {
    const base = [
        "'self'",
        "https://api.dicebear.com",
        "https://www.googleapis.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://*.uploadthing.com",
        "https://*.ingest.uploadthing.com",
        "https://cdn.jsdelivr.net",
        "https://cdn.tldraw.com",
        "https://*.tldraw.com",
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
        } catch {}
    }
    base.push("https://campuszen-chat.onrender.com", "wss://campuszen-chat.onrender.com");
    return base.join(" ");
}

function getDevelopmentCSP() {
    return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com http://localhost:* ws://localhost:*",
        "style-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com http://localhost:*",
        "img-src 'self' data: blob: https://*.giphy.com https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",
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
        "script-src 'self' 'unsafe-inline' https://www.youtube.com https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",
        "style-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdn.tldraw.com https://*.tldraw.com",
        "img-src 'self' data: blob: https://*.giphy.com https://utfs.io https://*.uploadthing.com https://*.ufs.sh https://api.dicebear.com https://*.tldraw.com https://*.cloud.appwrite.io",
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
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
