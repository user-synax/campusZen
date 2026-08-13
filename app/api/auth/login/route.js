import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";
import {
    signToken,
    setAuthCookie,
    getCurrentUserLegacy,
    migrateLegacyUser,
} from "@/lib/auth";
import { updateStreak } from "@/lib/gamification";
import { awardDailyLoginVP } from "@/lib/coins";
import { applyRateLimit, rateLimit } from "@/lib/rate-limit";
import { sanitizeUser } from "@/lib/sanitize";
import { sendSuspiciousLoginEmail } from "@/lib/email-templates";
import { loginSchema, validateRequest } from "@/utils/schemas";
import { createAppwriteServerClient } from "@/lib/appwrite/server";
import { Account } from "appwrite";

function parseUserAgent(userAgent = "") {
    const device = /Mobile|Android|iPhone|iPad/i.test(userAgent)
        ? "Mobile"
        : /Tablet|iPad/i.test(userAgent)
          ? "Tablet"
          : "Desktop";

    let browser = "Unknown";
    if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent))
        browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
        browser = "Safari";
    else if (/Edge|Edg/i.test(userAgent)) browser = "Edge";

    return { device, browser };
}

function getClientIp(request) {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

export async function POST(request) {
    try {
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "auth_login_ip",
            10,
            15 * 60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        const validation = await validateRequest(loginSchema)(request);
        if (!validation.valid) {
            return NextResponse.json(
                { message: "Validation failed", errors: validation.errors },
                { status: 400 },
            );
        }

        const { email, password } = validation.data;

        // Rate limit login by email
        const emailKey = `login_email_${email?.toString().toLowerCase()}`;
        const emailResult = rateLimit(emailKey, 5, 15 * 60 * 1000);
        if (!emailResult.allowed) {
            return NextResponse.json(
                {
                    message: `Too many login attempts for this account. Try again in ${emailResult.retryAfter} seconds.`,
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(emailResult.retryAfter),
                    },
                },
            );
        }

        await connectDB();

        const mongoUser = await User.findOne({ email }).select("+password");
        if (!mongoUser) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 },
            );
        }

        let appwriteSession = null;
        let finalMongoUser = null;

        // Check if user is already migrated
        if (mongoUser.authMigrated && mongoUser.appwriteUserId) {
            try {
                // Try to log in with Appwrite
                const client = createAppwriteServerClient();
                const account = new Account(client);
                appwriteSession = await account.createEmailPasswordSession(
                    email,
                    password,
                );
                finalMongoUser = await User.findOne({
                    appwriteUserId: appwriteSession.userId,
                })
                    .select("-password")
                    .lean();
            } catch (appwriteError) {
                console.warn("Appwrite login failed, falling back to legacy");
            }
        }

        // If not migrated or Appwrite login failed, use legacy and migrate
        if (!appwriteSession || !finalMongoUser) {
            const isMatch = await mongoUser.comparePassword(password);
            if (!isMatch) {
                return NextResponse.json(
                    { message: "Invalid credentials" },
                    { status: 401 },
                );
            }

            finalMongoUser = await User.findById(mongoUser._id)
                .select("-password")
                .lean();

            // Try to migrate user to Appwrite
            if (!mongoUser.authMigrated) {
                try {
                    const appwriteUser = await migrateLegacyUser(
                        mongoUser,
                        password,
                    );
                    // Now log in with Appwrite to get session
                    const client = createAppwriteServerClient();
                    const account = new Account(client);
                    appwriteSession = await account.createEmailPasswordSession(
                        email,
                        password,
                    );
                    // Update finalMongoUser with appwriteUserId
                    finalMongoUser = await User.findOne({
                        appwriteUserId: appwriteSession.userId,
                    })
                        .select("-password")
                        .lean();
                } catch (migrateError) {
                    console.error(
                        "User migration failed, continuing with legacy session:",
                        migrateError,
                    );
                }
            }
        }

        const response = NextResponse.json({
            success: true,
            user: sanitizeUser(finalMongoUser),
        });

        // Set Appwrite session cookie if available
        if (appwriteSession) {
            const sessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
            response.cookies.set(sessionCookieName, appwriteSession.secret, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7,
                path: "/",
            });
        }

        // Also set legacy JWT for backwards compatibility
        const token = await signToken({
            userId: finalMongoUser._id.toString(),
            username: finalMongoUser.username,
        });
        await setAuthCookie(response, token);

        // Track login history
        const userAgent = request.headers.get("user-agent") || "";
        const { device, browser } = parseUserAgent(userAgent);
        const ipAddress = getClientIp(request);

        // Update streak and handle login history in background
        updateStreak(finalMongoUser._id).catch((err) =>
            console.error("Streak update error:", err),
        );

        // Award daily-login VP (idempotent per calendar day, background)
        awardDailyLoginVP(finalMongoUser._id).catch((err) =>
            console.error("Daily VP award error:", err),
        );

        // Check last 5 logins for this user
        const recentLogins = await LoginHistory.find({
            userId: finalMongoUser._id,
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // Determine if suspicious (new device/browser)
        const isKnownDevice = recentLogins.some(
            (login) => login.device === device && login.browser === browser,
        );
        const isSuspicious = !isKnownDevice && recentLogins.length > 0;

        // Save login history
        await LoginHistory.create({
            userId: finalMongoUser._id,
            ipAddress,
            userAgent,
            device,
            browser,
            isSuspicious,
        });

        // Send alert email if suspicious
        if (isSuspicious) {
            sendSuspiciousLoginEmail(finalMongoUser, {
                userAgent,
                ipAddress,
                createdAt: new Date(),
            }).catch((err) => console.error("Operation failed:", err));
        }

        return response;
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
