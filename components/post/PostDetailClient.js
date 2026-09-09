"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Share2, FileX, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import UserAvatar from "@/components/user/UserAvatar";
import PollDisplay from "@/components/post/PollDisplay";
import CommentItem from "@/components/post/CommentItem";
import { LikeButton } from "@/components/spectrumui/like-button";
import ContentBlockRenderer from "./ContentBlockRenderer";
import { renderContentWithMentions, extractUrls } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import LinkPreview from "@/components/shared/LinkPreview";
import FormattedTime from "@/components/shared/FormattedTime";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { containsMarkdown } from "@/utils/markdown";
import useUser from "@/hooks/useUser";
import clientCache from "@/lib/client-cache";
import PostOptionsMenu from "./PostOptionsMenu";
import FollowButton from "@/components/user/FollowButton";

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
    const [isLiked, setIsLiked] = useState(initialPost?._isLiked || false);
    const [likesCount, setLikesCount] = useState(initialPost?.likesCount || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [postRes, commentsRes] = await Promise.all([
                fetch(`/api/posts/${postId}`),
                fetch(`/api/posts/${postId}/comments`),
            ]);
            if (postRes.status === 404) { setPost(null); setLoading(false); return; }
            if (!postRes.ok) throw new Error("Failed to fetch post");
            if (!commentsRes.ok) throw new Error("Failed to fetch comments");
            const postData = await postRes.json();
            const commentsData = await commentsRes.json();
            setPost(postData);
            setIsLiked(postData._isLiked || false);
            setLikesCount(postData.likesCount || 0);
            const commentsList = commentsData.comments || [];
            setComments(commentsList);
            clientCache.set(postCacheKey, postData, 3 * 60 * 1000);
            clientCache.set(commentsCacheKey, commentsList, 3 * 60 * 1000);
        } catch (error) {
            console.error("Error fetching post detail:", error);
            toast.error("Failed to load post");
        } finally {
            setLoading(false);
        }
    }, [postId, postCacheKey, commentsCacheKey]);

    useEffect(() => { if (!initialPost) fetchData(); }, [initialPost, fetchData]);

    const urls = post?.content ? extractUrls(post.content) : [];

    const handleLike = async () => {
        try {
            const res = await fetch("/api/posts/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) });
            if (!res.ok) throw new Error("Failed to like post");
            const data = await res.json();
            setIsLiked(data.liked);
            setLikesCount(data.likesCount);
            setPost((prev) => {
                const updated = { ...prev, _isLiked: data.liked, likesCount: data.likesCount };
                clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
                return updated;
            });
            return data;
        } catch (err) {
            toast.error("Failed to like post");
            throw err;
        }
    };

    const handleShare = () => {
        if (typeof window === "undefined") return;
        const url = window.location.href;
        if (navigator.share) navigator.share({ title: `CampusZen`, url }).catch(() => {});
        else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || isSubmittingComment || !currentUser) return;
        setIsSubmittingComment(true);
        const commentText = newComment.trim();
        const optimisticComment = { _id: Date.now().toString(), content: commentText, author: currentUser, createdAt: new Date().toISOString(), isOptimistic: true };
        const newComments = [...comments, optimisticComment];
        setComments(newComments);
        setNewComment("");
        clientCache.set(commentsCacheKey, newComments, 3 * 60 * 1000);
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentText }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            const finalComments = comments.map((c) => c._id === optimisticComment._id ? data : c);
            setComments(finalComments);
            clientCache.set(commentsCacheKey, finalComments, 3 * 60 * 1000);
            setPost((prev) => {
                const updated = prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null;
                if (updated) clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
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
            const res = await fetch(`/api/posts/${postId}/comments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId }) });
            if (!res.ok) throw new Error("Failed to delete");
            setPost((prev) => {
                const updated = prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) } : null;
                if (updated) clientCache.set(postCacheKey, updated, 3 * 60 * 1000);
                return updated;
            });
            toast.success("Comment deleted");
        } catch (error) {
            setComments(originalComments);
            clientCache.set(commentsCacheKey, originalComments, 3 * 60 * 1000);
            toast.error("Failed to delete comment");
        }
    };

    if (loading) return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-3 h-[53px] flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8 hover:cursor-pointer"><ArrowLeft className="w-4 h-4" /></Button>
                <h1 className="font-bold text-[15px]">Post</h1>
            </div>
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        </div>
    );

    if (!post) return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border px-3 h-[53px] flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
                <h1 className="font-bold text-[15px]">Post</h1>
            </div>
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-4 text-center">
                <FileX className="w-10 h-10 text-muted-foreground" />
                <p className="font-semibold text-[15px]">Post not found</p>
                <p className="text-sm text-muted-foreground">This post may have been deleted.</p>
                <Link href="/feed"><Button variant="outline" size="sm" className="rounded-full hover:cursor-pointer">Back to Feed</Button></Link>
            </div>
        </div>
    );

    const isPremiumPost = post.author?.isPro;
    const isOwnPost = currentUser?._id === post.author?._id || currentUser?._id?.toString() === post.author?._id?.toString();

    return (
        <div className="flex flex-col min-h-screen bg-background pb-16">
            {/* Header — X-like back */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-2 h-[53px] flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8 hover:bg-accent hover:cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-bold text-[15px]">Post</h1>
            </div>

            {/* Post — premium vs direct */}
            <article className="px-4 pt-3 pb-2 border-b border-border">
                {/* Author row — X detail has larger avatar and follow */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href={`/profile/${post.author.username}`} className="shrink-0 hover:cursor-pointer">
                            <UserAvatar user={post.author} size="md" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <Link href={`/profile/${post.author.username}`} className="font-bold text-[15px] hover:underline leading-none hover:cursor-pointer">
                                    {post.author.name}
                                </Link>
                                {isPremiumPost && (
                                    <span className="hidden sm:inline-flex items-center rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold gap-1">Premium</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
                                <span className="truncate">@{post.author.username}</span>
                                <span>·</span>
                                <span className="shrink-0"><FormattedTime date={post.createdAt} /></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isOwnPost && currentUser && (
                            <div className="hidden sm:block">
                                <FollowButton targetUserId={post.author._id} username={post.author.username} size="sm" />
                            </div>
                        )}
                        <PostOptionsMenu post={post} currentUser={currentUser} onPostDeleted={() => router.push('/feed')} />
                    </div>
                </div>

                {/* Content — larger on detail (17px X-like) */}
                <div className="mt-3 text-[17px] leading-[1.45] break-words whitespace-pre-wrap">
                    {post.isMarkdown || containsMarkdown(post.content) ? (
                        <MarkdownRenderer content={post.content} className="text-[17px] leading-[1.45]" />
                    ) : (
                        <div className="whitespace-pre-wrap break-words">
                            {renderContentWithMentions(post.content || "").map((segment, i) => {
                                if (segment.type === "hashtag") return <Link key={i} href={`/hashtag/${segment.value}`} className="text-[#4ba9e1] hover:underline">#{segment.value}</Link>;
                                if (segment.type === "mention") return <UserMention key={i} username={segment.value} />;
                                if (segment.type === "url") return <a key={i} href={segment.value} target="_blank" rel="noopener noreferrer" className="text-[#4ba9e1] hover:underline break-all">{segment.value}</a>;
                                return <span key={i}>{segment.value}</span>;
                            })}
                        </div>
                    )}
                </div>

                {post.contentBlocks?.length > 0 && (
                    <div className="mt-3">
                        <ContentBlockRenderer blocks={post.contentBlocks} />
                    </div>
                )}

                <div className="mt-3 space-y-3">
                    {urls.length > 0 ? urls.map((url, i) => <LinkPreview key={i} url={url} />) : post.linkPreview ? <LinkPreview url={post.linkPreview.url} /> : null}
                </div>

                {post.poll?.options?.length > 0 && (
                    <div className="mt-3">
                        <PollDisplay poll={post.poll} postId={post._id} currentUserId={currentUser?._id} isExpired={post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()} />
                    </div>
                )}

                {/* Date row — X detail shows time · date · views */}
                <div className="mt-4 py-3 border-y border-border flex items-center gap-1.5 text-[14px] text-muted-foreground">
                    <FormattedTime date={post.createdAt} type="full" />
                    <span>·</span>
                    <span className="font-medium text-foreground">{likesCount}</span> Likes
                    <span className="mx-1">·</span>
                    <span className="font-medium text-foreground">{post.commentsCount ?? comments.length}</span> Replies
                </div>

                {/* Action bar — X detail large */}
                <div className="flex items-center justify-around py-1 -mx-2">
                    <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full hover:bg-[#4ba9e1]/10 hover:text-[#4ba9e1] text-muted-foreground hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                        <MessageCircle className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex justify-center">
                        <LikeButton liked={isLiked} count={0} onLikedChange={handleLike} size="md" />
                    </div>
                    <button onClick={handleShare} className="flex-1 flex items-center justify-center py-2 rounded-full hover:bg-[#00ba7c]/10 hover:text-[#00ba7c] text-muted-foreground hover:cursor-pointer transition-colors">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </article>

            {/* Reply composer — X-like */}
            <div className="px-4 py-3 border-b border-border flex gap-3">
                <UserAvatar user={currentUser} size="sm" />
                <div className="flex-1 flex gap-2">
                    <Input
                        id="comment-input"
                        placeholder={currentUser ? "Post your reply" : "Log in to reply"}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                        disabled={!currentUser || isSubmittingComment}
                        className="flex-1 bg-accent/30 border-transparent focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30 rounded-full h-10 text-[14px] hover:cursor-text"
                    />
                    <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || isSubmittingComment || !currentUser}
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-5 h-10 text-[13px] hover:cursor-pointer disabled:opacity-40"
                    >
                        {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
                    </Button>
                </div>
            </div>

            {/* Comments */}
            <div className="divide-y divide-border/30">
                {comments.length === 0 ? (
                    <div className="text-center py-10 px-4">
                        <p className="text-[14px] text-muted-foreground">No replies yet. Be the first!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment._id} className="px-4 py-3 hover:bg-accent/20 transition-colors">
                            <CommentItem comment={comment} currentUserId={currentUser?._id} onDelete={handleDeleteComment} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
