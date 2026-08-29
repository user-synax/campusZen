"use client";

import { useEffect, useRef, useState } from "react";
import { ensureChatSocket } from "@/lib/chat-socket";
import { getPusherClient } from "@/lib/pusher-client";

/**
 * DM chat realtime hook. Core chat (message:new, typing, presence, read
 * receipts) is now delivered over the Socket.IO backend. DMs previously had NO
 * presence at all — the backend now emits presence:online/offline/snapshot for
 * 1:1 conversations too, and this hook surfaces an `online` boolean.
 *
 * Events NOT yet migrated (dm-message-deleted, dm-message-reaction) are still
 * broadcast by the existing Next.js Pusher routes, so we keep a Pusher
 * subscription for those this pass.
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
        let pusher;
        let channel;

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

                s.on("message:new", onNewMessage);
                s.on("typing:start", onTypingStart);
                s.on("typing:stop", onTypingStop);
                s.on("presence:online", onPresenceOnline);
                s.on("presence:offline", onPresenceOffline);
                s.on("presence:snapshot", onSnapshot);
                s.on("read:receipt", onReadReceipt);

                // Keep Pusher for not-yet-migrated events.
                pusher = getPusherClient();
                if (pusher) {
                    channel = pusher.subscribe(`private-dm-${currentUserId}`);
                    channel.bind("dm-message-deleted", (d) => {
                        if (handlersRef.current.onMessageDeleted)
                            handlersRef.current.onMessageDeleted(d);
                    });
                    channel.bind("dm-message-reaction", (d) => {
                        if (handlersRef.current.onReaction)
                            handlersRef.current.onReaction(d);
                    });
                }

                cleanup = () => {
                    s.off("message:new", onNewMessage);
                    s.off("typing:start", onTypingStart);
                    s.off("typing:stop", onTypingStop);
                    s.off("presence:online", onPresenceOnline);
                    s.off("presence:offline", onPresenceOffline);
                    s.off("presence:snapshot", onSnapshot);
                    s.off("read:receipt", onReadReceipt);
                    if (channel) {
                        channel.unbind_all();
                        pusher.unsubscribe(`private-dm-${currentUserId}`);
                    }
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
