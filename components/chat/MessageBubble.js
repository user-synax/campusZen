"use client";

import { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/user/UserAvatar";
import { Trash2, MoreHorizontal, Reply, SmilePlus, Heart } from "lucide-react";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { renderContentWithMentions, extractUrls } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import LinkPreview from "@/components/shared/LinkPreview";
import FormattedTime from "@/components/shared/FormattedTime";
import { Trash, } from "lucide-react";
import EmojiPicker from "@/components/post/EmojiPicker";
import { getBubbleTheme } from "@/lib/chatBubbleThemes";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢", "🙏", "🎉"];
function MessageBubble({
    message,
    isOwn,
    showAvatar,
    currentUserId,
    onDelete,
    onReact,
    onReply,
}) {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Mobile swipe to reply states
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isDraggingRef = useRef(false);
    const hasVibratedRef = useRef(false);

    useEffect(() => {
        if (!showMenu) return;
        const handleClose = () => setShowMenu(false);
        window.addEventListener("click", handleClose);
        return () => window.removeEventListener("click", handleClose);
    }, [showMenu]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(message._id);
            setShowDeleteModal(false);
        } finally {
            setDeleting(false);
        }
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
            // Start dragging only if horizontal rightward swipe is dominant
            if (deltaX > 10 && deltaX > Math.abs(deltaY)) {
                isDraggingRef.current = true;
                setIsDragging(true);
            }
        }

        if (isDraggingRef.current) {
            if (e.cancelable) {
                e.preventDefault();
            }
            const currentDrag = Math.min(deltaX, 80);
            setDragX(currentDrag);

            // Subtle haptic response on crossing reply threshold (50px)
            if (navigator.vibrate && currentDrag >= 50 && !hasVibratedRef.current) {
                try {
                    navigator.vibrate(20);
                } catch (err) {
                    // Ignore haptic errors
                }
                hasVibratedRef.current = true;
            } else if (currentDrag < 50) {
                hasVibratedRef.current = false;
            }
        }
    };

    const handleTouchEnd = () => {
        if (isDraggingRef.current) {
            if (dragX >= 50) {
                onReply(message);
            }
        }
        setDragX(0);
        setIsDragging(false);
        isDraggingRef.current = false;
        hasVibratedRef.current = false;
    };

    const urls = message.content ? extractUrls(message.content) : [];

    // Resolve bubble theme (sender.bubbleTheme is set by the API)
    const bubbleTheme = getBubbleTheme(message.sender?.bubbleTheme);
    const bubbleStyle = isOwn ? bubbleTheme.ownBubble : bubbleTheme.otherBubble;

    // SYSTEM MESSAGE
    if (message.type === "system") {
        return (
            <div className="text-center my-2">
                <span className="text-[11px] text-white bg-blue-500 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    // DELETED MESSAGE
    if (message.isDeleted) {
        return (
            <div
                className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}
            >
                <div
                    className="italic text-xs text-muted-foreground px-3 py-1.5 rounded-xl 
                        border border-border/50 flex gap-2"
                >
                    <Trash size={12} aria-description="This message was deleted" /> Message deleted
                </div>
            </div>
        );
    }

    return (
        <div
            id={`msg-${message._id}`}
            className={`flex items-end gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"} group relative 
                  ${message.isOptimistic ? "opacity-70" : "opacity-100"} transition-all duration-300 rounded-lg p-1`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Avatar — show for other people only */}
            {!isOwn && (
                <div className="shrink-0 mb-1">
                    {showAvatar ? (
                        <Link href={`/profile/${message.sender?.username}`}>
                            <UserAvatar user={message.sender} size="xs" />
                        </Link>
                    ) : (
                        <div className="w-6" /> // spacer
                    )}
                </div>
            )}

            <div
                className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}
                style={{
                    transform: dragX > 0 ? `translateX(${dragX}px)` : undefined,
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
            >
                {/* Sender name — show only for others, only if showAvatar */}
                {!isOwn && showAvatar && (
                    <p className="text-[10px] text-muted-foreground mb-1 px-1">
                        {message.sender?.name}
                    </p>
                )}

                {/* Message bubble */}
                <div className="relative">
                    {/* Hard offset shadow (solid, no blur) */}
                    {(bubbleTheme.borderStyle === "animated" || bubbleTheme.pattern) && (
                        <div
                            className={cn(
                                "absolute inset-0 rounded-2xl -z-10",
                                isOwn
                                    ? "translate-x-[3px] translate-y-[3px]"
                                    : "-translate-x-[3px] translate-y-[3px]",
                            )}
                            style={{
                                backgroundColor: isOwn
                                    ? "rgba(0,0,0,0.25)"
                                    : "rgba(0,0,0,0.15)",
                            }}
                        />
                    )}
                    <div
                        className={cn(
                            "relative px-3 py-2 rounded-2xl text-sm leading-relaxed overflow-hidden",
                            bubbleStyle.className,
                        )}
                        style={bubbleStyle.style}
                    >
                        {/* Pattern overlay — z-0, low opacity */}
                        {bubbleTheme.pattern && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none rounded-[inherit]"
                                style={{ opacity: 0.15 }}
                            >
                                {bubbleTheme.pattern.type === "svg" ? (
                                    <div
                                        className="absolute inset-0"
                                        dangerouslySetInnerHTML={{
                                            __html: bubbleTheme.pattern.value,
                                        }}
                                    />
                                ) : bubbleTheme.pattern.type === "css" ? (
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundImage:
                                                bubbleTheme.pattern.value,
                                        }}
                                    />
                                ) : null}
                            </div>
                        )}
                        {/* Mobile swipe reply indicator */}
                        {dragX > 0 && (
                        <div
                            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none"
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
                                        : "bg-accent/80 text-muted-foreground border-border"
                                )}
                            >
                                <Reply className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                    {/* Replying-to Preview inside bubble */}
                    {message.replyTo && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const element = document.getElementById(
                                    `msg-${message.replyTo._id}`,
                                );
                                if (element) {
                                    element.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                    });
                                    element.classList.add("bg-primary/20");
                                    setTimeout(
                                        () =>
                                            element.classList.remove(
                                                "bg-primary/20",
                                            ),
                                        2000,
                                    );
                                }
                            }}
                            className={cn(
                                "mb-2 p-1.5 rounded-lg text-left border-l-2 cursor-pointer transition-colors text-xs select-none min-w-[120px] max-w-full",
                                isOwn
                                    ? "bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-white"
                                    : "bg-accent/80 border-primary hover:bg-accent text-foreground",
                            )}
                        >
                            <p
                                className={cn(
                                    "font-bold text-[10px] truncate mb-0.5",
                                    isOwn
                                        ? "text-primary-foreground/90"
                                        : "text-primary",
                                )}
                            >
                                {message.replyTo.sender?.name || "User"}
                            </p>
                            <p
                                className={cn(
                                    "truncate text-[11px] opacity-80",
                                    isOwn
                                        ? "text-primary-foreground/80"
                                        : "text-muted-foreground",
                                )}
                            >
                                {message.replyTo.content ||
                                    (message.replyTo.type === "image"
                                        ? "📷 Image"
                                        : "Message")}
                            </p>
                        </div>
                    )}
                    {/* Image message */}
                    {message.type === "image" && message.imageUrl && (
                        <div className="mb-1 rounded-xl overflow-hidden">
                            <img
                                src={message.imageUrl}
                                alt="Shared"
                                className="max-w-full max-h-60 object-cover cursor-pointer"
                                onClick={() =>
                                    window.open(message.imageUrl, "_blank")
                                }
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Text content */}
                    {message.content && (
                        <div className="whitespace-pre-wrap break-words">
                            {renderContentWithMentions(message.content).map(
                                (segment, i) => {
                                    if (segment.type === "hashtag") {
                                        return (
                                            <Link
                                                key={i}
                                                href={`/hashtag/${segment.value}`}
                                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                #{segment.value}
                                            </Link>
                                        );
                                    } else if (segment.type === "mention") {
                                        return (
                                            <UserMention
                                                key={i}
                                                username={segment.value}
                                            />
                                        );
                                    } else if (segment.type === "url") {
                                        return (
                                            <a
                                                key={i}
                                                href={segment.value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${isOwn ? "text-white" : "text-primary"} hover:underline underline-offset-2 opacity-90`}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {segment.value}
                                            </a>
                                        );
                                    } else {
                                        return (
                                            <span key={i}>{segment.value}</span>
                                        );
                                    }
                                },
                            )}
                        </div>
                    )}

                    {/* Chat Link Preview */}
                    {urls.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {urls.map((url, i) => (
                                <LinkPreview key={i} url={url} />
                            ))}
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-1">
                        <FormattedTime
                            date={message.createdAt}
                            type="time"
                            className={`text-[10px] ${isOwn ? "text-gray-300" : "text-muted-foreground"}`}
                        />
                        {isOwn && message.isOptimistic && (
                            <span className="text-[8px] animate-pulse text-primary-foreground/40">
                                sending...
                            </span>
                        )}
                    </div>
                </div>
                </div>

                {/* Reactions */}
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
                                className="flex items-center gap-1 bg-accent/40 border border-border/80 
                                           hover:bg-accent hover:border-border rounded-full px-2.5 py-0.5 text-xs 
                                           shadow-xs transition-all active:scale-95 duration-150 backdrop-blur-xs"
                            >
                                <span>{emoji}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Action buttons — visible on hover (Desktop) and always (Mobile) */}
            <div
                className={`flex flex-row md:flex-col gap-1 items-center ${isOwn ? "mr-1" : "ml-1"} 
                       md:opacity-0 md:group-hover:opacity-100 transition-opacity`}
            >
                {/* React */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionPicker(!showReactionPicker);
                    }}
                    className="w-7 h-7 rounded-full bg-accent/50 border border-border 
                     flex items-center justify-center hover:bg-accent active:scale-90 transition-transform"
                >
                    <SmilePlus size={14} />
                </button>

                {/* 3-Dot Options Dropdown */}
                <div className="relative hidden md:block">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="w-7 h-7 rounded-full bg-accent/50 border border-border 
                       flex items-center justify-center hover:bg-accent active:scale-90 transition-transform"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>

                    {showMenu && (
                        <div
                            className={`absolute bottom-full ${isOwn ? "right-0" : "left-0"} mb-1 w-28 bg-card border border-border rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-150`}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReply(message);
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-1.5 font-medium transition-colors"
                            >
                                <Reply className="w-3 h-3 text-muted-foreground" />
                                Reply
                            </button>
                            {isOwn && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteModal(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive flex items-center gap-1.5 font-medium transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Reaction picker */}
            {showReactionPicker && (
                <div
                    className={`absolute bottom-full mb-1 bg-card border border-border 
                        rounded-full px-2.5 py-1 flex items-center gap-1 shadow-lg z-10 ${isOwn ? "right-0" : "left-0"}`}
                >
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
                            <button
                                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-semibold active:scale-110 transition-transform"
                                title="Add custom reaction"
                            >
                                +
                            </button>
                        }
                    />
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={() => !deleting && setShowDeleteModal(false)}
                onConfirm={handleDelete}
                loading={deleting}
            />
        </div>
    );
}

export default memo(MessageBubble, (prevProps, nextProps) => {
    return (
        prevProps.message._id === nextProps.message._id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.imageUrl === nextProps.message.imageUrl &&
        prevProps.message.isDeleted === nextProps.message.isDeleted &&
        prevProps.message.isOptimistic === nextProps.message.isOptimistic &&
        prevProps.message.sender?.bubbleTheme === nextProps.message.sender?.bubbleTheme &&
        prevProps.isOwn === nextProps.isOwn &&
        prevProps.showAvatar === nextProps.showAvatar &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onReact === nextProps.onReact &&
        prevProps.onReply === nextProps.onReply &&
        JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions)
    );
});
