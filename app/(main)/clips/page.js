"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ClipPlayer from "@/components/clips/ClipPlayer";
import ClipActionStack from "@/components/clips/ClipActionStack";
import ClipInfo from "@/components/clips/ClipInfo";
import CommentSheet from "@/components/clips/CommentSheet";
import ClipUploadModal from "@/components/clips/ClipUploadModal";
import EmptyState from "@/components/shared/EmptyState";
import { Video, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClipsPage() {
    const [clips, setClips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [openCommentSheet, setOpenCommentSheet] = useState(false);
    const [selectedClip, setSelectedClip] = useState(null);
    const [openUploadModal, setOpenUploadModal] = useState(false);

    const containerRef = useRef(null);
    const clipObserverRef = useRef(null);
    const sentinelRef = useRef(null);
    const sentinelObserverRef = useRef(null);
    const isFetchingRef = useRef(false);

    const fetchClips = async (nextCursor = null) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            setLoading(true);
            let url = "/api/clips/feed?limit=10";
            if (nextCursor) url += `&cursor=${nextCursor}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setClips(nextCursor ? [...clips, ...data.clips] : data.clips);
                setCursor(data.pagination.nextCursor);
                setHasMore(data.pagination.hasNextPage);
            }
        } catch (error) {
            console.error("Fetch clips error:", error);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        fetchClips();
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        clipObserverRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.dataset.index);
                        setActiveIndex(index);
                    }
                });
            },
            {
                root: containerRef.current,
                threshold: 0.5,
            },
        );

        const clipElements =
            containerRef.current.querySelectorAll(".clip-item");
        clipElements.forEach((el) => clipObserverRef.current.observe(el));

        return () => {
            if (clipObserverRef.current) {
                clipObserverRef.current.disconnect();
            }
        };
    }, [clips]);

    useEffect(() => {
        if (!containerRef.current || !hasMore) return;

        sentinelObserverRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isFetchingRef.current) {
                        fetchClips(cursor);
                    }
                });
            },
            {
                root: containerRef.current,
                threshold: 0.1,
            },
        );

        if (sentinelRef.current) {
            sentinelObserverRef.current.observe(sentinelRef.current);
        }

        return () => {
            if (sentinelObserverRef.current) {
                sentinelObserverRef.current.disconnect();
            }
        };
    }, [hasMore, cursor, clips]);

    const handleView = useCallback(async (clipId) => {
        try {
            await fetch(`/api/clips/${clipId}/view`, { method: "POST" });
        } catch (error) {
            console.error("View error:", error);
        }
    }, []);

    const handleLike = useCallback(async (clipId) => {
        try {
            await fetch(`/api/clips/${clipId}/like`, { method: "POST" });
            setClips((prev) =>
                prev.map((clip) =>
                    clip._id === clipId
                        ? {
                              ...clip,
                              _isLiked: !clip._isLiked,
                              likesCount: clip._isLiked
                                  ? clip.likesCount - 1
                                  : clip.likesCount + 1,
                          }
                        : clip,
                ),
            );
        } catch (error) {
            console.error("Like error:", error);
        }
    }, []);

    const handleSave = useCallback(async (clipId) => {
        try {
            await fetch(`/api/clips/${clipId}/save`, { method: "POST" });
            setClips((prev) =>
                prev.map((clip) =>
                    clip._id === clipId
                        ? {
                              ...clip,
                              _isSaved: !clip._isSaved,
                              savesCount: clip._isSaved
                                  ? clip.savesCount - 1
                                  : clip.savesCount + 1,
                          }
                        : clip,
                ),
            );
        } catch (error) {
            console.error("Save error:", error);
        }
    }, []);

    const handleDelete = useCallback((clipId) => {
        setClips((prev) => prev.filter((clip) => clip._id !== clipId));
    }, []);

    const handleCommentClick = useCallback((clip) => {
        setSelectedClip(clip);
        setOpenCommentSheet(true);
    }, []);

    if (loading && clips.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        );
    }

    if (clips.length === 0) {
        return (
            <>
                <div className="flex h-screen items-center justify-center bg-black relative">
                    {/* Upload button */}
                    <div className="absolute top-4 right-4 z-50">
                        <Button
                            onClick={() => setOpenUploadModal(true)}
                            className="bg-white text-black hover:bg-white/90"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Upload
                        </Button>
                    </div>
                    <EmptyState
                        icon={Video}
                        title="No clips yet"
                        description="Be the first to upload a clip!"
                    />
                </div>
                <ClipUploadModal
                    open={openUploadModal}
                    onOpenChange={setOpenUploadModal}
                />
            </>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-black flex justify-center">
            {/* Upload button */}
            <div className="absolute top-4 right-4 z-50">
                <Button
                    onClick={() => setOpenUploadModal(true)}
                    className="bg-white text-black hover:bg-white/90"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Upload
                </Button>
            </div>

            <div
                ref={containerRef}
                className="h-full w-full max-w-md overflow-y-scroll snap-y snap-mandatory"
            >
                {clips.map((clip, index) => (
                    <div
                        key={clip._id}
                        data-index={index}
                        className="clip-item relative h-screen w-full snap-start"
                    >
                        <ClipPlayer
                            clip={clip}
                            isActive={index === activeIndex}
                            onView={() => handleView(clip._id)}
                        />
                        <ClipInfo clip={clip} />
                        <ClipActionStack
                            clip={clip}
                            onLike={() => handleLike(clip._id)}
                            onCommentClick={() => handleCommentClick(clip)}
                            onSave={() => handleSave(clip._id)}
                            onDelete={() => handleDelete(clip._id)}
                        />
                    </div>
                ))}
                {hasMore && (
                    <div
                        ref={sentinelRef}
                        className="h-20 flex items-center justify-center"
                    >
                        {loading && (
                            <div className="animate-pulse text-white">
                                Loading...
                            </div>
                        )}
                    </div>
                )}
            </div>
            {selectedClip && (
                <CommentSheet
                    open={openCommentSheet}
                    onOpenChange={setOpenCommentSheet}
                    clip={selectedClip}
                />
            )}
            <ClipUploadModal
                open={openUploadModal}
                onOpenChange={setOpenUploadModal}
            />
        </div>
    );
}
