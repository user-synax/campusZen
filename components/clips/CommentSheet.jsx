"use client";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user";
import { useState, useEffect } from "react";

export default function CommentSheet({ open, onOpenChange, clip }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const fetchComments = async (nextCursor = null) => {
        try {
            setLoading(true);
            let url = `/api/clips/${clip._id}/comments?limit=20`;
            if (nextCursor) url += `&cursor=${nextCursor}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setComments(
                    nextCursor
                        ? [...comments, ...data.comments]
                        : data.comments,
                );
                setCursor(data.pagination.nextCursor);
                setHasMore(data.pagination.hasNextPage);
            }
        } catch (error) {
            console.error("Fetch comments error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && clip) {
            fetchComments();
        }
    }, [open, clip]);

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await fetch(`/api/clips/${clip._id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });
            const data = await res.json();
            if (data.success) {
                setComments([data.comment, ...comments]);
                setNewComment("");
            }
        } catch (error) {
            console.error("Submit comment error:", error);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle>Comments</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {comments.map((comment) => (
                        <div key={comment._id} className="flex gap-3">
                            <UserAvatar user={comment.user} size="sm" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">
                                        {comment.user?.username}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))}
                    {hasMore && (
                        <Button
                            variant="ghost"
                            onClick={() => fetchComments(cursor)}
                            disabled={loading}
                            className="w-full"
                        >
                            Load more
                        </Button>
                    )}
                </div>
                <form onSubmit={handleSubmitComment} className="pt-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            disabled={loading}
                        />
                        <Button type="submit" disabled={!newComment.trim()}>
                            Post
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
