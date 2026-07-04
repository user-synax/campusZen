"use client";

import { Heart, MessageCircle, Share2, Bookmark, Trash2 } from "lucide-react";
import { useState } from "react";
import useUser from "@/hooks/useUser";
import FollowButton from "@/components/user/FollowButton";
import { useRouter } from "next/navigation";

export default function ClipActionStack({
    clip,
    onLike,
    onCommentClick,
    onSave,
    onDelete,
}) {
    const { user } = useUser();
    const router = useRouter();
    const [isLiked, setIsLiked] = useState(clip._isLiked);
    const [isSaved, setIsSaved] = useState(clip._isSaved);
    const [likesCount, setLikesCount] = useState(clip.likesCount);
    const [savesCount, setSavesCount] = useState(clip.savesCount);
    const [isFollowing, setIsFollowing] = useState(clip._userIsFollowing);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = user?._id === clip.user?._id;

    const handleLike = async () => {
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
        if (onLike) await onLike();
    };

    const handleSave = async () => {
        setIsSaved(!isSaved);
        setSavesCount(isSaved ? savesCount - 1 : savesCount + 1);
        if (onSave) await onSave();
    };

    const handleShare = async () => {
        const shareData = {
            title: "Check out this clip!",
            text: clip.description || "Check out this clip on CampusZen",
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            }
        } catch (error) {
            console.error("Share error:", error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this clip?")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/clips/${clip._id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success && onDelete) {
                onDelete();
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete clip. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewProfile = () => {
        router.push(`/profile/${clip.user.username}`);
    };

    return (
        <div className="absolute right-3 bottom-28 flex flex-col gap-5 z-10">
            {!isOwner && (
                <FollowButton
                    targetUserId={clip.user._id}
                    username={clip.user.username}
                    initialIsFollowing={isFollowing}
                    initialFollowersCount={clip.user.followersCount || 0}
                    onToggle={(following) => {
                        setIsFollowing(following);
                    }}
                    onViewProfile={handleViewProfile}
                    compact
                />
            )}
            <ActionButton
                icon={Heart}
                count={likesCount}
                active={isLiked}
                onClick={handleLike}
            />
            <ActionButton
                icon={MessageCircle}
                count={clip.commentsCount}
                onClick={onCommentClick}
            />
            <ActionButton icon={Share2} onClick={handleShare} />
            <ActionButton
                icon={Bookmark}
                count={savesCount}
                active={isSaved}
                onClick={handleSave}
            />
            {isOwner && (
                <ActionButton
                    icon={Trash2}
                    onClick={handleDelete}
                    isDeleting={isDeleting}
                />
            )}
        </div>
    );
}

function ActionButton({ icon: Icon, count, active, onClick, isDeleting }) {
    return (
        <button
            onClick={onClick}
            disabled={isDeleting}
            className="flex flex-col items-center gap-1 focus:outline-none"
        >
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-opacity ${
                    active ? "text-red-500" : "text-white"
                }`}
            >
                <Icon className={`w-6 h-6 ${active ? "fill-current" : ""}`} />
            </div>
            {count !== undefined && (
                <span className="text-xs font-semibold text-white">
                    {count.toLocaleString()}
                </span>
            )}
        </button>
    );
}
