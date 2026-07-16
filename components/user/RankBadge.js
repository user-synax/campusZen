"use client";

import { memo } from "react";
import { getRankForLevel } from "@/lib/ranks";
import { cn } from "@/lib/utils";

const RankBadge = memo(function RankBadge({ level, size = "md", className }) {
    const rank = getRankForLevel(level || 1);

    // Badge size - keep original dimensions, don't scale up beyond a certain point
    const badgeSizeClasses = {
        xs: "h-4 w-4",
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-10 w-10",
        xl: "h-12 w-12",
    };

    return (
        <div
            className={cn(
                "rounded-full overflow-hidden shadow-md shrink-0",
                badgeSizeClasses[size] || badgeSizeClasses.md,
                className,
            )}
        >
            <img
                src={rank.badge}
                alt={rank.name}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={(e) => {
                    // Fallback if badge image not available
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                }}
            />
            {/* Fallback badge */}
            <div className="hidden w-full h-full items-center justify-center bg-primary text-white text-[8px] font-bold rounded-full">
                {rank.name.charAt(0)}
            </div>
        </div>
    );
});

export default RankBadge;
