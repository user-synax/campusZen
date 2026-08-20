"use client";

import { useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher-client";

export function useUserChannel(userId, handlers = {}) {
    const channelRef = useRef(null);
    const dmChannelRef = useRef(null);
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!userId) return;

        const pusher = getPusherClient();
        if (!pusher) return;

        // Subscribe to user channel (group events)
        const channelName = `private-user-${userId}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        channel.bind("pusher:subscription_error", (status) => {
            if (status === 403 || status === 401) {
                console.error("[Pusher] Auth failed for user channel.");
            } else {
                console.error(`[Pusher] User channel subscription error: status ${status}`);
            }
        });

        channel.bind("pusher:subscription_succeeded", () => {});

        const bindEvent = (event, handlerKey) => {
            channel.bind(event, (data) => {
                if (handlersRef.current[handlerKey]) {
                    handlersRef.current[handlerKey](data);
                }
            });
        };

        bindEvent("group-created", "onGroupCreated");
        bindEvent("group-joined", "onGroupJoined");
        bindEvent("group-left", "onGroupLeft");
        bindEvent("new-group-message", "onNewGroupMessage");
        bindEvent("vc-started", "onVcStarted");
        bindEvent("vc-update", "onVcUpdate");

        // Subscribe to DM channel (all DMs land on this one channel)
        const dmChannelName = `private-dm-${userId}`;
        const dmChannel = pusher.subscribe(dmChannelName);
        dmChannelRef.current = dmChannel;

        dmChannel.bind("pusher:subscription_error", (status) => {
            if (status === 403 || status === 401) {
                console.error("[Pusher] Auth failed for DM channel.");
            } else {
                console.error(`[Pusher] DM channel subscription error: status ${status}`);
            }
        });

        dmChannel.bind("pusher:subscription_succeeded", () => {});

        dmChannel.bind("new-dm-message", (data) => {
            if (handlersRef.current.onNewDMMessage) {
                handlersRef.current.onNewDMMessage(data);
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            channelRef.current = null;

            dmChannel.unbind_all();
            pusher.unsubscribe(dmChannelName);
            dmChannelRef.current = null;
        };
    }, [userId]);

    return channelRef;
}
