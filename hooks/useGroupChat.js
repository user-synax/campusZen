"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher-client";

export function useGroupChat(groupId, handlers = {}) {
    const channelRef = useRef(null);
    const presenceChannelRef = useRef(null);
    const handlersRef = useRef(handlers);
    const [onlineMembers, setOnlineMembers] = useState([]);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!groupId) return;

        const pusher = getPusherClient();
        if (!pusher) return;

        // Subscribe to private channel for this group
        const channelName = `private-group-${groupId}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        channel.bind("pusher:subscription_error", (status) => {
            if (status === 403 || status === 401) {
                console.error("[Pusher] Auth failed. Check membership.");
            }
        });

        // Bind all events with a wrapper that calls the current handler ref
        const bindEvent = (event, handlerKey) => {
            channel.bind(event, (data) => {
                if (handlersRef.current[handlerKey]) {
                    handlersRef.current[handlerKey](data);
                }
            });
        };

        bindEvent("new-message", "onNewMessage");
        bindEvent("message-deleted", "onMessageDeleted");
        bindEvent("typing-start", "onTypingStart");
        bindEvent("typing-stop", "onTypingStop");
        bindEvent("member-added", "onMemberAdded");
        bindEvent("member-removed", "onMemberRemoved");
        bindEvent("group-deleted", "onGroupDeleted");
        bindEvent("group-updated", "onGroupUpdated");
        bindEvent("message-reaction", "onReaction");

        // Subscribe to presence channel for online status
        const presenceChannelName = `presence-group-${groupId}`;
        const presenceChannel = pusher.subscribe(presenceChannelName);
        presenceChannelRef.current = presenceChannel;

        presenceChannel.bind("pusher:subscription_succeeded", (members) => {
            const membersArray = [];
            members.each((member) => {
                membersArray.push(member.info);
            });
            setOnlineMembers(membersArray);
        });

        presenceChannel.bind("pusher:member_added", (member) => {
            setOnlineMembers((prev) => {
                if (prev.some((m) => m.id === member.info.id)) return prev;
                return [...prev, member.info];
            });
        });

        presenceChannel.bind("pusher:member_removed", (member) => {
            setOnlineMembers((prev) => prev.filter((m) => m.id !== member.id));
        });

        presenceChannel.bind("pusher:subscription_error", () => {
            // Presence channel auth failed — non-critical, ignore silently
        });

        // Cleanup on unmount or groupId change
        return () => {
            channel.unbind_all();
            pusher.unsubscribe(channelName);
            channelRef.current = null;

            presenceChannel.unbind_all();
            pusher.unsubscribe(presenceChannelName);
            presenceChannelRef.current = null;
            setOnlineMembers([]);
        };
    }, [groupId]);

    return { channelRef, onlineMembers };
}
