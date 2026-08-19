import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, setAuthCookie, generateUniqueUsername } from "@/lib/auth";
import { notifyAdminNewUser } from "@/lib/admin-notify";
import config from "@/lib/config";

export async function GET(request) {
    try {
        const { searchParams, origin } = new URL(request.url);
        const code = searchParams.get("code");

        if (!code) {
            console.error("[Google OAuth Callback GET] Missing auth code");
            return NextResponse.redirect(`${origin}/login?error=missing_code`);
        }

        const clientId = config.google.clientId || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = config.google.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri =
            config.google.redirectUri || `${origin}/api/auth/google/callback`;

        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error("[Google OAuth Callback GET] Token exchange failed:", errBody);
            return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
        }

        const tokenData = await tokenRes.json();

        // Fetch user profile from Google UserInfo endpoint
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userRes.ok) {
            const errBody = await userRes.text();
            console.error("[Google OAuth Callback GET] UserInfo fetch failed:", errBody);
            return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
        }

        const googleUser = await userRes.json();
        console.log("[Google OAuth Callback GET] Successfully fetched Google user:", googleUser.email);

        await connectDB();

        let user = await User.findOne({ email: googleUser.email.toLowerCase() });

        if (user) {
            if (!user.emailVerified && googleUser.verified_email) {
                user.emailVerified = true;
                await user.save();
            }
        } else {
            const username = await generateUniqueUsername(
                googleUser.name || googleUser.email.split("@")[0],
            );

            user = await User.create({
                name: googleUser.name || "User",
                username,
                email: googleUser.email.toLowerCase(),
                password: await (
                    await import("bcryptjs")
                ).default.hash(Math.random().toString(36), 12),
                avatar: googleUser.picture || "",
                authProvider: "google",
                emailVerified: !!googleUser.verified_email,
                isVerified: false,
                verificationStatus: "none",
                gender: "unspecified",
            });

            try {
                const { FOUNDER_USERNAME } = await import("@/lib/founder");
                if (FOUNDER_USERNAME) {
                    const founderUser = await User.findOne({
                        username: FOUNDER_USERNAME,
                    }).lean();
                    if (
                        founderUser &&
                        founderUser._id.toString() !== user._id.toString()
                    ) {
                        await User.findByIdAndUpdate(user._id, {
                            $addToSet: { following: founderUser._id },
                        });
                        await User.findByIdAndUpdate(founderUser._id, {
                            $addToSet: { followers: user._id },
                        });
                    }
                }
            } catch (err) { }

            notifyAdminNewUser(user).catch(() => { });
        }

        const token = await signToken({
            userId: user._id.toString(),
            username: user.username,
        });

        const redirectTo = "/feed";
        const response = NextResponse.redirect(`${origin}${redirectTo}`);
        await setAuthCookie(response, token);

        return response;
    } catch (error) {
        console.error("[Google OAuth Callback GET Error]:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        let appwriteUser = body.appwriteUser;
        const userId = body.userId;
        const secret = body.secret;

        console.log(
            "[Google Callback API] Received body params:",
            { hasAppwriteUser: !!appwriteUser, userId, hasSecret: !!secret },
        );

        if ((!appwriteUser || !appwriteUser.$id) && secret) {
            try {
                const { Client, Account } = await import("node-appwrite");
                const client = new Client()
                    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
                    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
                    .setSession(secret);
                const account = new Account(client);
                appwriteUser = await account.get();
                console.log("[Google Callback API] Fetched user via session secret:", appwriteUser?.$id);
            } catch (err) {
                console.warn(
                    "[Google Callback API] Failed to fetch user via session secret:",
                    err?.message || err,
                );
            }
        }

        if ((!appwriteUser || !appwriteUser.$id) && userId) {
            try {
                const { getAppwriteUsers } = await import("@/lib/appwrite/server");
                const users = getAppwriteUsers();
                appwriteUser = await users.get(userId);
                console.log("[Google Callback API] Fetched user via Admin SDK userId:", appwriteUser?.$id);
            } catch (err) {
                console.error(
                    "[Google Callback API] Failed to fetch user via Admin SDK userId:",
                    err?.message || err,
                );
            }
        }

        if (!appwriteUser || !appwriteUser.$id) {
            try {
                const { getServerSession } = await import("@/lib/appwrite/server");
                appwriteUser = await getServerSession();
                if (appwriteUser) {
                    console.log("[Google Callback API] Fetched user via getServerSession cookie:", appwriteUser.$id);
                }
            } catch (err) {
                console.warn(
                    "[Google Callback API] Failed to fetch user via getServerSession:",
                    err?.message || err,
                );
            }
        }

        if (!appwriteUser || !appwriteUser.$id) {
            console.error(
                "[Google Callback API] Invalid appwriteUser provided",
            );
            return NextResponse.json(
                { error: "Invalid appwriteUser" },
                { status: 401 },
            );
        }

        await connectDB();

        // Find existing user by Appwrite ID or email
        let user = await User.findOne({
            $or: [
                { appwriteUserId: appwriteUser.$id },
                { email: appwriteUser.email.toLowerCase() },
            ],
        });

        if (user) {
            // If user exists but doesn't have appwriteUserId, link it
            if (!user.appwriteUserId) {
                user.appwriteUserId = appwriteUser.$id;
                user.authMigrated = true;
                user.emailVerified = appwriteUser.emailVerification;
                await user.save();
            } else if (user.emailVerified !== appwriteUser.emailVerification) {
                // Sync email verification status
                user.emailVerified = appwriteUser.emailVerification;
                await user.save();
            }
        } else {
            // Create new user
            // Generate unique username
            const username = await generateUniqueUsername(
                appwriteUser.name || appwriteUser.email.split("@")[0],
            );

            // Create MongoDB user
            user = await User.create({
                name: appwriteUser.name || "User",
                username,
                email: appwriteUser.email.toLowerCase(),
                // Generate random password (won't be used for OAuth)
                password: await (
                    await import("bcryptjs")
                ).default.hash(Math.random().toString(36), 12),
                avatar: "",
                appwriteUserId: appwriteUser.$id,
                authMigrated: true,
                authProvider: "google",
                emailVerified: appwriteUser.emailVerification,
                isVerified: false,
                verificationStatus: "none",
                gender: "unspecified",
            });

            // Auto-follow founder
            try {
                const { FOUNDER_USERNAME } = await import("@/lib/founder");
                if (FOUNDER_USERNAME) {
                    const founderUser = await User.findOne({
                        username: FOUNDER_USERNAME,
                    }).lean();
                    if (
                        founderUser &&
                        founderUser._id.toString() !== user._id.toString()
                    ) {
                        await User.findByIdAndUpdate(user._id, {
                            $addToSet: { following: founderUser._id },
                        });
                        await User.findByIdAndUpdate(founderUser._id, {
                            $addToSet: { followers: user._id },
                        });
                    }
                }
            } catch (err) {
                console.error(
                    "[Google Callback API] Auto-follow founder failed:",
                    err.message,
                );
            }

            // Send admin notification
            notifyAdminNewUser(user).catch((err) =>
                console.error(
                    "[Google Callback API] Admin notify failed:",
                    err,
                ),
            );

            import("@/lib/globalGroup")
                .then(({ autoJoinGlobalGroup }) => {
                    autoJoinGlobalGroup(user._id).catch((err) =>
                        console.error(
                            "[Google Callback API] Global group join failed:",
                            err,
                        ),
                    );
                })
                .catch((err) =>
                    console.error(
                        "[Google Callback API] Global group import failed:",
                        err,
                    ),
                );
        }

        // Set legacy JWT cookie for compatibility
        const token = await signToken({
            userId: user._id.toString(),
            username: user.username,
        });

        // Determine redirect URL
        const redirectTo = "/feed";

        const response = NextResponse.json({ redirectTo });
        await setAuthCookie(response, token);

        return response;
    } catch (error) {
        console.error("[Google Callback API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
