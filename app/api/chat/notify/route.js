import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

/**
 * Internal endpoint the chat backend calls (server-to-server, best-effort) to
 * create the in-app/push notification for a chat message. Notifications stay on
 * the Next.js + Pusher stack; this just re-triggers them when the backend owns
 * the send. Protected by a shared CHAT_BACKEND_SECRET.
 */
export async function POST(request) {
    try {
        const secret = request.headers.get("x-chat-backend-secret");
        if (!secret || secret !== process.env.CHAT_BACKEND_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        if (body.kind === "dm") {
            await createNotification({
                recipient: body.recipientId,
                sender: body.senderId,
                type: "dm_message",
                meta: {
                    conversationId: body.conversationId,
                    messagePreview: body.preview,
                    senderName: body.senderName,
                },
                dedupe: false,
            });
        } else {
            await createNotification({
                recipient: body.recipientId,
                sender: body.senderId,
                type: "group_message",
                groupId: body.groupId,
                meta: {
                    groupName: body.groupName,
                    messagePreview: body.preview,
                    senderName: body.senderName,
                },
                dedupe: false,
            });
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ ok: false });
    }
}
