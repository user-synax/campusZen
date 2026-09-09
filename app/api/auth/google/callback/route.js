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

        // CSRF / OAuth state validation.
        const state = searchParams.get("state");
        const stateCookie = request.cookies.get("google_oauth_state")?.value;
        if (!state || !stateCookie || state !== stateCookie) {
            console.error("[Google OAuth Callback GET] State mismatch");
            return NextResponse.redirect(`${origin}/login?error=oauth_state_mismatch`);
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
        // Consume the OAuth state cookie.
        response.cookies.set("google_oauth_state", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 0,
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("[Google OAuth Callback GET Error]:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
}

export async function POST(request) {
    // JWT-only — supports both direct {email,name} and legacy Appwrite {appwriteUser} payloads
    try {
        const body = await request.json();
        const appwriteUser = body.appwriteUser;
        const emailRaw = body.email || appwriteUser?.email;
        const email = emailRaw?.toLowerCase?.();
        const name = body.name || body.displayName || appwriteUser?.name || email?.split("@")[0] || "User";
        const avatar = body.avatar || body.picture || appwriteUser?.picture || "";
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
        await connectDB();
        let user = await User.findOne({ email });
        if (!user) {
            const username = await generateUniqueUsername(name);
            user = await User.create({
                name, username, email,
                password: await (await import("bcryptjs")).default.hash(Math.random().toString(36), 12),
                avatar, authProvider: "google", emailVerified: true, isVerified: false, verificationStatus: "none", gender: "unspecified",
            });
            notifyAdminNewUser(user).catch(() => {});
        }
        const token = await signToken({ userId: user._id.toString(), username: user.username });
        const response = NextResponse.json({ redirectTo: "/feed" });
        await setAuthCookie(response, token);
        return response;
    } catch (error) {
        console.error("[Google Callback API POST] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
