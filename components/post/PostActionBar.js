"use client";

import { useState, useCallback } from "react";
import { MessageCircle, Bookmark } from "lucide-react";
import { LikeButton } from "@/components/spectrumui/like-button";
import ShareButton from "./ShareButton";
import PostOptionsMenu from "./PostOptionsMenu";
import { cn } from "@/lib/utils";

/**
 * Client island for post interactions — like, comment toggle, bookmark, share,
 * overflow menu. Rendered inside the server-component PostCard shell.
 */
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
    const [localBookmarked, setLocalBookmarked] = useState(
        post._isBookmarked || false,
    );

    const handleBookmark = useCallback(
        async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await onBookmark?.(post._id);
            setLocalBookmarked((prev) => !prev);
        },
        [onBookmark, post._id],
    );

    return (
        <div className="flex items-center justify-between mt-3 text-muted-foreground">
            <div className="flex items-center gap-4 sm:gap-6">
                <LikeButton
                    liked={post._isLiked}
                    count={Math.max(
                        0,
                        (post.likesCount || 0) - (post._isLiked ? 1 : 0),
                    )}
                    onLikedChange={() => onLike?.(post._id)}
                    size="sm"
                />

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleComments?.();
                    }}
                    className="icon-chunky hover:cursor-pointer flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors group/comment px-1"
                >
                    <div className="p-2 rounded-full group-hover/comment:bg-blue-400/10">
                        <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-[10px] sm:text-xs pr-1">
                        {commentsCount}
                    </span>
                </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <button
                    onClick={handleBookmark}
                    className={cn(
                        "p-2 rounded-full border-2 border-transparent transition-all duration-150 hover:cursor-pointer",
                        localBookmarked
                            ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                            : "hover:text-yellow-400 hover:bg-yellow-400/10 hover:border-border hover:shadow-[var(--shadow-hard-sm)]",
                    )}
                    title={localBookmarked ? "Remove bookmark" : "Save post"}
                >
                    <Bookmark
                        className={cn(
                            "w-4 h-4",
                            localBookmarked && "fill-current",
                        )}
                    />
                </button>

                <ShareButton post={post} />

                <div onClick={(e) => e.stopPropagation()}>
                    <PostOptionsMenu
                        post={post}
                        currentUser={currentUser}
                        onPostDeleted={onDelete}
                        onPostUpdated={(updatedPost) => {
                            post.content = updatedPost.content;
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
