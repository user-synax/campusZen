"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Centralized mutation hook for post interactions.
 *
 * Every mutation:
 *   1. Captures the previous state (rollback snapshot)
 *   2. Applies the optimistic update immediately
 *   3. Fires the API call
 *   4. On success: reconciles with server response
 *   5. On failure: rolls back to snapshot + shows toast
 *
 * The caller provides a `setPosts` updater and a `postsRef` so the hook
 * never holds stale closure references to the posts array.
 */
export function usePostMutations({ setPosts, postsRef }) {
    // ━━━ Like / Unlike ━━━
    const likePost = useCallback(
        async (postId) => {
            // 1. Snapshot for rollback
            let snapshot = null;

            setPosts((prev) => {
                snapshot = prev;
                return prev.map((p) =>
                    p._id === postId
                        ? {
                              ...p,
                              _isLiked: !p._isLiked,
                              likesCount: p._isLiked
                                  ? Math.max(0, (p.likesCount || 0) - 1)
                                  : (p.likesCount || 0) + 1,
                          }
                        : p,
                );
            });

            try {
                const res = await fetch("/api/posts/like", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to like");

                // Reconcile with server truth
                setPosts((prev) =>
                    prev.map((p) =>
                        p._id === postId
                            ? {
                                  ...p,
                                  _isLiked: data.liked,
                                  likesCount: data.likesCount,
                              }
                            : p,
                    ),
                );

                return data;
            } catch (err) {
                // Rollback
                if (snapshot) setPosts(snapshot);
                toast.error(err.message || "Failed to like post");
                throw err;
            }
        },
        [setPosts],
    );

    // ━━━ Bookmark / Unbookmark ━━━
    const bookmarkPost = useCallback(
        async (postId) => {
            let snapshot = null;

            setPosts((prev) => {
                snapshot = prev;
                return prev.map((p) =>
                    p._id === postId
                        ? { ...p, _isBookmarked: !p._isBookmarked }
                        : p,
                );
            });

            try {
                const res = await fetch("/api/bookmarks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId }),
                });

                const data = await res.json();
                if (!res.ok)
                    throw new Error(data.message || "Failed to bookmark");

                // Reconcile
                setPosts((prev) =>
                    prev.map((p) =>
                        p._id === postId
                            ? { ...p, _isBookmarked: data.bookmarked }
                            : p,
                    ),
                );

                toast.success(data.message);
                return data;
            } catch (err) {
                if (snapshot) setPosts(snapshot);
                toast.error(err.message || "Failed to save post");
                throw err;
            }
        },
        [setPosts],
    );

    // ━━━ Increment comment count (optimistic) ━━━
    const incrementCommentCount = useCallback(
        (postId, delta = 1) => {
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId
                        ? {
                              ...p,
                              commentsCount: Math.max(
                                  0,
                                  (p.commentsCount || 0) + delta,
                              ),
                          }
                        : p,
                ),
            );
        },
        [setPosts],
    );

    // ━━━ Delete post (optimistic remove) ━━━
    const deletePost = useCallback(
        (postId) => {
            setPosts((prev) => prev.filter((p) => p._id !== postId));
        },
        [setPosts],
    );

    // ━━━ Prepend new post (for post:new streaming) ━━━
    const prependPost = useCallback(
        (post) => {
            setPosts((prev) => {
                // Deduplicate
                if (prev.some((p) => p._id === post._id)) return prev;
                return [post, ...prev];
            });
        },
        [setPosts],
    );

    return {
        likePost,
        bookmarkPost,
        incrementCommentCount,
        deletePost,
        prependPost,
    };
}
