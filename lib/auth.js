import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import UserBan from "@/models/UserBan";
import TokenBlacklist from "@/models/TokenBlacklist";
import connectDB from "@/lib/db";
import config from "./config";
import { rateLimit } from './redis-rate-limit'

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
export async function checkRateLimit(ip) {
    const result = await rateLimit(ip, 'login', LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
    return result.allowed
}

const getSecretKey = () => {
    const secret = config.jwt.secret;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured; refusing to sign tokens.");
    }
    return new TextEncoder().encode(secret);
};

export async function signToken(payload) {
    const secretKey = getSecretKey();

    // Embed the user's current tokenVersion so that logout-all / password reset /
    // change-password can invalidate previously issued tokens. If the caller did
    // not supply it, resolve it from the DB.
    let tokenVersion = payload.version;
    if (tokenVersion === undefined && payload.userId) {
        try {
            await connectDB();
            const u = await User.findById(payload.userId)
                .select("tokenVersion")
                .lean();
            tokenVersion = u ? u.tokenVersion || 0 : 0;
        } catch {
            tokenVersion = 0;
        }
    }

    // Preserve original session start for absolute cap (30d). On first login
    // createdAt is undefined -> use now. On refresh we forward decoded.createdAt
    // so absolute lifetime is bounded even though iat slides.
    const nowSec = Math.floor(Date.now() / 1000);
    const createdAt = payload.createdAt || payload.iat || nowSec;
    const jwt = new SignJWT({ ...payload, version: tokenVersion || 0, createdAt })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt();

    if (config.jwt.expiresIn) {
        jwt.setExpirationTime(config.jwt.expiresIn);
    }

    return await jwt.sign(secretKey);
}

export async function verifyToken(token) {
    try {
        const secretKey = getSecretKey();
        const { payload } = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

function getCookieMaxAgeSeconds() {
    // Keep cookie TTL strictly in sync with JWT expiry to avoid
    // "cookie present but JWT expired" stuck loop (7d cookie + 1h JWT = bug).
    // Parse config.jwt.expiresIn (e.g. "7d", "24h", "3600s") -> seconds.
    const raw = config.jwt.expiresIn || "7d";
    if (typeof raw === "number") return raw;
    const m = String(raw).trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!m) return 60 * 60 * 24 * 7;
    const n = parseInt(m[1], 10);
    const unit = (m[2] || "s").toLowerCase();
    const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1;
    return n * mult;
}

// ── Rolling session: refresh when <50% TTL remains ──
// This keeps active users logged in indefinitely (sliding 7d window)
// while truly inactive users still expire. Absolute cap 30d prevents
// infinite lifetime for stolen tokens.
function getAbsoluteMaxSeconds() {
    const raw = config.jwt.absoluteExpiresIn || process.env.JWT_ABSOLUTE_EXPIRES_IN || "30d";
    if (/^\d+$/.test(String(raw).trim())) return parseInt(String(raw).trim(), 10);
    const m = String(raw).trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!m) return 30 * 86400;
    const n = parseInt(m[1], 10);
    const unit = (m[2] || "s").toLowerCase();
    const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1;
    return n * mult;
}
const ABSOLUTE_MAX_SECONDS = getAbsoluteMaxSeconds();

export function shouldRefreshToken(decoded) {
    if (!decoded || !decoded.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp;
    const iat = decoded.iat;
    if (exp <= now) return false;
    const ttl = iat ? exp - iat : getCookieMaxAgeSeconds();
    if (ttl <= 0) return false;
    const remaining = exp - now;
    // Absolute cap: use createdAt (original session start) if present, else iat.
    // This survives sliding refreshes (iat moves, createdAt doesn't).
    const sessionStart = decoded.createdAt || iat;
    const absoluteMax = getAbsoluteMaxSeconds();
    if (sessionStart && now - sessionStart > absoluteMax) return false;
    // Refresh when less than 50% of TTL remains
    return remaining < ttl * 0.5;
}

export async function setAuthCookie(response, token) {
    const maxAge = getCookieMaxAgeSeconds();
    const options = {
        httpOnly: true,
        secure: config.env.isProd || process.env.VERCEL === "1",
        sameSite: "lax",
        maxAge,
        path: "/",
    };

    // Single source of truth: set on the Response that will be returned.
    // Using next/headers cookies() inside Route Handlers is unreliable
    // (it mutates the request store, not the response Set-Cookie header,
    // and can be read-only in some contexts). Response cookie is authoritative.
    if (response && response.cookies) {
        response.cookies.set("campusx_token", token, options);
        return;
    }

    // Fallback only when called without a Response (e.g. legacy server action)
    try {
        const cookieStore = await cookies();
        cookieStore.set("campusx_token", token, options);
    } catch (e) {
        console.error("[Auth] setAuthCookie fallback failed:", e.message);
    }
}

export async function clearAuthCookie(response) {
    const options = {
        httpOnly: true,
        secure: config.env.isProd || process.env.VERCEL === "1",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    };

    if (response && response.cookies) {
        response.cookies.set("campusx_token", "", options);
        return;
    }

    try {
        const cookieStore = await cookies();
        cookieStore.set("campusx_token", "", options);
    } catch (e) { }
}

/**
 * Force logout everywhere: bumps tokenVersion. All JWTs with older version are rejected.
 * Uses jose + tokenVersion as single source of truth.
 * @param {string} userId
 */
export async function blacklistAllUserTokens(userId) {
    await connectDB();
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}

// ── Single-token revocation ("logout this device") ──
// TokenBlacklist is a TTL collection (expiresAt + expireAfterSeconds:0).
// It stores ONLY the single JWT for "logout this device" so other sessions stay valid.
// `blacklistAllUserTokens` above uses tokenVersion for global logout.

export async function blacklistToken(token, userId, expSeconds) {
    if (!token || !userId) return;
    try {
        await connectDB();
        const expiresAt = expSeconds
            ? new Date(expSeconds * 1000)
            : new Date(Date.now() + getCookieMaxAgeSeconds() * 1000);
        // Upsert to avoid duplicate key errors on retry
        await TokenBlacklist.updateOne(
            { token },
            { $setOnInsert: { token, userId, expiresAt } },
            { upsert: true }
        );
    } catch (err) {
        console.error("[Auth] blacklistToken error:", err.message);
    }
}

export async function isTokenBlacklisted(token) {
    if (!token) return false;
    try {
        await connectDB();
        const found = await TokenBlacklist.findOne({ token }).select("_id").lean();
        return !!found;
    } catch (err) {
        console.error("[Auth] isTokenBlacklisted error:", err.message);
        return false;
    }
}

export function getTokenFromRequest(request) {
    return request.cookies.get("campusx_token")?.value || null;
}

export async function getCurrentUser(request, response = null) {
    const token = getTokenFromRequest(request);
    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded) return null;

    // Single-token revocation (TTL collection) — "logout this device"
    if (await isTokenBlacklisted(token)) return null;

    let userId = decoded.userId;
    if (typeof userId === "object" && userId?.buffer) {
        userId = Buffer.from(Object.values(userId.buffer)).toString("hex");
    } else if (userId && typeof userId.toString === "function") {
        userId = userId.toString();
    }

    await connectDB();

    const user = await User.findById(userId).select("-password").lean();
    if (!user || user.isDeleted) return null;

    // Global logout check — tokenVersion (jose + tokenVersion is source of truth)
    if (decoded.version !== undefined && decoded.version < (user.tokenVersion || 0)) {
        return null;
    }

    if (user.isBanned) {
        const ban = await UserBan.findOne({
            userId: user._id,
            isActive: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).lean();
        if (ban) throw new Error("Account suspended");
    }

    // ── Rolling session: refresh cookie if expiring soon ──
    // Called on every getCurrentUser; most frequent path is GET /api/users/me
    // from useUser hook. Only refreshes when <50% TTL remains, so at most
    // once per 3.5 days for 7d TTL — no perf impact. Checks tokenVersion/
    // blacklist already passed, so safe to extend.
    if (decoded && shouldRefreshToken(decoded)) {
        try {
            const newToken = await signToken({
                userId: user._id.toString(),
                username: user.username,
                version: decoded.version ?? user.tokenVersion ?? 0,
                createdAt: decoded.createdAt || decoded.iat,
            });
            // Prefer explicit Response cookie (authoritative for Route Handlers)
            if (response && response.cookies) {
                await setAuthCookie(response, newToken);
            } else {
                // Fallback for Server Components / callers without Response
                // (best-effort; Route Handlers should pass `response`)
                try {
                    const cookieStore = await cookies();
                    const maxAge = getCookieMaxAgeSeconds();
                    cookieStore.set("campusx_token", newToken, {
                        httpOnly: true,
                        secure: config.env.isProd || process.env.VERCEL === "1",
                        sameSite: "lax",
                        maxAge,
                        path: "/",
                    });
                } catch {}
            }
        } catch (e) {
            console.error("[Auth] rolling refresh failed:", e.message);
        }
    }

    return user;
}

// Backward compat alias — use getCurrentUser
export const getCurrentUserLegacy = getCurrentUser;

// Helper function to generate unique username
export async function generateUniqueUsername(baseName) {
    let username = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
    let counter = 1;

    while (true) {
        const checkUsername = counter > 1 ? `${username}_${counter}` : username;
        const existing = await User.findOne({ username: checkUsername });
        if (!existing) {
            return checkUsername;
        }
        counter++;
    }
}

// Explicit refresh for client-initiated or forced cases (e.g. /api/auth/refresh,
// change-password). Also used by rolling session above.
export async function maybeRefreshAuth(request, response) {
    const token = getTokenFromRequest(request);
    if (!token) return null;
    const decoded = await verifyToken(token);
    if (!decoded || !shouldRefreshToken(decoded)) return null;
    if (await isTokenBlacklisted(token)) return null;
    // Load user to ensure version still valid before extending
    let userId = decoded.userId;
    if (typeof userId === "object" && userId?.buffer) userId = Buffer.from(Object.values(userId.buffer)).toString("hex");
    else if (userId && typeof userId.toString === "function") userId = userId.toString();
    await connectDB();
    const user = await User.findById(userId).select("username tokenVersion isDeleted").lean();
    if (!user || user.isDeleted) return null;
    if (decoded.version !== undefined && decoded.version < (user.tokenVersion || 0)) return null;
    const newToken = await signToken({ userId: user._id.toString(), username: user.username, version: decoded.version ?? user.tokenVersion ?? 0, createdAt: decoded.createdAt || decoded.iat });
    await setAuthCookie(response, newToken);
    return newToken;
}

// Helper for route handlers that need to refresh the session after a
// tokenVersion bump (e.g. change-password). Re-issues a fresh JWT and
// attaches the Set-Cookie to the provided response.
export async function refreshAuthCookie(response, userId) {
    const user = await User.findById(userId).select("username tokenVersion").lean();
    if (!user) return null;
    const token = await signToken({ userId: user._id.toString(), username: user.username, version: user.tokenVersion || 0 });
    await setAuthCookie(response, token);
    return token;
}
