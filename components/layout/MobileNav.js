"use client";

import { useState, useEffect } from "react";
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
    Settings,
    MessageSquare,
    Shield,
    BookOpen,
    BarChart2,
    History,
    Heart,
    Palette,
    Crown,
    Zap,
    Lock,
    Star,
    Rocket,
    ShieldCheck,
    Link2,
    Check,
    ChevronDown,
    ChevronRight,
    BookText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
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
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
        { href: "/search", icon: Search, label: "Explore" },
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
            <nav suppressHydrationWarning className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border supports-[backdrop-filter]:bg-background/80">
                <div className="mx-auto max-w-[500px] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center gap-1">
                    <div className="flex flex-1 items-center justify-between gap-1 bg-muted/40 rounded-full p-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = mounted && (pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href)));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-selected={isActive}
                                    className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 rounded-full hover:cursor-pointer transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] ${isActive ? "bg-background text-foreground shadow-sm border border-border/50 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                                >
                                    <span className="relative">
                                        <Icon className={`w-[22px] h-[22px] transition-transform duration-[var(--duration-fast)] ${isActive ? "scale-[1.02]" : "scale-100"}`} strokeWidth={isActive ? 2.2 : 1.8} />
                                        {item.badge > 0 && mounted && (
                                            <span className="t-badge" data-open="true">
                                                <span className="t-badge-dot bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-background">
                                                    <AnimatedCount value={item.badge} max={99} />
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            );
                        })}
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <button
                                    aria-label="Menu"
                                    className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 hover:cursor-pointer transition-all duration-[var(--duration-fast)]"
                                >
                                    <Menu className="w-[22px] h-[22px]" />
                                </button>
                            </SheetTrigger>
                            <SheetContent
                        side="right"
                        className="w-[68vw] max-w-[260px] p-0 flex flex-col bg-[#090909] border-l border-[#262626] overflow-hidden rounded-l-[20px]"
                    >
                        <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-4 pt-5 pb-4 border-b border-[#262626] bg-[#090909] text-left space-y-0">
                            <SheetTitle className="flex items-center">
                                <Logo size="sm" />
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                            <nav suppressHydrationWarning className="p-2.5 space-y-5">
                                <div className="space-y-1">
                                    <p className="px-3 py-1 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666]">Discover</p>
                                    {[
                                        { href: "/search", icon: Search, label: "Explore", iconColor: "text-sky-400", active: mounted && pathname === "/search" },
                                        { href: "/bookmarks", icon: Bookmark, label: "Bookmarks", iconColor: "text-amber-400", active: mounted && pathname === "/bookmarks" },
                                        { href: "/connect", icon: Link2, label: "Connect", iconColor: "text-emerald-400", active: mounted && pathname === "/connect" },
                                        { href: "/community", icon: GraduationCap, label: "Communities", iconColor: "text-violet-400", active: mounted && pathname === "/community" },
                                    ].map((item) => (
                                        <SheetClose key={item.href} asChild>
                                            <Link href={item.href} className="block">
                                                <span
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] font-medium transition-all duration-[var(--duration-fast)] hover:cursor-pointer border",
                                                        item.active
                                                            ? "bg-white text-black border-white font-semibold shadow-sm"
                                                            : "bg-transparent text-[#9ca3af] border-transparent hover:text-white hover:bg-[#141414] hover:border-[#262626]",
                                                    )}
                                                >
                                                    <item.icon className={cn("w-[18px] h-[18px] shrink-0", item.iconColor)} />
                                                    <span className="flex-1">{item.label}</span>
                                                    {item.active && <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" aria-hidden="true" />}
                                                </span>
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </div>

                                <div className="space-y-1.5">
                                    <p className="px-3 py-1 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666]">Personalize</p>
                                    {user?.isPro ? (
                                        <div className="t-acc" data-open={themeOpen}>
                                            <button
                                                onClick={() => setThemeOpen(!themeOpen)}
                                                className={cn(
                                                    "flex items-center justify-between w-full px-3 py-2.5 rounded-full text-[13px] font-medium border hover:cursor-pointer transition-all duration-[var(--duration-fast)]",
                                                    themeOpen
                                                        ? "bg-white text-black border-white font-semibold shadow-sm"
                                                        : "bg-transparent text-[#9ca3af] border-transparent hover:text-white hover:bg-[#141414] hover:border-[#262626]"
                                                )}
                                            >
                                                <span className="flex items-center gap-2.5"><Palette className={cn("w-[18px] h-[18px] shrink-0", themeOpen ? "text-fuchsia-600" : "text-fuchsia-400")} /> Customize</span>
                                                <span className="t-acc-chevron inline-flex"><ChevronDown className="w-3.5 h-3.5" /></span>
                                            </button>
                                            <div className="t-acc-panel">
                                                <div className="t-acc-panel-inner">
                                                    <div className="pl-2 pr-1 py-2 space-y-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#666] px-2 mb-1">Standard</p>
                                                        <button onClick={() => { setTheme("light"); setThemeOpen(false); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-full text-[13px] font-medium hover:bg-[#141414] border border-transparent hover:border-[#262626] hover:cursor-pointer transition-colors text-white">
                                                            <span className="w-3.5 h-3.5 rounded-full bg-white border border-[#262626] shrink-0" /> Light {theme === "light" && <Check className="w-3.5 h-3.5 ml-auto" />}
                                                        </button>
                                                        <button onClick={() => { setTheme("dark"); setThemeOpen(false); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-full text-[13px] font-medium hover:bg-[#141414] border border-transparent hover:border-[#262626] hover:cursor-pointer transition-colors text-white">
                                                            <span className="w-3.5 h-3.5 rounded-full bg-[#090909] border border-[#262626] shrink-0" /> Dark {theme === "dark" && <Check className="w-3.5 h-3.5 ml-auto" />}
                                                        </button>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#666] px-2 mt-2 mb-1">Premium</p>
                                                        {PREMIUM_THEMES.map((preset) => (
                                                            <button key={preset.id} onClick={() => { setTheme(preset.id); setThemeOpen(false); setOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-full text-[13px] font-medium hover:bg-[#141414] border border-transparent hover:border-[#262626] hover:cursor-pointer transition-colors text-white">
                                                                <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-[#262626]" style={{ backgroundColor: preset.colors.primary }} /> {preset.name} {theme === preset.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setOpen(false); setShowUpgradeModal(true); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-full text-[13px] font-medium bg-transparent text-[#9ca3af] border border-transparent hover:text-white hover:bg-[#141414] hover:border-[#262626] hover:cursor-pointer transition-all duration-[var(--duration-fast)]">
                                            <span className="relative shrink-0"><Palette className="w-[18px] h-[18px] text-fuchsia-400" /><Lock className="w-2.5 h-2.5 absolute -bottom-1 -right-1 bg-[#090909] rounded-full p-0.5 text-[#666] border border-[#262626]" /></span> Customize
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <p className="px-3 py-1 text-[10px] font-bold tracking-[0.14em] uppercase text-[#666]">Account</p>
                                    {[
                                        { href: `/profile/${user?.username}`, icon: User, label: "Profile", iconColor: "text-blue-400", active: mounted && pathname === `/profile/${user?.username}` },
                                        { href: "/settings", icon: Settings, label: "Settings", iconColor: "text-slate-400", active: mounted && pathname === "/settings" },
                                        { href: "/docs", icon: BookText, label: "Docs", iconColor: "text-orange-400", active: mounted && pathname === "/docs" },
                                        ...(user && isAdmin(user) ? [{ href: "/admin", icon: Shield, label: "Admin Dashboard", iconColor: "text-emerald-400", active: mounted && pathname === "/admin" }] : []),
                                    ].map((item) => (
                                        <SheetClose key={item.href} asChild>
                                            <Link href={item.href} className="block">
                                                <span className={cn("flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] font-medium border transition-all duration-[var(--duration-fast)] hover:cursor-pointer", item.active ? "bg-white text-black border-white font-semibold shadow-sm" : "bg-transparent border-transparent text-[#9ca3af] hover:text-white hover:bg-[#141414] hover:border-[#262626]")}>
                                                    <item.icon className={cn("w-[18px] h-[18px] shrink-0", item.iconColor)} /> <span className="flex-1">{item.label}</span>
                                                    {item.active && <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" aria-hidden="true" />}
                                                </span>
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </div>
                            </nav>
                        </div>

                        <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-[#1c1c1c] mt-auto bg-[#090909] space-y-2.5">
                            {mounted && !loading && user && (
                                <SheetClose asChild>
                                    <Link
                                        href={`/profile/${user?.username}`}
                                        className="flex items-center gap-3 p-2.5 rounded-[14px] bg-[#141414] border border-[#262626] hover:bg-[#1c1c1c] hover:border-[#2a2a2a] hover:cursor-pointer transition-all duration-[var(--duration-fast)] group"
                                    >
                                        <Avatar className="w-9 h-9 border border-[#262626] group-hover:border-[#333] transition-colors shrink-0">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback className="bg-[#1c1c1c] text-white text-xs font-bold">
                                                {user.name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold truncate text-white leading-none">
                                                {user.name}
                                            </p>
                                            <p className="text-[12px] text-[#999] truncate">
                                                @{user.username}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white transition-colors shrink-0" />
                                    </Link>
                                </SheetClose>
                            )}
                            <SheetClose asChild>
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full bg-transparent border border-transparent text-[#9ca3af] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-[13px] font-medium hover:cursor-pointer transition-all duration-[var(--duration-fast)]">
                                    <LogOut className="w-[18px] h-[18px] shrink-0" /> Log out
                                </button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
                    </div>
                </div>
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
                            onClick={() => setShowUpgradeModal(false)}
                            className="w-full"
                        >
                            Upgrade to Pro
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
