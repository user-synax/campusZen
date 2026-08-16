"use client";

import { useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher-client";

export function useDMChat(conversationId, currentUserId, handlers = {}) {
    const channelRef = useRef(null);
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!conversationId || !currentUserId) return;

        const pusher = getPusherClient();
        if (!pusher) return;

        const channelName = `private-dm-${currentUserId}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        channel.bind("pusher:subscription_error", (status) => {
            if (status === 403 || status === 401) {
                console.error("[Pusher] Auth failed.");
            }
        });

        const bindEvent = (event, handlerKey) => {
            channel.bind(event, (data) => {
                if (data.conversationId !== conversationId) return;
                if (handlersRef.current[handlerKey]) {
                    handlersRef.current[handlerKey](data);
                }
            });
        };

        bindEvent("new-dm-message", "onNewMessage");
        bindEvent("dm-typing-start", "onTypingStart");
        bindEvent("dm-typing-stop", "onTypingStop");
        bindEvent("dm-message-deleted", "onMessageDeleted");
        bindEvent("dm-message-reaction", "onReaction");

        return () => {
            // Only unbind our handlers — do NOT unsubscribe from the channel.
            // useUserChannel (layout-level) also subscribes to private-dm-{userId}
            // and would lose its listeners if we unsubscribed here.
            channel.unbind_all();
            channelRef.current = null;
        };
    }, [conversationId, currentUserId]);

    return channelRef;
}
