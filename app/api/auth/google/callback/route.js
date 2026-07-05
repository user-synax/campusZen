import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import config from "@/lib/config";
import { signToken, setAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { notifyAdminNewUser } from "@/lib/admin-notify";

async function getGoogleTokens(code) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: config.google.clientId,
            client_secret: config.google.clientSecret,
            redirect_uri: config.google.redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get tokens: ${error}`);
    }

    return response.json();
}

async function getGoogleUserInfo(accessToken) {
    const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );

    if (!response.ok) {
        throw new Error("Failed to get user info");
    }

    return response.json();
}

export async function GET(request) {
    try {
        const { searchParams, origin } = new URL(request.url);
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            console.error("Google OAuth error:", error);
            return NextResponse.redirect(
                `${origin}/login?error=oauth_cancelled`,
            );
        }

        if (!code) {
            return NextResponse.redirect(`${origin}/login?error=missing_code`);
        }

        await connectDB();

        const tokens = await getGoogleTokens(code);
        const userInfo = await getGoogleUserInfo(tokens.access_token);

        const { sub: googleId, email, name, picture } = userInfo;

        // Find existing user by Google ID or email
        let user = await User.findOne({
            $or: [{ googleId }, { email: email.toLowerCase() }],
        });

        if (user) {
            // Update existing user with Google info if they don't have it
            if (!user.googleId) {
                user.googleId = googleId;
                user.googleAccessToken = tokens.access_token;
                user.googleRefreshToken =
                    tokens.refresh_token || user.googleRefreshToken;
                user.googleProfile = userInfo;
                user.authProvider = "google";
                await user.save();
            }
        } else {
            // Create new user
            // Generate a random password (won't be used for Google auth)
            const tempPassword = await bcrypt.hash(
                Math.random().toString(36),
                12,
            );

            // Generate a unique username
            let username = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
            let usernameExists = true;
            let counter = 1;

            while (usernameExists) {
                const checkUsername =
                    counter > 1 ? `${username}_${counter}` : username;
                const existing = await User.findOne({
                    username: checkUsername,
                });
                if (!existing) {
                    username = checkUsername;
                    usernameExists = false;
                } else {
                    counter++;
                }
            }

            user = await User.create({
                name,
                username,
                email: email.toLowerCase(),
                password: tempPassword,
                avatar: picture || "",
                googleId,
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleProfile: userInfo,
                authProvider: "google",
                emailVerified: true,
                isVerified: false,
                verificationStatus: "none",
                gender: "unspecified",
                isOnboarded: false,
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
                console.error("Auto-follow founder failed:", err.message);
            }

            // Send admin notification
            notifyAdminNewUser(user).catch((err) =>
                console.error("Admin notify failed:", err),
            );

            import("@/lib/globalGroup")
                .then(({ autoJoinGlobalGroup }) => {
                    autoJoinGlobalGroup(user._id).catch((err) =>
                        console.error("Operation failed:", err),
                    );
                })
                .catch((err) => console.error("Operation failed:", err));
        }

        // Sign JWT and set cookie
        const token = await signToken({
            userId: user._id.toString(),
            username: user.username,
        });
        // Redirect to onboarding if not onboarded, otherwise to feed
        const redirectUrl = user.isOnboarded
            ? `${origin}/feed`
            : `${origin}/onboarding`;
        const response = NextResponse.redirect(redirectUrl);
        await setAuthCookie(response, token);

        return response;
    } catch (error) {
        console.error("Google OAuth callback error:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
}
