import { NextResponse } from "next/server";
import config from "@/lib/config";

export async function GET(request) {
    try {
        const { origin } = new URL(request.url);

        const clientId = config.google.clientId || process.env.GOOGLE_CLIENT_ID;
        const redirectUri =
            config.google.redirectUri || `${origin}/api/auth/google/callback`;

        if (clientId) {
            const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            googleAuthUrl.searchParams.set("client_id", clientId);
            googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
            googleAuthUrl.searchParams.set("response_type", "code");
            googleAuthUrl.searchParams.set("scope", "openid email profile");
            googleAuthUrl.searchParams.set("prompt", "select_account");

            console.log("[Google OAuth Init] Redirecting to Google Auth URL:", googleAuthUrl.toString());
            return NextResponse.redirect(googleAuthUrl.toString());
        }

        // If no direct GOOGLE_CLIENT_ID, redirect to login
        return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
    } catch (error) {
        console.error("Google OAuth init error:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
    }
}
