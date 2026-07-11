"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import clientCache from "@/lib/client-cache";

export function usePosts(queryParams = {}, initialPosts = []) {
    const isDiscover = queryParams.feedType === "discover";
    const cacheTtl = isDiscover ? 90 * 1000 : 5 * 60 * 1000;

    const cacheKey = useMemo(() => {
        return JSON.stringify(["feed", queryParams]);
    }, [queryParams]);

    const cachedData = clientCache.get(cacheKey);

    const [posts, setPosts] = useState(
        cachedData ? cachedData.posts : initialPosts,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(
        cachedData ? cachedData.hasMore : true,
    );
    const [cursor, setCursor] = useState(cachedData ? cachedData.cursor : null);
    const [isPrefetching, setIsPrefetching] = useState(false);

    const prefetchData = useRef(null);
    const isFetchedRef = useRef(false);
    const loadingRef = useRef(false); // Stable ref to avoid stale closure in fetchPosts
    const postsRef = useRef(cachedData ? cachedData.posts : initialPosts);
    const prevQueryParamsRef = useRef(queryParams);

    // Sync loadingRef with loading state
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    // Reset when query params change (e.g., mode switch)
    useEffect(() => {
        const paramsChanged =
            JSON.stringify(prevQueryParamsRef.current) !==
            JSON.stringify(queryParams);
        if (paramsChanged) {
            isFetchedRef.current = false;
            prefetchData.current = null;
            prevQueryParamsRef.current = queryParams;
            const newCached = clientCache.get(cacheKey);
            if (newCached) {
                setPosts(newCached.posts);
                postsRef.current = newCached.posts;
                setHasMore(newCached.hasMore);
                setCursor(newCached.cursor);
            } else {
                setPosts([]);
                postsRef.current = [];
                setHasMore(true);
                setCursor(null);
            }
        }
    }, [cacheKey, queryParams, isDiscover]);

    const fetchPosts = useCallback(
        async (
            currentCursor = null,
            append = false,
            forceRefresh = false,
            attempt = 0,
        ) => {
            if (loadingRef.current) return;

            // Skip fetch if cached and not forcing
            if (
                !forceRefresh &&
                !append &&
                !isFetchedRef.current &&
                cachedData
            ) {
                isFetchedRef.current = true;
                return;
            }

            setLoading(true);
            loadingRef.current = true;
            setError(null);

            try {
                const params = new URLSearchParams({
                    limit: 15,
                    ...queryParams,
                });
                if (currentCursor) params.set("cursor", currentCursor);

                const res = await fetch(
                    `/api/posts/cursor-feed?${params.toString()}`,
                );
                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(
                        data.error?.message || "Failed to fetch posts",
                    );
                }

                const { posts: newPosts, pagination } = data;
                let appendedCount = 0;

                if (!append) {
                    setPosts(newPosts);
                    postsRef.current = newPosts;
                } else {
                    const existingIds = new Set(
                        postsRef.current.map((p) => p._id),
                    );
                    const filteredNew = newPosts.filter(
                        (p) => !existingIds.has(p._id),
                    );
                    appendedCount = filteredNew.length;
                    const finalPosts = [...postsRef.current, ...filteredNew];

                    setPosts(finalPosts);
                    postsRef.current = finalPosts;
                }

                clientCache.set(
                    cacheKey,
                    {
                        posts: postsRef.current,
                        cursor: pagination.nextCursor,
                        hasMore: pagination.hasNextPage,
                    },
                    cacheTtl,
                );

                setHasMore(pagination.hasNextPage);
                setCursor(pagination.nextCursor);
                isFetchedRef.current = true;

                if (process.env.NODE_ENV !== "production") {
                    console.log("[usePosts] page", {
                        append,
                        requestCursor: currentCursor,
                        received: newPosts.length,
                        appendedCount,
                        hasNextPage: pagination.hasNextPage,
                        nextCursor: pagination.nextCursor,
                        total: postsRef.current.length,
                        attempt,
                    });
                }

                // If a page is duplicate-only, advance cursor again to avoid stalling.
                if (
                    append &&
                    appendedCount === 0 &&
                    pagination.hasNextPage &&
                    pagination.nextCursor &&
                    attempt < 3
                ) {
                    loadingRef.current = false;
                    await fetchPosts(
                        pagination.nextCursor,
                        true,
                        false,
                        attempt + 1,
                    );
                    return;
                }
            } catch (err) {
                console.error("fetchPosts error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
                loadingRef.current = false;
            }
        },
        // Removed `cachedData` from deps — read via closure from stable ref instead
        [cacheKey, queryParams, cacheTtl],
    );

    // Initial load
    useEffect(() => {
        if (!isFetchedRef.current && posts.length === 0) {
            isFetchedRef.current = true;
            if (!cachedData) {
                fetchPosts(null, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryParams]);
    // Intentionally only re-run on queryParams change, not fetchPosts reference

    // Prefetch next page as user approaches bottom for smoother loading.
    const prefetchNextPage = useCallback(async () => {
        if (
            !hasMore ||
            loadingRef.current ||
            isPrefetching ||
            !cursor ||
            prefetchData.current
        )
            return;

        setIsPrefetching(true);
        try {
            const params = new URLSearchParams({
                limit: 15,
                cursor,
                ...queryParams,
            });

            const res = await fetch(
                `/api/posts/cursor-feed?${params.toString()}`,
            );
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    prefetchData.current = {
                        posts: data.posts,
                        nextCursor: data.pagination.nextCursor,
                        hasNextPage: data.pagination.hasNextPage,
                    };
                }
            }
        } catch (err) {
            console.error("Prefetch failed:", err);
        } finally {
            setIsPrefetching(false);
        }
    }, [hasMore, isPrefetching, cursor, queryParams]);

    // Load more
    const loadMore = useCallback(() => {
        if (!hasMore || loadingRef.current) return;

        if (prefetchData.current) {
            const {
                posts: prefetchedPosts,
                nextCursor,
                hasNextPage,
            } = prefetchData.current;
            prefetchData.current = null;

            let appendedCount = 0;

            setPosts((prevPosts) => {
                const existingIds = new Set(prevPosts.map((p) => p._id));
                const filteredNew = prefetchedPosts.filter(
                    (p) => !existingIds.has(p._id),
                );
                appendedCount = filteredNew.length;
                const finalPosts = [...prevPosts, ...filteredNew];

                clientCache.set(
                    cacheKey,
                    {
                        posts: finalPosts,
                        cursor: nextCursor,
                        hasMore: hasNextPage,
                    },
                    cacheTtl,
                );

                return finalPosts;
            });

            setCursor(nextCursor);
            setHasMore(hasNextPage);

            // If this prefetched page was fully duplicate, move forward immediately.
            if (appendedCount === 0 && hasNextPage && nextCursor) {
                fetchPosts(nextCursor, true);
            }
        } else {
            fetchPosts(cursor, true);
        }
    }, [cursor, hasMore, fetchPosts, cacheKey, cacheTtl]);

    const refresh = useCallback(async () => {
        isFetchedRef.current = false;
        prefetchData.current = null;
        setCursor(null);
        setPosts([]);
        postsRef.current = [];
        return fetchPosts(null, false, true);
    }, [fetchPosts]);

    return {
        posts,
        loading,
        error,
        hasMore,
        loadMore,
        refresh,
        prefetchNextPage,
        addPost: (post) => {
            setPosts((prev) => [post, ...prev]);
            clientCache.invalidate("feed");
        },
        removePost: (id) =>
            setPosts((prev) => prev.filter((p) => p._id !== id)),
        updatePostLike: async (postId) => {
            try {
                const res = await fetch("/api/posts/like", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId }),
                });

                if (!res.ok) throw new Error("Failed to like post");

                const data = await res.json();

                setPosts((prev) => {
                    const newPosts = prev.map((p) =>
                        p._id === postId
                            ? {
                                  ...p,
                                  likesCount: data.likesCount,
                                  _isLiked: data.liked,
                              }
                            : p,
                    );

                    // Update client cache
                    if (cacheKey) {
                        clientCache.set(
                            cacheKey,
                            { posts: newPosts, hasMore, cursor },
                            cacheTtl,
                        );
                    }
                    return newPosts;
                });

                return data;
            } catch (err) {
                console.error("Like error:", err);
                throw err;
            }
        },
    };
}
