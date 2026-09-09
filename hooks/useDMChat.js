"use client";

import { useEffect, useRef, useState } from "react";
import { ensureChatSocket } from "@/lib/chat-socket";

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
                const onMessageReaction = (data) => {
                    if (data.conversationId === conversationId && handlersRef.current.onReaction) {
                        handlersRef.current.onReaction(data);
                    }
                };

                s.on("message:new", onNewMessage);
                s.on("message:deleted", onMessageDeleted);
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
