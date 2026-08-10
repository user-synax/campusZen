"use client";

import { FileText, Zap, Compass, Sparkles, Search } from "lucide-react";
import { useCallback, useState, useEffect, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import PostCard from "@/components/post/PostCard";
import PostSkeleton from "@/components/post/PostSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { usePosts } from "@/hooks/usePosts";
import useUser from "@/hooks/useUser";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNotifications } from "@/hooks/useNotifications";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import PushPromptManager from "@/components/notifications/PushPromptManager";
import Link from "next/link";
import CommunitySwitcher from "@/components/feed/CommunitySwitcher";
import ShinyText from "@/components/reactBits/shinyText";

// Lazy load heavy components
const PostComposer = dynamic(() => import("@/components/post/PostComposer"), {
    ssr: false,
    loading: () => (
        <div className="px-4 py-3">
            <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-accent/60 shrink-0 animate-pulse" />
                <div className="flex-1 h-10 bg-accent/60 rounded-2xl animate-pulse" />
            </div>
        </div>
    ),
});

export default function FeedPage() {
    const { user: currentUser, refetch: refetchCurrentUser } = useUser();
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [activeTab, setActiveTab] = useState("discover");

    const shouldShowInterestsTab =
        currentUser?.interests?.includes("AI") &&
        currentUser?.interests?.length > 0;

    const isLatestMode = activeTab === "new";
    const feedType = activeTab === "new" ? "discover" : activeTab;

    const {
        posts,
        loading,
        error,
        hasMore,
        loadMore,
        prefetchNextPage,
        addPost,
        removePost,
        updatePostLike,
        refresh: refreshPosts,
    } = usePosts({
        ...(selectedCommunity && { community: selectedCommunity }),
        mode: isLatestMode ? "latest8h" : "default",
        feedType,
    });

    const parentRef = useRef(null);
    const [scrollMargin, setScrollMargin] = useState(0);
    const [modeKey, setModeKey] = useState(0);

    useEffect(() => {
        setModeKey((prev) => prev + 1);
    }, [selectedCommunity, activeTab]);

    useEffect(() => {
        if (parentRef.current) {
            setScrollMargin(parentRef.current.offsetTop);
        }
    }, [posts.length]);

    const postsVirtualizer = useWindowVirtualizer({
        count: posts.length,
        estimateSize: () => 350,
        overscan: 4,
        scrollMargin,
        key: modeKey,
    });

    const { newNotification } = useNotifications();

    useEffect(() => {
        const handleRefreshEvent = () => refreshPosts();
        window.addEventListener("cx-refresh-feed", handleRefreshEvent);
        return () =>
            window.removeEventListener("cx-refresh-feed", handleRefreshEvent);
    }, [refreshPosts]);

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMore,
        hasMore,
        loading,
        rootMargin: "900px",
    });

    useEffect(() => {
        if (!hasMore) return;

        let ticking = false;
        const prefetchDistance = 1200;
        const loadDistance = 450;
        const loadThrottleMs = 800;
        let lastLoadAt = 0;

        const onScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const remaining =
                    document.documentElement.scrollHeight -
                    (window.scrollY + window.innerHeight);

                if (remaining < prefetchDistance) {
                    prefetchNextPage();
                }

                // Fallback for cases where sentinel intersection is missed.
                if (
                    remaining < loadDistance &&
                    !loading &&
                    Date.now() - lastLoadAt > loadThrottleMs
                ) {
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

    const handlePostCreated = useCallback(
        (newPost) => {
            addPost(newPost);
            if (newPost.xpAwarded) {
                refetchCurrentUser();
                window.dispatchEvent(new CustomEvent("cx-xp-updated"));
            }
        },
        [addPost, refetchCurrentUser],
    );

    const handleDeletePost = useCallback(
        (postId) => removePost(postId),
        [removePost],
    );

    const handleLikePost = useCallback(
        async (postId) => updatePostLike(postId),
        [updatePostLike],
    );

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const tabs = [
        { id: "discover", label: "Discover", icon: Compass },
        ...(shouldShowInterestsTab
            ? [{ id: "interests", label: "Interests", icon: Sparkles }]
            : []),
        { id: "new", label: "Latest", icon: Zap },
    ];

    const emptyTitle = isLatestMode
        ? "No new posts in 8 hours"
        : activeTab === "interests"
          ? "No posts matching your interests yet"
          : "No posts yet";

    const emptyDescription = isLatestMode
        ? "Check back later for new posts"
        : activeTab === "interests"
          ? "Check back later or update your interests!"
          : selectedCommunity
            ? `Be the first to post in ${selectedCommunity}!`
            : "Be the first to post what's happening on campus!";

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* ── Sticky header ── */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
                {/* Greeting + switcher row */}
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
                    <div className="min-w-0 flex flex-col">
                        <h1 className="text-lg sm:text-xl font-semibold tracking-tight leading-tight flex items-baseline gap-1 truncate">
                            <span className="text-muted-foreground font-normal text-base sm:text-lg">
                                Hello,&nbsp;
                            </span>
                            <ShinyText
                                text={currentUser?.name || "User"}
                                speed={2}
                                delay={0.5}
                                color="#ffffff"
                                shineColor="#4ea8e0"
                                spread={120}
                                direction="left"
                                yoyo={false}
                                pauseOnHover={true}
                                disabled={false}
                            />
                        </h1>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground/50 tracking-wide mt-0.5 hidden xs:block">
                            Your campus feed
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <CommunitySwitcher
                            selectedCommunity={selectedCommunity}
                            onSelect={setSelectedCommunity}
                        />
                        {/* Search entry point — sidebar Search item removed */}
                        <Link
                            href="/search"
                            aria-label="Search"
                            className="icon-chunky inline-flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-accent/60"
                        >
                            <Search className="w-[18px] h-[18px]" />
                        </Link>
                    </div>
                </div>

                {/* Tab bar */}
                <nav className="flex items-center gap-1 px-3 pb-1.5">
                    {tabs.map(({ id, label, icon: Icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => handleTabChange(id)}
                                className={`
                                    chip-chunky hover:cursor-pointer relative flex items-center justify-center gap-1.5
                                    flex-1 sm:flex-none sm:px-4
                                    py-2 text-[12px] sm:text-[13px] font-medium
                                    select-none outline-none
                                    focus-visible:ring-2 focus-visible:ring-primary/50
                                    ${
                                        isActive
                                            ? "chip-chunky-active text-foreground"
                                            : "text-muted-foreground hover:text-foreground/80"
                                    }
                                `}
                            >
                                <Icon
                                    className={`
                                        w-3.5 h-3.5 shrink-0 transition-all duration-200
                                        ${isActive ? "text-primary" : ""}
                                    `}
                                />
                                <span>{label}</span>

                                {/* Active indicator — animated gradient underline */}
                                {isActive && (
                                    <span
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full
                                                   bg-gradient-to-r from-transparent via-primary to-transparent
                                                   animate-pulse"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </header>

            {/* ── Content wrapper — constrained width on large screens ── */}
            <div className="flex-1 w-full max-w-2xl mx-auto">
                {/* Composer section */}
                <div className="border-b border-border/40 bg-background/60 px-1 py-1">
                    <PostComposer
                        onPostCreated={handlePostCreated}
                        defaultCommunity={selectedCommunity}
                    />
                </div>

                {/* Push banner */}
                <PushPromptManager newNotification={newNotification} />

                {/* Posts list */}
                <div className="flex-1">
                    {loading && posts.length === 0 ? (
                        <div className="divide-y divide-border/40">
                            {Array(5)
                                .fill(0)
                                .map((_, i) => (
                                    <PostSkeleton key={i} />
                                ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="pt-12 px-4">
                            <EmptyState
                                icon={FileText}
                                title={emptyTitle}
                                description={emptyDescription}
                            />
                        </div>
                    ) : (
                        <>
                            <div
                                ref={parentRef}
                                className="divide-y divide-border/40 relative w-full"
                            >
                                <div
                                    style={{
                                        height: `${postsVirtualizer.getTotalSize()}px`,
                                        width: "100%",
                                        position: "relative",
                                    }}
                                >
                                    {postsVirtualizer
                                        .getVirtualItems()
                                        .map((virtualRow) => {
                                            const post =
                                                posts[virtualRow.index];
                                            if (!post) return null;
                                            return (
                                                <div
                                                    key={post._id}
                                                    ref={
                                                        postsVirtualizer.measureElement
                                                    }
                                                    data-index={
                                                        virtualRow.index
                                                    }
                                                    style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                        width: "100%",
                                                        transform: `translateY(${
                                                            virtualRow.start -
                                                            postsVirtualizer
                                                                .options
                                                                .scrollMargin
                                                        }px)`,
                                                    }}
                                                >
                                                    <PostCard
                                                        post={post}
                                                        currentUserId={
                                                            currentUser?._id
                                                        }
                                                        onDelete={
                                                            handleDeletePost
                                                        }
                                                        onLike={handleLikePost}
                                                    />
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <div ref={sentinelRef}>
                                <InfiniteScrollSentinel
                                    loading={loading}
                                    hasMore={hasMore}
                                    error={error}
                                    onRetry={loadMore}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}