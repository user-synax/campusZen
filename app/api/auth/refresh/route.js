import { NextResponse } from "next/server";
import { getCurrentUser, verifyToken, getTokenFromRequest, shouldRefreshToken, signToken, setAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/refresh — explicit sliding refresh
// Also supports GET for simple client pings (e.g. visibilitychange)
// Returns 200 with { refreshed: boolean } and sets Set-Cookie when refreshed.
// Always returns 401 if no valid session.
export async function POST(request) {
    try {
        const token = getTokenFromRequest(request);
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const decoded = await verifyToken(token);
        if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Use getCurrentUser to validate blacklist/version/ban and trigger rolling logic
        const probeRes = NextResponse.next();
        const user = await getCurrentUser(request, probeRes);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // If getCurrentUser already refreshed (remaining <50%), forward its cookie
        const refreshedCookie = probeRes.cookies.get("campusx_token");
        if (refreshedCookie?.value) {
            const res = NextResponse.json({ success: true, refreshed: true });
            await setAuthCookie(res, refreshedCookie.value);
            res.headers.set("Cache-Control", "no-store");
            return res;
        }

        // Otherwise, check if we should force-refresh even if not yet at 50% threshold
        // Client can call this proactively; we refresh unconditionally if valid
        // but respect absolute cap via shouldRefreshToken fallback: if token is very old
        // but not yet expiring, don't force extend.
        // For explicit POST, we allow refresh if remaining < 90% TTL to avoid
        // spamming infinite extensions on every call.
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.iat ? decoded.exp - decoded.iat : 0;
        const remaining = decoded.exp - now;
        const shouldForce = ttl > 0 && remaining < ttl * 0.9;
        if (shouldForce && shouldRefreshToken(decoded) === false && remaining < ttl * 0.9) {
            // Not at 50% yet, but client asked proactively: still extend if within 90%
            // To avoid extending stolen old tokens, check absolute cap
            const ABSOLUTE_MAX = 30 * 86400;
            const sessionStart = decoded.createdAt || decoded.iat;
            if (sessionStart && now - sessionStart > ABSOLUTE_MAX) {
                return NextResponse.json({ success: true, refreshed: false, reason: "absolute_cap" });
            }
            const newToken = await signToken({
                userId: user._id.toString(),
                username: user.username,
                version: decoded.version ?? user.tokenVersion ?? 0,
                createdAt: decoded.createdAt || decoded.iat,
            });
            const res = NextResponse.json({ success: true, refreshed: true, forced: true });
            await setAuthCookie(res, newToken);
            res.headers.set("Cache-Control", "no-store");
            return res;
        }

        const res = NextResponse.json({ success: true, refreshed: false });
        res.headers.set("Cache-Control", "no-store");
        return res;
    } catch (e) {
        console.error("[refresh] error:", e.message);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request) {
    return POST(request);
}
