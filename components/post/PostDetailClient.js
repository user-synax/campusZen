"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Share2, FileX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import UserAvatar from "@/components/user/UserAvatar";
import PollDisplay from "@/components/post/PollDisplay";
import CommentItem from "@/components/post/CommentItem";
import LikeButton from "./LikeButton";
import ContentBlockRenderer from "./ContentBlockRenderer";
import { renderContentWithMentions, extractUrls } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import LinkPreview from "@/components/shared/LinkPreview";
import FormattedTime from "@/components/shared/FormattedTime";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { containsMarkdown } from "@/utils/markdown";
import useUser from "@/hooks/useUser";
import clientCache from "@/lib/client-cache";

export default function PostDetailClient({ postId }) {
    const router = useRouter();
    const { user: currentUser } = useUser();

    const postCacheKey = useMemo(() => `post-detail:${postId}`, [postId]);
    const commentsCacheKey = useMemo(() => `post-comments:${postId}`, [postId]);

    const initialPost = clientCache.get(postCacheKey);
    const initialComments = clientCache.get(commentsCacheKey);

    const [post, setPost] = useState(initialPost || null);
    const [comments, setComments] = useState(initialComments || []);
    const [loading, setLoading] = useState(!initialPost);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Post action states
    const [isLiked, setIsLiked] = useState(initialPost?._isLiked || false);
    const [likesCount, setLikesCount] = useState(initialPost?.likesCount || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [postRes, commentsRes] = await Promise.all([
                fetch(`/api/posts/${postId}`),
                fetch(`/api/posts/${postId}/comments`),
            ]);

            if (postRes.status === 404) {
                setPost(null);
                setLoading(false);
                return;
            }

            if (!postRes.ok) throw new Error("Failed to fetch post");
            if (!commentsRes.ok) throw new Error("Failed to fetch comments");

            const postData = await postRes.json();
            const commentsData = await commentsRes.json();

            setPost(postData);
            setIsLiked(postData._isLiked || false);
            setLikesCount(postData.likesCount || 0);

            const commentsList = commentsData.comments || [];
            setComments(commentsList);

            // Update caches
            clientCache.set(postCacheKey, postData, 3 * 60 * 1000);
            clientCache.set(commentsCacheKey, commentsList, 3 * 60 * 1000);
        } catch (error) {
            console.error("Error fetching post detail:", error);
            toast.error("Failed to load post");
        } finally {
            setLoading(false);
        }
    }, [postId, postCacheKey, commentsCacheKey]);

    useEffect(() => {
        if (!initialPost) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchData();
        }
    }, [initialPost, fetchData]);

    const urls = post?.content ? extractUrls(post.content) : [];

    const handleLike = async () => {
        try {
            const res = await fetch("/api/posts/like", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId }),
            });

            if (!res.ok) throw new Error("Failed to like post");

            const data = await res.json();
            setIsLiked(data.liked);
            setLikesCount(data.likesCount);

            // Update cached post
            setPost((prev) => {
                const updated = {
                    ...prev,
                    _isLiked: data.liked,
                    likesCount: data.likesCount,
                };
                clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
                return updated;
            });

            return data;
        } catch (err) {
            console.error("Like error:", err);
            toast.error("Failed to like post");
            throw err;
        }
    };

    const handleShare = () => {
        if (typeof window === "undefined") return;

        const url = window.location.href;
        if (navigator.share) {
            navigator
                .share({
                    title: `Check out this post on CampusZen`,
                    url,
                })
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || isSubmittingComment || !currentUser) return;

        setIsSubmittingComment(true);
        const commentText = newComment.trim();

        // Optimistic add
        const optimisticComment = {
            _id: Date.now().toString(),
            content: commentText,
            author: currentUser,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        const newComments = [...comments, optimisticComment];
        setComments(newComments);
        setNewComment("");
        clientCache.set(commentsCacheKey, newComments, 3 * 60 * 1000);

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentText }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            const finalComments = comments.map((c) =>
                c._id === optimisticComment._id ? data : c,
            );
            setComments(finalComments);
            clientCache.set(commentsCacheKey, finalComments, 3 * 60 * 1000);

            setPost((prev) => {
                const updated = prev
                    ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 }
                    : null;
                if (updated)
                    clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
                return updated;
            });
        } catch (error) {
            setComments(comments);
            clientCache.set(commentsCacheKey, comments, 3 * 60 * 1000);
            setNewComment(commentText);
            toast.error(error.message || "Failed to post comment");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const originalComments = [...comments];
        const newComments = comments.filter((c) => c._id !== commentId);
        setComments(newComments);
        clientCache.set(commentsCacheKey, newComments, 3 * 60 * 1000);

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId }),
            });

            if (!res.ok) throw new Error("Failed to delete");

            setPost((prev) => {
                const updated = prev
                    ? {
                          ...prev,
                          commentsCount: Math.max(
                              0,
                              (prev.commentsCount || 0) - 1,
                          ),
                      }
                    : null;
                if (updated)
                    clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
                return updated;
            });

            toast.success("Comment deleted");
        } catch (error) {
            setComments(originalComments);
            clientCache.set(commentsCacheKey, originalComments, 3 * 60 * 1000);
            toast.error("Failed to delete comment");
        }
    };

    if (loading)
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-10 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="font-bold">Post</h1>
                </div>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            </div>
        );

    if (!post) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-10 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <h1 className="font-bold">Post</h1>
                </div>
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <FileX className="w-12 h-12 text-muted-foreground" />
                    <p className="font-semibold">Post not found</p>
                    <p className="text-sm text-muted-foreground">
                        This post may have been deleted.
                    </p>
                    <Link href="/feed">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                        >
                            Back to Feed
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-10 flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="font-bold">Post</h1>
            </div>

            {/* Post Detail */}
            <div className="p-4 border-b border-border">
                {/* Author row */}
                <div className="flex items-center gap-3 mb-4">
                    <Link href={`/profile/${post.author.username}`}>
                        <UserAvatar user={post.author} size="lg" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/profile/${post.author.username}`}
                                className="hover:underline flex items-center gap-1"
                            >
                                <span className="font-bold text-lg text-foreground">
                                    {post.author.name}
                                </span>
                            </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            @{post.author.username} ·
                            <FormattedTime date={post.createdAt} type="full" />
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="text-xl leading-relaxed mb-6">
                    {post.isMarkdown || containsMarkdown(post.content) ? (
                        <MarkdownRenderer content={post.content} />
                    ) : (
                        <div className="whitespace-pre-wrap word-break-words">
                            {renderContentWithMentions(post.content || "").map(
                                (segment, i) => {
                                    if (segment.type === "hashtag") {
                                        return (
                                            <Link
                                                key={i}
                                                href={`/hashtag/${segment.value}`}
                                                className="text-blue-400 hover:text-blue-300 hover:underline"
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
                                                className="text-primary hover:underline"
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
                </div>

                {/* Rich Content Blocks (GIFs, emojis) */}
                {post.contentBlocks?.length > 0 && (
                    <div className="mb-6">
                        <ContentBlockRenderer blocks={post.contentBlocks} />
                    </div>
                )}

                {/* Link Previews */}
                <div className="mb-6 space-y-4">
                    {urls.length > 0 ? (
                        // New rich previews for all links found in text
                        urls.map((url, i) => <LinkPreview key={i} url={url} />)
                    ) : post.linkPreview ? (
                        // Fallback to attached link preview if no links in text
                        <LinkPreview url={post.linkPreview.url} />
                    ) : null}
                </div>

                {/* Poll */}
                {post.poll?.options?.length > 0 && (
                    <div className="mb-6">
                        <PollDisplay
                            poll={post.poll}
                            postId={post._id}
                            currentUserId={currentUser?._id}
                            isExpired={
                                post.poll.expiresAt &&
                                new Date(post.poll.expiresAt) < new Date()
                            }
                        />
                    </div>
                )}

                {/* Stats and Actions */}
                <div className="flex flex-col gap-4 py-4 border-t border-b border-border">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground px-1">
                        <span className="flex items-center gap-1">
                            <strong className="text-foreground">
                                {likesCount}
                            </strong>{" "}
                            Likes
                        </span>
                        <span className="flex items-center gap-1">
                            <strong className="text-foreground">
                                {comments.length}
                            </strong>{" "}
                            Comments
                        </span>
                        {post.community && (
                            <Badge
                                variant="secondary"
                                className="ml-auto bg-secondary/50"
                            >
                                🎓 {post.community}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-around">
                        <LikeButton
                            postId={postId}
                            initialLiked={isLiked}
                            initialCount={likesCount}
                            onLike={handleLike}
                        />

                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-muted-foreground hover:text-blue-400"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>Comment</span>
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={handleShare}
                            className="flex items-center gap-2 text-muted-foreground hover:text-green-400"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Comments */}
            <div className="p-4">
                {/* Comment input */}
                <div className="flex gap-3 mb-8">
                    <UserAvatar user={currentUser} size="md" />
                    <div className="flex-1 flex flex-col gap-2">
                        <Input
                            placeholder="Post your reply"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" &&
                                !e.shiftKey &&
                                handleAddComment()
                            }
                            className="bg-accent/20 border-border h-12 text-base focus-visible:ring-1"
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleAddComment}
                                disabled={
                                    !newComment.trim() || isSubmittingComment
                                }
                                className="rounded-full px-6"
                            >
                                {isSubmittingComment ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Reply"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Comments list */}
                {comments.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">
                            No comments yet. Be the first to reply!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment._id}
                                comment={comment}
                                currentUserId={currentUser?._id}
                                onDelete={handleDeleteComment}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
