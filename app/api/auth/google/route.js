import { NextResponse } from "next/server";
import {
    createAppwriteClient,
    getAppwriteAccount,
} from "@/lib/appwrite/client";
import { Account, ID } from "appwrite";

export async function GET(request) {
    try {
        // For Appwrite's OAuth flow is typically handled client-side
        // But let's redirect to the frontend, which will use Appwrite's SDK
        // Wait, actually Appwrite's createOAuth2Session is client-side
        // So let's just return a redirect to the frontend to handle it, or let's
        // Let's check Appwrite's docs
        // Alternatively, let's update the frontend to use Appwrite's client SDK directly
        // So let's just keep this route as is, but let's update the callback
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login`);
    } catch (error) {
        console.error("Google OAuth init error:", error);
        const { origin } = new URL(request.url);
        return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
    }
}
