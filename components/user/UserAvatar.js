"use client";

import { memo } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { getRankForLevel } from "@/lib/ranks";

// Simple ring configurations - easy to adjust!
const RING_CONFIGS = {
    founder: {
        style: {
            boxShadow: `
  0 0 0 3px rgba(239, 68, 68, 0.7),
  0 0 0 8px rgba(239, 68, 68, 0.25),
  0 8px 20px rgba(239, 68, 68, 0.4)
`,
        },
    },
    pro: {
        style: {
            boxShadow: "0 0 0 3px #3b82f6, 0 0 0 3px #06b6d4",
        },
    },
    rookie: {
        style: {
            boxShadow: "0 0 0 3px #6b7280",
        },
    },
    ruby: {
        style: {
            boxShadow: "0 0 0 3px #dc2626",
        },
    },
    diamond: {
        style: {
            boxShadow: "0 0 0 3px #3b82f6",
        },
    },
    emerald: {
        style: {
            boxShadow: "0 0 0 3px #10b981",
        },
    },
    titan: {
        style: {
            boxShadow: "0 0 0 3px #8b5cf6",
        },
    },
    mythic: {
        style: {
            boxShadow: "0 0 0 3px #f59e0b",
        },
    },
    ace: {
        style: {
            boxShadow: "0 0 0 3px #14b8a6",
        },
    },
    immortal: {
        style: {
            boxShadow: `
  0 0 0 4px rgba(236, 72, 153, 0.7),
  0 0 0 10px rgba(236, 72, 153, 0.25),
  0 8px 20px rgba(236, 72, 153, 0.4)
`,
        },
    },
};

const UserAvatar = memo(function UserAvatar({
    user,
    size = "md",
    className,
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
    } else if (user?.isPro) {
        activeRing = RING_CONFIGS.pro;
    } else if (user?.level !== undefined) {
        const rank = getRankForLevel(user.level);
        activeRing = RING_CONFIGS[rank.name.toLowerCase()];
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
        </div>
    );
});

export default UserAvatar;
