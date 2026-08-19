"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Home,
    GraduationCap,
    Bell,
    Bookmark,
    Search,
    Calendar,
    MessageSquare,
    BarChart2,
    Settings,
    Shield,
    Terminal,
    Type,
    Palette,
    BookOpen,
    History,
    Heart,
    Trophy,
    CreditCard,
    Sun,
    Moon,
    Crown,
    Zap,
    Lock,
    Star,
    Rocket,
    ShieldCheck,
    Video,
    ShoppingBag,
    ChevronDown,
    ChevronRight,
    Coins,
    Link2,
    Wallet,
    Check,
    BookText
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/shared/Logo";
import useUser from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBell from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import { isFounder } from "@/lib/founder";
import { isAdmin } from "@/lib/admin";
import { useCat } from "@/context/CatContext";
import clientCache from "@/lib/client-cache";
import {
    primaryNavItems as basePrimaryNavItems,
    gamificationItems,
    moreItems,
    bottomNavItems,
    adminItems as baseAdminItems,
} from "./navItems";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PREMIUM_THEMES } from "@/context/ThemeContext";
import { getLevelProgress } from "@/lib/ranks";
import { CircleStar } from "lucide-react";

// ─── localStorage helpers ─────────────────────────────────────────────────────
function readLocalBool(key, defaultValue) {
    if (typeof window === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === "true";
}

function writeLocalBool(key, value) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, String(value));
}

function CollapsibleSection({
    label,
    storageKey,
    defaultOpen = false,
    children,
}) {
    const [open, setOpen] = useState(defaultOpen);

    useEffect(() => {
        setOpen(readLocalBool(storageKey, defaultOpen));
    }, []);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        writeLocalBool(storageKey, next);
    };

    return (
        <div className="mt-2">
            <button
                onClick={toggle}
                className="hover:cursor-pointer flex items-center gap-2 w-full px-3 py-2 rounded-lg group transition-all duration-200 hover:bg-accent/60 border border-transparent hover:border-border/40"
                aria-expanded={open}
            >
                <span className={`text-[11px] font-semibold uppercase tracking-wider select-none transition-colors duration-150 flex-1 text-left ${open ? 'text-foreground' : 'text-muted-foreground/80 group-hover:text-foreground'}`}>
                    {label}
                </span>
                <div className={`p-0.5 rounded transition-all duration-200 ${open ? 'bg-primary/10' : 'bg-transparent group-hover:bg-accent'}`}>
                    {open ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground/70 group-hover:text-foreground transition-colors duration-150 shrink-0" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/70 group-hover:text-foreground transition-colors duration-150 shrink-0" />
                    )}
                </div>
            </button>
            {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
        </div>
    );
}

function CollapsibleSectionIconOnly({
    storageKey,
    defaultOpen = false,
    children,
}) {
    const [open, setOpen] = useState(defaultOpen);

    useEffect(() => {
        setOpen(readLocalBool(storageKey, defaultOpen));
    }, []);

    return open ? <div className="space-y-0.5">{children}</div> : null;
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useUser();
    const { unreadCount } = useNotifications();
    const chatUnread = useChatUnreadCount();
    const [pendingResources, setPendingResources] = useState(0);
    const { theme, setTheme, toggleTheme } = useTheme();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Compute admin/founder status once per render instead of calling repeatedly
    const isAdminUser = user ? isAdmin(user) : false;
    const isFounderUser = user ? isFounder(user.username) : false;

    useEffect(() => {
        if (user && isAdminUser) {
            const CACHE_KEY = "cx_admin_pending_resources";
            const CACHE_TTL = 60 * 1000; // 60 seconds

            const cached = clientCache.get(CACHE_KEY);
            if (cached !== null) {
                setPendingResources(cached);
                return;
            }

            fetch("/api/admin/resources?status=pending")
                .then((res) => res.json())
                .then((data) => {
                    const count = data.total || 0;
                    setPendingResources(count);
                    clientCache.set(CACHE_KEY, count, CACHE_TTL);
                })
                .catch(() => {});
        }
    }, [user]);

    const primaryNavItems = basePrimaryNavItems.map((item) =>
        item.href === "/chats"
            ? { ...item, badge: chatUnread }
            : item.href === "/notifications"
              ? { ...item, badge: unreadCount }
              : item,
    );

    const adminNavItems = isAdminUser
        ? baseAdminItems.map((item) =>
              item.href === "/admin/resources"
                  ? { ...item, badge: pendingResources }
                  : item,
          )
        : [];

    const progress = user
        ? getLevelProgress(user.xp || 0, user.level || 1)
        : null;

    const proFeatures = [
        {
            icon: Palette,
            title: "Custom Themes",
            description:
                "Create and apply custom color schemes, import/export themes, and use premium presets like Nebula, Sunset, and more",
        },
        {
            icon: Zap,
            title: "Animated Profile Headers",
            description:
                "Beautiful animated gradient profile banners that match your theme",
        },
        {
            icon: Crown,
            title: "Exclusive Avatar Frames",
            description: "Theme-specific animated avatar borders",
        },
        {
            icon: ShieldCheck,
            title: "Ad-Free Experience",
            description:
                "No ads anywhere on any screen for a clean distraction-free experience",
        },
        {
            icon: Star,
            title: "Priority Support",
            description:
                "Get fast responses from our support team within 24 hours",
        },
        {
            icon: Rocket,
            title: "Early Access",
            description:
                "Be the first to try new features before they're released to everyone else",
        },
        {
            icon: BarChart2,
            title: "Advanced Analytics",
            description:
                "Detailed insights about your activity, engagement, and growth",
        },
        {
            icon: Lock,
            title: "Expanded Storage",
            description:
                "More storage for your resource uploads and media files",
        },
    ];

    const renderNavItem = (item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
            <div key={item.href}>
                <div className="relative">
                    {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4.5 bg-primary rounded-r-full z-10" />
                    )}
                    <Link
                        href={item.href}
                    >
                        <Button
                            variant="ghost"
                            className={cn(
                                "chip-chunky w-full justify-start hover:cursor-pointer gap-3 h-10 px-3 font-medium",
                                isActive
                                    ? "chip-chunky-active text-foreground font-semibold hover:bg-accent"
                                    : "text-muted-foreground hover:text-foreground",
                                item.className,
                            )}
                        >
                            <div className="relative shrink-0">
                                <Icon
                                    className={cn(
                                        "w-4.5 h-4.5 transition-colors",
                                        isActive ? "text-primary" : "",
                                    )}
                                />
                                {item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-3.75 h-3.75 bg-primary text-[9px] text-primary-foreground font-bold flex items-center justify-center rounded-full px-0.5 border-2 border-background">
                                        {item.badge > 9 ? "9+" : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="hidden lg:block text-sm">
                                {item.label}
                            </span>
                        </Button>
                    </Link>
                </div>

                {item.href === "/resources" &&
                    pathname.startsWith("/resources") && (
                        <div className="hidden lg:flex flex-col gap-0.5 mt-0.5 ml-9 mr-1">
                            {[
                                {
                                    label: "My Uploads",
                                    href: "/resources/my-uploads",
                                    icon: History,
                                },
                                {
                                    label: "Saved",
                                    href: "/resources/saved",
                                    icon: Heart,
                                },
                            ].map((sub) => (
                                <Link key={sub.href} href={sub.href}>
                                    <button
                                        className={cn(
                                            "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                            pathname === sub.href
                                                ? "bg-primary/8 text-primary"
                                                : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/50",
                                        )}
                                    >
                                        <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                        {sub.label}
                                    </button>
                                </Link>
                            ))}
                        </div>
                    )}

                {item.href === "/tools" && pathname.startsWith("/tools") && (
                    <div className="hidden lg:flex flex-col gap-0.5 mt-0.5 ml-9 mr-1">
                        {[
                            {
                                label: "Popular",
                                href: "/tools",
                                icon: Terminal,
                            },
                            {
                                label: "Text tools",
                                href: "/tools/text",
                                icon: Type,
                            },
                            {
                                label: "Color tools",
                                href: "/tools/color",
                                icon: Palette,
                            },
                            {
                                label: "SEO tools",
                                href: "/tools/seo",
                                icon: Search,
                            },
                        ].map((sub) => (
                            <Link key={sub.href} href={sub.href}>
                                <button
                                    className={cn(
                                        "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                        pathname === sub.href
                                            ? "bg-primary/8 text-primary"
                                            : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/50",
                                    )}
                                >
                                    <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                    {sub.label}
                                </button>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <aside className="fixed left-0 top-0 h-screen w-18 lg:w-70 border-r border-border/60 bg-background z-50 hidden md:flex flex-col">
                <div className="flex h-15 shrink-0 items-center px-3 lg:px-5 border-b border-border/40">
                    <Logo className="lg:hidden" showText={false} />
                    <Logo className="hidden lg:flex" />
                </div>

                <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5">
                    {primaryNavItems.map(renderNavItem)}

                    <div className="hidden lg:block">
                        <CollapsibleSection
                            label="Gamification"
                            storageKey="cx_sidebar_gamification_open"
                            defaultOpen={false}
                        >
                            {gamificationItems.map(renderNavItem)}
                        </CollapsibleSection>
                    </div>
                    <div className="lg:hidden mt-2">
                        <CollapsibleSectionIconOnly
                            storageKey="cx_sidebar_gamification_open"
                            defaultOpen={false}
                        >
                            {gamificationItems.map(renderNavItem)}
                        </CollapsibleSectionIconOnly>
                    </div>

                    <div className="hidden lg:block">
                        <CollapsibleSection
                            label="More"
                            storageKey="cx_sidebar_more_open"
                            defaultOpen={false}
                        >
                            {moreItems.map(renderNavItem)}
                        </CollapsibleSection>
                    </div>

                    <div className="lg:hidden mt-2">
                        <CollapsibleSectionIconOnly
                            storageKey="cx_sidebar_more_open"
                            defaultOpen={false}
                        >
                            {moreItems.map(renderNavItem)}
                        </CollapsibleSectionIconOnly>
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/40">
                        {bottomNavItems.map(renderNavItem)}
                    </div>

                    {user && isAdminUser && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                            <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-3 mb-1.5 select-none">
                                Admin
                            </p>

                            {adminNavItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <div key={item.href} className="relative">
                                        {isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4.5bg-primary rounded-r-full z-10" />
                                        )}
                                        <Link href={item.href}>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "chip-chunky w-full justify-start gap-3 h-10 px-3 group",
                                                    isActive
                                                        ? "chip-chunky-active text-foreground font-semibold hover:bg-accent"
                                                        : "text-muted-foreground hover:text-foreground",
                                                    item.color,
                                                )}
                                            >
                                                <div className="relative shrink-0">
                                                    <Icon
                                                        className={cn(
                                                            "w-4.5 h-4.5 transition-colors",
                                                            item.color,
                                                        )}
                                                    />
                                                    {item.badge > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-3.75 h-3.75 bg-red-500 text-[9px] text-white font-bold flex items-center justify-center rounded-full px-0.5 border-2 border-background">
                                                            {item.badge > 9
                                                                ? "9+"
                                                                : item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="hidden lg:block text-sm font-medium">
                                                    {item.label}
                                                </span>
                                            </Button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </nav>

                {/* Bottom: XP + profile + actions */}
                <div className="shrink-0 border-t border-border/40 p-2 space-y-1.5">
                    {!loading && user && user.username && (
                        <>
                            {/* XP progress card */}
                            <div className="card-chunky hidden lg:block px-3 py-2.5 bg-accent/40 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
                                        Level {user.level || 1}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                        {progress?.xpInCurrentLevel || 0} /{" "}
                                        {progress?.xpNeededForNext || 0} XP
                                    </span>
                                </div>
                                <Progress
                                    value={progress?.progressPercentage || 0}
                                    className="h-1"
                                />
                            </div>

                            {/* User profile card */}
                            <Link href={`/profile/${user.username}`}>
                                <div
                                    className={cn(
                                        "card-chunky card-chunky-interactive flex items-center gap-2.5 p-2 group",
                                        isFounderUser
                                            ? "bg-primary/5 border-primary/20"
                                            : "hover:bg-accent/70",
                                    )}
                                >
                                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-border/60">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="text-sm font-bold bg-accent">
                                            {user.name
                                                ?.charAt(0)
                                                ?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden lg:flex flex-col flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                            {user.name}
                                        </p>
                                        <p
                                            className={cn(
                                                "text-[11px] truncate leading-tight",
                                                isFounderUser
                                                    ? "text-primary/70 font-medium"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            {isFounderUser
                                                ? "✦ Founder"
                                                : `@${user.username}`}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                            <div className="shrink-0">
                                <NotificationBell currentUser={user} />
                            </div>
                            <Button
                                variant="ghost"
                                onClick={toggleTheme}
                                className="chip-chunky flex-1 justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-foreground"
                            >
                                {theme === "dark" ? (
                                    <Sun className="w-4 h-4 shrink-0" />
                                ) : (
                                    <Moon className="w-4 h-4 shrink-0" />
                                )}
                                <span className="hidden lg:block text-xs font-semibold">
                                    {theme === "dark"
                                        ? "Light mode"
                                        : "Dark mode"}
                                </span>
                            </Button>
                        </div>
                        {user && (
                            <div className="flex items-center gap-2 w-full px-2 py-1.5">
                                <img src="/icon/vp-coin.png" alt="VP" className="w-5 h-5 shrink-0" />
                                <span className="hidden lg:block text-sm font-semibold text-foreground">
                                    {(user.vp || 0).toLocaleString()} VP
                                </span>
                            </div>
                        )}

                        {/* Theme Picker */}
                        {user?.isPro ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="chip-chunky w-full justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-foreground hover:cursor-pointer"
                                    >
                                        <Palette className="w-4 h-4 shrink-0" />
                                        <span className="hidden lg:block text-xs font-semibold">
                                            Theme
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="right"
                                    align="start"
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={() => setShowUpgradeModal(true)}
                                className="chip-chunky w-full justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-foreground hover:cursor-pointer"
                            >
                                <div className="relative shrink-0">
                                    <Palette className="w-4 h-4" />
                                    <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                                </div>
                                <span className="hidden lg:block text-xs font-semibold">
                                    Customize
                                </span>
                            </Button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Upgrade Modal */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-125 max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-r from-primary to-accent flex items-center justify-center">
                                <Crown className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">
                                    Unlock Premium Features
                                </DialogTitle>
                                <DialogDescription>
                                    Upgrade to Pro to customize your experience
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {proFeatures.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <div
                                        key={index}
                                        className="flex gap-3 p-3 rounded-lg bg-accent/30 border border-border/50"
                                    >
                                        <Icon className="w-6 h-6 shrink-0 text-primary mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-sm">
                                                {feature.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                        <Button
                            size="lg"
                            onClick={() => {
                                setShowUpgradeModal(false);
                                router.push("/billing");
                            }}
                            className="w-full"
                        >
                            Upgrade to Pro
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full"
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
