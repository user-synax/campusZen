"use client";

import { useEffect } from "react";
import useUser from "@/hooks/useUser";
import { ensureChatSocket, disconnectChatSocket } from "@/lib/chat-socket";

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
            ensureChatSocket().catch(() => {});
        } else {
            disconnectChatSocket();
        }
    }, [user?._id]);

    return null;
}
