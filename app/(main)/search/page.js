"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Search,
    X,
    Users,
    Bookmark,
    FileSearch,
    Flame,
    Zap,
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

export default function SearchPage() {
    const { user: currentUser } = useUser();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [activeTab, setActiveTab] = useState("posts");
    const [postResults, setPostResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [trending, setTrending] = useState({ communities: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [allUsersLoading, setAllUsersLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [allUsersHasMore, setAllUsersHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [allUsersPage, setAllUsersPage] = useState(1);

    const performSearch = useCallback(
        async (q, pageNum = 1, append = false) => {
            if (!q.trim()) return;
            setLoading(true);
            setError(null);
            setHasSearched(true);
            try {
                if (activeTab === "all-users") {
                    // Handle user search for Users tab
                    const usersRes = await fetch(
                        `/api/search/users?q=${encodeURIComponent(q)}&page=${pageNum}&limit=20`,
                    );
                    const usersData = await usersRes.json();
                    if (usersRes.ok) {
                        if (append) {
                            setUserResults((prev) => [
                                ...prev,
                                ...usersData.users,
                            ]);
                        } else {
                            setUserResults(usersData.users || []);
                        }
                        setHasMore(usersData.hasMore);
                        setPage(pageNum);
                    } else {
                        throw new Error(usersData.message || "Search failed");
                    }
                } else {
                    // Handle post search for Posts tab
                    const postsRes = await fetch(
                        `/api/search/posts?q=${encodeURIComponent(q)}&page=${pageNum}&limit=20`,
                    );
                    const postsData = await postsRes.json();
                    if (postsRes.ok) {
                        if (append) {
                            setPostResults((prev) => [
                                ...prev,
                                ...postsData.posts,
                            ]);
                        } else {
                            setPostResults(postsData.posts || []);
                            const usersRes = await fetch(
                                `/api/search/users?q=${encodeURIComponent(q)}&limit=10`,
                            );
                            const usersData = await usersRes.json();
                            if (usersRes.ok)
                                setUserResults(usersData.users || []);
                        }
                        setHasMore(postsData.hasMore);
                        setPage(pageNum);
                    } else {
                        throw new Error(postsData.message || "Search failed");
                    }
                }
            } catch (error) {
                console.error("Search failed:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        },
        [activeTab],
    );

    useEffect(() => {
        if (debouncedQuery.trim().length >= 2) {
            setPage(1);
            performSearch(debouncedQuery, 1, false);
        } else if (debouncedQuery.trim().length === 0 && hasSearched) {
            setPostResults([]);
            setUserResults([]);
            setHasSearched(false);
            setHasMore(false);
        }
    }, [debouncedQuery, performSearch, hasSearched]);

    const loadMore = useCallback(() => {
        if (!hasMore || loading) return;
        if (activeTab === "posts" || activeTab === "all-users") {
            performSearch(debouncedQuery, page + 1, true);
        }
    }, [page, hasMore, loading, activeTab, performSearch, debouncedQuery]);

    const fetchAllUsers = useCallback(async (pageNum = 1, append = false) => {
        setAllUsersLoading(true);
        try {
            const res = await fetch(`/api/users/all?page=${pageNum}&limit=20`);
            const data = await res.json();
            if (res.ok) {
                if (append) {
                    setAllUsers((prev) => [...prev, ...data.users]);
                } else {
                    setAllUsers(data.users || []);
                }
                setAllUsersHasMore(data.hasMore);
                setAllUsersPage(pageNum);
            }
        } catch (error) {
            console.error("Failed to fetch all users:", error);
        } finally {
            setAllUsersLoading(false);
        }
    }, []);

    const loadMoreAllUsers = useCallback(() => {
        if (!allUsersHasMore || allUsersLoading || activeTab !== "all-users")
            return;
        fetchAllUsers(allUsersPage + 1, true);
    }, [
        allUsersPage,
        allUsersHasMore,
        allUsersLoading,
        activeTab,
        fetchAllUsers,
    ]);

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMore,
        hasMore:
            (hasMore && activeTab === "posts") ||
            (hasMore &&
                activeTab === "all-users" &&
                debouncedQuery.trim().length >= 2),
        loading,
    });

    const { sentinelRef: allUsersSentinelRef } = useInfiniteScroll({
        fetchMore: loadMoreAllUsers,
        hasMore:
            allUsersHasMore &&
            activeTab === "all-users" &&
            debouncedQuery.trim().length === 0,
        loading: allUsersLoading,
    });

    const fetchTrending = async () => {
        try {
            const res = await fetch("/api/search/trending");
            const data = await res.json();
            if (res.ok) {
                setTrending({
                    communities: data.trendingCommunities || [],
                    users: data.activeUsers || [],
                });
            }
        } catch (error) {
            console.error("Failed to fetch trending:", error);
        }
    };

    useEffect(() => {
        if (activeTab === "all-users" && allUsers.length === 0) {
            fetchAllUsers(1, false);
        }
    }, [activeTab, fetchAllUsers, allUsers.length]);

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
                prev.map((p) => {
                    if (p._id === postId) {
                        return {
                            ...p,
                            likesCount: data.likesCount,
                            _isLiked: data.liked,
                        };
                    }
                    return p;
                }),
            );
            return data;
        } catch (err) {
            console.error("Like error:", err);
            throw err;
        }
    }, []);

    const tabs = ["posts", "all-users"];

    return (
        <div className="flex-1 max-w-2xl border-r border-border min-h-screen pb-24">
            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
                {/* Search bar */}
                <div className="px-4 pt-4 pb-3">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            placeholder="Search posts, people, colleges…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 pr-10 h-10 rounded-xl bg-accent/60 border border-border/60 focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:bg-accent text-sm transition-all placeholder:text-muted-foreground/60"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium capitalize transition-colors",
                                activeTab === tab
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tab === "posts" && (
                                <FileSearch className="w-3.5 h-3.5" />
                            )}
                            {tab === "people" && (
                                <Users className="w-3.5 h-3.5" />
                            )}
                            {tab === "all-users" && (
                                <Users className="w-3.5 h-3.5" />
                            )}
                            {tab === "all-users" ? "Users" : tab}
                            {/* Animated underline */}
                            <span
                                className={cn(
                                    "absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-all duration-200",
                                    activeTab === tab
                                        ? "bg-primary opacity-100"
                                        : "opacity-0",
                                )}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Results ── */}
            <div className="min-h-[calc(100vh-130px)]">
                {/* POSTS TAB */}
                {activeTab === "posts" && (
                    <div className="animate-in fade-in duration-200">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {Array(3)
                                    .fill(0)
                                    .map((_, i) => (
                                        <PostSkeleton key={i} />
                                    ))}
                            </div>
                        ) : !hasSearched ? (
                            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                                <div className="relative mb-5">
                                    <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
                                        <Search className="w-7 h-7 text-muted-foreground/50" />
                                    </div>
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <Zap className="w-2.5 h-2.5 text-primary" />
                                    </span>
                                </div>
                                <h3 className="text-base font-semibold text-foreground mb-1">
                                    Search CampusZen
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
                                    Find posts by keyword, hashtag, or topic
                                </p>
                            </div>
                        ) : postResults.length === 0 ? (
                            <div className="pt-16">
                                <EmptyState
                                    icon={FileSearch}
                                    title="No posts found"
                                    description={`No posts matching "${query}"`}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Result count pill */}
                                <div className="px-4 py-2.5 flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        Results for{" "}
                                        <span className="font-medium text-foreground">
                                            "{debouncedQuery}"
                                        </span>
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
                )}

                {/* USERS TAB */}
                {activeTab === "all-users" && (
                    <div className="animate-in fade-in duration-200">
                        {loading && debouncedQuery.trim().length >= 2 ? (
                            <div className="p-4 space-y-3">
                                {Array(5)
                                    .fill(0)
                                    .map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 px-4 py-4 rounded-xl bg-accent/30 animate-pulse"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-accent shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-1/3 bg-accent rounded-md" />
                                                <div className="h-3 w-1/4 bg-accent rounded-md" />
                                                <div className="h-3 w-1/2 bg-accent rounded-md" />
                                            </div>
                                            <div className="h-9 w-24 bg-accent rounded-lg" />
                                        </div>
                                    ))}
                            </div>
                        ) : debouncedQuery.trim().length >= 2 ? (
                            userResults.length === 0 ? (
                                <div className="pt-16">
                                    <EmptyState
                                        icon={Users}
                                        title="No users found"
                                        description={`No users matching "${query}"`}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="px-4 py-3 flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            Results for{" "}
                                            <span className="font-medium text-foreground">
                                                "{debouncedQuery}"
                                            </span>
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {userResults.map((user) => {
                                            const isAdmin =
                                                user.role === "admin" ||
                                                user.email ===
                                                    process.env
                                                        .NEXT_PUBLIC_ADMIN_EMAIL;
                                            return (
                                                <div
                                                    key={user._id}
                                                    className={cn(
                                                        "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative",
                                                        isAdmin
                                                            ? "bg-gradient-to-r from-purple-900/20 via-violet-900/15 to-fuchsia-900/20 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] hover:border-purple-500/60"
                                                            : user.isPro
                                                              ? "bg-gradient-to-r from-yellow-900/20 via-amber-900/10 to-orange-900/20 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:border-yellow-500/50"
                                                              : "bg-accent/10 hover:bg-accent/30 border border-border/30",
                                                    )}
                                                >
                                                    {isAdmin && (
                                                        <div className="absolute -top-2 -right-2 z-10">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg animate-pulse">
                                                                <Shield className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {user.isPro && !isAdmin && (
                                                        <div className="absolute -top-2 -right-2 z-10">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg animate-pulse">
                                                                <Crown className="w-3.5 h-3.5 text-yellow-950" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Link
                                                        href={`/profile/${user.username}`}
                                                        className="shrink-0 relative"
                                                    >
                                                        <div
                                                            className={cn(
                                                                "rounded-full p-0.5",
                                                                isAdmin
                                                                    ? "bg-gradient-to-tr from-purple-400 via-violet-500 to-fuchsia-500 animate-pulse"
                                                                    : user.isPro
                                                                      ? "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 animate-pulse"
                                                                      : "",
                                                            )}
                                                        >
                                                            <UserAvatar
                                                                user={user}
                                                                size="lg"
                                                            />
                                                        </div>
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/profile/${user.username}`}
                                                        >
                                                            <p
                                                                className={cn(
                                                                    "font-semibold text-sm leading-tight truncate flex items-center gap-1.5 transition-colors",
                                                                    isAdmin
                                                                        ? "text-purple-400 group-hover:text-purple-300"
                                                                        : user.isPro
                                                                          ? "text-yellow-400 group-hover:text-yellow-300"
                                                                          : "text-foreground group-hover:text-primary",
                                                                )}
                                                            >
                                                                {user.name}
                                                                {isAdmin && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40">
                                                                        <Shield className="w-3 h-3 text-purple-400" />
                                                                        <span className="text-xs font-medium text-purple-400">
                                                                            Founder
                                                                        </span>
                                                                    </span>
                                                                )}
                                                                {user.isPro &&
                                                                    !isAdmin && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40">
                                                                            <Crown className="w-3 h-3 text-yellow-400" />
                                                                            <span className="text-xs font-medium text-yellow-400">
                                                                                Pro
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                {user.isVerified && (
                                                                    <VerifiedBadge
                                                                        size="sm"
                                                                        verificationType={
                                                                            user.verificationType
                                                                        }
                                                                    />
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                                @{user.username}
                                                            </p>
                                                        </Link>
                                                        {user.bio && (
                                                            <p className="text-xs text-muted-foreground/80 truncate mt-1.5">
                                                                {user.bio}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-xs text-muted-foreground/70">
                                                                {
                                                                    user.followersCount
                                                                }{" "}
                                                                followers
                                                            </span>
                                                            {user.college && (
                                                                <>
                                                                    <span className="text-muted-foreground/30">
                                                                        ·
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground/70 truncate">
                                                                        🎓{" "}
                                                                        {
                                                                            user.college
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {currentUser?._id !==
                                                        user._id && (
                                                        <div className="shrink-0">
                                                            <FollowButton
                                                                targetUserId={
                                                                    user._id
                                                                }
                                                                username={
                                                                    user.username
                                                                }
                                                                initialIsFollowing={currentUser?.following?.includes(
                                                                    user._id,
                                                                )}
                                                                initialFollowersCount={
                                                                    user.followersCount ||
                                                                    0
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                            )
                        ) : allUsersLoading && allUsers.length === 0 ? (
                            <div className="p-4 space-y-3">
                                {Array(5)
                                    .fill(0)
                                    .map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 px-4 py-4 rounded-xl bg-accent/30 animate-pulse"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-accent shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-1/3 bg-accent rounded-md" />
                                                <div className="h-3 w-1/4 bg-accent rounded-md" />
                                                <div className="h-3 w-1/2 bg-accent rounded-md" />
                                            </div>
                                            <div className="h-9 w-24 bg-accent rounded-lg" />
                                        </div>
                                    ))}
                            </div>
                        ) : allUsers.length === 0 ? (
                            <div className="pt-16">
                                <EmptyState
                                    icon={Users}
                                    title="No users found"
                                    description="No users available yet"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        Newest first
                                    </span>
                                </div>
                                <div className="p-3 space-y-3">
                                    {allUsers.map((user) => {
                                        const isAdmin =
                                            user.role === "admin" ||
                                            user.email ===
                                                process.env
                                                    .NEXT_PUBLIC_ADMIN_EMAIL;
                                        return (
                                            <div
                                                key={user._id}
                                                className={cn(
                                                    "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative",
                                                    isAdmin
                                                        ? "bg-gradient-to-r from-purple-900/20 via-violet-900/15 to-fuchsia-900/20 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] hover:border-purple-500/60"
                                                        : user.isPro
                                                          ? "bg-gradient-to-r from-yellow-900/20 via-amber-900/10 to-orange-900/20 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:border-yellow-500/50"
                                                          : "bg-accent/10 hover:bg-accent/30 border border-border/30",
                                                )}
                                            >
                                                {isAdmin && (
                                                    <div className="absolute -top-2 -right-2 z-10">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg animate-pulse">
                                                            <Shield className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                                {user.isPro && !isAdmin && (
                                                    <div className="absolute -top-2 -right-2 z-10">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg animate-pulse">
                                                            <Crown className="w-3.5 h-3.5 text-yellow-950" />
                                                        </div>
                                                    </div>
                                                )}
                                                <Link
                                                    href={`/profile/${user.username}`}
                                                    className="shrink-0 relative"
                                                >
                                                    <div
                                                        className={cn(
                                                            "rounded-full p-0.5",
                                                            isAdmin
                                                                ? "bg-gradient-to-tr from-purple-400 via-violet-500 to-fuchsia-500 animate-pulse"
                                                                : user.isPro
                                                                  ? "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 animate-pulse"
                                                                  : "",
                                                        )}
                                                    >
                                                        <UserAvatar
                                                            user={user}
                                                            size="lg"
                                                        />
                                                    </div>
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={`/profile/${user.username}`}
                                                    >
                                                        <p
                                                            className={cn(
                                                                "font-semibold text-sm leading-tight truncate flex items-center gap-1.5 transition-colors",
                                                                isAdmin
                                                                    ? "text-purple-400 group-hover:text-purple-300"
                                                                    : user.isPro
                                                                      ? "text-yellow-400 group-hover:text-yellow-300"
                                                                      : "text-foreground group-hover:text-primary",
                                                            )}
                                                        >
                                                            {user.name}
                                                            {isAdmin && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40">
                                                                    <Shield className="w-3 h-3 text-purple-400" />
                                                                    <span className="text-xs font-medium text-purple-400">
                                                                        Founder
                                                                    </span>
                                                                </span>
                                                            )}
                                                            {user.isPro &&
                                                                !isAdmin && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40">
                                                                        <Crown className="w-3 h-3 text-yellow-400" />
                                                                        <span className="text-xs font-medium text-yellow-400">
                                                                            Pro
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            {user.isVerified && (
                                                                <VerifiedBadge
                                                                    size="sm"
                                                                    verificationType={
                                                                        user.verificationType
                                                                    }
                                                                />
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            @{user.username}
                                                        </p>
                                                    </Link>
                                                    {user.bio && (
                                                        <p className="text-xs text-muted-foreground/80 truncate mt-1.5">
                                                            {user.bio}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-xs text-muted-foreground/70">
                                                            {
                                                                user.followersCount
                                                            }{" "}
                                                            followers
                                                        </span>
                                                        {user.college && (
                                                            <>
                                                                <span className="text-muted-foreground/30">
                                                                    ·
                                                                </span>
                                                                <span className="text-xs text-muted-foreground/70 truncate">
                                                                    🎓{" "}
                                                                    {
                                                                        user.college
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {currentUser?._id !==
                                                    user._id && (
                                                    <div className="shrink-0">
                                                        <FollowButton
                                                            targetUserId={
                                                                user._id
                                                            }
                                                            username={
                                                                user.username
                                                            }
                                                            initialIsFollowing={currentUser?.following?.includes(
                                                                user._id,
                                                            )}
                                                            initialFollowersCount={
                                                                user.followersCount ||
                                                                0
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div ref={allUsersSentinelRef}>
                                    <InfiniteScrollSentinel
                                        loading={allUsersLoading}
                                        hasMore={allUsersHasMore}
                                        error={error}
                                        onRetry={loadMoreAllUsers}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* TRENDING TAB */}
                {activeTab === "trending" && (
                    <div className="p-4 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Trending Communities */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                </div>
                                <h2 className="font-semibold text-base">
                                    Trending Communities
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {trending.communities.length === 0
                                    ? Array(3)
                                          .fill(0)
                                          .map((_, i) => (
                                              <div
                                                  key={i}
                                                  className="h-[66px] bg-accent/40 rounded-xl animate-pulse"
                                              />
                                          ))
                                    : trending.communities.map((c, i) => (
                                          <Link
                                              key={c.name}
                                              href={`/community/${slugifyCollege(c.name)}`}
                                          >
                                              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/20 hover:bg-accent/50 border border-border/40 hover:border-border/80 transition-all group">
                                                  <span className="text-xl font-black text-muted-foreground/15 w-7 shrink-0 text-center leading-none">
                                                      {i + 1}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                          🎓 {c.name}
                                                      </p>
                                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                          <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                                                          {c.count} posts this
                                                          week
                                                      </p>
                                                  </div>
                                              </div>
                                          </Link>
                                      ))}
                            </div>
                        </section>

                        <Separator className="bg-border/40" />

                        {/* Most Active Students */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-yellow-500" />
                                </div>
                                <h2 className="font-semibold text-base">
                                    Most Active Students
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {trending.users.length === 0
                                    ? Array(3)
                                          .fill(0)
                                          .map((_, i) => (
                                              <div
                                                  key={i}
                                                  className="h-[66px] bg-accent/40 rounded-xl animate-pulse"
                                              />
                                          ))
                                    : trending.users.map((item, i) => (
                                          <Link
                                              key={item.username}
                                              href={`/profile/${item.username}`}
                                          >
                                              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/20 hover:bg-accent/50 border border-border/40 hover:border-border/80 transition-all group">
                                                  <span className="text-xl font-black text-muted-foreground/15 w-7 shrink-0 text-center leading-none">
                                                      {i + 1}
                                                  </span>
                                                  <UserAvatar
                                                      user={item}
                                                      size="sm"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                      <p className="font-semibold text-sm truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                                                          {item.name}
                                                          {item.isVerified && (
                                                              <VerifiedBadge
                                                                  size="sm"
                                                                  verificationType={
                                                                      item.verificationType
                                                                  }
                                                              />
                                                          )}
                                                      </p>
                                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                          @{item.username} ·{" "}
                                                          {item.postCount} posts
                                                      </p>
                                                  </div>
                                              </div>
                                          </Link>
                                      ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
