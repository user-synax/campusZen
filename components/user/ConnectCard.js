"use client";

import Link from "next/link";
import Image from "next/image";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import ConnectButton from "@/components/user/ConnectButton";

export default function ConnectCard({ user, currentUserId }) {
    const interests = (user.interests || []).slice(0, 3);
    const hasCourse =
        (user.course && user.course.trim()) ||
        (user.branch && user.branch.trim());
    const hasCollege = user.college && user.college.trim();
    const hasInterests = interests.length > 0;

    return (
        <div className="card-chunky card-chunky-interactive relative bg-card p-4 flex flex-col h-full">
            {/* Stretched link — the whole card navigates to the profile. */}
            <Link
                href={`/profile/${user.username}`}
                aria-label={`View ${user.name}'s profile`}
                className="absolute inset-0 z-0 rounded-[inherit]"
            />

            {/* Large avatar area */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-accent mb-4">
                {user.avatar ? (
                    <Image
                        src={user.avatar}
                        alt={user.name || "User avatar"}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, 50vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl font-bold text-muted-foreground/40">
                            {user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                    </div>
                )}
            </div>

            {/* Content area */}
            <div className="flex-1 flex flex-col items-center text-center gap-1.5 w-full min-w-0">
                {/* Name + verified */}
                <div className="w-full min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate flex items-center justify-center gap-1.5 text-foreground">
                        {user.name}
                        {user.isVerified && (
                            <VerifiedBadge
                                size="sm"
                                verificationType={user.verificationType}
                            />
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        @{user.username}
                    </p>
                </div>

                {/* College / course */}
                {hasCollege || hasCourse ? (
                    <div className="text-xs text-muted-foreground/80 truncate max-w-full">
                        {hasCollege && <span>{user.college}</span>}
                        {hasCollege && hasCourse && (
                            <span className="mx-1">·</span>
                        )}
                        {hasCourse && (
                            <span>
                                {[user.course, user.branch]
                                    .filter(Boolean)
                                    .join(" — ")}
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground/50 italic">
                        No college added yet
                    </p>
                )}

                {/* Interests tags */}
                {hasInterests ? (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                        {interests.map((interest) => (
                            <span
                                key={interest}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-muted-foreground border border-border/50"
                            >
                                {interest}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground/50 italic mt-1">
                        No interests added yet
                    </p>
                )}
            </div>

            {/* Connect button — centered */}
            {user._id !== currentUserId && (
                <div className="relative z-10 mt-auto pt-4 w-full flex justify-center">
                    <ConnectButton
                        targetUserId={user._id}
                        username={user.username}
                        compact={false}
                    />
                </div>
            )}
        </div>
    );
}