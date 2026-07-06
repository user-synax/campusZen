"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Loader2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";
import { useDMChat } from "@/hooks/useDMChat";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import UserAvatar from "@/components/user/UserAvatar";
import TypingIndicator from "@/components/chat/TypingIndicator";

export default function DMChatRoomPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const conversationId = params.conversationId;
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [typingUser, setTypingUser] = useState(null);

    const messagesContainerRef = useRef(null);
    const bottomRef = useRef(null);

    const messagesVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => messagesContainerRef.current,
        estimateSize: () => 70,
        overscan: 10,
    });

    const fetchInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const [convRes, messagesRes] = await Promise.all([
                fetch(`/api/dms`),
                fetch(`/api/dms/${conversationId}/messages?limit=30`),
            ]);

            const convData = await convRes.json();
            const messagesData = await messagesRes.json();

            if (convRes.ok) {
                const conv = convData.conversations?.find(
                    (c) => c._id === conversationId,
                );
                if (conv) {
                    setConversation(conv);
                    setOtherUser(conv.otherParticipant);
                }
            }
            if (messagesRes.ok) {
                setMessages(messagesData.messages);
                setHasMore(messagesData.hasMore);
                setCursor(messagesData.nextCursor);
            }

            fetch(`/api/dms/${conversationId}/read`, { method: "POST" }).catch(
                () => { },
            );
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("DM data fetch error:", error);
            toast.error("Failed to load chat");
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        if (conversationId) fetchInitialData();
    }, [conversationId, fetchInitialData]);

    const loadOlderMessages = async () => {
        if (!cursor || loadingOlder) return;
        const savedScrollHeight = messagesContainerRef.current.scrollHeight;
        setLoadingOlder(true);
        try {
            const res = await fetch(
                `/api/dms/${conversationId}/messages?cursor=${cursor}&limit=30`,
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
    };

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

    const onNewMessage = useCallback(
        (message) => {
            setMessages((prev) => {
                if (message.clientId) {
                    const index = prev.findIndex(
                        (m) => m.clientId === message.clientId,
                    );
                    if (index !== -1) {
                        const next = [...prev];
                        next[index] = { ...message, isOptimistic: false };
                        return next;
                    }
                }
                if (prev.some((m) => m._id === message._id)) return prev;
                return [...prev, message];
            });
            if (isNearBottom()) setTimeout(scrollToBottom, 50);
            fetch(`/api/dms/${conversationId}/read`, { method: "POST" }).catch(
                () => { },
            );
        },
        [conversationId, isNearBottom, scrollToBottom],
    );

    const onTypingStart = useCallback((data) => {
        setTypingUser({
            _id: data.userId,
            name: data.userName,
            avatar: data.userAvatar,
        });
    }, []);

    const onTypingStop = useCallback(() => {
        setTypingUser(null);
    }, []);

    const handleTyping = useCallback(
        async (isTyping) => {
            try {
                await fetch(`/api/dms/${conversationId}/typing`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isTyping }),
                });
            } catch (err) {
                console.error("Typing error:", err);
            }
        },
        [conversationId],
    );

    useDMChat(conversationId, currentUser?._id, {
        onNewMessage,
        onTypingStart,
        onTypingStop,
    });

    const handleSend = useCallback(
        async (content, type = "text", imageUrl = "") => {
            if (type === "text" && !content.trim()) return;
            if (type === "image" && !imageUrl) return;
            const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const replyTarget = replyingTo;
            setReplyingTo(null);
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
            setMessages((prev) => [...prev, optimisticMsg]);
            setTimeout(scrollToBottom, 50);
            try {
                const res = await fetch(`/api/dms/${conversationId}/messages`, {
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
                if (!res.ok) {
                    const data = await res.json();
                    toast.error(data.message || "Failed to send message");
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
        [replyingTo, currentUser, conversationId, scrollToBottom],
    );

    const handleReact = useCallback(async (messageId, emoji) => {
        toast.warning("Reactions coming soon to DMs!");
    }, []);

    const handleDeleteMessage = useCallback(async (messageId) => {
        toast.warning("Delete coming soon to DMs!");
    }, []);

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
            <div className="shrink-0 bg-background/80 backdrop-blur border-b border-border z-10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/chats")}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <UserAvatar user={otherUser} size="sm" />
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                            {otherUser?.name || otherUser?.username}
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-xs text-muted-foreground truncate border text-center border-gray-200 px-4 py-2 mx-4 rounded-xl mt-1 bg-gray-50">
                Do not share sensitive information. Messages are not end-to-end encrypted.
            </div>

            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar min-h-0"
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
                <div ref={bottomRef} className="h-4" />
            </div>

            <div className="flex-shrink-0 bg-background border-t border-border">
                {typingUser && (
                    <div className="px-4 pt-2">
                        <TypingIndicator users={[typingUser]} />
                    </div>
                )}

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
                    sending={false}
                    groupId={conversationId}
                />
            </div>
        </div>
    );
}
