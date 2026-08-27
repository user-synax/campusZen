import { NextResponse } from "next/server";
import crypto from "crypto";
import config from "@/lib/config";

export async function GET(request) {
    try {
        const { origin } = new URL(request.url);

        const clientId = config.google.clientId || process.env.GOOGLE_CLIENT_ID;
        const redirectUri =
            config.google.redirectUri || `${origin}/api/auth/google/callback`;

        if (clientId) {
            // CSRF protection: generate a single-use state and mirror it in an
            // httpOnly cookie. The callback must echo it back.
            const state = crypto.randomBytes(16).toString("hex");

            const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            googleAuthUrl.searchParams.set("client_id", clientId);
            googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
            googleAuthUrl.searchParams.set("response_type", "code");
            googleAuthUrl.searchParams.set("scope", "openid email profile");
            googleAuthUrl.searchParams.set("prompt", "select_account");
            googleAuthUrl.searchParams.set("state", state);

            const res = NextResponse.redirect(googleAuthUrl.toString());
            res.cookies.set("google_oauth_state", state, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 10 * 60,
                path: "/",
            });
            return res;
        }

        // If no direct GOOGLE_CLIENT_ID, redirect to login
        return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
    } catch (error) {
        console.error("Google OAuth init error:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
    }
}
