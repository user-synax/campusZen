/**
 * PostCard — server-component shell with client islands for interactivity.
 *
 * The outer shell is a plain React component (no "use client") that renders
 * static layout + data. Interactive pieces are thin client components:
 *   - PostActionBar   → like / comment toggle / bookmark / share / menu
 *   - PostContent     → markdown / mention rendering (already client)
 *   - PostImageGrid   → images (already client)
 *   - PollDisplay     → poll voting (already client)
 *   - CommentSection  → comment list + composer (already client)
 *
 * When rendered inside a "use client" parent (feed page), this component
 * runs on the client but keeps its own bundle footprint minimal because the
 * heavy interactive logic lives in the island components.
 */

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import UserAvatar from "@/components/user/UserAvatar";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import FormattedTime from "@/components/shared/FormattedTime";
import PostContent from "./PostContent";
import ContentBlockRenderer from "./ContentBlockRenderer";
import PostActionBar from "./PostActionBar";
import { Badge } from "@/components/ui/badge";

// Lazy-load heavy client islands
const CommentSection = dynamic(
    () => import("@/components/post/CommentSection"),
    { ssr: false },
);
const PollDisplay = dynamic(
    () => import("@/components/post/PollDisplay"),
    { ssr: false },
);
const PostImageGrid = dynamic(
    () => import("@/components/post/PostImageGrid"),
    { ssr: false },
);

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

    return (
        <div
            className="border-b border-border p-3 sm:p-4 hover:bg-accent/10 transition-colors cursor-pointer group overflow-hidden"
            onClick={() => router.push(`/post/${post._id}`)}
        >
            <div className="flex gap-2.5 sm:gap-3 min-w-0">
                <div className="shrink-0">
                    <UserAvatar user={post.author} size="md" />
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[13px] sm:text-sm min-w-0">
                        <Link
                            href={`/profile/${post.author.username}`}
                            className="hover:underline flex items-center gap-1 min-w-0 hover:cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="font-semibold text-foreground text-[13px] sm:text-[14px] truncate">
                                {post.author.name}
                            </span>
                            {post.author?.isVerified && (
                                <VerifiedBadge
                                    size="sm"
                                    verificationType={post.author.verificationType}
                                />
                            )}
                        </Link>
                        <span className="text-muted-foreground truncate text-[12px] sm:text-[13px] hidden xs:inline">
                            @{post.author.username}
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">&middot;</span>
                        <Link
                            href={`/post/${post._id}`}
                            className="text-muted-foreground hover:underline text-[12px] sm:text-[13px] shrink-0 hover:cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <FormattedTime date={post.createdAt} />
                        </Link>
                        {post.community && (
                            <Badge
                                variant="outline"
                                className="text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 font-medium border-border bg-secondary/30 max-w-[110px] sm:max-w-none truncate"
                            >
                                {post.communityInfo?.emoji || "\u{1F393}"}{" "}
                                <span className="truncate">{post.communityInfo?.name || post.community}</span>
                            </Badge>
                        )}
                    </div>

                    <div className="mt-1 min-w-0 overflow-hidden break-words">
                        <PostContent
                            content={post.content}
                            isMarkdown={post.isMarkdown}
                        />
                    </div>

                    {post.contentBlocks?.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <ContentBlockRenderer
                                blocks={post.contentBlocks}
                                className="mt-2"
                            />
                        </div>
                    )}

                    {post.images?.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <PostImageGrid images={post.images} />
                        </div>
                    )}

                    {post.poll?.options?.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <PollDisplay
                                poll={post.poll}
                                postId={post._id}
                                currentUserId={currentUser?._id || currentUserId}
                                isExpired={
                                    post.poll.expiresAt &&
                                    new Date(post.poll.expiresAt) < new Date()
                                }
                            />
                        </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
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
                        <div onClick={(e) => e.stopPropagation()}>
                            <CommentSection
                                postId={post._id}
                                currentUser={currentUser}
                                onCountChange={(diff) =>
                                    onToggleComments ? onToggleComments(diff) : undefined
                                }
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default PostCard;
