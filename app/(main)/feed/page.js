"use client";

import { FileText, Search, Flame, Users } from "lucide-react";
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
import Link from "next/link";
import CommunitySwitcher from "@/components/feed/CommunitySwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
                        <CommunitySwitcher selectedCommunity={selectedCommunity} onSelect={setSelectedCommunity} />
                    </div>
                </div>

                <div className="relative flex border-b border-border/40">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "var(--gradient-lilac-bleed)" }} />
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`relative flex-1 flex items-center justify-center py-2.5 text-[13px] hover:cursor-pointer transition-colors duration-[var(--duration-fast)] ${isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30"}`}
                            >
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-primary rounded-full animate-[tabIn_var(--duration-fast)_var(--ease-smooth-out)]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 border-b border-border/30 bg-card/40">
                    <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                        <AvatarFallback className="bg-accent text-[11px] font-bold">{currentUser?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] text-muted-foreground">What&apos;s happening?</span>
                    <span className="ml-auto text-[11px] font-semibold text-foreground bg-accent border border-border/50 px-2.5 py-1 rounded-full hidden lg:inline-flex items-center gap-1">
                        CampusZen
                    </span>
                </div>
            </header>

            {/* Center feed — widened, responsive, no virtualizer jank on mobile */}
            <div className="flex-1 w-full max-w-[680px] mx-auto sm:border-x border-border/40 bg-background overflow-hidden">
                {/* Composer — X-style */}
                <div className="border-b border-border/40 bg-background hover:bg-background transition-colors">
                    <PostComposer onPostCreated={handlePostCreated} defaultCommunity={selectedCommunity} />
                </div>

                <PushPromptManager newNotification={newNotification} />

                {/* Timeline — simple list, no absolute virtualization (fixes mobile overflow) */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    {loading && posts.length === 0 ? (
                        <div className="divide-y divide-border/30">
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="p-3 sm:p-4 animate-[fadeIn_var(--duration-slow)_var(--ease-smooth-out)]" style={{ animationDelay: `${i * 40}ms` }}>
                                    <PostSkeleton />
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="pt-6 sm:pt-10 px-3 sm:px-4">
                            <div className="rounded-[14px] border border-border bg-card p-6 sm:p-8 text-center shadow-sm">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent border border-border/50 flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                </div>
                                <EmptyState icon={FileText} title={emptyTitle} description={emptyDescription} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-border/30">
                                {posts.map((post) => (
                                    <div key={post._id} className="group/post hover:bg-accent/[0.03] dark:hover:bg-accent/20 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:cursor-pointer overflow-hidden">
                                        <PostCardWithState post={post} currentUserId={currentUser?._id} currentUser={currentUser} onDelete={deletePost} onLike={likePost} onBookmark={bookmarkPost} />
                                    </div>
                                ))}
                            </div>
                            <div ref={sentinelRef} className="py-2">
                                <InfiniteScrollSentinel loading={loading} hasMore={hasMore} error={error} onRetry={loadMore} />
                            </div>
                        </>
                    )}
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
