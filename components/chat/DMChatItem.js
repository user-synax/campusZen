"use client";

import UserAvatar from "@/components/user/UserAvatar";
import FormattedTime from "@/components/shared/FormattedTime";
import AnimatedCount from "@/components/ui/AnimatedCount";

export default function DMChatItem({
    conversation,
    currentUserId,
    online,
    onClick,
}) {
    const otherUser = conversation.otherParticipant;
    const isOnline = !!online;
    const hasUnread = conversation.unreadCount > 0;

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 
                transition-colors cursor-pointer border-b border-border/50 active:bg-accent/50"
        >
            <div className="relative shrink-0">
                <UserAvatar user={otherUser} size="md" />
                <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                        isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                    title={isOnline ? "Online" : "Offline"}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold truncate pr-2 group-hover:text-primary transition-colors">
                        {otherUser.name || otherUser.username}
                    </h3>
                    <FormattedTime
                        date={
                            conversation.lastMessage?.sentAt ||
                            conversation.updatedAt
                        }
                        className="text-[10px] text-muted-foreground whitespace-nowrap"
                    />
                </div>

                <div className="flex items-center justify-between mt-0.5">
                    <p
                        className={`text-xs truncate transition-colors ${
                            hasUnread
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        }`}
                    >
                        {conversation.lastMessage ? (
                            conversation.lastMessage.type === "system" ? (
                                <span className="italic">
                                    {conversation.lastMessage.content}
                                </span>
                            ) : (
                                `${conversation.lastMessage.senderName}: ${conversation.lastMessage.content}`
                            )
                        ) : (
                            "No messages yet"
                        )}
                    </p>

                    {hasUnread && (
                        <div className="shrink-0 ml-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-foreground">
                                <AnimatedCount
                                    value={conversation.unreadCount}
                                    max={99}
                                />
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
