"use client";

import { RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FeedRefreshButton() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleClick = useCallback(async () => {
        if (isRefreshing) return;

        // Haptic feedback for mobile devices
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        setIsRefreshing(true);

        try {
            // Trigger feed refresh via custom event that the feed page listens to
            window.dispatchEvent(new CustomEvent("cx-refresh-feed"));

            // Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: "smooth" });

            // Show success toast
            toast.success("Feed refreshed");
        } catch (err) {
            console.error("Refresh error:", err);
            toast.error("Failed to refresh feed");
        }

        // Keep spinning for at least 800ms for visual feedback
        setTimeout(() => {
            setIsRefreshing(false);
        }, 800);
    }, [isRefreshing]);

    const refreshing = isRefreshing;

    return (
        <div
            className={cn(
                "fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50",
                "transition-all duration-300 ease-out",
            )}
        >
            <button
                onClick={handleClick}
                disabled={refreshing}
                className={cn(
                    // Base styles - smaller on desktop
                    "group relative flex items-center justify-center",
                    "w-11 h-11 sm:w-10 sm:h-10",
                    "rounded-full",
                    "transition-all duration-300 ease-spring",
                    "active:scale-95",
                    refreshing
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:scale-105",

                    // Subtle glass - match site theme
                    "bg-linear-to-br from-white/15 via-white/8 to-transparent",
                    "dark:from-white/12 dark:via-white/6 dark:to-transparent",
                    "backdrop-blur-xl",
                    "backdrop-saturate-125",

                    // Subtle border matching site accent
                    "ring-1 ring-border/50",
                    "border border-border/60",
                    "shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]",

                    // Outer shadow matching site depth
                    "shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]",

                    // Hover effects - site primary color glow
                    "hover:shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(99,102,241,0.2)]",
                    "hover:border-primary/30",

                    // Subtle shine - reduced gloss
                    "before:absolute before:inset-0 before:rounded-full",
                    "before:bg-linear-to-b before:from-white/40 before:via-white/15 before:to-transparent",
                    "before:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
                    "before:pointer-events-none",

                    // Inner subtle glow
                    "after:absolute after:inset-[2px] after:rounded-full",
                    "after:bg-linear-to-br after:from-white/10 after:via-transparent after:to-transparent",
                    "after:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
                    "after:pointer-events-none",
                )}
                aria-label="Refresh feed"
            >
                {/* Subtle inner layer */}
                <span
                    className="absolute inset-[2px] rounded-full bg-linear-to-br from-white/12 via-transparent to-primary/5"
                    aria-hidden="true"
                />

                {/* Bottom depth shadow */}
                <span
                    className="absolute bottom-[1px] left-2 right-2 h-[40%] rounded-b-full bg-gradient-to-t from-black/20 to-transparent"
                    aria-hidden="true"
                />

                {/* Top subtle highlight */}
                <span
                    className="absolute top-[1px] left-1/3 right-1/3 h-[4px] rounded-full bg-white/30"
                    style={{ filter: "blur(1px)" }}
                    aria-hidden="true"
                />

                {/* Side soft highlights - toned down */}
                <span
                    className="absolute top-1/3 -left-[0.5px] w-[2px] h-1/3 rounded-full bg-gradient-to-b from-transparent via-white/20 to-transparent"
                    aria-hidden="true"
                />
                <span
                    className="absolute top-1/3 -right-[0.5px] w-[2px] h-1/3 rounded-full bg-gradient-to-b from-transparent via-white/20 to-transparent"
                    aria-hidden="true"
                />

                {/* Icon container */}
                <span className="relative z-10 flex items-center justify-center">
                    <RefreshCw
                        className={cn(
                            "w-[18px] h-[18px] sm:w-4 sm:h-4",
                            "text-foreground/90",
                            "transition-transform duration-500",
                            refreshing && "animate-spin",
                            !refreshing && "group-hover:rotate-180",
                        )}
                    />
                </span>

                {/* Loading ripple */}
                {refreshing && (
                    <span
                        className="absolute inset-0 rounded-full bg-primary/15 animate-ping"
                        aria-hidden="true"
                    />
                )}

                {/* Subtle hover glow */}
                <span
                    className={cn(
                        "absolute -inset-1 rounded-full pointer-events-none",
                        "bg-primary/10",
                        "blur-md opacity-0 group-hover:opacity-100",
                        "transition-opacity duration-300",
                    )}
                    aria-hidden="true"
                />
            </button>
        </div>
    );
}
