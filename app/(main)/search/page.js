"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Search,
    X,
    Users,
    Hash,
    Flame,
    TrendingUp,
    GraduationCap,
    Image as ImageIcon,
    Crown,
    Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PostCard from "@/components/post/PostCard";
import PostSkeleton from "@/components/post/PostSkeleton";
import UserAvatar from "@/components/user/UserAvatar";
import FollowButton from "@/components/user/FollowButton";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import EmptyState from "@/components/shared/EmptyState";
import useUser from "@/hooks/useUser";
import { slugifyCollege } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import { useDebounce } from "@/hooks/useDebounce";
import TrendingPosts from "@/components/feed/TrendingPosts";

const TABS = [
    { id: "top", label: "Top" },
    { id: "people", label: "People" },
    { id: "media", label: "Media" },
];

function formatCount(c) {
    if (c >= 1000) return (c / 1000).toFixed(1) + "k";
    return String(c);
}

function UserRow({ user, currentUser }) {
    const isAdmin = user.role === "admin" || user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    return (
        <div
            className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative",
                isAdmin
                    ? "bg-gradient-to-r from-purple-900/20 via-violet-900/15 to-fuchsia-900/20 border border-purple-500/30 hover:border-purple-500/50"
                    : user.isPro
                      ? "bg-gradient-to-r from-yellow-900/20 via-amber-900/10 to-orange-900/20 border border-yellow-500/30 hover:border-yellow-500/50"
                      : "bg-accent/10 hover:bg-accent/30 border border-border/30",
            )}
        >
            {isAdmin && (
                <div className="absolute -top-2 -right-2 z-10">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow">
                        <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                </div>
            )}
            {user.isPro && !isAdmin && (
                <div className="absolute -top-2 -right-2 z-10">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center shadow">
                        <Crown className="w-3 h-3 text-yellow-950" />
                    </div>
                </div>
            )}
            <Link href={`/profile/${user.username}`} className="shrink-0 relative">
                <div
                    className={cn(
                        "rounded-full p-0.5",
                        isAdmin
                            ? "bg-gradient-to-tr from-purple-400 via-violet-500 to-fuchsia-500"
                            : user.isPro
                              ? "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500"
                              : "",
                    )}
                >
                    <UserAvatar user={user} size="lg" />
                </div>
            </Link>
            <div className="flex-1 min-w-0">
                <Link href={`/profile/${user.username}`}>
                    <p
                        className={cn(
                            "font-semibold text-sm leading-tight truncate flex items-center gap-1.5",
                            isAdmin
                                ? "text-purple-400 group-hover:text-purple-300"
                                : user.isPro
                                  ? "text-yellow-400 group-hover:text-yellow-300"
                                  : "text-foreground group-hover:text-primary",
                        )}
                    >
                        {user.name}
                        {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-xs font-medium text-purple-400">
                                <Shield className="w-3 h-3" />
                                Founder
                            </span>
                        )}
                        {user.isPro && !isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-xs font-medium text-yellow-400">
                                <Crown className="w-3 h-3" />
                                Pro
                            </span>
                        )}
                        {user.isVerified && (
                            <VerifiedBadge size="sm" verificationType={user.verificationType} />
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </Link>
                {user.bio && (
                    <p className="text-xs text-muted-foreground/80 truncate mt-1">{user.bio}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground/70">{user.followersCount ?? user.followers?.length ?? 0} followers</span>
                    {user.college && (
                        <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs text-muted-foreground/70 truncate">🎓 {user.college}</span>
                        </>
                    )}
                </div>
            </div>
            {currentUser?._id !== user._id && (
                <div className="shrink-0">
                    <FollowButton
                        targetUserId={user._id}
                        username={user.username}
                        initialIsFollowing={currentUser?.following?.includes(user._id)}
                        initialFollowersCount={user.followersCount ?? 0}
                    />
                </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    const { user: currentUser } = useUser();
    const [query, setQuery] = useState("");
    // useDebounce 300ms as specified
    const debouncedQuery = useDebounce(query, 300);
    const hasQuery = debouncedQuery.trim().length >= 2;

    const [activeTab, setActiveTab] = useState("top");
    const tabsRef = useRef(null);
    const pillRef = useRef(null);

    // Search results
    const [postResults, setPostResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMorePosts, setHasMorePosts] = useState(false);
    const [hasMoreUsers, setHasMoreUsers] = useState(false);
    const [postsPage, setPostsPage] = useState(1);
    const [usersPage, setUsersPage] = useState(1);

    // Explore (when no query) — reuse RightPanel logic
    const [exploreHashtags, setExploreHashtags] = useState([]);
    const [exploreCommunities, setExploreCommunities] = useState([]);
    const [exploreLoading, setExploreLoading] = useState(true);

    // ── t-tabs 250ms sliding pill (transitions-dev 16-tabs-sliding) ──
    const movePill = useCallback(
        (animate) => {
            const bar = tabsRef.current;
            const pill = pillRef.current;
            if (!bar || !pill) return;
            const tabs = [...bar.querySelectorAll(".t-tab")];
            const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
            if (!active) return;
            if (!animate) {
                const prev = pill.style.transition;
                pill.style.transition = "none";
                pill.style.transform = `translateX(${active.offsetLeft}px)`;
                pill.style.width = `${active.offsetWidth}px`;
                void pill.offsetWidth;
                pill.style.transition = prev;
            } else {
                pill.style.transform = `translateX(${active.offsetLeft}px)`;
                pill.style.width = `${active.offsetWidth}px`;
            }
        },
        []
    );

    useEffect(() => {
        if (!hasQuery) return;
        // slide on tab change
        movePill(true);
    }, [activeTab, hasQuery, movePill]);

    useEffect(() => {
        if (!hasQuery) return;
        // initial position without animation + resize tracking
        requestAnimationFrame(() => movePill(false));
        const onResize = () => movePill(false);
        window.addEventListener("resize", onResize);
        // fonts ready may shift layout
        if (document.fonts?.ready) {
            document.fonts.ready.then(() => movePill(false)).catch(() => {});
        }
        return () => window.removeEventListener("resize", onResize);
    }, [hasQuery, movePill]);

    // Fetch explore data (reuses RightPanel sources: hashtags/trending + communities + TrendingPosts)
    useEffect(() => {
        if (hasQuery) return;
        let cancelled = false;
        const fetchExplore = async () => {
            setExploreLoading(true);
            try {
                const [tagRes, commRes] = await Promise.all([
                    fetch("/api/hashtags/trending?limit=8"),
                    fetch("/api/communities?limit=5"),
                ]);
                const tagData = await tagRes.json().catch(() => ({}));
                const commData = await commRes.json().catch(() => []);
                if (cancelled) return;
                setExploreHashtags(tagRes.ok ? tagData.hashtags || [] : []);
                // communities API returns array directly
                setExploreCommunities(commRes.ok ? (Array.isArray(commData) ? commData : []) : []);
            } catch (e) {
                console.error("Explore fetch error", e);
            } finally {
                if (!cancelled) setExploreLoading(false);
            }
        };
        fetchExplore();
        return () => {
            cancelled = true;
        };
    }, [hasQuery]);

    const fetchPosts = useCallback(async (q, pageNum = 1, append = false) => {
        const res = await fetch(`/api/search/posts?q=${encodeURIComponent(q)}&page=${pageNum}&limit=20`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Search failed");
        if (append) {
            setPostResults((prev) => [...prev, ...(data.posts || [])]);
        } else {
            setPostResults(data.posts || []);
        }
        setHasMorePosts(data.hasMore);
        setPostsPage(pageNum);
        return data;
    }, []);

    const fetchUsers = useCallback(async (q, pageNum = 1, append = false) => {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(q)}&page=${pageNum}&limit=20`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Search failed");
        if (append) {
            setUserResults((prev) => [...prev, ...(data.users || [])]);
        } else {
            setUserResults(data.users || []);
        }
        setHasMoreUsers(data.hasMore);
        setUsersPage(pageNum);
        return data;
    }, []);

    // Initial search (both posts + users so Top has preview and People is ready)
    useEffect(() => {
        if (!hasQuery) {
            setPostResults([]);
            setUserResults([]);
            setHasMorePosts(false);
            setHasMoreUsers(false);
            setError(null);
            setPostsPage(1);
            setUsersPage(1);
            return;
        }
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const [postData] = await Promise.all([
                    fetchPosts(debouncedQuery, 1, false).catch((e) => { throw e; }),
                    fetchUsers(debouncedQuery, 1, false).catch(() => null),
                ]);
                if (cancelled) return;
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [debouncedQuery, hasQuery, fetchPosts, fetchUsers]);

    // Tab change reuses already-fetched data; if tab's data missing, fetch it
    const handleTabChange = useCallback((id) => {
        setActiveTab(id);
        // pill will slide via effect; ensure next frame has correct width
        requestAnimationFrame(() => movePill(true));
        // if switching to people and we have no users yet but query exists, fetch
        if (id === "people" && hasQuery && userResults.length === 0 && !loading) {
            fetchUsers(debouncedQuery, 1, false).catch(() => {});
        }
        if ((id === "top" || id === "media") && hasQuery && postResults.length === 0 && !loading) {
            fetchPosts(debouncedQuery, 1, false).catch(() => {});
        }
    }, [hasQuery, userResults.length, postResults.length, loading, debouncedQuery, fetchUsers, fetchPosts, movePill]);

    const loadMore = useCallback(async () => {
        if (loading) return;
        try {
            setLoading(true);
            if (activeTab === "people") {
                if (!hasMoreUsers) return;
                await fetchUsers(debouncedQuery, usersPage + 1, true);
            } else {
                if (!hasMorePosts) return;
                await fetchPosts(debouncedQuery, postsPage + 1, true);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab, loading, hasMoreUsers, hasMorePosts, debouncedQuery, usersPage, postsPage, fetchUsers, fetchPosts]);

    const hasMoreForTab = activeTab === "people" ? hasMoreUsers : hasMorePosts;

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMore,
        hasMore: hasQuery && hasMoreForTab,
        loading,
    });

    const handleLikePost = useCallback(async (postId) => {
        try {
            const res = await fetch("/api/posts/like", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId }),
            });
            if (!res.ok) throw new Error("Failed to like post");
            const data = await res.json();
            setPostResults((prev) =>
                prev.map((p) => (p._id === postId ? { ...p, likesCount: data.likesCount, _isLiked: data.liked } : p))
            );
            return data;
        } catch (err) {
            console.error("Like error:", err);
            throw err;
        }
    }, []);

    const mediaPosts = postResults.filter(
        (p) => (p.images && p.images.length > 0) || (p.contentBlocks && p.contentBlocks.some((b) => b.type === "gif"))
    );

    return (
        <div className="flex-1 max-w-2xl border-r border-border min-h-screen pb-24">
            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
                <div className="px-4 pt-4 pb-3">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            placeholder="Search posts, people, hashtags…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 pr-10 h-10 rounded-xl bg-accent/60 border border-border/60 focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:bg-accent text-sm transition-all placeholder:text-muted-foreground/60"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                {/* t-tabs 250ms — Top / People / Media (X Explore) — only when searching */}
                {hasQuery && (
                    <div className="px-3 pb-3 flex justify-center">
                        <div ref={tabsRef} className="t-tabs" role="tablist" aria-label="Search filters">
                            <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className="t-tab inline-flex items-center gap-1.5 text-sm font-medium"
                                >
                                    {tab.id === "people" && <Users className="w-3.5 h-3.5" />}
                                    {tab.id === "media" && <ImageIcon className="w-3.5 h-3.5" />}
                                    {tab.id === "top" && <Search className="w-3.5 h-3.5" />}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className="min-h-[calc(100vh-130px)]">
                {!hasQuery ? (
                    /* ── Explore default (no query): trending hashtags + TrendingPosts + communities ── */
                    <div className="animate-in fade-in duration-200">
                        <div className="p-4 space-y-6">
                            {/* Trending hashtags */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <Hash className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <h2 className="font-semibold text-[15px]">Trending hashtags</h2>
                                    <span className="ml-auto text-xs text-muted-foreground">Tap to explore</span>
                                </div>
                                {exploreLoading ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Array(6)
                                            .fill(0)
                                            .map((_, i) => (
                                                <div key={i} className="h-7 w-20 bg-accent/40 rounded-full animate-pulse" />
                                            ))}
                                    </div>
                                ) : exploreHashtags.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No trending tags yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {exploreHashtags.slice(0, 8).map((ht) => (
                                            <Link
                                                key={ht.tag}
                                                href={`/hashtag/${ht.tag}`}
                                                className="px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 border border-transparent hover:border-border text-xs font-semibold transition-colors"
                                            >
                                                #{ht.tag}
                                                {ht.weeklyCount > 0 && (
                                                    <span className="ml-1.5 text-muted-foreground font-normal">
                                                        {formatCount(ht.weeklyCount)}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <Separator className="bg-border/40" />

                            {/* Trending today — reuses RightPanel TrendingPosts logic */}
                            <section>
                                <div className="mb-2">
                                    <TrendingPosts />
                                </div>
                            </section>

                            <Separator className="bg-border/40" />

                            {/* What's happening — communities trending (RightPanel source) */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <h2 className="font-semibold text-[15px]">What&apos;s happening</h2>
                                </div>
                                {exploreLoading ? (
                                    <div className="space-y-2">
                                        {Array(5)
                                            .fill(0)
                                            .map((_, i) => (
                                                <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-accent/20 animate-pulse">
                                                    <div className="w-8 h-8 rounded bg-accent" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-3 w-24 bg-accent rounded" />
                                                        <div className="h-2 w-16 bg-accent rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : exploreCommunities.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No trends yet.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {exploreCommunities.slice(0, 5).map((item, i) => (
                                            <Link
                                                key={item.slug || item.name}
                                                href={`/community/${item.slug || slugifyCollege(item.name)}`}
                                                className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent/60 transition-colors"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-muted-foreground leading-none">Trending in Communities</p>
                                                    <p className="text-[13px] font-semibold truncate group-hover:text-foreground">{item.name}</p>
                                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                        <GraduationCap className="w-3 h-3" />
                                                        {formatCount(item.postCount)} posts
                                                    </p>
                                                </div>
                                                <span className="text-sm font-bold text-muted-foreground/30 group-hover:text-muted-foreground">›</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                <Link
                                    href="/community"
                                    className="mt-3 inline-flex text-xs font-medium text-[#4ba9e1] hover:underline"
                                >
                                    Show more communities →
                                </Link>
                            </section>

                            {/* Empty hint */}
                            <div className="pt-2 text-center text-xs text-muted-foreground">
                                Try searching for <span className="font-medium text-foreground">people</span>,{" "}
                                <span className="font-medium text-foreground">hashtags</span> or{" "}
                                <span className="font-medium text-foreground">topics</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Top tab ── */}
                        {activeTab === "top" && (
                            <div className="animate-in fade-in duration-200">
                                {loading && postResults.length === 0 ? (
                                    <div className="p-4 space-y-3">
                                        {Array(3)
                                            .fill(0)
                                            .map((_, i) => (
                                                <PostSkeleton key={i} />
                                            ))}
                                    </div>
                                ) : postResults.length === 0 && userResults.length === 0 ? (
                                    <div className="pt-16">
                                        <EmptyState
                                            icon={Search}
                                            title="No results"
                                            description={`No results for '${debouncedQuery}'`}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* People preview in Top */}
                                        {userResults.length > 0 && (
                                            <div className="p-3 border-b border-border/40">
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                                                        <Users className="w-4 h-4 text-muted-foreground" /> People
                                                    </h3>
                                                    <button
                                                        onClick={() => handleTabChange("people")}
                                                        className="text-xs font-medium text-[#4ba9e1] hover:underline"
                                                    >
                                                        Show more
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {userResults.slice(0, 3).map((u) => (
                                                        <UserRow key={u._id} user={u} currentUser={currentUser} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Posts */}
                                        {postResults.length > 0 ? (
                                            <>
                                                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/30">
                                                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                                                    <span className="text-xs text-muted-foreground">
                                                        Top posts for <span className="font-medium text-foreground">&quot;{debouncedQuery}&quot;</span>
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-border/60">
                                                    {postResults.map((post) => (
                                                        <PostCard
                                                            key={post._id}
                                                            post={post}
                                                            currentUserId={currentUser?._id}
                                                            currentUser={currentUser}
                                                            onLike={handleLikePost}
                                                        />
                                                    ))}
                                                </div>
                                                <div ref={sentinelRef}>
                                                    <InfiniteScrollSentinel loading={loading} hasMore={hasMorePosts} error={error} onRetry={loadMore} />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="py-10 text-center text-sm text-muted-foreground">No posts found</div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── People tab ── */}
                        {activeTab === "people" && (
                            <div className="animate-in fade-in duration-200">
                                {loading && userResults.length === 0 ? (
                                    <div className="p-4 space-y-3">
                                        {Array(5)
                                            .fill(0)
                                            .map((_, i) => (
                                                <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-xl bg-accent/30 animate-pulse">
                                                    <div className="w-14 h-14 rounded-full bg-accent shrink-0" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 w-1/3 bg-accent rounded" />
                                                        <div className="h-3 w-1/4 bg-accent rounded" />
                                                    </div>
                                                    <div className="h-9 w-20 bg-accent rounded-full" />
                                                </div>
                                            ))}
                                    </div>
                                ) : userResults.length === 0 ? (
                                    <div className="pt-16">
                                        <EmptyState icon={Users} title="No people found" description={`No users matching '${debouncedQuery}'`} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border/30">
                                            People matching <span className="font-medium text-foreground">&quot;{debouncedQuery}&quot;</span>
                                        </div>
                                        <div className="p-3 space-y-3">
                                            {userResults.map((u) => (
                                                <UserRow key={u._id} user={u} currentUser={currentUser} />
                                            ))}
                                        </div>
                                        <div ref={sentinelRef}>
                                            <InfiniteScrollSentinel loading={loading} hasMore={hasMoreUsers} error={error} onRetry={loadMore} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Media tab ── */}
                        {activeTab === "media" && (
                            <div className="animate-in fade-in duration-200">
                                {loading && postResults.length === 0 ? (
                                    <div className="p-4 space-y-3">
                                        {Array(3)
                                            .fill(0)
                                            .map((_, i) => (
                                                <PostSkeleton key={i} />
                                            ))}
                                    </div>
                                ) : mediaPosts.length === 0 ? (
                                    <div className="pt-16">
                                        <EmptyState icon={ImageIcon} title="No media" description={`No photos or GIFs for '${debouncedQuery}'`} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/30">
                                            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Media posts for &quot;{debouncedQuery}&quot;</span>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                            {mediaPosts.map((post) => (
                                                <PostCard
                                                    key={post._id}
                                                    post={post}
                                                    currentUserId={currentUser?._id}
                                                    currentUser={currentUser}
                                                    onLike={handleLikePost}
                                                />
                                            ))}
                                        </div>
                                        {/* pagination is posts-based */}
                                        <div ref={sentinelRef}>
                                            <InfiniteScrollSentinel loading={loading} hasMore={hasMorePosts} error={error} onRetry={loadMore} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
