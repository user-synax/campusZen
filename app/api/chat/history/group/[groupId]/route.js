import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mintChatToken } from "@/lib/chatToken";
import { validateObjectId } from "@/utils/validators";

/**
 * GET /api/chat/history/group/[groupId]/messages
 * Same-origin proxy to the chat backend REST history endpoint (see dm route).
 */
export async function GET(request, { params }) {
    try {
        const { groupId } = await params;
        if (!validateObjectId(groupId)) {
            return NextResponse.json({ message: "Invalid Group ID" }, { status: 400 });
        }
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = await mintChatToken(currentUser._id);
        const { searchParams } = new URL(request.url);
        const backend = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL;
        const upstream = await fetch(
            `${backend}/groups/${groupId}/messages?${searchParams.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await upstream.json();
        return NextResponse.json(data, { status: upstream.status });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}
