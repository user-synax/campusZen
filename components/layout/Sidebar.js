"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Home,
    GraduationCap,
    Bell,
    LogOut,
    Bookmark,
    Search,
    Calendar,
    MessageSquare,
    BarChart2,
    Settings,
    Shield,
    Terminal,
    Type,
    Palette as PaletteIcon,
    BookOpen,
    History,
    Heart,
    Trophy,
    Code,
    CreditCard,
    Sun,
    Moon,
    Crown,
    Zap,
    Palette,
    Lock,
    Star,
    Rocket,
    ShieldCheck,
    Video,
    ChevronDown,
    ChevronRight,
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
import config from "@/lib/config";
import { useCat } from "@/context/CatContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TrophyIcon } from "lucide-react";
import { Sparkle } from "lucide-react";
import { SparkleIcon } from "lucide-react";
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

// ─── Collapsible section wrapper ─────────────────────────────────────────────
function CollapsibleSection({ label, storageKey, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);

    // Read from localStorage on mount (client-side only)
    useEffect(() => {
        setOpen(readLocalBool(storageKey, defaultOpen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        writeLocalBool(storageKey, next);
    };

    return (
        <div className="mt-2">
            {/* Section header */}
            <button
                onClick={toggle}
                className="flex items-center justify-between w-full px-3 py-1 group"
                aria-expanded={open}
            >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 select-none group-hover:text-muted-foreground/60 transition-colors duration-150">
                    {label}
                </span>
                {open ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors duration-150 shrink-0" />
                ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors duration-150 shrink-0" />
                )}
            </button>
            {open && <div className="space-y-0.5">{children}</div>}
        </div>
    );
}

// ─── Collapsed icon-only section indicator ───────────────────────────────────
function CollapsibleSectionIconOnly({ storageKey, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);

    useEffect(() => {
        setOpen(readLocalBool(storageKey, defaultOpen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const { cursorEnabled, handleToggleClick } = useCat();
    const { theme, toggleTheme } = useTheme();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        if (user && isAdmin(user)) {
            fetch("/api/admin/resources?status=pending")
                .then((res) => res.json())
                .then((data) => setPendingResources(data.total || 0))
                .catch(() => {});
        }
    }, [user]);

    // ── Primary nav items (always visible) ──────────────────────────────────
    const primaryNavItems = [
        { label: "Feed", href: "/feed", icon: Home },
        { label: "Communities", href: "/community", icon: GraduationCap },
        {
            label: "Chats",
            href: "/chats",
            icon: MessageSquare,
            badge: chatUnread,
        },
        {
            label: "Notifications",
            href: "/notifications",
            icon: Bell,
            badge: unreadCount,
        },
        { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    ];

    // ── Gamification items (collapsible) ────────────────────────────────────
    const gamificationItems = [
        { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
        { label: "Ranks", href: "/ranks", icon: CircleStar },
    ];

    // ── More items (collapsible) ─────────────────────────────────────────────
    const moreItems = [
        { label: "Clips", href: "/clips", icon: Video },
        { label: "Resources", href: "/resources", icon: BookOpen },
        { label: "Events", href: "/events", icon: Calendar },
        { label: "Tools", href: "/tools", icon: Terminal },
    ];

    // ── Secondary bottom items ───────────────────────────────────────────────
    const bottomNavItems = [
        { label: "Billing", href: "/billing", icon: CreditCard },
        {
            label: "Customize",
            href: "/customize",
            icon: PaletteIcon,
            isCustomize: true,
        },
        { label: "Settings", href: "/settings", icon: Settings },
    ];

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const handleCustomizeClick = (e) => {
        if (!user?.isPro) {
            e.preventDefault();
            setShowUpgradeModal(true);
        }
    };

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

    // ── Shared nav item renderer ─────────────────────────────────────────────
    const renderNavItem = (item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
            <div key={item.href}>
                {/* Nav item */}
                <div className="relative">
                    {/* Left active indicator */}
                    {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-primary rounded-r-full z-10" />
                    )}
                    <Link
                        href={item.href}
                        onClick={
                            item.isCustomize
                                ? handleCustomizeClick
                                : undefined
                        }
                    >
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start hover:cursor-pointer gap-3 h-10 px-3 rounded-lg transition-all duration-150 font-medium",
                                isActive
                                    ? "bg-accent text-foreground font-semibold hover:bg-accent"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                                item.className,
                            )}
                        >
                            <div className="relative shrink-0">
                                <Icon
                                    className={cn(
                                        "w-[18px] h-[18px] transition-colors",
                                        isActive
                                            ? "text-primary"
                                            : "",
                                    )}
                                />
                                {item.isCustomize &&
                                    !user?.isPro && (
                                        <Lock className="w-[10px] h-[10px] absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                                    )}
                                {item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-primary text-[9px] text-primary-foreground font-bold flex items-center justify-center rounded-full px-0.5 border-2 border-background">
                                        {item.badge > 9
                                            ? "9+"
                                            : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="hidden lg:block text-sm">
                                {item.label}
                            </span>
                        </Button>
                    </Link>
                </div>

                {/* Resources sub-links */}
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
                                <Link
                                    key={sub.href}
                                    href={sub.href}
                                >
                                    <button
                                        className={cn(
                                            "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                            pathname ===
                                                sub.href
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

                {/* Tools sub-links */}
                {item.href === "/tools" &&
                    pathname.startsWith("/tools") && (
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
                                <Link
                                    key={sub.href}
                                    href={sub.href}
                                >
                                    <button
                                        className={cn(
                                            "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                                            pathname ===
                                                sub.href
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
                {/* Logo */}
                <div className="flex h-[60px] shrink-0 items-center px-3 lg:px-5 border-b border-border/40">
                    <Logo className="lg:hidden" showText={false} />
                    <Logo className="hidden lg:flex" />
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5">
                    {/* ── Primary nav ─────────────────────────────────── */}
                    {primaryNavItems.map(renderNavItem)}

                    {/* ── Gamification collapsible (lg: shows label) ── */}
                    <div className="hidden lg:block">
                        <CollapsibleSection
                            label="Gamification"
                            storageKey="cx_sidebar_gamification_open"
                            defaultOpen={false}
                        >
                            {gamificationItems.map(renderNavItem)}
                        </CollapsibleSection>
                    </div>
                    {/* Icon-only mode (collapsed sidebar on md) */}
                    <div className="lg:hidden mt-2">
                        <CollapsibleSectionIconOnly
                            storageKey="cx_sidebar_gamification_open"
                            defaultOpen={false}
                        >
                            {gamificationItems.map(renderNavItem)}
                        </CollapsibleSectionIconOnly>
                    </div>

                    {/* ── More collapsible ─────────────────────────── */}
                    <div className="hidden lg:block">
                        <CollapsibleSection
                            label="More"
                            storageKey="cx_sidebar_more_open"
                            defaultOpen={false}
                        >
                            {moreItems.map(renderNavItem)}
                        </CollapsibleSection>
                    </div>
                    {/* Icon-only mode */}
                    <div className="lg:hidden mt-2">
                        <CollapsibleSectionIconOnly
                            storageKey="cx_sidebar_more_open"
                            defaultOpen={false}
                        >
                            {moreItems.map(renderNavItem)}
                        </CollapsibleSectionIconOnly>
                    </div>

                    {/* ── Bottom secondary items ────────────────────── */}
                    <div className="mt-2 pt-2 border-t border-border/40">
                        {bottomNavItems.map(renderNavItem)}
                    </div>

                    {/* Admin section */}
                    {user && isAdmin(user) && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                            <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-3 mb-1.5 select-none">
                                Admin
                            </p>

                            {[
                                {
                                    href: "/admin",
                                    icon: Shield,
                                    label: "Dashboard",
                                    color: "text-amber-500",
                                },
                                {
                                    href: "/admin/resources",
                                    icon: BookOpen,
                                    label: "Review",
                                    badge: pendingResources,
                                },
                                {
                                    href: "/analytics",
                                    icon: BarChart2,
                                    label: "Analytics",
                                },
                            ].map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <div key={item.href} className="relative">
                                        {isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-primary rounded-r-full z-10" />
                                        )}
                                        <Link href={item.href}>
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start gap-3 h-10 px-3 rounded-lg transition-all duration-150 group",
                                                    isActive
                                                        ? "bg-accent text-foreground font-semibold hover:bg-accent"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                                                    item.color,
                                                )}
                                            >
                                                <div className="relative shrink-0">
                                                    <Icon
                                                        className={cn(
                                                            "w-[18px] h-[18px] transition-colors",
                                                            item.color,
                                                        )}
                                                    />
                                                    {item.badge > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-[9px] text-white font-bold flex items-center justify-center rounded-full px-0.5 border-2 border-background">
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
                            <div className="hidden lg:block px-3 py-2.5 rounded-lg bg-accent/40 space-y-2">
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
                                        "flex items-center gap-2.5 p-2 rounded-xl transition-all duration-150 group cursor-pointer",
                                        isFounder(user.username)
                                            ? "bg-primary/5 border border-primary/10 hover:bg-primary/10"
                                            : "hover:bg-accent/70",
                                    )}
                                >
                                    <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border/60">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="text-xs font-bold bg-accent">
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
                                                isFounder(user.username)
                                                    ? "text-primary/70 font-medium"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            {isFounder(user.username)
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
                                className="flex-1 justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-150 rounded-lg"
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
                        <div className="flex items-center gap-1">
                            <div className="shrink-0 w-9" />
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="flex-1 justify-start gap-3 h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150 rounded-lg"
                            >
                                <LogOut className="w-4 h-4 shrink-0" />
                                <span className="hidden lg:block text-xs font-semibold">
                                    Log out
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Upgrade Modal */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
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
                                // Placeholder for promo code link
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
