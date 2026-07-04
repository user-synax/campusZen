"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FollowButton({
    targetUserId,
    username,
    initialIsFollowing,
    initialFollowersCount,
    onToggle,
    compact = false,
    onViewProfile,
}) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [followersCount, setFollowersCount] = useState(initialFollowersCount);
    const [isLoading, setIsLoading] = useState(false);

    const handleFollow = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsLoading(true);

        // Optimistic update
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setFollowersCount((prev) => (wasFollowing ? prev - 1 : prev + 1));

        try {
            const res = await fetch("/api/follow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            // Sync with server
            setIsFollowing(data.following);
            setFollowersCount(data.followersCount);
            if (onToggle) onToggle(data.following, data.followersCount);

            if (data.following) {
                toast.success(`Following @${username}`, {
                    description: "You're now connected with this user.",
                });
            } else {
                toast.success(`Unfollowed @${username}`, {
                    description: "You've disconnected with this user.",
                });
            }
        } catch (error) {
            // Revert optimistic update
            setIsFollowing(wasFollowing);
            setFollowersCount(initialFollowersCount);
            toast.error("Failed to update follow status", {
                description: error.message || "An unknown error occurred",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewProfile = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (onViewProfile) {
            onViewProfile();
        }
    };

    if (isFollowing) {
        if (onViewProfile) {
            if (compact) {
                return (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            disabled={isLoading}
                            onClick={handleViewProfile}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all focus:outline-none"
                        >
                            <User className="w-6 h-6" />
                        </button>
                        <span className="text-xs font-semibold text-white">
                            Profile
                        </span>
                    </div>
                );
            }
            return (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={handleViewProfile}
                    className={cn(
                        "rounded-full hover:bg-accent hover:text-accent-foreground hover:border-accent hover:cursor-pointer",
                        "px-6",
                    )}
                >
                    View Profile
                </Button>
            );
        }
        return (
            <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={handleFollow}
                className={cn(
                    "rounded-full hover:bg-destructive hover:text-white hover:border-destructive group  hover:cursor-pointer",
                    compact ? "px-3 h-8 text-xs" : "px-6",
                )}
            >
                <span className="group-hover:hidden">Following</span>
                <span className="hidden group-hover:inline">Unfollow</span>
            </Button>
        );
    }

    if (compact) {
        return (
            <div className="flex flex-col items-center gap-1">
                <button
                    disabled={isLoading}
                    onClick={handleFollow}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-all focus:outline-none"
                >
                    <Plus className="w-6 h-6" />
                </button>
                <span className="text-xs font-semibold text-white">Follow</span>
            </div>
        );
    }

    return (
        <Button
            variant="default"
            size="sm"
            disabled={isLoading}
            onClick={handleFollow}
            className={cn(
                "rounded-full hover:cursor-pointer hover:outline-4 hover:outline-accent",
                "px-6",
            )}
        >
            Follow
        </Button>
    );
}
