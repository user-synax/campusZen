"use client";

import { FileText } from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PostCard from "@/components/post/PostCard";
import PostSkeleton from "@/components/post/PostSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { usePosts } from "@/hooks/usePosts";
import { usePostMutations } from "@/hooks/usePostMutations";
import useUser from "@/hooks/useUser";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtime } from "@/hooks/useRealtime";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import PushPromptManager from "@/components/notifications/PushPromptManager";
import CommunitySwitcher from "@/components/feed/CommunitySwitcher";
import VerifiedFilterToggle from "@/components/feed/VerifiedFilterToggle";
import VerificationNudgeBanner from "@/components/shared/VerificationNudgeBanner";

const PostComposer = dynamic(() => import("@/components/post/PostComposer"), {
    ssr: false,
    loading: () => (
        <div className="px-4 py-3 flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-accent/60 shrink-0 animate-pulse" />
            <div className="flex-1 h-11 bg-accent/60 rounded-full animate-pulse" />
        </div>
    ),
});

function PostCardWithState({ post, currentUserId, currentUser, onDelete, onLike, onBookmark }) {
    const [showComments, setShowComments] = useState(false);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
    const handleToggleComments = useCallback((diff) => {
        if (typeof diff === "number") setCommentsCount((prev) => Math.max(0, prev + diff));
        else setShowComments((prev) => !prev);
    }, []);
    return (
        <PostCard
            post={post}
            currentUserId={currentUserId}
            currentUser={currentUser}
            onDelete={onDelete}
            onLike={onLike}
            onBookmark={onBookmark}
            onToggleComments={handleToggleComments}
            showComments={showComments}
            commentsCount={commentsCount}
        />
    );
}

export default function FeedPage() {
    const { user: currentUser, refetch: refetchCurrentUser } = useUser();
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [activeTab, setActiveTab] = useState("discover");
    const [verifiedOnly, setVerifiedOnly] = useState(false);

    const isLatestMode = activeTab === "new";
    const feedType = activeTab === "new" ? "discover" : activeTab;

    const {
        posts,
        setPosts,
        loading,
        error,
        hasMore,
        loadMore,
        prefetchNextPage,
        addPost,
        removePost,
        refresh: refreshPosts,
    } = usePosts({
        ...(selectedCommunity && { community: selectedCommunity }),
        mode: isLatestMode ? "latest8h" : "default",
        feedType,
        verifiedOnly,
    });

    const postsRef = useRef(posts);
    useEffect(() => { postsRef.current = posts; }, [posts]);

    const { likePost, bookmarkPost, deletePost, prependPost } = usePostMutations({ setPosts, postsRef });

    useRealtime({
        "post:new": useCallback(
            (data) => {
                if (activeTab === "new") return;
                if (data.author?._id === currentUser?._id) return;
                prependPost(data);
            },
            [activeTab, currentUser?._id, prependPost],
        ),
        "post:like": useCallback(
            (data) => {
                setPosts((prev) =>
                    prev.map((p) =>
                        p._id === data.postId
                            ? { ...p, likesCount: data.likesCount }
                            : p,
                    ),
                );
            },
            [setPosts],
        ),
    });



    const { newNotification } = useNotifications();
    useEffect(() => {
        const h = () => refreshPosts();
        window.addEventListener("cx-refresh-feed", h);
        return () => window.removeEventListener("cx-refresh-feed", h);
    }, [refreshPosts]);

    const { sentinelRef } = useInfiniteScroll({ fetchMore: loadMore, hasMore, loading, rootMargin: "900px" });

    useEffect(() => {
        if (!hasMore) return;
        let ticking = false;
        let lastLoadAt = 0;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const rem = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
                if (rem < 1200) prefetchNextPage();
                if (rem < 450 && !loading && Date.now() - lastLoadAt > 800) {
                    lastLoadAt = Date.now();
                    loadMore();
                }
                ticking = false;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [hasMore, loading, prefetchNextPage, loadMore]);

    const handlePostCreated = useCallback((newPost) => {
        addPost(newPost);
        if (newPost.xpAwarded) {
            refetchCurrentUser();
            window.dispatchEvent(new CustomEvent("cx-xp-updated"));
        }
    }, [addPost, refetchCurrentUser]);

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const tabs = [
        { id: "discover", label: "For you" },
        { id: "new", label: "Following" },
    ];

    const emptyTitle = isLatestMode ? "No new posts in 8 hours" : "No posts yet";
    const emptyDescription = isLatestMode ? "Check back later for new posts" : selectedCommunity ? `Be the first to post in ${selectedCommunity}!` : "Be the first to post what's happening on campus!";

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/50">
                <div className="flex items-center justify-between px-3 h-[44px]">
                    <h1 className="text-[16px] font-bold tracking-tight">Home</h1>
                    <div className="flex items-center gap-1">
                        <VerifiedFilterToggle active={verifiedOnly} onToggle={() => setVerifiedOnly((v) => !v)} />
                        <CommunitySwitcher selectedCommunity={selectedCommunity} onSelect={setSelectedCommunity} />
                    </div>
                </div>

                <div className="relative flex">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`relative flex-1 flex items-center justify-center py-2.5 text-[13px] hover:cursor-pointer transition-colors duration-[var(--duration-fast)] ${isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"}`}
                            >
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-primary rounded-full animate-[tabIn_var(--duration-fast)_var(--ease-smooth-out)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Center feed — premium card stack: 12–16px gaps, 20px radius */}
            <div className="flex-1 w-full max-w-[640px] mx-auto">
                <div className="feed-stack">
                    {/* Composer — rounded card */}
                    <div className="composer-card overflow-hidden">
                        <PostComposer noBorder onPostCreated={handlePostCreated} defaultCommunity={selectedCommunity} />
                    </div>

                    <VerificationNudgeBanner />

                    <PushPromptManager newNotification={newNotification} />

                    {/* Timeline — spaced cards, no dividers */}
                    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
                        {loading && posts.length === 0 ? (
                            <>
                                {Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="post-skeleton-card p-3 sm:p-4">
                                        <PostSkeleton />
                                    </div>
                                ))}
                            </>
                        ) : posts.length === 0 ? (
                            <div className="post-skeleton-card p-6 text-center sm:p-8">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary border border-border/60 flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                </div>
                                <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />
                            </div>
                        ) : (
                            <>
                                {posts.map((post) => (
                                    <PostCardWithState key={post._id} post={post} currentUserId={currentUser?._id} currentUser={currentUser} onDelete={deletePost} onLike={likePost} onBookmark={bookmarkPost} />
                                ))}
                                <div ref={sentinelRef} className="py-2">
                                    <InfiniteScrollSentinel loading={loading} hasMore={hasMore} error={error} onRetry={loadMore} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes tabIn {
                    from { transform: scaleX(0.6); opacity: 0; filter: blur(var(--blur-small)); }
                    to { transform: scaleX(1); opacity: 1; filter: blur(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(var(--distance-medium)); filter: blur(var(--blur-small)); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
            `}</style>
        </div>
    );
}
