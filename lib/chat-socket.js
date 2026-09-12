"use client";

import { io } from "socket.io-client";

// Resolve backend URL:
// - NEXT_PUBLIC_CHAT_BACKEND_URL is the canonical env (exposed to browser).
// - In local dev (window.location.hostname === 'localhost') we allow a
//   localhost:4000 fallback so `bun --cwd backend dev` works without env.
// - In production (e.g. Vercel) localhost fallback would be wrong and causes
//   `ws://localhost:4000` failed spam — so we return null and let the app
//   fall back to HTTP (Next.js API) instead of hammering a dead socket.
function resolveBackendUrl() {
    const env = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL;
    if (env && env.trim()) return env.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        return "http://localhost:4000";
    }
    return null;
}

const BACKEND_URL = resolveBackendUrl();

let socket = null;
let tokenPromise = null;

export async function fetchToken() {
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
let backendUnavailableWarned = false;

export function isChatBackendConfigured() {
    return !!BACKEND_URL;
}

export function getChatBackendUrl() {
    return BACKEND_URL;
}

export async function ensureChatSocket() {
    if (!BACKEND_URL) {
        // In production without env, we deliberately do NOT create a socket that
        // would spam `ws://localhost:4000` errors. The caller should fall back
        // to HTTP. We throw a typed error so callers can distinguish config
        // missing vs network failure.
        const err = new Error("CHAT_BACKEND_NOT_CONFIGURED");
        err.code = "CHAT_BACKEND_NOT_CONFIGURED";
        throw err;
    }
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

    // Suppress the browser's default `WebSocket connection to 'ws://…' failed`
    // spam by handling connect_error early. The underlying failure is still
    // visible in socket.io's attempts, but we avoid an unhandled error and
    // provide a single actionable warning instead of a stack per retry.
    socket.on("connect_error", async (err) => {
        // If the backend is genuinely down (ECONNREFUSED / timeout) the error
        // message will be `websocket error` or `xhr poll error`. In that case
        // we do NOT want to spam token refresh; only refresh on auth errors.
        const msg = String(err?.message || "");
        const isAuthError = msg.includes("Authentication") || msg.includes("jwt") || msg.includes("Unauthorized");
        if (isAuthError) {
            try {
                const fresh = await fetchToken();
                socket.auth = { token: fresh };
                socket.connect();
            } catch {
                // leave disconnected; next ensureChatSocket() will retry
            }
            return;
        }
        // For network / CORS / offline errors, warn once and let the
        // automatic reconnection continue silently. The chat pages will
        // concurrently fall back to HTTP so messaging still works.
        if (!backendUnavailableWarned) {
            backendUnavailableWarned = true;
            console.warn(
                `[chat-socket] backend unreachable at ${BACKEND_URL}. ` +
                    `Chat will use HTTP fallback. ` +
                    `If you are in local dev, run \`bun --cwd backend dev\`. ` +
                    `In production, set NEXT_PUBLIC_CHAT_BACKEND_URL.`,
            );
        }
    });

    socket.on("connect", () => {
        backendUnavailableWarned = false;
    });

    // Also surface a single warning on disconnect without spamming per retry.
    socket.on("disconnect", (reason) => {
        if (reason === "io server disconnect" || reason === "transport close") {
            // Let reconnection handle it; no extra warning.
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
