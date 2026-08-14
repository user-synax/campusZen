"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import Image from "next/image";
import { ArrowLeft, Info, Loader2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";
import { useGroupChat } from "@/hooks/useGroupChat";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import GroupInfoSheet from "@/components/chat/GroupInfoSheet";

export default function ChatRoomPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const groupId = params.groupId;
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [messages, setMessages] = useState([]);
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [infoOpen, setInfoOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);

    const messagesContainerRef = useRef(null);
    const bottomRef = useRef(null);
    const pendingTimeoutsRef = useRef({});

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
            const [groupRes, messagesRes] = await Promise.all([
                fetch(`/api/groups/${groupId}`),
                fetch(`/api/groups/${groupId}/messages?limit=30`),
            ]);

            const groupData = await groupRes.json();
            const messagesData = await messagesRes.json();

            if (groupRes.ok) setGroup(groupData);
            if (messagesRes.ok) {
                setMessages(messagesData.messages);
                setHasMore(messagesData.hasMore);
                setCursor(messagesData.nextCursor);
            }

            // Mark as read
            fetch(`/api/groups/${groupId}/read`, { method: "POST" }).catch(
                () => {},
            );

            // Initial scroll
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Chat data fetch error:", error);
            toast.error("Failed to load chat");
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        if (groupId) fetchInitialData();
    }, [groupId, fetchInitialData]);

    // Clean up pending recovery timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(pendingTimeoutsRef.current).forEach(clearTimeout);
            pendingTimeoutsRef.current = {};
        };
    }, []);

    const loadOlderMessages = async () => {
        if (!cursor || loadingOlder) return;

        const savedScrollHeight = messagesContainerRef.current.scrollHeight;
        setLoadingOlder(true);

        try {
            const res = await fetch(
                `/api/groups/${groupId}/messages?cursor=${cursor}&limit=30`,
            );
            const data = await res.json();

            if (res.ok) {
                setMessages((prev) => [...data.messages, ...prev]);
                setCursor(data.nextCursor);
                setHasMore(data.hasMore);

                // Maintain scroll position
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
    };

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const refetchLatestMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/groups/${groupId}/messages?limit=30`);
            const data = await res.json();
            if (res.ok) {
                setMessages(data.messages);
                setHasMore(data.hasMore);
                setCursor(data.nextCursor);
            }
        } catch (err) {
            // Silent — will be retried by next optimistic timeout or user refresh
        }
    }, [groupId]);

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

    // ━━━ Real-time Handlers ━━━
    const onNewMessage = useCallback(
        (message) => {
            setMessages((prev) => {
                // 1. If message has clientId, try to replace optimistic message
                if (message.clientId) {
                    const index = prev.findIndex(
                        (m) => m.clientId === message.clientId,
                    );
                    if (index !== -1) {
                        // Clear the recovery timeout for this message
                        if (pendingTimeoutsRef.current[message.clientId]) {
                            clearTimeout(pendingTimeoutsRef.current[message.clientId]);
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

            // Auto-scroll if near bottom
            if (isNearBottom()) {
                setTimeout(scrollToBottom, 50);
            }

            // Mark as read
            fetch(`/api/groups/${groupId}/read`, { method: "POST" }).catch(
                () => {},
            );
        },
        [groupId],
    );

    const onMessageDeleted = useCallback(({ messageId }) => {
        setMessages((prev) =>
            prev.map((m) =>
                m._id === messageId
                    ? { ...m, isDeleted: true, content: "", imageUrl: "" }
                    : m,
            ),
        );
    }, []);

    const onTypingStart = useCallback(
        ({ userId, userName, userAvatar }) => {
            if (userId === currentUser?._id) return;
            setTypingUsers((prev) => ({
                ...prev,
                [userId]: { name: userName, avatar: userAvatar },
            }));
        },
        [currentUser],
    );

    const onTypingStop = useCallback(({ userId }) => {
        setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    }, []);

    const onReaction = useCallback(({ messageId, reactions }) => {
        setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)),
        );
    }, []);

    const onGroupDeleted = useCallback(() => {
        toast.error("This group was deleted");
        router.push("/chats");
    }, [router]);

    const onGroupUpdated = useCallback(({ name, avatar, description }) => {
        setGroup((prev) => {
            if (!prev) return prev;
            return { ...prev, ...(name && { name }), ...(avatar !== undefined && { avatar }), ...(description !== undefined && { description }) };
        });
    }, []);

    const onMemberRemoved = useCallback(
        ({ userId }) => {
            if (userId === currentUser?._id) {
                toast.error("You were removed from this group");
                router.push("/chats");
            } else {
                // Refetch members
                fetch(`/api/groups/${groupId}`)
                    .then((res) => res.json())
                    .then(setGroup)
                    .catch(() => {});
            }
        },
        [currentUser, groupId, router],
    );

    const onMemberAdded = useCallback(() => {
        fetch(`/api/groups/${groupId}`)
            .then((res) => res.json())
            .then(setGroup)
            .catch(() => {});
    }, [groupId]);

    const { onlineMembers } = useGroupChat(groupId, {
        onNewMessage,
        onMessageDeleted,
        onTypingStart,
        onTypingStop,
        onReaction,
        onGroupDeleted,
        onGroupUpdated,
        onMemberRemoved,
        onMemberAdded,
    });

    // ━━━ Actions ━━━
    const handleSend = useCallback(
        async (content, type = "text", imageUrl = "") => {
            if (type === "text" && !content.trim()) return;
            if (type === "image" && !imageUrl) return;

            const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const replyTarget = replyingTo;
            setReplyingTo(null);

            // Optimistic message
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
                // We don't use setSending(true) here because we want the input to stay active for the next message
                const res = await fetch(`/api/groups/${groupId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content,
                        type,
                        imageUrl,
                        clientId,
                        replyTo: replyTarget?._id,
                    }),
                });

                if (res.ok) {
                    // Start recovery timeout — if Pusher confirmation doesn't arrive in 7s, refetch
                    pendingTimeoutsRef.current[clientId] = setTimeout(() => {
                        setMessages((prev) => {
                            const stuck = prev.some((m) => m.clientId === clientId && m.isOptimistic);
                            if (stuck) refetchLatestMessages();
                            return prev;
                        });
                        delete pendingTimeoutsRef.current[clientId];
                    }, 7000);
                } else {
                    const data = await res.json();
                    toast.error(data.message || "Failed to send message");
                    // Remove optimistic message on error
                    setMessages((prev) =>
                        prev.filter((m) => m.clientId !== clientId),
                    );
                }
            } catch (error) {
                toast.error("Network error");
                setMessages((prev) =>
                    prev.filter((m) => m.clientId !== clientId),
                );
            }
        },
        [replyingTo, currentUser, groupId, scrollToBottom],
    );

    const handleTyping = useCallback(
        (isTyping) => {
            fetch(`/api/groups/${groupId}/typing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isTyping }),
            }).catch(() => {});
        },
        [groupId],
    );

    const handleDeleteMessage = useCallback(
        async (messageId) => {
            try {
                const res = await fetch(
                    `/api/groups/${groupId}/messages/${messageId}`,
                    {
                        method: "DELETE",
                    },
                );
                if (!res.ok) toast.error("Failed to delete message");
            } catch (error) {
                toast.error("Error deleting message");
            }
        },
        [groupId],
    );

    const handleReact = useCallback(
        async (messageId, emoji) => {
            try {
                const res = await fetch(
                    `/api/groups/${groupId}/messages/${messageId}/react`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emoji }),
                    },
                );
                if (!res.ok) toast.error("Failed to react");
            } catch (error) {
                toast.error("Error reacting");
            }
        },
        [groupId],
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* ━━━ Chat Header ━━━ */}
            <div className="flex-shrink-0 bg-background/80 backdrop-blur border-b border-border z-10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/chats")}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 
                          border border-border flex items-center justify-center font-bold flex-shrink-0 overflow-hidden relative"
                    >
                        {group?.avatar ? (
                            <Image
                                src={group.avatar}
                                alt={group.name}
                                width={36}
                                height={36}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            group?.name?.charAt(0)?.toUpperCase()
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                            {group?.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                            {group?.members?.length} members
                            {onlineMembers.length > 0 && (
                                <span className="ml-1">
                                    · <span className="text-green-500">{onlineMembers.length} online</span>
                                </span>
                            )}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setInfoOpen(true)}
                        className="rounded-full"
                    >
                        <Info className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* ━━━ Messages Area ━━━ */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar min-h-0"
            >
                {hasMore && (
                    <div className="text-center py-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadOlderMessages}
                            disabled={loadingOlder}
                            className="text-xs text-muted-foreground hover:bg-accent/50"
                        >
                            {loadingOlder ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                                <ChevronUp className="w-3 h-3 mr-1" />
                            )}
                            Load older messages
                        </Button>
                    </div>
                )}

                <div
                    style={{
                        height: `${messagesVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {messagesVirtualizer.getVirtualItems().map((virtualRow) => {
                        const message = messages[virtualRow.index];
                        if (!message) return null;
                        const i = virtualRow.index;
                        return (
                            <div
                                key={message._id}
                                ref={messagesVirtualizer.measureElement}
                                data-index={virtualRow.index}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <MessageBubble
                                    message={message}
                                    isOwn={
                                        message.sender?._id === currentUser?._id
                                    }
                                    showAvatar={
                                        i === 0 ||
                                        messages[i - 1]?.sender?._id !==
                                            message.sender?._id
                                    }
                                    currentUserId={currentUser?._id}
                                    onDelete={handleDeleteMessage}
                                    onReact={handleReact}
                                    onReply={setReplyingTo}
                                />
                            </div>
                        );
                    })}
                </div>

                {Object.keys(typingUsers).length > 0 && (
                    <TypingIndicator users={Object.values(typingUsers)} />
                )}

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* ━━━ Message Input ━━━ */}
            <div className="flex-shrink-0 bg-background border-t border-border">
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-accent/30 border-b border-border/50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0 border-l-2 border-primary pl-3 py-0.5">
                            <p className="text-xs font-bold text-primary truncate">
                                Reply to {replyingTo.sender?.name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {replyingTo.content ||
                                    (replyingTo.type === "image"
                                        ? "📷 Image"
                                        : "Message")}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReplyingTo(null)}
                            className="h-6 w-6 rounded-full hover:bg-accent/80"
                        >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                    </div>
                )}

                <MessageInput
                    onSend={handleSend}
                    onTyping={handleTyping}
                    sending={sending}
                    groupId={groupId}
                />
            </div>

            {/* Group Info Sheet */}
            <GroupInfoSheet
                group={group}
                currentUserId={currentUser?._id}
                isAdmin={
                    group?.members?.find(
                        (m) =>
                            (m.userId?._id || m.userId)?.toString() ===
                            currentUser?._id?.toString(),
                    )?.role === "admin"
                }
                onUpdate={setGroup}
                open={infoOpen}
                onOpenChange={setInfoOpen}
            />
        </div>
    );
}
