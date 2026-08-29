import config from "../config.js";

/**
 * Best-effort server-to-server call into the Next.js app to create the
 * in-app/push notification for a chat message. Notifications (Pusher + web push)
 * stay owned by the Next.js stack, so we trigger them via a dedicated internal
 * route there. Failures here are swallowed — chat must work even if notifying
 * fails. No-ops if CHAT_BACKEND_SECRET is not configured.
 */
export async function notifyChatMessage({ kind, sender, recipient, convId, groupId, groupName, preview, senderName }) {
    if (!config.notifySecret || !config.nextAppUrl) return;
    try {
        const url =
            kind === "dm"
                ? `${config.nextAppUrl}/api/chat/notify`
                : `${config.nextAppUrl}/api/chat/notify`;
        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-chat-backend-secret": config.notifySecret,
            },
            body: JSON.stringify({
                kind,
                senderId: String(sender),
                recipientId: String(recipient),
                conversationId: convId ? String(convId) : undefined,
                groupId: groupId ? String(groupId) : undefined,
                groupName: groupName ? String(groupName) : undefined,
                preview,
                senderName,
            }),
        });
    } catch (err) {
        // Best-effort only.
        console.error("[notifyChatMessage] failed:", err.message);
    }
}
