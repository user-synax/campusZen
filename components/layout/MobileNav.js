"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    GraduationCap,
    User,
    Bell,
    Bookmark,
    LogOut,
    Menu,
    Search,
    Calendar,
    Settings,
    MessageSquare,
    Shield,
    BookOpen,
    BarChart2,
    Terminal,
    Type,
    History,
    Heart,
    Palette,
    Crown,
    Zap,
    Lock,
    Star,
    Rocket,
    ShieldCheck,
    Video,
    CreditCard,
    Wallet,
    ShoppingBag,
    Link2,
    Check,
    ChevronDown,
    ChevronRight,
    BookText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useUser from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatUnreadCount } from "@/context/ChatUnreadContext";
import AnimatedCount from "@/components/ui/AnimatedCount";
import { useTheme, PREMIUM_THEMES } from "@/context/ThemeContext";
import CreatePostDialog from "@/components/post/CreatePostDialog";
import Logo from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/admin";

export default function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useUser();
    const { unreadCount } = useNotifications();
    const chatUnread = useChatUnreadCount();
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

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

    const navItems = [
        { href: "/feed", icon: Home, label: "Home" },
        { href: "/clips", icon: Video, label: "Clips" },
        {
            href: "/chats",
            icon: MessageSquare,
            label: "Chats",
            badge: chatUnread,
        },
        {
            href: "/notifications",
            icon: Bell,
            label: "Notifications",
            badge: unreadCount,
        },
    ];

    return (
        <>
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 z-50">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    if (item.isAction) {
                        return (
                            <CreatePostDialog
                                key={item.label}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-10 h-10 text-primary"
                                    >
                                        <Icon className="w-6 h-6" />
                                    </Button>
                                }
                            />
                        );
                    }

                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`w-10 h-10 relative ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            >
                                <Icon className="w-6 h-6" />
                                {item.badge > 0 && (
                                    <span className="t-badge" data-open="true">
                                        <span className="t-badge-dot bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-background">
                                            <AnimatedCount value={item.badge} max={99} />
                                        </span>
                                    </span>
                                )}
                            </Button>
                        </Link>
                    );
                })}

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 text-muted-foreground"
                        >
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="w-70 p-0 flex flex-col"
                    >
                        <SheetHeader className="p-6 border-b text-left">
                            <SheetTitle>
                                <Logo size="sm" />
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex flex-col flex-1 overflow-y-auto">
                            <div className="p-4 border-b">
                                {!loading && user && (
                                    <Link
                                        href={`/profile/${user?.username}`}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 hover:bg-accent/50 p-2 rounded-lg transition-colors"
                                    >
                                        <Avatar className="w-10 h-10 border border-border">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="bg-secondary">
                                                {user.name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </Link>
                                )}
                                {/* XP Progress Bar */}
                                {!loading && user && (
                                    <div className="px-2 pt-4 pb-2 space-y-1.5 border-t mt-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Level {user.level || 1}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                {(user.xp || 0) % 1000} / 1000
                                                XP
                                            </span>
                                        </div>
                                        <Progress
                                            value={((user.xp || 0) % 1000) / 10}
                                            className="h-1.5"
                                        />
                                    </div>
                                )}
                            </div>

                            <nav className="p-2 space-y-1">
                                <Link
                                    href="/resources"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname.startsWith("/resources")
                                                ? "bg-accent text-accent-foreground font-bold"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <BookOpen className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Resources
                                        </span>
                                    </Button>
                                </Link>

                                {/* Resources Sub-links */}
                                {pathname.startsWith("/resources") && (
                                    <div className="flex flex-col gap-0.5 pl-12 pr-3 py-1">
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
                                                onClick={() => setOpen(false)}
                                            >
                                                <button
                                                    className={cn(
                                                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                                                        pathname === sub.href
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-muted-foreground/60 hover:text-foreground",
                                                    )}
                                                >
                                                    <sub.icon className="w-3 h-3" />
                                                    {sub.label}
                                                </button>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                <Link
                                    href="/search"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/search"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Search className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Search
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/bookmarks"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/bookmarks"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Bookmark className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Bookmarks
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/connect"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/connect"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Link2 className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Connect
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/community"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/community"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <GraduationCap className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Communities
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/leaderboard"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/leaderboard"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <BarChart2 className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Leaderboard
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/events"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/events"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Calendar className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Events
                                        </span>
                                    </Button>
                                </Link>

                                <Link
                                    href="/wallet"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/wallet"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Wallet className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Wallet
                                        </span>
                                    </Button>
                                </Link>

                                <Link
                                    href="/shop"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/shop"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <ShoppingBag className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Shop
                                        </span>
                                    </Button>
                                </Link>

                                <Link
                                    href="/tools"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname.startsWith("/tools")
                                                ? "bg-accent text-accent-foreground font-bold"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Terminal className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Tools
                                        </span>
                                    </Button>
                                </Link>

                                {/* Tools Sub-links */}
                                {pathname.startsWith("/tools") && (
                                    <div className="flex flex-col gap-0.5 pl-12 pr-3 py-1">
                                        {[
                                            {
                                                label: "Popular Tools",
                                                href: "/tools",
                                                icon: Terminal,
                                            },
                                            {
                                                label: "Text Tools",
                                                href: "/tools/text",
                                                icon: Type,
                                            },
                                            {
                                                label: "Color Tools",
                                                href: "/tools/color",
                                                icon: Palette,
                                            },
                                            {
                                                label: "SEO Tools",
                                                href: "/tools/seo",
                                                icon: Search,
                                            },
                                        ].map((sub) => (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                onClick={() => setOpen(false)}
                                            >
                                                <button
                                                    className={cn(
                                                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                                                        pathname === sub.href
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-muted-foreground/60 hover:text-foreground",
                                                    )}
                                                >
                                                    <sub.icon className="w-3 h-3" />
                                                    {sub.label}
                                                </button>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                <Link
                                    href="/billing"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname.startsWith("/billing")
                                                ? "bg-accent text-accent-foreground font-bold"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Billing
                                        </span>
                                    </Button>
                                </Link>

                                {/* Theme Picker */}
                                {user?.isPro ? (
                                    <>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setThemeOpen(!themeOpen)}
                                            className={cn(
                                                "w-full justify-start gap-4 h-12 px-3",
                                                themeOpen ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                                            )}
                                        >
                                            <Palette className="w-5 h-5" />
                                            <span className="text-base font-medium flex-1 text-left">
                                                Customize
                                            </span>
                                            {themeOpen ? (
                                                <ChevronDown className="w-4 h-4 shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 shrink-0" />
                                            )}
                                        </Button>
                                        {themeOpen && (
                                            <div className="pl-12 pr-3 py-2 space-y-1">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 mb-1">Standard</p>
                                                <button
                                                    onClick={() => { setTheme("light"); setThemeOpen(false); setOpen(false); }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-accent"
                                                >
                                                    <span className="w-4 h-4 rounded-full bg-[#ffffff] border border-border shrink-0" />
                                                    Light
                                                    {theme === "light" && <Check className="w-4 h-4 ml-auto text-primary" />}
                                                </button>
                                                <button
                                                    onClick={() => { setTheme("dark"); setThemeOpen(false); setOpen(false); }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-accent"
                                                >
                                                    <span className="w-4 h-4 rounded-full bg-[#0a0a0a] border border-border shrink-0" />
                                                    Dark
                                                    {theme === "dark" && <Check className="w-4 h-4 ml-auto text-primary" />}
                                                </button>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 mt-2 mb-1">Premium</p>
                                                {PREMIUM_THEMES.map((preset) => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => { setTheme(preset.id); setThemeOpen(false); setOpen(false); }}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-accent"
                                                    >
                                                        <span
                                                            className="w-4 h-4 rounded-full shrink-0"
                                                            style={{ backgroundColor: preset.colors.primary }}
                                                        />
                                                        {preset.name}
                                                        {theme === preset.id && <Check className="w-4 h-4 ml-auto text-primary" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setOpen(false);
                                            setShowUpgradeModal(true);
                                        }}
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3 text-muted-foreground",
                                        )}
                                    >
                                        <div className="relative">
                                            <Palette className="w-5 h-5" />
                                            <Lock className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                                        </div>
                                        <span className="text-base font-medium">
                                            Customize
                                        </span>
                                    </Button>
                                )}

                                {user && isAdmin(user) && (
                                    <>
                                        <Link
                                            href="/admin"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start gap-4 h-12 px-3 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10",
                                                    pathname === "/admin"
                                                        ? "bg-emerald-500/10 font-bold"
                                                        : "",
                                                )}
                                            >
                                                <Shield className="w-5 h-5" />
                                                <span className="text-base font-medium">
                                                    Admin Dashboard
                                                </span>
                                            </Button>
                                        </Link>
                                        <Link
                                            href="/admin/resources"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start gap-4 h-12 px-3 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10",
                                                    pathname ===
                                                        "/admin/resources"
                                                        ? "bg-amber-500/10 font-bold"
                                                        : "",
                                                )}
                                            >
                                                <Shield className="w-5 h-5" />
                                                <span className="text-base font-medium">
                                                    Review Queue
                                                </span>
                                            </Button>
                                        </Link>
                                        <Link
                                            href="/analytics"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Button
                                                variant="ghost"
                                                className={cn(
                                                    "w-full justify-start gap-4 h-12 px-3 text-violet-500 hover:text-violet-600 hover:bg-violet-500/10",
                                                    pathname === "/analytics"
                                                        ? "bg-violet-500/10 font-bold"
                                                        : "",
                                                )}
                                            >
                                                <BarChart2 className="w-5 h-5" />
                                                <span className="text-base font-medium">
                                                    Analytics
                                                </span>
                                            </Button>
                                        </Link>
                                    </>
                                )}

                                <Link
                                    href={`/profile/${user?.username}`}
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname ===
                                                `/profile/${user?.username}`
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <User className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Profile
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/settings"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/settings"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <Settings className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Settings
                                        </span>
                                    </Button>
                                </Link>
                                <Link
                                    href="/docs"
                                    onClick={() => setOpen(false)}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-4 h-12 px-3",
                                            pathname === "/docs"
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        <BookText className="w-5 h-5" />
                                        <span className="text-base font-medium">
                                            Docs
                                        </span>
                                    </Button>
                                </Link>
                            </nav>
                        </div>

                        <div className="p-4 border-t mt-auto space-y-2">
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="w-full justify-start gap-4 h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-base font-medium">
                                    Log out
                                </span>
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </nav>

            {/* Upgrade Modal */}
            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-[500px] max-h-[70vh] flex flex-col p-0">
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
                        <div className="grid grid-cols-1 gap-3">
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
