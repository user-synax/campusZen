"use client";

import { useEffect, useRef } from "react";

export function useInfiniteScroll({
    fetchMore,
    hasMore,
    loading,
    rootMargin = "200px",
    threshold = 0.1,
}) {
    const observerRef = useRef(null);
    const loadingRef = useRef(loading);
    const fetchMoreRef = useRef(fetchMore);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        fetchMoreRef.current = fetchMore;
    }, [fetchMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (
                    first.isIntersecting &&
                    hasMore &&
                    !loadingRef.current &&
                    document.visibilityState === "visible"
                ) {
                    fetchMoreRef.current();
                }
            },
            {
                threshold,
                rootMargin,
            },
        );

        const sentinel = observerRef.current;
        if (sentinel) observer.observe(sentinel);

        return () => {
            if (sentinel) {
                observer.unobserve(sentinel);
            }
            observer.disconnect();
        };
    }, [hasMore, loading, rootMargin, threshold]);

    return { sentinelRef: observerRef };
}
