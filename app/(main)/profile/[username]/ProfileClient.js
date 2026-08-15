"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import UserAvatar from "@/components/user/UserAvatar";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import RankBadge from "@/components/user/RankBadge";
import FollowButton from "@/components/user/FollowButton";
import PostCard from "@/components/post/PostCard";
import PostSkeleton from "@/components/post/PostSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import {
    FileText,
    Zap,
    Flame,
    Trophy,
    MessageSquare,
    Lock,
    Share2,
    Heart,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useUser from "@/hooks/useUser";
import { usePosts } from "@/hooks/usePosts";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import { useTheme } from "@/context/ThemeContext";
import { renderContentWithMentions } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import { getBannerUrl } from "@/utils/defaultBanner";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import Image from "next/image";
import { getLevelProgress } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import CosmeticBadge from "@/components/profile/CosmeticBadge";

const FollowListModal = dynamic(
    () => import("@/components/user/FollowListModal"),
    { ssr: false },
);
const EditProfileDrawer = dynamic(
    () => import("@/components/user/EditProfileDrawer"),
    { ssr: false },
);
const ActivityHeatmap = dynamic(
    () => import("@/components/profile/ActivityHeatmap"),
    { ssr: false },
);
const ProfileCardExportModal = dynamic(
    () => import("@/components/user/ProfileCardExportModal"),
    { ssr: false },
);
const ConnectionsListModal = dynamic(
    () => import("@/components/user/ConnectionsListModal"),
    { ssr: false },
);

export default function ProfileClient({ username: initialUsername }) {
    const params = useParams();
    const username = initialUsername || params.username;
    const { user: currentUser, refetch: refetchCurrentUser } = useUser();
    const router = useRouter();
    const {
        posts,
        loading: postsLoading,
        error: postsError,
        hasMore: hasMorePosts,
        loadMore: loadMorePosts,
        addPost,
        removePost,
        updatePostLike,
    } = usePosts({ username });
    const [sendingDm, setSendingDm] = useState(false);
    const [activeTab, setActiveTab] = useState("posts"); // "posts" or "clips"
    const [clips, setClips] = useState([]);
    const [clipsLoading, setClipsLoading] = useState(false);
    const [clipsCursor, setClipsCursor] = useState(null);
    const [hasMoreClips, setHasMoreClips] = useState(false);
    const clipsSentinelRef = useRef(null);

    const { sentinelRef } = useInfiniteScroll({
        fetchMore: loadMorePosts,
        hasMore: hasMorePosts,
        loading: postsLoading,
    });

    // Fetch clips for the profile
    const fetchClips = async (nextCursor = null) => {
        if (clipsLoading || (!nextCursor && clips.length > 0)) return;
        setClipsLoading(true);
        try {
            let url = `/api/clips/feed?username=${username}&limit=12`;
            if (nextCursor) url += `&cursor=${nextCursor}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setClips(nextCursor ? [...clips, ...data.clips] : data.clips);
                setClipsCursor(data.pagination.nextCursor);
                setHasMoreClips(data.pagination.hasNextPage);
            }
        } catch (error) {
            console.error("Fetch clips error:", error);
        } finally {
            setClipsLoading(false);
        }
    };

    // Observer for clips infinite scroll
    useEffect(() => {
        if (!clipsSentinelRef.current || !hasMoreClips || clipsLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchClips(clipsCursor);
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(clipsSentinelRef.current);
        return () => observer.disconnect();
    }, [hasMoreClips, clipsCursor, clipsLoading]);

    // Fetch clips when tab switches to clips
    useEffect(() => {
        if (activeTab === "clips" && clips.length === 0) {
            fetchClips();
        }
    }, [activeTab]);

    const handleDeletePost = useCallback(
        (postId) => {
            removePost(postId);
        },
        [removePost],
    );

    const handleLikePost = useCallback(
        async (postId) => {
            return await updatePostLike(postId);
        },
        [updatePostLike],
    );

    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    // Follow modal state
    const [followModal, setFollowModal] = useState(false);
    const [followModalTab, setFollowModalTab] = useState("followers");
    const [connectionsModal, setConnectionsModal] = useState(false);

    // Derived state
    const isOwnProfile =
        profileUser?.isMe ||
        currentUser?.username?.toLowerCase() ===
            profileUser?.username?.toLowerCase();
    const isFollowing =
        profileUser?.isFollowing ||
        currentUser?.following?.some(
            (id) => id.toString() === profileUser?._id?.toString(),
        );

    // Equipped shop cosmetics (resolved server-side into a flat map).
    const equipped = profileUser?.equippedItems || {};
    const avatarFrame = equipped.avatar_frame;
    const bgEffect = equipped.profile_bg;
    const shopBanner = equipped.profile_banner?.visual?.imageUrl;
    const layoutVariant = equipped.profile_layout?.visual?.className;
    const isCompactLayout = layoutVariant === "layout-compact";

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setLoading(true);

                // Fetch profile and posts in parallel
                const [userRes, postsRes] = await Promise.all([
                    fetch(`/api/users/${username}`),
                    fetch(`/api/posts/get?username=${username}`),
                ]);

                const userData = await userRes.json();

                if (userRes.ok) {
                    setProfileUser(userData);
                } else {
                    toast.error("Failed to load profile", {
                        description: userData.message,
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Profile fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchProfileData();
    }, [username, currentUser?.username]);

    const handleEditSave = (data) => {
        const updated = data?.user ?? data;
        setProfileUser((prev) => ({
            ...prev,
            ...updated,
            followersCount: prev.followersCount,
            followingCount: prev.followingCount,
            postCount: prev.postCount,
            isFollowing: prev.isFollowing,
            isMe: prev.isMe,
            pinnedPost: prev.pinnedPost,
        }));
        refetchCurrentUser();
    };

    const handleSendDM = async () => {
        if (!currentUser || !profileUser) return;

        if (!profileUser.dmEnabled) {
            toast.error("This user has disabled direct messages");
            return;
        }

        setSendingDm(true);

        try {
            const res = await fetch("/api/dms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: profileUser._id }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/chats/dm/${data.conversation._id}`);
            } else {
                const errorData = await res.json();
                toast.error(
                    errorData.message || "Failed to start conversation",
                );
            }
        } catch (error) {
            console.error("DM error:", error);
            toast.error("Failed to start conversation");
        } finally {
            setSendingDm(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="h-40 sm:h-56 bg-gradient-to-br from-secondary via-secondary/70 to-secondary animate-pulse" />
                <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 pb-4 -mt-14 sm:-mt-16 space-y-4">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-secondary animate-pulse border-4 border-background shadow-xl" />
                    <div className="h-6 w-48 bg-secondary animate-pulse rounded-full" />
                    <div className="h-4 w-32 bg-secondary animate-pulse rounded-full" />
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-20 bg-secondary/70 animate-pulse rounded-2xl"
                            />
                        ))}
                    </div>
                </div>
                <div className="max-w-3xl w-full mx-auto mt-8">
                    {[1, 2].map((i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <EmptyState
                icon={FileText}
                title="User not found"
                description="The profile you are looking for does not exist."
            />
        );
    }

    return (
        <div className="flex flex-col min-h-screen relative bg-background">
            {/* Profile background effect (shop cosmetic) — subtle ambient wash
                behind all profile content. pointer-events-none + low alpha
                keeps text contrast intact in every theme. */}
            {bgEffect?.visual?.color && (
                <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                        background: `radial-gradient(120% 60% at 50% 0%, ${bgEffect.visual.color}1f, transparent 55%)`,
                    }}
                />
            )}

            {/* Header */}
            <div className="relative z-10 flex flex-col max-w-3xl w-full mx-auto sm:border-x sm:border-border/40">
                <div className="h-40 sm:h-56 relative overflow-hidden bg-secondary">
                    {shopBanner ? (
                        // Shop-equipped cosmetic banner (static image, lazy).
                        // Plain <img> avoids next/image remote-domain config
                        // for arbitrary admin-pasted CDN URLs.
                        <img
                            src={shopBanner}
                            alt={`${profileUser?.name}'s cosmetic banner`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : profileUser?.banner ? (
                        <Image
                            src={getBannerUrl(
                                profileUser?.banner,
                                profileUser?.username,
                            )}
                            alt={`${profileUser?.name}'s banner`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority
                            quality={100}
                        />
                    ) : profileUser?.isPro ? (
                        <div className="absolute inset-0 animate-gradient" />
                    ) : (
                        <Image
                            src={getBannerUrl(
                                profileUser?.banner,
                                profileUser?.username,
                            )}
                            alt={`${profileUser?.name}'s banner`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority
                            quality={100}
                        />
                    )}
                    {/* Subtle bottom fade for a premium blend into the content */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
                </div>

                <div className="px-4 sm:px-6 pb-4 relative">
                    {/* Sparkling Animation for Pro Users */}
                    {profileUser.isPro &&
                        !(
                            profileUser.role === "admin" ||
                            profileUser.email ===
                                process.env.NEXT_PUBLIC_ADMIN_EMAIL
                        ) && (
                            <>
                                <div
                                    className="absolute top-8 left-6 sm:top-10 sm:left-10 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-yellow-300 rounded-full animate-ping opacity-75"
                                    style={{ animationDuration: "2s" }}
                                />
                                <div
                                    className="absolute top-16 right-12 sm:top-20 sm:right-16 w-1 h-1 bg-amber-400 rounded-full animate-ping opacity-60"
                                    style={{
                                        animationDuration: "2.5s",
                                        animationDelay: "0.5s",
                                    }}
                                />
                                <div
                                    className="absolute bottom-28 left-16 sm:bottom-32 sm:left-20 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-orange-300 rounded-full animate-ping opacity-65"
                                    style={{
                                        animationDuration: "1.8s",
                                        animationDelay: "1s",
                                    }}
                                />
                                <div
                                    className="absolute top-32 right-20 sm:top-40 sm:right-24 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-70"
                                    style={{
                                        animationDuration: "2.2s",
                                        animationDelay: "1.5s",
                                    }}
                                />
                                <div
                                    className="absolute bottom-16 right-8 sm:bottom-20 sm:right-10 w-1 sm:w-1.5 h-1 sm:h-1.5 bg-amber-300 rounded-full animate-ping opacity-55"
                                    style={{
                                        animationDuration: "2.8s",
                                        animationDelay: "0.8s",
                                    }}
                                />
                            </>
                        )}

                    <div className="flex justify-between items-end -mt-14 sm:-mt-16 mb-3 relative z-10 ">
                        {/* Profile Avatar with Premium Glowing Frame */}
                        <div className="relative">
                            {profileUser.isPro &&
                                !(
                                    profileUser.role === "admin" ||
                                    profileUser.email ===
                                        process.env.NEXT_PUBLIC_ADMIN_EMAIL
                                ) && (
                                    <div className="absolute -inset-2 rounded-full animate-pulse bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 blur-md opacity-50" />
                                )}
                            {(() => {
                                const frameAsset =
                                    avatarFrame?.visual?.frameAssetUrl;
                                const isVideoFrame = /\.(webm|mp4|ogg)$/i.test(
                                    frameAsset || "",
                                );
                                return (
                                    <>
                                        {/* CSS-only frame (border/glow) — used when no
                                            overlay asset is set. */}
                                        <div
                                            className={cn(
                                                "rounded-full",
                                                avatarFrame?.visual?.className ||
                                                    "",
                                                (avatarFrame?.rarity ===
                                                    "legendary" ||
                                                    avatarFrame?.rarity ===
                                                        "mythic") &&
                                                    "animate-pulse",
                                            )}
                                            style={
                                                !frameAsset &&
                                                avatarFrame?.visual?.color
                                                    ? {
                                                          border: `4px solid ${avatarFrame.visual.color}`,
                                                          boxShadow: `0 0 0 2px ${avatarFrame.visual.color}55, 0 0 16px ${avatarFrame.visual.color}66`,
                                                      }
                                                    : undefined
                                            }
                                        >
                                            <UserAvatar
                                                user={profileUser}
                                                size="xl"
                                                customSize="w-28 h-28 sm:w-32 sm:h-32"
                                                className={`border-4 border-background shadow-2xl ring-2 ring-black/10 relative z-10 transition-transform duration-300 ${profileUser.isPro && !(profileUser.role === "admin" || profileUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) ? "ring-4 ring-yellow-400/50" : ""}`}
                                            />
                                        </div>
                                        {/* Discord-style overlay frame: transparent-center
                                            GIF/WebM sitting on top of the avatar. */}
                                        {frameAsset && (
                                            <div
                                                aria-hidden
                                                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[112%] h-[112%] z-20"
                                            >
                                                {isVideoFrame ? (
                                                    <video
                                                        src={frameAsset}
                                                        autoPlay
                                                        muted
                                                        loop
                                                        playsInline
                                                        className="w-full h-full object-contain select-none"
                                                    />
                                                ) : (
                                                    <img
                                                        src={frameAsset}
                                                        alt=""
                                                        aria-hidden
                                                        loading="lazy"
                                                        className="w-full h-full object-contain select-none pointer-events-none"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {isOwnProfile ? (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExportOpen(true)}
                                    className="hover:cursor-pointer flex items-center gap-1.5 backdrop-blur-sm bg-background/80 pill-chunky"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditOpen(true)}
                                    className="backdrop-blur-sm bg-background/80 font-semibold pill-chunky"
                                >
                                    Edit profile
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <FollowButton
                                    targetUserId={profileUser._id}
                                    username={profileUser.username}
                                    initialIsFollowing={isFollowing}
                                    initialFollowersCount={
                                        profileUser.followersCount
                                    }
                                    onToggle={(following, count) => {
                                        setProfileUser((prev) => ({
                                            ...prev,
                                            followersCount: count,
                                        }));
                                    }}
                                />
                                {profileUser.dmEnabled ? (
                                    <Button
                                        size="sm"
                                        onClick={handleSendDM}
                                        disabled={sendingDm}
                                        className="font-semibold pill-chunky"
                                    >
                                        <MessageSquare className="w-4 h-4 mr-1" />
                                        {sendingDm ? "Opening..." : "DM"}
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        disabled
                                        className="opacity-70 pill-chunky"
                                    >
                                        <Lock className="w-4 h-4 mr-1" />
                                        DM Locked
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap py-3">
                        <RankBadge level={profileUser.level || 1} size="xl" />
                        <span
                            className={`text-xl sm:text-2xl font-black tracking-tight ${
                                profileUser.isPro &&
                                !(
                                    profileUser.role === "admin" ||
                                    profileUser.email ===
                                        process.env.NEXT_PUBLIC_ADMIN_EMAIL
                                )
                                    ? "text-transparent bg-clip-text bg-linear-to-r from-yellow-300 via-amber-400 to-yellow-500 animate-pulse drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                                    : "text-foreground"
                            }`}
                        >
                            {profileUser.name}
                        </span>
                        {profileUser?.isVerified && (
                            <VerifiedBadge
                                size="lg"
                                showText
                                verificationType={profileUser.verificationType}
                            />
                        )}
                        {/* Admin badge */}
                        {(profileUser.role === "admin" ||
                            profileUser.email ===
                                process.env.NEXT_PUBLIC_ADMIN_EMAIL) && (
                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 hover:bg-purple-600/30 rounded-full px-3 py-1 text-xs font-bold">
                                <CrownIcon className="w-4 h-4" /> &nbsp; Founder
                            </Badge>
                        )}
                        {/* Cosmetic shop badge — distinct dashed style so users
                            don't confuse purchased flex with earned/verified badges */}
                        {equipped.special_badge && (
                            <CosmeticBadge item={equipped.special_badge} />
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">
                        @{profileUser.username}
                    </p>

                    {profileUser.bio && (
                        <div className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {renderContentWithMentions(profileUser.bio).map(
                                (segment, i) => {
                                    if (segment.type === "hashtag") {
                                        return (
                                            <Link
                                                key={i}
                                                href={`/hashtag/${segment.value}`}
                                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                            >
                                                #{segment.value}
                                            </Link>
                                        );
                                    } else if (segment.type === "mention") {
                                        return (
                                            <UserMention
                                                key={i}
                                                username={segment.value}
                                            />
                                        );
                                    } else {
                                        return (
                                            <span key={i}>{segment.value}</span>
                                        );
                                    }
                                },
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3 text-sm text-muted-foreground">
                        {profileUser.college && (
                            <span className="flex items-center gap-1.5 bg-accent/40 border border-border/50 rounded-full px-3 py-1">
                                🎓 {profileUser.college}
                            </span>
                        )}
                        {profileUser.course && (
                            <span className="flex items-center gap-1.5 bg-accent/40 border border-border/50 rounded-full px-3 py-1">
                                📚 {profileUser.course}
                            </span>
                        )}
                        {profileUser.year && (
                            <span className="flex items-center gap-1.5 bg-accent/40 border border-border/50 rounded-full px-3 py-1">
                                📅 Year {profileUser.year}
                            </span>
                        )}
                    </div>

                    {/* Social Links */}
                    {profileUser.socialLinks && (
                        <div className="flex flex-wrap gap-2.5 mt-4">
                            {profileUser.socialLinks.twitter && (
                                <a
                                    href={profileUser.socialLinks.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center hover:bg-sky-500/30 transition-all hover:scale-110 shadow-sm border border-border/40"
                                    title="Twitter"
                                >
                                    <svg
                                        className="w-4 h-4 text-sky-500"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </a>
                            )}
                            {profileUser.socialLinks.instagram && (
                                <a
                                    href={profileUser.socialLinks.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center hover:bg-pink-500/30 transition-all hover:scale-110 shadow-sm border border-border/40"
                                    title="Instagram"
                                >
                                    <svg
                                        className="w-4 h-4 text-pink-500"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                            )}
                            {profileUser.socialLinks.linkedin && (
                                <a
                                    href={profileUser.socialLinks.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center hover:bg-blue-600/30 transition-all hover:scale-110 shadow-sm border border-border/40"
                                    title="LinkedIn"
                                >
                                    <svg
                                        className="w-4 h-4 text-blue-600"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>
                            )}
                            {profileUser.socialLinks.github && (
                                <a
                                    href={profileUser.socialLinks.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-gray-600/20 flex items-center justify-center hover:bg-gray-600/30 transition-all hover:scale-110 shadow-sm border border-border/40"
                                    title="GitHub"
                                >
                                    <svg
                                        className="w-4 h-4 text-gray-600"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                </a>
                            )}
                            {profileUser.socialLinks.website && (
                                <a
                                    href={profileUser.socialLinks.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center hover:bg-green-500/30 transition-all hover:scale-110 shadow-sm border border-border/40"
                                    title="Website"
                                >
                                    <svg
                                        className="w-4 h-4 text-green-500"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    )}

                    {/* Gamification Stats */}
                    {isCompactLayout ? (
                        // Compact layout variant (shop cosmetic): inline row,
                        // same data, no card chrome — purely cosmetic reorder.
                        <div className="flex items-center justify-around mt-5 py-3 rounded-2xl bg-accent/20 card-chunky">
                            <div className="flex flex-col items-center">
                                <span className="text-base font-black">
                                    {profileUser.totalXP || profileUser.xp || 0}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    Total XP
                                </span>
                            </div>
                            <div className="w-px h-8 bg-border/60" />
                            <div className="flex flex-col items-center">
                                <span className="text-base font-black">
                                    {profileUser.currentStreak || 0}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    Day Streak
                                </span>
                            </div>
                            <div className="w-px h-8 bg-border/60" />
                            <div className="flex flex-col items-center">
                                <span className="text-base font-black">
                                    Lvl {profileUser.level || 1}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    Level
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-6">
                            <Card className="p-3 sm:p-4 bg-accent/30 dark:bg-zinc-900/40 rounded-2xl flex flex-col items-center justify-center text-center card-chunky card-chunky-interactive">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-1.5">
                                    <Zap className="w-4 h-4 text-primary fill-primary" />
                                </div>
                                <span className="text-lg sm:text-xl font-black">
                                    {profileUser.totalXP || profileUser.xp || 0}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    Total XP
                                </span>
                            </Card>

                            <Card className="p-3 sm:p-4 bg-accent/30 dark:bg-zinc-900/40 rounded-2xl flex flex-col items-center justify-center text-center card-chunky card-chunky-interactive">
                                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center mb-1.5">
                                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                                </div>
                                <span className="text-lg sm:text-xl font-black">
                                    {profileUser.currentStreak || 0}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    Day Streak
                                </span>
                            </Card>

                            <Card className="p-3 sm:p-4 bg-accent/30 dark:bg-zinc-900/40 rounded-2xl flex flex-col items-center justify-center text-center card-chunky card-chunky-interactive">
                                <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center mb-1.5">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                </div>
                                <span className="text-lg sm:text-xl font-black">
                                    Lvl {profileUser.level || 1}
                                </span>
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wide">
                                    {(() => {
                                        const progress = getLevelProgress(
                                            profileUser.xp || 0,
                                            profileUser.level || 1,
                                        );
                                        return `${progress.remainingXP} XP to next`;
                                    })()}
                                </span>
                            </Card>
                        </div>
                    )}

                    {/* Exclusive Theme Widget for Premium */}
                    {profileUser.isPro && (
                        <div className="mt-6">
                            <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl card-chunky">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white text-lg shadow-sm">
                                        🎨
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-sm">
                                            Theme Master
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Customizing their CampusZen
                                            experience
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    <div className="flex gap-6 mt-6 pb-3 border-b border-border/50">
                        <button
                            onClick={() => {
                                setFollowModal(true);
                                setFollowModalTab("following");
                            }}
                            className="flex hover:cursor-pointer gap-1.5 hover:opacity-70 transition-opacity"
                        >
                            <strong className="font-black">
                                {profileUser.followingCount}
                            </strong>{" "}
                            <span className="text-muted-foreground">
                                Following
                            </span>
                        </button>
                        <button
                            onClick={() => {
                                setFollowModal(true);
                                setFollowModalTab("followers");
                            }}
                            className="flex hover:cursor-pointer gap-1.5 hover:opacity-70 transition-opacity"
                        >
                            <strong className="font-black">
                                {profileUser.followersCount}
                            </strong>{" "}
                            <span className="text-muted-foreground">
                                Followers
                            </span>
                        </button>
                        {(profileUser.connectionsCount > 0 || isOwnProfile) && (
                            <button
                                onClick={() => setConnectionsModal(true)}
                                className="flex hover:cursor-pointer gap-1.5 hover:opacity-70 transition-opacity"
                            >
                                <strong className="font-black">
                                    {profileUser.connectionsCount || 0}
                                </strong>{" "}
                                <span className="text-muted-foreground">
                                    Connections
                                </span>
                            </button>
                        )}
                        <span className="flex gap-1.5">
                            <strong className="font-black">
                                {profileUser.postCount}
                            </strong>{" "}
                            <span className="text-muted-foreground">Posts</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Activity Heatmap */}
            {profileUser && (
                <div className="relative z-10 max-w-3xl w-full mx-auto px-4 sm:px-6 pb-2 mt-1">
                    <ActivityHeatmap username={username} />
                </div>
            )}

            {/* Tabs */}
            <div className="sticky top-0 z-20 flex border-b border-border mt-2 bg-background/80 backdrop-blur-md max-w-3xl w-full mx-auto sm:border-x sm:border-border/40">
                <button
                    onClick={() => setActiveTab("posts")}
                    className={`flex-1 sm:flex-none px-6 py-3.5 font-bold text-sm transition-colors relative ${
                        activeTab === "posts"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Posts
                    {activeTab === "posts" && (
                        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("clips")}
                    className={`flex-1 sm:flex-none px-6 py-3.5 font-bold text-sm transition-colors relative ${
                        activeTab === "clips"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Clips
                    {activeTab === "clips" && (
                        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                    )}
                </button>
            </div>

            {/* Content Section */}
            <div className="relative z-10 flex-1 max-w-3xl w-full mx-auto sm:border-x sm:border-border/40">
                {activeTab === "posts" ? (
                    <>
                        {postsLoading && posts.length === 0 ? (
                            [1, 2, 3].map((i) => <PostSkeleton key={i} />)
                        ) : posts.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="No posts yet"
                                description={
                                    isOwnProfile
                                        ? "You haven't posted anything yet."
                                        : `@${profileUser.username} hasn't posted anything yet.`
                                }
                            />
                        ) : (
                            <>
                                <div className="divide-y divide-border">
                                    {/* Show pinned post first if exists */}
                                    {profileUser?.pinnedPost && (
                                        <PostCard
                                            key={
                                                typeof profileUser.pinnedPost ===
                                                "object"
                                                    ? profileUser.pinnedPost._id
                                                    : profileUser.pinnedPost
                                            }
                                            post={
                                                typeof profileUser.pinnedPost ===
                                                "object"
                                                    ? profileUser.pinnedPost
                                                    : posts.find(
                                                          (p) =>
                                                              p._id ===
                                                              profileUser.pinnedPost,
                                                      )
                                            }
                                            currentUserId={currentUser?._id}
                                            currentUser={currentUser}
                                            onDelete={handleDeletePost}
                                            onLike={handleLikePost}
                                            isPinned={true}
                                        />
                                    )}
                                    {posts
                                        .filter(
                                            (post) =>
                                                post._id !==
                                                (profileUser?.pinnedPost?._id ||
                                                    profileUser?.pinnedPost),
                                        )
                                        .map((post) => (
                                            <PostCard
                                                key={post._id}
                                                post={post}
                                                currentUserId={currentUser?._id}
                                                currentUser={currentUser}
                                                onDelete={handleDeletePost}
                                                onLike={handleLikePost}
                                                isPinned={false}
                                            />
                                        ))}
                                </div>

                                <div ref={sentinelRef}>
                                    <InfiniteScrollSentinel
                                        loading={postsLoading}
                                        hasMore={hasMorePosts}
                                        error={postsError}
                                        onRetry={loadMorePosts}
                                    />
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    // Clips Tab
                    <>
                        {clipsLoading && clips.length === 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div
                                        key={i}
                                        className="aspect-[9/16] bg-accent/30 rounded-2xl animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : clips.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="No clips yet"
                                description={
                                    isOwnProfile
                                        ? "You haven't uploaded any clips yet."
                                        : `@${profileUser.username} hasn't uploaded any clips yet.`
                                }
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
                                    {clips.map((clip) => (
                                        <div
                                            key={clip._id}
                                            className="aspect-[9/16] relative rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-lg transition-shadow duration-300 bg-accent/20"
                                            onClick={() => {
                                                // TODO: Navigate to specific clip view
                                                // For now, navigate to clips feed
                                                router.push("/clips");
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                            <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-white text-xs font-semibold">
                                                <Heart className="w-4 h-4 fill-white" />
                                                {clip.likesCount}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {hasMoreClips && (
                                    <div
                                        ref={clipsSentinelRef}
                                        className="flex justify-center py-8"
                                    >
                                        {clipsLoading && (
                                            <div className="animate-pulse text-muted-foreground">
                                                Loading more clips...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Edit Profile Drawer */}
            {isOwnProfile && (
                <EditProfileDrawer
                    user={profileUser}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSave={handleEditSave}
                />
            )}

            {/* Follow list modal */}
            <FollowListModal
                username={username}
                initialTab={followModalTab}
                followersCount={profileUser.followersCount}
                followingCount={profileUser.followingCount}
                open={followModal}
                onOpenChange={setFollowModal}
                currentUserId={currentUser?._id}
            />

            {/* Connections list modal */}
            <ConnectionsListModal
                username={username}
                connectionsCount={profileUser.connectionsCount || 0}
                open={connectionsModal}
                onOpenChange={setConnectionsModal}
                currentUserId={currentUser?._id}
            />

            {/* Export Profile Card Modal - Only for Own Profile */}
            {isOwnProfile && (
                <ProfileCardExportModal
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    profileUser={profileUser}
                />
            )}
        </div>
    );
}