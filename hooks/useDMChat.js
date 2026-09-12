"use client";

import { useEffect, useRef, useState } from "react";
import {
    ensureChatSocket,
    isChatBackendConfigured,
    getChatBackendUrl,
} from "@/lib/chat-socket";

/**
 * Helper: fetch DM inbox directly from Express backend when configured,
 * otherwise fallback to Next shim. Mirrors Task 7 frontend feature flag.
 * Token is minted via POST /api/chat-socket-token (short-lived 60s JWT).
 */
export async function fetchDMInboxDirect() {
    if (isChatBackendConfigured()) {
        try {
            const tokenRes = await fetch("/api/chat-socket-token", { method: "POST" });
            if (tokenRes.ok) {
                const { token } = await tokenRes.json();
                const backendUrl = getChatBackendUrl();
                const r = await fetch(`${backendUrl}/conversations`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (r.ok) return await r.json();
            }
        } catch (_) {
            // fallback to Next shim below
        }
    }
    const r = await fetch("/api/dms");
    return r.json();
}

/**
 * DM chat realtime hook. All events are now delivered over the Socket.IO
 * backend — no Pusher dependency.
 *
 * Server emits (via dm: room + user: personal rooms):
 *   message:new, message:deleted, message:reaction,
 *   typing:start, typing:stop, presence:online/offline/snapshot, read:receipt
 */
export function useDMChat(conversationId, currentUserId, handlers = {}) {
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const [online, setOnline] = useState(false);

    useEffect(() => {
        if (!conversationId || !currentUserId) return;
        let active = true;
        let socket;

        ensureChatSocket()
            .then((s) => {
                if (!active) return;
                socket = s;

                const onNewMessage = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        handlersRef.current.onNewMessage
                    ) {
                        handlersRef.current.onNewMessage(data);
                    }
                };
                const onTypingStart = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        handlersRef.current.onTypingStart
                    ) {
                        handlersRef.current.onTypingStart(data);
                    }
                };
                const onTypingStop = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        handlersRef.current.onTypingStop
                    ) {
                        handlersRef.current.onTypingStop(data);
                    }
                };
                const onPresenceOnline = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        data.user?.id !== currentUserId
                    ) {
                        setOnline(true);
                    }
                };
                const onPresenceOffline = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        data.user?.id !== currentUserId
                    ) {
                        setOnline(false);
                    }
                };
                const onSnapshot = (data) => {
                    if (data.conversationId === conversationId) {
                        setOnline((data.online || []).length > 0);
                    }
                };
                const onReadReceipt = (data) => {
                    if (
                        data.conversationId === conversationId &&
                        handlersRef.current.onReadReceipt
                    ) {
                        handlersRef.current.onReadReceipt(data);
                    }
                };
                const onMessageDeleted = (data) => {
                    if (data.conversationId === conversationId && handlersRef.current.onMessageDeleted) {
                        handlersRef.current.onMessageDeleted(data);
                    }
                };
                const onMessageEdited = (data) => {
                    if (data.conversationId === conversationId && handlersRef.current.onMessageEdited) {
                        handlersRef.current.onMessageEdited(data);
                    }
                };
                const onMessageReaction = (data) => {
                    if (data.conversationId === conversationId && handlersRef.current.onReaction) {
                        handlersRef.current.onReaction(data);
                    }
                };

                s.on("message:new", onNewMessage);
                s.on("message:deleted", onMessageDeleted);
                s.on("message:edited", onMessageEdited);
                s.on("message:reaction", onMessageReaction);
                s.on("typing:start", onTypingStart);
                s.on("typing:stop", onTypingStop);
                s.on("presence:online", onPresenceOnline);
                s.on("presence:offline", onPresenceOffline);
                s.on("presence:snapshot", onSnapshot);
                s.on("read:receipt", onReadReceipt);

                cleanup = () => {
                    s.off("message:new", onNewMessage);
                    s.off("message:deleted", onMessageDeleted);
                    s.off("message:edited", onMessageEdited);
                    s.off("message:reaction", onMessageReaction);
                    s.off("typing:start", onTypingStart);
                    s.off("typing:stop", onTypingStop);
                    s.off("presence:online", onPresenceOnline);
                    s.off("presence:offline", onPresenceOffline);
                    s.off("presence:snapshot", onSnapshot);
                    s.off("read:receipt", onReadReceipt);
                };
            })
            .catch(() => {});

        let cleanup = () => {};
        return () => {
            active = false;
            cleanup();
        };
    }, [conversationId, currentUserId]);

    return { online };
}
