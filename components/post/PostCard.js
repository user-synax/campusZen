"use client";

/**
 * PostCard — DESIGN.md (alpha) premium card.
 * Canvas #090909, surface-1 #141414, hairline-soft #1a1a1a borders,
 * ink / ink-muted hierarchy, accent-blue #4ba9e1 for links only.
 * 20px radius, 12–16px stack gap (parent .feed-stack), no lift on hover.
 */

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Crown } from "lucide-react";
import UserAvatar from "@/components/user/UserAvatar";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import FormattedTime from "@/components/shared/FormattedTime";
import PostContent from "./PostContent";
import ContentBlockRenderer from "./ContentBlockRenderer";
import PostActionBar from "./PostActionBar";
import { Badge } from "@/components/ui/badge";

const CommentSection = dynamic(() => import("@/components/post/CommentSection"), { ssr: false });
const PollDisplay = dynamic(() => import("@/components/post/PollDisplay"), { ssr: false });
const PostImageGrid = dynamic(() => import("@/components/post/PostImageGrid"), { ssr: false });
import PostOptionsMenu from "./PostOptionsMenu";

const PostCard = memo(function PostCard({
    post,
    currentUserId,
    currentUser,
    onDelete,
    onLike,
    onBookmark,
    onToggleComments,
    showComments,
    commentsCount,
    isPinned = false,
}) {
    const router = useRouter();
    const isPremium = post.author?.isPro;

    return (
        <article
            onClick={() => router.push(`/post/${post._id}`)}
            className="post-card group relative flex gap-3 px-3 py-3.5 sm:px-4 sm:py-4 cursor-pointer overflow-hidden"
        >
            {/* Premium quiet edge — no gradient */}
            {isPremium && (
                <span aria-hidden className="post-premium-edge" />
            )}

            {/* Avatar — 40px X-like */}
            <div className="shrink-0 pt-0.5">
                <Link href={`/profile/${post.author.username}`} onClick={(e) => e.stopPropagation()} className="hover:cursor-pointer">
                    <UserAvatar user={post.author} size="md" />
                </Link>
            </div>

            {/* Main */}
            <div className="flex-1 min-w-0">
                {/* Header — name, handle, time, community, menu */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-[14px] leading-none">
                        <Link
                            href={`/profile/${post.author.username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 min-w-0 hover:cursor-pointer group/name"
                        >
                            <span className="font-semibold text-[15px] tracking-[-0.15px] truncate group-hover/name:underline decoration-1 underline-offset-2">
                                {post.author.name}
                            </span>
                            {post.author?.isVerified && (
                                <VerifiedBadge size="sm" verificationType={post.author.verificationType} />
                            )}
                            {isPremium && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold tracking-wide border border-border/60 text-foreground">
                                    <Crown className="w-3 h-3" />
                                    Premium
                                </span>
                            )}
                        </Link>
                        <span className="post-meta truncate hidden sm:inline">@{post.author.username}</span>
                        <span className="post-meta hidden sm:inline">·</span>
                        <Link
                            href={`/post/${post._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="post-meta hover:underline hover:cursor-pointer shrink-0"
                        >
                            <FormattedTime date={post.createdAt} />
                        </Link>
                        {isPinned && (
                            <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground gap-1">
                                · Pinned
                            </span>
                        )}
                        {post.community && (
                            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] h-5 px-2 font-medium rounded-full border-border bg-secondary/60 max-w-[140px] truncate">
                                {post.communityInfo?.name || post.community}
                            </Badge>
                        )}
                    </div>

                    {/* Menu — context-menu (right-click/long-press + click) */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1 -mt-1">
                        <PostOptionsMenu post={post} currentUser={currentUser} onPostDeleted={onDelete} onPostUpdated={() => window.dispatchEvent(new CustomEvent("cx-refresh-feed"))} />
                    </div>
                </div>

                {/* Pinned label mobile */}
                {isPinned && (
                    <div className="sm:hidden mt-1 text-[11px] font-medium text-muted-foreground">Pinned post</div>
                )}
                {/* Community mobile */}
                {post.community && (
                    <div className="sm:hidden mt-1.5">
                        <Badge variant="outline" className="text-[11px] h-5 px-2 font-medium rounded-full border-border bg-secondary/60 truncate max-w-[180px]">
                            {post.communityInfo?.name || post.community}
                        </Badge>
                    </div>
                )}

                {/* Content — 15px Inter voice */}
                <div className="post-body mt-1.5 min-w-0 overflow-hidden break-words">
                    <PostContent content={post.content} isMarkdown={post.isMarkdown} />
                </div>

                {post.contentBlocks?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2.5">
                        <ContentBlockRenderer blocks={post.contentBlocks} className="mt-0" />
                    </div>
                )}

                {post.images?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2.5">
                        <PostImageGrid images={post.images} />
                    </div>
                )}

                {post.poll?.options?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2.5">
                        <PollDisplay
                            poll={post.poll}
                            postId={post._id}
                            currentUserId={currentUser?._id || currentUserId}
                            isExpired={post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()}
                        />
                    </div>
                )}

                {/* Action bar — quiet divider, evenly spaced */}
                <div onClick={(e) => e.stopPropagation()} className="mt-3 border-t border-border/40 pt-1">
                    <PostActionBar
                        post={post}
                        currentUser={currentUser}
                        commentsCount={commentsCount}
                        onLike={onLike}
                        onBookmark={onBookmark}
                        onDelete={onDelete}
                        onToggleComments={onToggleComments}
                        showComments={showComments}
                    />
                </div>

                {showComments && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2 border-t border-border/40 pt-3">
                        <CommentSection
                            postId={post._id}
                            currentUser={currentUser}
                            onCountChange={(diff) => onToggleComments?.(diff)}
                        />
                    </div>
                )}
            </div>
        </article>
    );
});

export default PostCard;
