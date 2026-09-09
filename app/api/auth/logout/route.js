import { NextResponse } from "next/server";
import { clearAuthCookie, getTokenFromRequest, verifyToken, blacklistToken } from "@/lib/auth";

export async function POST(request) {
    const token = getTokenFromRequest(request);
    if (token) {
        const decoded = await verifyToken(token);
        if (decoded && decoded.userId) {
            blacklistToken(token, decoded.userId, decoded.exp);
        }
    }

    const response = NextResponse.json({ success: true });
    await clearAuthCookie(response);
    return response;
}
