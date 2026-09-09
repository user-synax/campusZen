"use client";

import { useEffect } from "react";
import useUser from "@/hooks/useUser";
import { ensureChatSocket, disconnectChatSocket, isChatBackendConfigured } from "@/lib/chat-socket";

/**
 * Establishes the chat Socket.IO connection at the app level (inside the
 * authenticated (main) layout) so the current user is reported as online and
 * receives presence/messages even when they are NOT on a /chats route. The
 * socket is a module singleton that is never torn down on navigation — it only
 * disconnects on logout, so others keep seeing the user's online status until
 * the app is closed.
 */
export default function ChatSocketProvider() {
    const { user } = useUser();

    useEffect(() => {
        if (user) {
            if (!isChatBackendConfigured()) {
                // No backend configured (e.g. production without env) — remain in
                // HTTP fallback mode. The chat pages will POST via Next.js API
                // (app/api/dms|groups) and poll history; no socket is needed.
                return;
            }
            ensureChatSocket().catch((err) => {
                // CHAT_BACKEND_NOT_CONFIGURED is expected in mis-configured env;
                // network errors are already warned once inside chat-socket.js
                if (err?.code !== "CHAT_BACKEND_NOT_CONFIGURED") {
                    // Silent — socket will auto-retry and pages fallback to HTTP
                }
            });
        } else {
            disconnectChatSocket();
        }
    }, [user?._id]);

    return null;
}
