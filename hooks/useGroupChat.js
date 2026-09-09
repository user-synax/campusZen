"use client";

import { useEffect, useRef, useState } from "react";
import { ensureChatSocket } from "@/lib/chat-socket";
import useUser from "@/hooks/useUser";

/**
 * Group chat realtime hook. All events are now delivered over the Socket.IO
 * backend — no Pusher dependency.
 *
 * Server emits (via group: room + user: personal rooms):
 *   message:new, message:deleted, message:reaction,
 *   typing:start, typing:stop, presence:online/offline/snapshot,
 *   read:receipt, member:added, member:removed,
 *   group:deleted, group:updated, vc:started, vc:update
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
                const onMessageDeleted = (data) => {
                    if (handlersRef.current.onMessageDeleted) {
                        handlersRef.current.onMessageDeleted(data);
                    }
                };
                const onMessageReaction = (data) => {
                    if (handlersRef.current.onReaction) {
                        handlersRef.current.onReaction(data);
                    }
                };
                const onMemberAdded = (data) => {
                    if (handlersRef.current.onMemberAdded) {
                        handlersRef.current.onMemberAdded(data);
                    }
                };
                const onMemberRemoved = (data) => {
                    if (handlersRef.current.onMemberRemoved) {
                        handlersRef.current.onMemberRemoved(data);
                    }
                };
                const onGroupDeleted = (data) => {
                    if (handlersRef.current.onGroupDeleted) {
                        handlersRef.current.onGroupDeleted(data);
                    }
                };
                const onGroupUpdated = (data) => {
                    if (handlersRef.current.onGroupUpdated) {
                        handlersRef.current.onGroupUpdated(data);
                    }
                };
                const onVcStarted = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onVcStarted) {
                        handlersRef.current.onVcStarted(data);
                    }
                };
                const onVcUpdate = (data) => {
                    if (data.groupId === groupId && handlersRef.current.onVcUpdate) {
                        handlersRef.current.onVcUpdate(data);
                    }
                };

                // Socket-native events (via group room)
                s.on("message:new", onNewMessage);
                s.on("message:deleted", onMessageDeleted);
                s.on("message:reaction", onMessageReaction);
                s.on("typing:start", onTypingStart);
                s.on("typing:stop", onTypingStop);
                s.on("presence:online", onPresenceOnline);
                s.on("presence:offline", onPresenceOffline);
                s.on("presence:snapshot", onSnapshot);
                s.on("read:receipt", onReadReceipt);
                s.on("member:added", onMemberAdded);
                s.on("member:removed", onMemberRemoved);
                s.on("group:deleted", onGroupDeleted);
                s.on("group:updated", onGroupUpdated);
                s.on("vc:started", onVcStarted);
                s.on("vc:update", onVcUpdate);

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
                    s.off("member:added", onMemberAdded);
                    s.off("member:removed", onMemberRemoved);
                    s.off("group:deleted", onGroupDeleted);
                    s.off("group:updated", onGroupUpdated);
                    s.off("vc:started", onVcStarted);
                    s.off("vc:update", onVcUpdate);
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
