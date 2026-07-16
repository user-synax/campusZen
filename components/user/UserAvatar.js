"use client";

import { memo } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import RankBadge from "./RankBadge";

// Simple ring configurations - easy to adjust!
const RING_CONFIGS = {
    founder: {
        style: {
            boxShadow: "0 0 0 4px #ef4444, 0 0 0 4px #f97316",
        },
    },
    pro: {
        style: {
            boxShadow: "0 0 0 3px #3b82f6, 0 0 0 3px #06b6d4",
        },
    },
};

const UserAvatar = memo(function UserAvatar({
    user,
    size = "md",
    className,
    showRank = true,
    customSize,
}) {
    const sizeClasses = {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };
    const effectiveSizeClass =
        customSize || sizeClasses[size] || sizeClasses.md;
    const { theme } = useTheme();
    const isCustomTheme = theme && !["light", "dark"].includes(theme);

    let activeRing = null;
    if (user?.role === "admin" || user?.isFounder) {
        activeRing = RING_CONFIGS.founder;
    } else if (user?.level >= 50) {
        activeRing = RING_CONFIGS.legend;
    } else if (user?.isPro) {
        activeRing = RING_CONFIGS.pro;
    }

    // Calculate appropriate sizes based on the size prop
    const getSizes = () => {
        switch (size) {
            case "xs":
                return "(max-width: 768px) 24px, 24px";
            case "sm":
                return "(max-width: 768px) 32px, 32px";
            case "md":
                return "(max-width: 768px) 40px, 40px";
            case "lg":
                return "(max-width: 768px) 48px, 48px";
            case "xl":
                return "(max-width: 768px) 128px, 128px";
            default:
                return "(max-width: 768px) 40px, 40px";
        }
    };

    return (
        <div className={cn("relative inline-flex", effectiveSizeClass)}>
            <Avatar
                style={activeRing?.style}
                className={cn(
                    effectiveSizeClass,
                    className,
                    "border-2 border-background overflow-hidden",
                )}
            >
                {user?.avatar ? (
                    <Image
                        src={user.avatar}
                        alt={user?.name || "User avatar"}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes={getSizes()}
                        quality={100}
                    />
                ) : (
                    <AvatarFallback>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                )}
            </Avatar>
            {user?.isBot && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-30">
                    Bot
                </div>
            )}
            {!user?.isBot && showRank && user?.level !== undefined && (
                <RankBadge level={user.level} size={size} />
            )}
        </div>
    );
});

export default UserAvatar;
