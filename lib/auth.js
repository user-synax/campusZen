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

    const jwt = new SignJWT({ ...payload, version: tokenVersion || 0 })
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
 * Blacklists all active tokens for a user (force logout).
 * Since we use stateless JWTs, we store them in a blacklist
 * and check during verification.
 *
 * @param {string} userId - The user ID to force logout
 */
export async function blacklistAllUserTokens(userId) {
    await connectDB();

    // In a real stateless JWT setup, you'd usually rotate a 'tokenVersion' on the User model
    // and include it in the JWT payload. Then verifyToken would check if payload.version === user.tokenVersion.
    //
    // However, the prompt specifically mentions TokenBlacklist model.
    // Since we don't have a way to find all active tokens (unless we stored them on login),
    // a common pattern is to use a `tokenVersion` or `lastLogoutAt` field on the User model.
    //
    // For now, I'll implement it by updating a `tokenVersion` on the User model
    // and adding a comment that this requires verifyToken to check the version.

    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}

// ── Single-token revocation (early logout) ──
// `blacklistAllUserTokens` (above) rotates tokenVersion to invalidate every
// JWT for a user. Sometimes we only want to kill the ONE token presented now
// (e.g. "log out this device"), without forcing every other session closed.
// For that we persist the raw JWT in TokenBlacklist and reject it in
// getCurrentUserLegacy below — see isTokenBlacklisted.

export async function blacklistToken(token, userId, expSeconds) {
    try {
        await connectDB();
        const expiresAt = expSeconds
            ? new Date(expSeconds * 1000)
            : new Date(Date.now() + 7 * 24 * 3600 * 1000);
        await TokenBlacklist.create({ token, userId, expiresAt });
    } catch (err) {
        // Blacklist is best-effort; never block a legit logout on its failure.
        console.error("[Auth] blacklistToken error:", err.message);
    }
}

export async function isTokenBlacklisted(token) {
    try {
        await connectDB();
        const found = await TokenBlacklist.findOne({ token })
            .select("_id")
            .lean();
        return !!found;
    } catch (err) {
        // If the check itself fails, fail open (don't lock out valid users).
        console.error("[Auth] isTokenBlacklisted error:", err.message);
        return false;
    }
}

export function getTokenFromRequest(request) {
    return request.cookies.get("campusx_token")?.value || null;
}

// Legacy function for fallback (keep for now)
export async function getCurrentUserLegacy(request) {
    const token = getTokenFromRequest(request);
    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded) return null;

    // Early single-token revocation via TokenBlacklist.
    if (await isTokenBlacklisted(token)) return null;

    // Safely extract userId - handle both string and buffer object cases
    let userId = decoded.userId;
    if (typeof userId === "object" && userId.buffer) {
        // If it's an ObjectId buffer object, convert to hex string
        userId = Buffer.from(Object.values(userId.buffer)).toString("hex");
    } else if (userId && typeof userId.toString === "function") {
        userId = userId.toString();
    }

    await connectDB();

    const user = await User.findById(userId).select("-password").lean();
    if (!user || user.isDeleted) return null;

    // Force logout check (tokenVersion)
    if (decoded.version !== undefined && decoded.version < user.tokenVersion) {
        return null;
    }

    // Check for active ban - only if user.isBanned is true or for extra safety
    // If we trust user.isBanned, we can skip the findOne query
    if (user.isBanned) {
        const ban = await UserBan.findOne({
            userId: user._id,
            isActive: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).lean();

        if (ban) throw new Error("Account suspended");
    }

    return user;
}

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

// Auth is now JWT-only — no Appwrite session.
// Kept for other Appwrite uses (storage), but not for auth.
export async function getCurrentUser(request) {
    return await getCurrentUserLegacy(request);
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
