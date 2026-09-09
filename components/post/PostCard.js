"use client";

/**
 * PostCard — X-like professional, compact, no AI slop.
 * Uses Framer dark canvas: canvas #090909, card #141414, hairline #262626,
 * white pill primary, blue #4ba9e1 only for links.
 * Premium vs direct: premium shows subtle crown pill, no gradient.
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
    const isDirect = !isPremium;

    return (
        <article
            onClick={() => router.push(`/post/${post._id}`)}
            className="group relative flex gap-3 px-3 sm:px-4 py-3 border-b border-border hover:bg-accent/30 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] cursor-pointer hover:cursor-pointer overflow-hidden"
        >
            {/* Premium subtle left accent — not gradient, just hairline wash */}
            {isPremium && (
                <span className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2px] bg-primary/20" />
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
                            <span className="font-semibold text-[15px] tracking-tight truncate group-hover/name:underline decoration-1 underline-offset-2">
                                {post.author.name}
                            </span>
                            {post.author?.isVerified && (
                                <VerifiedBadge size="sm" verificationType={post.author.verificationType} />
                            )}
                            {isPremium && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-wide border border-border/50">
                                    <Crown className="w-3 h-3" />
                                    Premium
                                </span>
                            )}
                        </Link>
                        <span className="text-muted-foreground truncate hidden sm:inline text-[14px]">@{post.author.username}</span>
                        <span className="text-muted-foreground hidden sm:inline">·</span>
                        <Link
                            href={`/post/${post._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:underline hover:cursor-pointer shrink-0 text-[14px]"
                        >
                            <FormattedTime date={post.createdAt} />
                        </Link>
                        {isPinned && (
                            <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground gap-1">
                                · Pinned
                            </span>
                        )}
                        {post.community && (
                            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] h-5 px-1.5 font-medium border-border bg-secondary/50 max-w-[110px] truncate">
                                {post.communityInfo?.name || post.community}
                            </Badge>
                        )}
                    </div>

                    {/* Menu — context-menu (right-click/long-press + click) */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1 -mt-1">
                        <PostOptionsMenu post={post} currentUser={currentUser} onPostDeleted={onDelete} onPostUpdated={(p) => (post.content = p.content)} />
                    </div>
                </div>

                {/* Pinned label mobile */}
                {isPinned && (
                    <div className="sm:hidden mt-1 text-[11px] font-medium text-muted-foreground">Pinned post</div>
                )}
                {/* Community mobile */}
                {post.community && (
                    <div className="sm:hidden mt-1">
                        <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-medium border-border bg-secondary/50 truncate max-w-[180px]">
                            {post.communityInfo?.name || post.community}
                        </Badge>
                    </div>
                )}

                {/* Content — 15px, no gradient */}
                <div className="mt-1.5 min-w-0 overflow-hidden break-words">
                    <PostContent content={post.content} isMarkdown={post.isMarkdown} />
                </div>

                {post.contentBlocks?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2">
                        <ContentBlockRenderer blocks={post.contentBlocks} className="mt-0" />
                    </div>
                )}

                {post.images?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-2">
                        <PostImageGrid images={post.images} />
                    </div>
                )}

                {post.poll?.options?.length > 0 && (
                    <div onClick={(e) => e.stopPropagation()} className="mt-3">
                        <PollDisplay
                            poll={post.poll}
                            postId={post._id}
                            currentUserId={currentUser?._id || currentUserId}
                            isExpired={post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()}
                        />
                    </div>
                )}

                {/* Action bar — X-like, evenly spaced, 13px counts */}
                <div onClick={(e) => e.stopPropagation()} className="mt-2 -ml-1">
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
                    <div onClick={(e) => e.stopPropagation()} className="mt-3 border-t border-border/50 pt-3">
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
