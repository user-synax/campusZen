import { NextResponse } from "next/server";
import {
    clearAuthCookie,
    getTokenFromRequest,
    verifyToken,
    blacklistToken,
} from "@/lib/auth";

export async function POST(request) {
    // Revoke the legacy JWT early (single-token revocation) before clearing it.
    const token = getTokenFromRequest(request);
    if (token) {
        const decoded = await verifyToken(token);
        if (decoded && decoded.userId) {
            blacklistToken(token, decoded.userId, decoded.exp);
        }
    }

    const response = NextResponse.json({ success: true });
    await clearAuthCookie(response);

    // Clear Appwrite session cookie
    const sessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
    response.cookies.set(sessionCookieName, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    return response;
}
