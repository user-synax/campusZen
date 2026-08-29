"use client";

import { io } from "socket.io-client";

// Dev fallback: if the env var isn't set we assume the backend runs locally
// on :4000. In production NEXT_PUBLIC_CHAT_BACKEND_URL must be the Render URL.
const BACKEND_URL =
    process.env.NEXT_PUBLIC_CHAT_BACKEND_URL || "http://localhost:4000";

let socket = null;
let tokenPromise = null;

async function fetchToken() {
    if (!tokenPromise) {
        tokenPromise = fetch("/api/chat-socket-token", { method: "POST" })
            .then((res) => {
                if (!res.ok) throw new Error("token fetch failed");
                return res.json();
            })
            .then((data) => data.token)
            .finally(() => {
                // Allow a later call to refetch if needed.
                tokenPromise = null;
            });
    }
    return tokenPromise;
}

/**
 * Returns the singleton chat socket, connecting on first use. The socket is
 * authenticated via the short-lived token from /api/chat-socket-token passed in
 * the handshake `auth` payload. On a connect_error (e.g. expired token) we
 * refetch a fresh token and reconnect.
 *
 * Reconnection is automatic and aggressive so the presence/online state stays
 * alive for the whole app session (the connection is established app-wide by
 * <ChatSocketProvider/> and only torn down on logout).
 */
export async function ensureChatSocket() {
    if (socket && (socket.connected || socket.connecting)) {
        return socket;
    }
    const token = await fetchToken();
    socket = io(BACKEND_URL, {
        transports: ["websocket"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 20000,
    });

    socket.on("connect_error", async () => {
        // Token may have expired between mint and handshake; refresh + reconnect.
        try {
            const fresh = await fetchToken();
            socket.auth = { token: fresh };
            socket.connect();
        } catch {
            // leave disconnected; next ensureChatSocket() will retry
        }
    });

    return socket;
}

export function getChatSocket() {
    return socket;
}

/** Tear down the singleton. Used on logout so we stop reporting presence. */
export function disconnectChatSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    tokenPromise = null;
}
