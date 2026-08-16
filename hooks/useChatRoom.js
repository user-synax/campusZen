"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * Shared chat room logic used by both group and DM chat pages.
 *
 * @param {Object} config
 * @param {string} config.id - groupId or conversationId
 * @param {string} config.type - "group" | "dm"
 * @param {Object} config.endpoints - { fetchInfo, fetchMessages, markRead }
 * @param {Function} config.parseInfo - (rawData) => parsed info object
 * @param {Function} config.sendMessage - (body) => POST to correct endpoint, returns Response
 * @param {Function} config.onError - (message) => toast or similar
 */
export default function useChatRoom({
    id,
    type,
    endpoints,
    parseInfo,
    sendMessage,
    onError,
}) {
    const [messages, setMessages] = useState([]);
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    const messagesContainerRef = useRef(null);
    const bottomRef = useRef(null);
    const pendingTimeoutsRef = useRef({});
    const replyingToRef = useRef(null);

    // Keep replyingToRef in sync so handleSend always reads the latest value
    replyingToRef.current = replyingTo;

    // ━━━ Virtualizer ━━━
    const messagesVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => messagesContainerRef.current,
        estimateSize: () => 70,
        overscan: 10,
    });

    // ━━━ Fetching ━━━
    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [infoRes, messagesRes] = await Promise.all([
                fetch(endpoints.fetchInfo),
                fetch(`${endpoints.fetchMessages}?limit=30`),
            ]);

            const infoData = await infoRes.json();
            const messagesData = await messagesRes.json();

            if (infoRes.ok) setInfo(parseInfo(infoData));
            if (messagesRes.ok) {
                setMessages(messagesData.messages);
                setHasMore(messagesData.hasMore);
                setCursor(messagesData.nextCursor);
            }

            if (endpoints.markRead) {
                fetch(endpoints.markRead, { method: "POST" }).catch(() => {});
            }

            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Chat data fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [id, endpoints, parseInfo]);

    useEffect(() => {
        if (id) fetchInitialData();
    }, [id, fetchInitialData]);

    // Clean up pending recovery timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(pendingTimeoutsRef.current).forEach(clearTimeout);
            pendingTimeoutsRef.current = {};
        };
    }, []);

    // ━━━ Scroll helpers ━━━
    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const isNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        return (
            container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
            150
        );
    }, []);

    // ━━━ Load older messages ━━━
    const loadOlderMessages = useCallback(async () => {
        if (!cursor || loadingOlder) return;
        const savedScrollHeight = messagesContainerRef.current.scrollHeight;
        setLoadingOlder(true);
        try {
            const res = await fetch(
                `${endpoints.fetchMessages}?cursor=${cursor}&limit=30`,
            );
            const data = await res.json();
            if (res.ok) {
                setMessages((prev) => [...data.messages, ...prev]);
                setCursor(data.nextCursor);
                setHasMore(data.hasMore);
                requestAnimationFrame(() => {
                    if (messagesContainerRef.current) {
                        const newScrollHeight =
                            messagesContainerRef.current.scrollHeight;
                        messagesContainerRef.current.scrollTop =
                            newScrollHeight - savedScrollHeight;
                    }
                });
            }
        } catch (error) {
            console.error("Load older error:", error);
        } finally {
            setLoadingOlder(false);
        }
    }, [id, cursor, loadingOlder, endpoints.fetchMessages]);

    // ━━━ Refetch latest (recovery) ━━━
    const refetchLatestMessages = useCallback(async () => {
        try {
            const res = await fetch(`${endpoints.fetchMessages}?limit=30`);
            const data = await res.json();
            if (res.ok) {
                setMessages(data.messages);
                setHasMore(data.hasMore);
                setCursor(data.nextCursor);
            }
        } catch (err) {
            // Silent — will be retried by next optimistic timeout or user refresh
        }
    }, [id, endpoints.fetchMessages]);

    // ━━━ Real-time: new message (with optimistic replace) ━━━
    const onNewMessage = useCallback(
        (message) => {
            setMessages((prev) => {
                // 1. If message has clientId, try to replace optimistic message
                if (message.clientId) {
                    const index = prev.findIndex(
                        (m) => m.clientId === message.clientId,
                    );
                    if (index !== -1) {
                        if (pendingTimeoutsRef.current[message.clientId]) {
                            clearTimeout(
                                pendingTimeoutsRef.current[message.clientId],
                            );
                            delete pendingTimeoutsRef.current[message.clientId];
                        }
                        const next = [...prev];
                        next[index] = { ...message, isOptimistic: false };
                        return next;
                    }
                }

                // 2. Avoid duplicates if already added
                if (prev.some((m) => m._id === message._id)) return prev;
                return [...prev, message];
            });

            if (isNearBottom()) {
                setTimeout(scrollToBottom, 50);
            }

            if (endpoints.markRead) {
                fetch(endpoints.markRead, { method: "POST" }).catch(() => {});
            }
        },
        [id, isNearBottom, scrollToBottom, endpoints.markRead],
    );

    // ━━━ Send message ━━━
    const handleSend = useCallback(
        async (currentUser, content, type = "text", imageUrl = "") => {
            if (type === "text" && !content.trim()) return;
            if (type === "image" && !imageUrl) return;

            const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const replyTarget = replyingToRef.current;
            setReplyingTo(null);

            // Resolve sender's equipped bubble theme from user's shop inventory
            let senderBubbleTheme = null;
            const equippedBubbleItemId = currentUser.equippedShopItems?.chat_bubble;
            if (equippedBubbleItemId) {
                const ownedBubble = (currentUser.ownedShopItems || []).find(
                    (o) => o.itemId?.toString() === equippedBubbleItemId.toString(),
                );
                if (ownedBubble?.slug) senderBubbleTheme = ownedBubble.slug;
            }

            const optimisticMsg = {
                _id: clientId,
                clientId,
                content: type === "text" ? content : "",
                type,
                imageUrl: type === "image" ? imageUrl : "",
                sender: {
                    _id: currentUser._id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    username: currentUser.username,
                    bubbleTheme: senderBubbleTheme,
                },
                replyTo: replyTarget
                    ? {
                          _id: replyTarget._id,
                          content: replyTarget.content,
                          type: replyTarget.type,
                          sender: replyTarget.sender,
                      }
                    : null,
                createdAt: new Date().toISOString(),
                isOptimistic: true,
                reactions: [],
            };

            // Add to UI immediately
            setMessages((prev) => [...prev, optimisticMsg]);
            setTimeout(scrollToBottom, 50);

            try {
                const res = await sendMessage({
                    content,
                    type,
                    imageUrl,
                    clientId,
                    replyTo: replyTarget?._id,
                });

                if (res.ok) {
                    // Start recovery timeout — if Pusher confirmation doesn't arrive in 7s, refetch
                    pendingTimeoutsRef.current[clientId] = setTimeout(() => {
                        setMessages((prev) => {
                            const stuck = prev.some(
                                (m) =>
                                    m.clientId === clientId && m.isOptimistic,
                            );
                            if (stuck) refetchLatestMessages();
                            return prev;
                        });
                        delete pendingTimeoutsRef.current[clientId];
                    }, 7000);
                } else {
                    const data = await res.json();
                    onError(data.message || "Failed to send message");
                    setMessages((prev) =>
                        prev.filter((m) => m.clientId !== clientId),
                    );
                }
            } catch (error) {
                onError("Network error");
                setMessages((prev) =>
                    prev.filter((m) => m.clientId !== clientId),
                );
            }
        },
        [scrollToBottom, refetchLatestMessages, sendMessage, onError],
    );

    // ━━━ Stable key for virtualized rows (M3 fix) ━━━
    const getMessageKey = useCallback((message) => {
        return message.clientId || message._id;
    }, []);

    return {
        // State
        messages,
        setMessages,
        info,
        setInfo,
        loading,
        loadingOlder,
        hasMore,
        replyingTo,
        setReplyingTo,

        // Refs
        messagesContainerRef,
        bottomRef,
        pendingTimeoutsRef,

        // Virtualizer
        messagesVirtualizer,

        // Actions
        fetchInitialData,
        loadOlderMessages,
        scrollToBottom,
        isNearBottom,
        refetchLatestMessages,
        onNewMessage,
        handleSend,
        getMessageKey,

        // Expose type for pages
        type,
    };
}
