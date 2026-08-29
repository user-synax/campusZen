"use client";

import { useState, useCallback, useMemo, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";
import { useDMChat } from "@/hooks/useDMChat";
import useChatRoom from "@/hooks/useChatRoom";
import { ensureChatSocket } from "@/lib/chat-socket";
import clientCache from "@/lib/client-cache";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import UserAvatar from "@/components/user/UserAvatar";
import TypingIndicator from "@/components/chat/TypingIndicator";
import BubbleThemePicker from "@/components/chat/BubbleThemePicker";

export default function DMChatRoomPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const conversationId = params.conversationId;
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [typingUser, setTypingUser] = useState(null);

    // ━━━ Shared chat room logic ━━━
    const endpoints = useMemo(() => ({
        fetchInfo: `/api/dms/${conversationId}`,
        fetchMessages: `/api/chat/history/dm/${conversationId}/messages`,
        markRead: `/api/dms/${conversationId}/read`,
    }), [conversationId]);

    const parseInfo = useCallback((data) => data.conversation, []);

    // Send over the Socket.IO backend (see group page for the ack->Response wrap).
    const sendMessage = useCallback(
        async (body) => {
            try {
                const socket = await ensureChatSocket();
                const ack = await new Promise((resolve) => {
                    const t = setTimeout(
                        () => resolve({ ok: false, error: "timeout" }),
                        10000,
                    );
                    socket.emit(
                        "message:send",
                        { kind: "dm", id: conversationId, ...body },
                        (resp) => {
                            clearTimeout(t);
                            resolve(resp || { ok: false });
                        },
                    );
                });
                return { ok: !!ack?.ok, json: async () => ack || {} };
            } catch (err) {
                return { ok: false, json: async () => ({ message: "Network error" }) };
            }
        },
        [conversationId],
    );

    const onError = useCallback((msg) => toast.error(msg), []);

    const room = useChatRoom({
        id: conversationId,
        type: "dm",
        endpoints,
        parseInfo,
        sendMessage,
        onError,
    });

    // ━━━ DM-specific real-time handlers ━━━
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

    const onMessageDeleted = useCallback(({ messageId }) => {
        room.setMessages((prev) =>
            prev.map((m) =>
                m._id === messageId
                    ? { ...m, isDeleted: true, content: "", imageUrl: "" }
                    : m,
            ),
        );
    }, []);

    const onReaction = useCallback(({ messageId, reactions }) => {
        room.setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)),
        );
    }, []);

    // Emit a read receipt over the socket when this user views the conversation.
    const markReadSocket = useCallback(async () => {
        try {
            const s = await ensureChatSocket();
            s.emit("read:mark", { kind: "dm", id: conversationId });
        } catch {
            // best-effort
        }
    }, [conversationId]);

    const onNewMessage = useCallback(
        (message) => {
            room.onNewMessage(message);
            markReadSocket();
        },
        [room.onNewMessage, markReadSocket],
    );

    const { online } = useDMChat(conversationId, currentUser?._id, {
        onNewMessage,
        onTypingStart,
        onTypingStop,
        onMessageDeleted,
        onReaction,
    });

    // Invalidate the cached DM inbox so the unread badge reflects reads made in
    // this conversation (useChatRoom marks the conversation read on open via the
    // markRead endpoint, but the list cache isn't auto-invalidated).
    useEffect(() => {
        clientCache.delete(JSON.stringify(["tab", "chats-dms"]));
    }, [conversationId]);

    // ━━━ DM-specific actions ━━━
    const handleReact = useCallback(
        async (messageId, emoji) => {
            try {
                const res = await fetch(
                    `/api/dms/${conversationId}/messages/${messageId}/react`,
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
        [conversationId],
    );

    const handleDeleteMessage = useCallback(
        async (messageId) => {
            try {
                const res = await fetch(
                    `/api/dms/${conversationId}/messages/${messageId}`,
                    { method: "DELETE" },
                );
                if (!res.ok) toast.error("Failed to delete message");
            } catch (error) {
                toast.error("Error deleting message");
            }
        },
        [conversationId],
    );

    const handleTyping = useCallback(
        async (isTyping) => {
            try {
                const s = await ensureChatSocket();
                s.emit(isTyping ? "typing:start" : "typing:stop", {
                    kind: "dm",
                    id: conversationId,
                });
            } catch (err) {
                console.error("Typing error:", err);
            }
        },
        [conversationId],
    );

    const handleSend = useCallback(
        (content, type, imageUrl) => {
            return room.handleSend(currentUser, content, type, imageUrl);
        },
        [room.handleSend, currentUser],
    );

    const otherUser = room.info?.otherParticipant;

    if (room.loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* ━━━ Header ━━━ */}
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
                    <div className="relative">
                        <UserAvatar user={otherUser} size="sm" />
                        {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-background" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                            {otherUser?.name || otherUser?.username}
                        </p>
                    </div>
                    <BubbleThemePicker
                        onThemeChange={(themeId) => {
                            room.setMessages((prev) =>
                                prev.map((m) =>
                                    m.sender?._id === currentUser?._id
                                        ? {
                                              ...m,
                                              sender: {
                                                  ...m.sender,
                                                  bubbleTheme:
                                                      themeId === "default"
                                                          ? null
                                                          : themeId,
                                              },
                                          }
                                        : m,
                                ),
                            );
                        }}
                    />
                </div>
            </div>

            {/* ━━━ Privacy Banner ━━━ */}
            <div className="text-xs text-muted-foreground truncate border text-center border-gray-200 px-4 py-2 mx-4 rounded-xl mt-1 bg-gray-50">
                Do not share sensitive information. Messages are not
                end-to-end encrypted.
            </div>

            {/* ━━━ Messages Area ━━━ */}
            <div
                ref={room.messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar min-h-0"
            >
                {room.hasMore && (
                    <div className="text-center py-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={room.loadOlderMessages}
                            disabled={room.loadingOlder}
                            className="text-xs text-muted-foreground hover:bg-accent/50"
                        >
                            {room.loadingOlder ? (
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
                        height: `${room.messagesVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {room.messagesVirtualizer.getVirtualItems().map((virtualRow) => {
                        const message = room.messages[virtualRow.index];
                        if (!message) return null;
                        const i = virtualRow.index;
                        return (
                            <div
                                key={room.getMessageKey(message)}
                                ref={room.messagesVirtualizer.measureElement}
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
                                        room.messages[i - 1]?.sender?._id !==
                                            message.sender?._id
                                    }
                                    currentUserId={currentUser?._id}
                                    onDelete={handleDeleteMessage}
                                    onReact={handleReact}
                                    onReply={room.setReplyingTo}
                                />
                            </div>
                        );
                    })}
                </div>
                <div ref={room.bottomRef} className="h-4" />
            </div>

            {/* ━━━ Message Input ━━━ */}
            <div className="flex-shrink-0 bg-background border-t border-border">
                {typingUser && (
                    <div className="px-4 pt-2">
                        <TypingIndicator users={[typingUser]} />
                    </div>
                )}

                {room.replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-accent/30 border-b border-border/50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0 border-l-2 border-primary pl-3 py-0.5">
                            <p className="text-xs font-bold text-primary truncate">
                                Reply to{" "}
                                {room.replyingTo.sender?.name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {room.replyingTo.content ||
                                    (room.replyingTo.type === "image"
                                        ? "📷 Image"
                                        : "Message")}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => room.setReplyingTo(null)}
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
