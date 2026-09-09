"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/user/UserAvatar";
import {
    Trash2,
    Reply,
    SmilePlus,
    Pencil,
    Check,
    CheckCheck,
    Copy,
} from "lucide-react";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { renderContentWithMentions, extractUrls } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import LinkPreview from "@/components/shared/LinkPreview";
import FormattedTime from "@/components/shared/FormattedTime";
import { Trash } from "lucide-react";
import EmojiPicker from "@/components/post/EmojiPicker";
import { MessageBubble as UIBubble, MessageBubbleContent } from "@/components/ui/chat-bubble";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
} from "@/components/motion/context-menu";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢", "🙏", "🎉"];

function MessageBubble({
    message,
    isOwn,
    showAvatar,
    currentUserId,
    onDelete,
    onReact,
    onReply,
    onEdit,
    isRead = false,
}) {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || "");
    const [savingEdit, setSavingEdit] = useState(false);

    // Mobile swipe to reply states
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasVibratedRef = useRef(false);

    useEffect(() => {
        if (!isEditing) setEditContent(message.content || "");
    }, [message.content, isEditing]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(message._id);
            setShowDeleteModal(false);
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveEdit = async () => {
        const trimmed = editContent.trim();
        if (!trimmed || trimmed === message.content || trimmed.length > 2000) return;
        setSavingEdit(true);
        try {
            await onEdit?.(message._id, trimmed);
            setIsEditing(false);
        } catch (e) {
            // keep editing open on error
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content || "");
        } catch {}
    };

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        isDraggingRef.current = false;
        hasVibratedRef.current = false;
    };

    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        const deltaX = touch.clientX - startXRef.current;
        const deltaY = touch.clientY - startYRef.current;

        if (!isDraggingRef.current) {
            if (deltaX > 10 && deltaX > Math.abs(deltaY)) {
                isDraggingRef.current = true;
                setIsDragging(true);
            }
        }

        if (isDraggingRef.current) {
            if (e.cancelable) e.preventDefault();
            const currentDrag = Math.min(deltaX, 80);
            setDragX(currentDrag);
            if (navigator.vibrate && currentDrag >= 50 && !hasVibratedRef.current) {
                try { navigator.vibrate(20); } catch {}
                hasVibratedRef.current = true;
            } else if (currentDrag < 50) {
                hasVibratedRef.current = false;
            }
        }
    };

    const handleTouchEnd = () => {
        if (isDraggingRef.current && dragX >= 50) onReply(message);
        setDragX(0);
        setIsDragging(false);
        isDraggingRef.current = false;
        hasVibratedRef.current = false;
    };

    const urls = !isEditing && message.content ? extractUrls(message.content) : [];

    // Contrast-aware variant: own = solid (bg-foreground text-background, 21:1), other = soft (bg-muted text-foreground, ~15:1)
    const variant = isOwn ? "solid" : "soft";
    const align = isOwn ? "end" : "start";

    if (message.type === "system") {
        return (
            <div className="text-center my-2">
                <span className="text-[11px] text-muted-foreground bg-card border border-border/60 px-3 py-1 rounded-full shadow-sm">
                    {message.content}
                </span>
            </div>
        );
    }

    if (message.isDeleted) {
        return (
            <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
                <div className="italic text-xs text-muted-foreground px-3 py-1.5 rounded-xl border border-border/50 bg-card/60 flex gap-2 items-center">
                    <Trash size={12} /> Message deleted
                </div>
            </div>
        );
    }

    return (
        <div
            id={`msg-${message._id}`}
            className={`flex items-end gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"} group relative ${
                message.isOptimistic ? "opacity-70" : "opacity-100"
            } transition-all duration-300 rounded-lg p-1`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {!isOwn && (
                <div className="shrink-0 mb-1">
                    {showAvatar ? (
                        <Link href={`/profile/${message.sender?.username}`}>
                            <UserAvatar user={message.sender} size="xs" />
                        </Link>
                    ) : (
                        <div className="w-6" />
                    )}
                </div>
            )}

            {/* w-fit + max-w ensures short messages hug content (no premature wrap) and long messages wrap at 75% */}
            <div
                className={cn("flex flex-col w-fit max-w-[75%] sm:max-w-[65%] md:max-w-[60%]", isOwn ? "items-end" : "items-start")}
                style={{
                    transform: dragX > 0 ? `translateX(${dragX}px)` : undefined,
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
            >
                {!isOwn && showAvatar && (
                    <p className="text-[10px] text-muted-foreground mb-1 px-1">{message.sender?.name}</p>
                )}

                <div className="relative w-fit max-w-full flex flex-col items-stretch">
                    {dragX > 0 && (
                        <div
                            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                            style={{
                                opacity: Math.min(dragX / 50, 1),
                                transform: `translateY(-50%) scale(${Math.min(dragX / 50, 1)})`,
                            }}
                        >
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150",
                                    dragX >= 50
                                        ? "bg-primary text-primary-foreground border-primary scale-110"
                                        : "bg-card/80 backdrop-blur text-muted-foreground border-border",
                                )}
                            >
                                <Reply className="w-4 h-4" />
                            </div>
                        </div>
                    )}

                    <ContextMenu>
                        <ContextMenuTrigger>
                            <UIBubble variant={variant} align={align} animateIn={!message.isOptimistic} className="w-fit max-w-full">
                                {/* w-fit + break-words fixes premature wrapping; timestamp is flex-wrapped but bubble width is content-driven */}
                                <MessageBubbleContent className={cn("w-fit max-w-full break-words", isEditing && "min-w-[220px]")}>
                                    {message.replyTo && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const el = document.getElementById(`msg-${message.replyTo._id}`);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                                    el.classList.add("bg-primary/20");
                                                    setTimeout(() => el.classList.remove("bg-primary/20"), 2000);
                                                }
                                            }}
                                            className={cn(
                                                "mb-2 p-1.5 rounded-lg text-left border-l-2 cursor-pointer transition-colors text-xs select-none min-w-[120px] max-w-full",
                                                isOwn
                                                    ? "bg-background/15 border-background/30 hover:bg-background/20 text-background"
                                                    : "bg-background/60 border-primary hover:bg-background/80 text-foreground",
                                            )}
                                        >
                                            <p className={cn("font-bold text-[10px] truncate mb-0.5", isOwn ? "text-background/90" : "text-primary")}>
                                                {message.replyTo.sender?.name || "User"}
                                            </p>
                                            <p className={cn("truncate text-[11px]", isOwn ? "text-background/70" : "text-muted-foreground")}>
                                                {message.replyTo.content || (message.replyTo.type === "image" ? "📷 Image" : "Message")}
                                            </p>
                                        </div>
                                    )}

                                    {message.type === "image" && message.imageUrl && (
                                        <div className="mb-1 rounded-xl overflow-hidden">
                                            <img
                                                src={message.imageUrl}
                                                alt="Shared"
                                                className="max-w-full max-h-60 object-cover cursor-pointer"
                                                onClick={() => window.open(message.imageUrl, "_blank")}
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    {isEditing ? (
                                        <div className="min-w-[220px] w-full">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSaveEdit();
                                                    }
                                                    if (e.key === "Escape") setIsEditing(false);
                                                }}
                                                rows={2}
                                                maxLength={2000}
                                                autoFocus
                                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-ring min-h-[44px] text-foreground placeholder:text-muted-foreground"
                                            />
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] text-muted-foreground">{editContent.length}/2000</span>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => setIsEditing(false)}
                                                        disabled={savingEdit}
                                                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-card border border-border hover:bg-accent transition-colors disabled:opacity-50 text-foreground"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={savingEdit || !editContent.trim() || editContent.trim() === message.content}
                                                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1"
                                                    >
                                                        {savingEdit ? "Saving…" : "Save"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        message.content && (
                                            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-6">
                                                {renderContentWithMentions(message.content).map((segment, i) => {
                                                    if (segment.type === "hashtag") {
                                                        return (
                                                            <Link key={i} href={`/hashtag/${segment.value}`} className={cn(isOwn ? "text-background underline decoration-background/30" : "text-primary")} onClick={(e) => e.stopPropagation()}>
                                                                #{segment.value}
                                                            </Link>
                                                        );
                                                    } else if (segment.type === "mention") {
                                                        return <UserMention key={i} username={segment.value} />;
                                                    } else if (segment.type === "url") {
                                                        return (
                                                            <a
                                                                key={i}
                                                                href={segment.value}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={cn(isOwn ? "text-background underline decoration-background/30" : "text-primary", "hover:underline underline-offset-2")}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {segment.value}
                                                            </a>
                                                        );
                                                    }
                                                    return <span key={i}>{segment.value}</span>;
                                                })}
                                            </div>
                                        )
                                    )}

                                    {urls.length > 0 && !isEditing && (
                                        <div className="mt-2 space-y-2">
                                            {urls.map((url, i) => (
                                                <LinkPreview key={i} url={url} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Timestamp + edited + read receipt - wrapping is now correctly contained inside w-fit bubble */}
                                    <div className={cn("flex items-center gap-1.5 mt-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
                                        <FormattedTime
                                            date={message.createdAt}
                                            type="time"
                                            className={cn("text-[11px] leading-none", isOwn ? "text-zinc-400 dark:text-zinc-600" : "text-muted-foreground")}
                                        />
                                        {message.isEdited && <span className={cn("text-[11px]", isOwn ? "text-zinc-400 dark:text-zinc-600" : "text-muted-foreground/70")}>(edited)</span>}
                                        {isOwn && !message.isDeleted && (
                                            <span className="ml-0.5 inline-flex">
                                                {message.isOptimistic ? (
                                                    <span className={cn("text-[10px] animate-pulse", isOwn ? "text-zinc-400 dark:text-zinc-600" : "text-muted-foreground/50")}>sending…</span>
                                                ) : isRead ? (
                                                    <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                                                ) : (
                                                    <Check className={cn("w-3.5 h-3.5", isOwn ? "text-zinc-400 dark:text-zinc-600" : "text-muted-foreground/60")} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </MessageBubbleContent>
                            </UIBubble>
                        </ContextMenuTrigger>
                        <ContextMenuContent ariaLabel="Message actions">
                            <ContextMenuItem onSelect={() => onReply(message)}>
                                <Reply className="w-3.5 h-3.5" /> Reply
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={handleCopy}>
                                <Copy className="w-3.5 h-3.5" /> Copy
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={() => setShowReactionPicker((v) => !v)}>
                                <SmilePlus className="w-3.5 h-3.5" /> React
                            </ContextMenuItem>
                            {isOwn && message.type === "text" && !message.isDeleted && onEdit && (
                                <ContextMenuItem onSelect={() => setIsEditing(true)}>
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </ContextMenuItem>
                            )}
                            {isOwn && (
                                <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem tone="destructive" onSelect={() => setShowDeleteModal(true)}>
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </ContextMenuItem>
                                </>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>
                </div>

                {message.reactions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                        {Object.entries(
                            message.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {}),
                        ).map(([emoji, count]) => (
                            <button
                                key={emoji}
                                onClick={() => onReact(message._id, emoji)}
                                className="flex items-center gap-1 bg-card border border-border/60 hover:bg-accent rounded-full px-2.5 py-0.5 text-xs shadow-sm transition-all active:scale-95"
                            >
                                <span>{emoji}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">{count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick reaction picker - now triggered via context menu or retained for swipe */}
            {showReactionPicker && (
                <div className={`absolute bottom-full mb-1 bg-card border border-border rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg z-10 ${isOwn ? "right-0" : "left-0"}`}>
                    {QUICK_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onReact(message._id, emoji);
                                setShowReactionPicker(false);
                            }}
                            className="text-lg w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center active:scale-125 transition-transform"
                        >
                            {emoji}
                        </button>
                    ))}
                    <EmojiPicker
                        onSelect={(emoji) => {
                            onReact(message._id, emoji);
                            setShowReactionPicker(false);
                        }}
                        trigger={
                            <button className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-semibold active:scale-110 transition-transform">
                                +
                            </button>
                        }
                    />
                </div>
            )}

            <ConfirmDeleteModal isOpen={showDeleteModal} onClose={() => !deleting && setShowDeleteModal(false)} onConfirm={handleDelete} loading={deleting} />
        </div>
    );
}

export default memo(MessageBubble, (prev, next) => {
    return (
        prev.message._id === next.message._id &&
        prev.message.content === next.message.content &&
        prev.message.imageUrl === next.message.imageUrl &&
        prev.message.isDeleted === next.message.isDeleted &&
        prev.message.isEdited === next.message.isEdited &&
        prev.message.editedAt === next.message.editedAt &&
        prev.message.isOptimistic === next.message.isOptimistic &&
        prev.isOwn === next.isOwn &&
        prev.showAvatar === next.showAvatar &&
        prev.currentUserId === next.currentUserId &&
        prev.isRead === next.isRead &&
        prev.onDelete === next.onDelete &&
        prev.onReact === next.onReact &&
        prev.onReply === next.onReply &&
        prev.onEdit === next.onEdit &&
        JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions)
    );
});
