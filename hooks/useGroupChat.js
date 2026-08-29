"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ensureChatSocket } from "@/lib/chat-socket";
import { getPusherClient } from "@/lib/pusher-client";
import useUser from "@/hooks/useUser";

/**
 * Group chat realtime hook. Core chat (message:new, typing, presence, read
 * receipts) is now delivered over the Socket.IO backend instead of Pusher.
 *
 * Events NOT yet migrated (message-deleted, message-reaction, member-added,
 * member-removed, group-updated, group-deleted) are still broadcast by the
 * existing Next.js Pusher routes, so we keep a Pusher subscription for those to
 * avoid regressing shipped features this pass. They can be moved to the socket
 * backend in a follow-up.
 */
export function useGroupChat(groupId, handlers = {}) {
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const [onlineMembers, setOnlineMembers] = useState([]);
    const { user: me } = useUser();
    const currentUserId = me?._id;

    useEffect(() => {
        if (!groupId) return;
        let active = true;
        let socket;
        let pusher;
        let channel;

        const upsertOnline = (user) =>
            setOnlineMembers((prev) => {
                if (!user || user.id === currentUserId) return prev;
                if (prev.some((m) => m.id === user.id)) return prev;
                return [...prev, user];
            });

        ensureChatSocket()
            .then((s) => {
                if (!active) return;
                socket = s;

                const onNewMessage = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onNewMessage) {
                        handlersRef.current.onNewMessage(data);
                    }
                };
                const onTypingStart = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onTypingStart) {
                        handlersRef.current.onTypingStart(data);
                    }
                };
                const onTypingStop = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onTypingStop) {
                        handlersRef.current.onTypingStop(data);
                    }
                };
                const onPresenceOnline = (data) => {
                    if (data.groupId === groupId) upsertOnline(data.user);
                };
                const onPresenceOffline = (data) => {
                    if (data.groupId === groupId && data.user?.id !== currentUserId) {
                        setOnlineMembers((prev) =>
                            prev.filter((m) => m.id !== data.user.id),
                        );
                    }
                };
                const onSnapshot = (data) => {
                    if (data.groupId === groupId) {
                        setOnlineMembers(
                            (data.online || []).filter(
                                (m) => m.id !== currentUserId,
                            ),
                        );
                    }
                };
                const onReadReceipt = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onReadReceipt) {
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
                    channel = pusher.subscribe(`private-group-${groupId}`);
                    const bind = (event, handlerKey) =>
                        channel.bind(event, (d) => {
                            if (handlersRef.current[handlerKey]) {
                                handlersRef.current[handlerKey](d);
                            }
                        });
                    bind("message-deleted", "onMessageDeleted");
                    bind("message-reaction", "onReaction");
                    bind("member-added", "onMemberAdded");
                    bind("member-removed", "onMemberRemoved");
                    bind("group-deleted", "onGroupDeleted");
                    bind("group-updated", "onGroupUpdated");
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
                        pusher.unsubscribe(`private-group-${groupId}`);
                    }
                };
            })
            .catch(() => {});

        let cleanup = () => {};
        return () => {
            active = false;
            cleanup();
        };
    }, [groupId]);

    return { onlineMembers };
}
