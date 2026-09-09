"use client";

import { useEffect, useRef } from "react";
import { ensureChatSocket } from "@/lib/chat-socket";

/**
 * Subscribe to realtime events on the app-wide Socket.IO connection
 * (replaces all Pusher client subscriptions).
 *
 * Handlers are stable across renders — pass inline closures freely, they are
 * read through a ref and never cause resubscription. Add/remove handlers at
 * any time; the socket itself is a singleton owned by <ChatSocketProvider/>.
 *
 * Available events (server-emitted via user:<id> and conversation rooms):
 *   notification:new   - { notification, text }        (was new-notification)
 *   notification:remove - { dedupeKey }                (was remove-notification)
 *   notification:read  - { notificationId }            (was notifications-read)
 *   group:created      - group                          (was group-created)
 *   group:joined       - group                          (was group-joined)
 *   group:left         - { groupId }                    (was group-left)
 *   group:updated      - populatedGroup                 (was group-updated)
 *   group:deleted      - { groupId, deletedBy }         (was group-deleted)
 *   member:added       - { member, message }            (was member-added)
 *   member:removed     - { userId, message }            (was member-removed)
 *   vc:started         - { groupId, startedBy, roomName } (was vc-started)
 *   vc:update          - { groupId, active, participantCount, participants } (was vc-update)
 *   message:new, typing:start/stop, presence:*, read:receipt (already socket-native)
 *   message:deleted    - { messageId, conversationId?, groupId? }
 *   message:reaction   - { messageId, reactions, conversationId?, groupId? }
 */
export function useRealtime(events = {}, { disabled = false } = {}) {
    const handlersRef = useRef(events);

    useEffect(() => {
        handlersRef.current = events;
    }, [events]);

    useEffect(() => {
        if (disabled) return;
        let socket = null;
        let cancelled = false;
        const bound = [];

        ensureChatSocket()
            .then((s) => {
                if (cancelled) return;
                socket = s;
                for (const eventName of Object.keys(handlersRef.current)) {
                    const handler = (payload) => {
                        handlersRef.current[eventName]?.(payload);
                    };
                    bound.push([eventName, handler]);
                    s.on(eventName, handler);
                }
            })
            .catch(() => {
                // Socket unavailable (offline / backend down) — non-fatal.
            });

        return () => {
            cancelled = true;
            if (socket) {
                for (const [eventName, handler] of bound) {
                    socket.off(eventName, handler);
                }
            }
        };
    }, [disabled]);
}
