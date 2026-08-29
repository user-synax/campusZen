"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sun, Moon, MoreHorizontal, Palette, Check } from "lucide-react";
import { useTheme, PREMIUM_THEMES } from "@/context/ThemeContext";
import { useChatUnreadCount } from "@/context/ChatUnreadContext";
import AnimatedCount from "@/components/ui/AnimatedCount";
import { useNotifications } from "@/hooks/useNotifications";
import useUser from "@/hooks/useUser";
import { isAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    primaryNavItems as basePrimaryNavItems,
    gamificationItems,
    moreItems,
    bottomNavItems,
    adminItems as baseAdminItems,
} from "./navItems";

export default function Dock() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme, toggleTheme } = useTheme();
    const { unreadCount } = useNotifications();
    const chatUnread = useChatUnreadCount();
    const { user } = useUser();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const isAdminUser = user ? isAdmin(user) : false;

    const primaryNavItems = basePrimaryNavItems.map((item) =>
        item.href === "/chats"
            ? { ...item, badge: chatUnread }
            : item.href === "/notifications"
                ? { ...item, badge: unreadCount }
                : item,
    );

    const moreNavItems = [
        ...gamificationItems,
        ...moreItems,
        ...bottomNavItems,
        ...(isAdminUser ? baseAdminItems : []),
    ];

    // macOS-style magnification: hovered icon scales up most, immediate
    // neighbors slightly, everything else stays put. Fast 150ms, no overshoot.
    const scaleFor = (index) => {
        if (hoveredIndex === null) return 1;
        if (hoveredIndex === index) return 1.25;
        if (Math.abs(hoveredIndex - index) === 1) return 1.1;
        return 1;
    };

    const renderDockIcon = (item, index) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        const scale = scaleFor(index);

        return (
            <div key={item.href} className="relative">
                {isActive && (
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-1 h-1 rounded-full bg-primary z-10" />
                )}
                <Link href={item.href} aria-label={item.label}>
                    <Button
                        variant="ghost"
                        className={cn(
                            "chip-chunky w-12 h-12 p-0 flex items-center justify-center rounded-2xl hover:cursor-pointer",
                            isActive
                                ? "chip-chunky-active text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: "bottom",
                            transition: "transform 150ms ease-out",
                        }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className="relative shrink-0">
                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-primary" : "",
                                )}
                            />
                                {item.badge > 0 && (
                                    <span className="t-badge" data-open="true">
                                        <span className="t-badge-dot min-w-3.75 h-3.75 bg-primary text-[9px] text-primary-foreground font-bold flex items-center justify-center rounded-full px-1 border-2 border-background">
                                            <AnimatedCount value={item.badge} max={9} />
                                        </span>
                                    </span>
                                )}
                        </div>
                    </Button>
                </Link>
            </div>
        );
    };

    const renderMoreRow = (item) => {
        const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
            >
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 h-10 px-3 chip-chunky",
                        isActive
                            ? "chip-chunky-active text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        item.color,
                    )}
                >
                    <div className="relative shrink-0">
                        <Icon
                            className={cn("w-4.5 h-4.5", item.color)}
                        />
                        {item.badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-3.75 h-3.75 bg-red-500 text-[9px] text-white font-bold flex items-center justify-center rounded-full px-0.5 border-2 border-background">
                                {item.badge > 9 ? "9+" : item.badge}
                            </span>
                        )}
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                </Button>
            </Link>
        );
    };

    return (
        <>
            {moreOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreOpen(false)}
                />
            )}

            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] hidden md:flex items-end gap-3 px-4 py-3 card-chunky bg-background">
                {primaryNavItems.map((item, index) =>
                    renderDockIcon(item, index),
                )}

                {/* More */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        onClick={() => setMoreOpen((v) => !v)}
                        aria-label="More"
                        className={cn(
                            "chip-chunky w-12 h-12 p-0 flex items-center justify-center rounded-2xl hover:cursor-pointer",
                            moreOpen
                                ? "chip-chunky-active text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>

                    {moreOpen && (
                        <div className="absolute bottom-[calc(100%+0.5rem)] right-0 w-56 max-h-[70vh] overflow-y-auto p-2 space-y-0.5 card-chunky bg-background">
                            {moreNavItems.map(renderMoreRow)}
                        </div>
                    )}
                </div>

                {/* Theme toggle */}
                <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="chip-chunky w-12 h-12 p-0 flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:cursor-pointer"
                >
                    {theme === "dark" ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </Button>

                {/* Theme changer (palette / premium themes) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            aria-label="Change theme"
                            className="chip-chunky w-12 h-12 p-0 flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:cursor-pointer"
                        >
                            <Palette className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="top"
                        align="end"
                        sideOffset={8}
                        className="w-52 max-h-80 overflow-y-auto"
                    >
                        <DropdownMenuLabel>Theme</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => setTheme("light")}
                            className="gap-3 cursor-pointer"
                        >
                            <span className="w-3 h-3 rounded-full bg-[#ffffff] border border-border shrink-0" />
                            Light
                            {theme === "light" && (
                                <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setTheme("dark")}
                            className="gap-3 cursor-pointer"
                        >
                            <span className="w-3 h-3 rounded-full bg-[#0a0a0a] border border-border shrink-0" />
                            Dark
                            {theme === "dark" && (
                                <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                            )}
                        </DropdownMenuItem>
                        {user?.isPro ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Premium</DropdownMenuLabel>
                                {PREMIUM_THEMES.map((preset) => (
                                    <DropdownMenuItem
                                        key={preset.id}
                                        onClick={() => setTheme(preset.id)}
                                        className="gap-3 cursor-pointer"
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: preset.colors.primary }}
                                        />
                                        {preset.name}
                                        {theme === preset.id && (
                                            <Check className="w-3.5 h-3.5 ml-auto text-primary" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </>
                        ) : (
                            <DropdownMenuItem
                                onClick={() => setShowUpgradeModal(true)}
                                className="gap-3 cursor-pointer"
                            >
                                <Palette className="w-3.5 h-3.5 shrink-0" />
                                Customize (Pro)
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>

            {/* Upgrade Modal (non-Pro theme customization) */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Unlock Custom Themes</DialogTitle>
                        <DialogDescription>
                            Upgrade to Pro to personalize your experience with
                            premium theme presets.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            size="lg"
                            onClick={() => {
                                setShowUpgradeModal(false);
                                router.push("/billing");
                            }}
                        >
                            Upgrade to Pro
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                window.open(
                                    "https://wa.me/+918826343179?text=Hello%20I%20need%20a%20promo%20code%20For%20campusZen.",
                                    "_blank",
                                );
                            }}
                        >
                            Get Promo Code
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
