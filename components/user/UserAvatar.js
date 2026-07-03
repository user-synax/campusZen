"use client";

import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

const UserAvatar = memo(function UserAvatar({ user, size = "md", className }) {
    const sizeClasses = {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };
    const { theme } = useTheme();
    const isCustomTheme = theme && !["light", "dark"].includes(theme);

    return (
        <div className={cn("relative", sizeClasses[size] || sizeClasses.md)}>
            {user?.isPro && (
                <div className="absolute inset-0 rounded-full p-0.5 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
            )}
            <Avatar
                className={cn(
                    sizeClasses[size] || sizeClasses.md,
                    className,
                    user?.isPro && "border-2 border-background",
                )}
            >
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>
                    {user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
            {user?.isBot && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                    Bot
                </div>
            )}
        </div>
    );
});

export default UserAvatar;
