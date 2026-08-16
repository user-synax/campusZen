"use client";

import { useState, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Info, Loader2, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";
import { useGroupChat } from "@/hooks/useGroupChat";
import useChatRoom from "@/hooks/useChatRoom";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import GroupInfoSheet from "@/components/chat/GroupInfoSheet";
import BubbleThemePicker from "@/components/chat/BubbleThemePicker";

export default function ChatRoomPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const groupId = params.groupId;
    const router = useRouter();
    const { user: currentUser } = useUser();

    const [typingUsers, setTypingUsers] = useState({});
    const [infoOpen, setInfoOpen] = useState(false);

    // ━━━ Shared chat room logic ━━━
    const endpoints = useMemo(() => ({
        fetchInfo: `/api/groups/${groupId}`,
        fetchMessages: `/api/groups/${groupId}/messages`,
        markRead: `/api/groups/${groupId}/read`,
    }), [groupId]);

    const parseInfo = useCallback((data) => data, []);

    const sendMessage = useCallback(
        async (body) => {
            return fetch(`/api/groups/${groupId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        },
        [groupId],
    );

    const onError = useCallback((msg) => toast.error(msg), []);

    const room = useChatRoom({
        id: groupId,
        type: "group",
        endpoints,
        parseInfo,
        sendMessage,
        onError,
    });

    // ━━━ Group-specific real-time handlers ━━━
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

    const onGroupDeleted = useCallback(() => {
        toast.error("This group was deleted");
        router.push("/chats");
    }, [router]);

    const onGroupUpdated = useCallback(
        ({ name, avatar, description }) => {
            room.setInfo((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    ...(name && { name }),
                    ...(avatar !== undefined && { avatar }),
                    ...(description !== undefined && { description }),
                };
            });
        },
        [],
    );

    const onMemberRemoved = useCallback(
        ({ userId }) => {
            if (userId === currentUser?._id) {
                toast.error("You were removed from this group");
                router.push("/chats");
            } else {
                fetch(`/api/groups/${groupId}`)
                    .then((res) => res.json())
                    .then(room.setInfo)
                    .catch(() => {});
            }
        },
        [currentUser, groupId, router],
    );

    const onMemberAdded = useCallback(() => {
        fetch(`/api/groups/${groupId}`)
            .then((res) => res.json())
            .then(room.setInfo)
            .catch(() => {});
    }, [groupId]);

    const { onlineMembers } = useGroupChat(groupId, {
        onNewMessage: room.onNewMessage,
        onMessageDeleted,
        onTypingStart,
        onTypingStop,
        onReaction,
        onGroupDeleted,
        onGroupUpdated,
        onMemberRemoved,
        onMemberAdded,
    });

    // ━━━ Group-specific actions ━━━
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

    const handleDeleteMessage = useCallback(
        async (messageId) => {
            try {
                const res = await fetch(
                    `/api/groups/${groupId}/messages/${messageId}`,
                    { method: "DELETE" },
                );
                if (!res.ok) toast.error("Failed to delete message");
            } catch (error) {
                toast.error("Error deleting message");
            }
        },
        [groupId],
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

    const handleSend = useCallback(
        (content, type, imageUrl) => {
            return room.handleSend(currentUser, content, type, imageUrl);
        },
        [room.handleSend, currentUser],
    );

    if (room.loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
        );
    }

    const group = room.info;

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
                                    ·{" "}
                                    <span className="text-green-500">
                                        {onlineMembers.length} online
                                    </span>
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        <BubbleThemePicker
                            onThemeChange={(themeId) => {
                                // Update all own messages in-place so the chat
                                // reflects the new theme without a full reload.
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
            </div>

            {/* ━━━ Messages Area ━━━ */}
            <div
                ref={room.messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar min-h-0"
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

                {Object.keys(typingUsers).length > 0 && (
                    <TypingIndicator users={Object.values(typingUsers)} />
                )}

                <div ref={room.bottomRef} className="h-4" />
            </div>

            {/* ━━━ Message Input ━━━ */}
            <div className="flex-shrink-0 bg-background border-t border-border">
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
                onUpdate={room.setInfo}
                open={infoOpen}
                onOpenChange={setInfoOpen}
            />
        </div>
    );
}
