"use client";

import { UserAvatar } from "@/components/user";
import { useState } from "react";

export default function ClipInfo({ clip }) {
    const [showFullDescription, setShowFullDescription] = useState(false);

    const toggleDescription = () => {
        setShowFullDescription(!showFullDescription);
    };

    const shouldTruncate = clip.description?.length > 100;
    const displayDescription =
        shouldTruncate && !showFullDescription
            ? clip.description.slice(0, 100) + "..."
            : clip.description;

    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black via-black/70 to-transparent z-10">
            <div className="flex items-center gap-3 mb-3">
                <UserAvatar user={clip.user} size="sm" />
                <span className="font-semibold text-white text-sm">
                    {clip.user?.username || clip.user?.name}
                </span>
            </div>
            {clip.description && (
                <p className="text-white text-sm">
                    {displayDescription}
                    {shouldTruncate && (
                        <button
                            onClick={toggleDescription}
                            className="ml-1 font-semibold text-white/80 hover:text-white"
                        >
                            {showFullDescription ? "less" : "more"}
                        </button>
                    )}
                </p>
            )}
        </div>
    );
}
