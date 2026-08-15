"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ConnectCard from "@/components/user/ConnectCard";
import EmptyState from "@/components/shared/EmptyState";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import useUser from "@/hooks/useUser";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

export default function ConnectPage() {
    const { user: currentUser } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState("");
    const [activeQuery, setActiveQuery] = useState("");

    const activeQueryRef = useRef(activeQuery);
    activeQueryRef.current = activeQuery;

    const fetchUsers = useCallback(async (pageNum = 1, append = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(pageNum));
            params.set("limit", "12");
            if (activeQueryRef.current.trim()) {
                params.set("q", activeQueryRef.current.trim());
            }

            const res = await fetch(
                `/api/connect/suggestions?${params.toString()}`,
            );
            const data = await res.json();

            if (res.ok) {
                if (append) {
                    setUsers((prev) => [...prev, ...data]);
                } else {
                    setUsers(data);
                }
                setHasMore(data.length >= 12);
                setPage(pageNum);
            }
        } catch (error) {
            console.error("Failed to fetch suggestions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsersRef = useRef(fetchUsers);
    fetchUsersRef.current = fetchUsers;

    useEffect(() => {
        fetchUsersRef.current(1, false);
    }, [activeQuery]);

    const loadMore = useCallback(() => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        fetchUsersRef.current(nextPage, true);
    }, [page, hasMore, loading]);

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMore,
        hasMore,
        loading,
    });

    const handleSearch = () => {
        setPage(1);
        setActiveQuery(inputValue);
    };

    const handleClear = () => {
        setInputValue("");
        setPage(1);
        setActiveQuery("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="flex-1 max-w-2xl border-r border-border min-h-screen pb-24">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
                <div className="px-4 pt-4 pb-3">
                    <h1 className="text-lg font-bold text-foreground mb-3">
                        Connect
                    </h1>
                    <div className="flex gap-2">
                        <div className="relative group flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                placeholder="Search by name, username, or college…"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10 h-10 rounded-xl bg-accent/60 border border-border/60 focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:bg-accent text-sm transition-all placeholder:text-muted-foreground/60"
                            />
                            {inputValue && (
                                <button
                                    onClick={handleClear}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
                                >
                                    <X className="w-3 h-3 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={handleSearch}
                            className="h-10 px-4 rounded-xl"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="min-h-[calc(100vh-130px)]">
                {loading && users.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 items-stretch">
                        {Array(6)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className="card-chunky bg-card p-4 flex flex-col animate-pulse"
                                >
                                    <div className="w-full aspect-[4/3] rounded-2xl bg-accent mb-4" />
                                    <div className="flex-1 flex flex-col items-center gap-2">
                                        <div className="h-4 w-24 bg-accent rounded" />
                                        <div className="h-3 w-20 bg-accent rounded" />
                                        <div className="h-3 w-32 bg-accent rounded" />
                                        <div className="flex gap-1.5 mt-1">
                                            <div className="h-5 w-14 bg-accent rounded-full" />
                                            <div className="h-5 w-14 bg-accent rounded-full" />
                                        </div>
                                    </div>
                                    <div className="h-9 w-full bg-accent rounded-full mt-4" />
                                </div>
                            ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="pt-16">
                        <EmptyState
                            icon={Link2}
                            title="No suggestions yet"
                            description={
                                activeQuery
                                    ? `No users found for "${activeQuery}"`
                                    : "No new users to connect with right now"
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 items-stretch">
                            {users.map((user) => (
                                <ConnectCard
                                    key={user._id}
                                    user={user}
                                    currentUserId={currentUser?._id}
                                />
                            ))}
                        </div>
                        <div ref={sentinelRef}>
                            <InfiniteScrollSentinel
                                loading={loading}
                                hasMore={hasMore}
                                onRetry={loadMore}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
