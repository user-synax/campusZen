"use client";

import { useState, useCallback } from "react";
import { MessageCircle, Bookmark, Share2 } from "lucide-react";
import { LikeButton } from "@/components/spectrumui/like-button";
import ShareButton from "./ShareButton";
import { cn } from "@/lib/utils";

export default function PostActionBar({
    post,
    currentUser,
    commentsCount,
    onLike,
    onBookmark,
    onDelete,
    onToggleComments,
    showComments,
}) {
    const [localBookmarked, setLocalBookmarked] = useState(post._isBookmarked || false);

    const handleBookmark = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await onBookmark?.(post._id);
        setLocalBookmarked((prev) => !prev);
    }, [onBookmark, post._id]);

    const replyCount = commentsCount ?? post.commentsCount ?? 0;
    const bookmarkActive = localBookmarked;

    const Item = ({ icon: Icon, count, active, hover, onClick, label }) => (
        <button
            onClick={onClick}
            aria-label={label}
            className={cn(
                "group flex items-center gap-1 sm:gap-1.5 text-[13px] hover:cursor-pointer transition-colors duration-[var(--duration-fast)]",
                active ? "text-[#f91880]" : "text-muted-foreground",
                hover === "blue" && "hover:text-[#4ba9e1]",
                hover === "green" && "hover:text-[#00ba7c]",
                hover === "pink" && "hover:text-[#f91880]",
            )}
        >
            <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center -ml-1 sm:-ml-2 transition-colors duration-[var(--duration-fast)]",
                hover === "blue" && "group-hover:bg-[#4ba9e1]/10",
                hover === "green" && "group-hover:bg-[#00ba7c]/10",
                hover === "pink" && (active ? "bg-[#f91880]/10" : "group-hover:bg-[#f91880]/10"),
            )}>
                <Icon className={cn("w-[18px] h-[18px]", active && "fill-current")} />
            </span>
            <span className="min-w-[12px] text-left tabular-nums text-[13px]">{count > 0 ? (count > 999 ? `${(count/1000).toFixed(1)}k` : count) : ""}</span>
        </button>
    );

    return (
        <div className="flex items-center justify-between mt-2 w-full gap-0 text-muted-foreground overflow-hidden select-none">
            {/* Like */}
            <div className="flex-1 flex justify-center">
                <LikeButton
                    liked={post._isLiked}
                    count={Math.max(0, (post.likesCount || 0) - (post._isLiked ? 1 : 0))}
                    onLikedChange={() => onLike?.(post._id)}
                    size="sm"
                    className="!bg-transparent !border-0 !shadow-none hover:!bg-transparent dark:!bg-transparent dark:!border-0 !px-2 !gap-1 !h-8"
                />
            </div>

            {/* Comment */}
            <div className="flex-1 flex justify-center">
                <Item icon={MessageCircle} count={replyCount} hover="blue" label="Comment" onClick={(e) => { e.stopPropagation(); onToggleComments?.(); }} />
            </div>

            {/* Share */}
            <div className="flex-1 flex justify-center">
                <div onClick={(e) => e.stopPropagation()} className="hidden sm:flex justify-center">
                    <ShareButton post={post} />
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); if (navigator.share) navigator.share({ title: 'CampusZen', url: `${location.origin}/post/${post._id}` }).catch(()=>{}); else { navigator.clipboard.writeText(`${location.origin}/post/${post._id}`); } }}
                    className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4ba9e1]/10 hover:text-[#4ba9e1] hover:cursor-pointer transition-colors"
                    aria-label="Share"
                >
                    <Share2 className="w-[18px] h-[18px]" />
                </button>
            </div>

            {/* Save */}
            <div className="flex-1 flex justify-center">
                <button
                    onClick={handleBookmark}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center hover:cursor-pointer transition-colors duration-[var(--duration-fast)]",
                        bookmarkActive ? "text-[#4ba9e1] bg-[#4ba9e1]/10" : "text-muted-foreground hover:text-[#4ba9e1] hover:bg-[#4ba9e1]/10"
                    )}
                    aria-label={bookmarkActive ? "Remove bookmark" : "Save"}
                >
                    <Bookmark className={cn("w-[18px] h-[18px]", bookmarkActive && "fill-current")} />
                </button>
            </div>
        </div>
    );
}
