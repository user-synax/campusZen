import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mintChatToken } from "@/lib/chatToken";

/**
 * POST /api/chat-socket-token
 * Mints a short-lived client-readable JWT (60s) that the browser passes in the
 * Socket.IO handshake `auth` payload. This sidesteps the httpOnly + sameSite
 * cookies that can't cross origins to the Render backend.
 */
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = await mintChatToken(currentUser._id);
        return NextResponse.json({ token });
    } catch (err) {
        return NextResponse.json({ error: "Failed to mint token" }, { status: 500 });
    }
}
