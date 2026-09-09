"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
    Home,
    GraduationCap,
    Bell,
    Bookmark,
    Search,
    MessageSquare,
    Settings,
    Shield,
    Palette,
    Sun,
    Moon,
    Crown,
    Zap,
    Lock,
    Star,
    Rocket,
    ShieldCheck,
    Link2,
    Check,
    MoreHorizontal,
    Feather,
    LogOut,
    Settings2,
    HelpCircle,
    Monitor,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useChatUnreadCount } from "@/context/ChatUnreadContext";
import AnimatedCount from "@/components/ui/AnimatedCount";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/shared/Logo";
import useUser from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { isFounder } from "@/lib/founder";
import { isAdmin } from "@/lib/admin";
import { PREMIUM_THEMES } from "@/context/ThemeContext";
import {
    primaryNavItems as basePrimaryNavItems,
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

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useUser();
    const { unreadCount } = useNotifications();
    const chatUnread = useChatUnreadCount();
    const { theme, setTheme, toggleTheme } = useTheme();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const navRef = useRef(null);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (e) {
            console.error("Logout failed:", e);
        }
    };

    useEffect(() => {
        const el = navRef.current;
        if (!el) return;
        requestAnimationFrame(() => el.classList.add("is-shown"));
    }, []);

    const isAdminUser = user ? isAdmin(user) : false;
    const isFounderUser = user ? isFounder(user.username) : false;

    const primaryNavItems = basePrimaryNavItems.map((item) =>
        item.href === "/chats"
            ? { ...item, badge: chatUnread }
            : item.href === "/notifications"
              ? { ...item, badge: unreadCount }
              : item,
    );

    const adminNavItems = isAdminUser ? baseAdminItems : [];

    const proFeatures = [
        { icon: Palette, title: "Custom Themes", description: "Create and apply custom color schemes and premium presets" },
        { icon: Zap, title: "Animated Profile Headers", description: "Beautiful animated gradient profile banners" },
        { icon: Crown, title: "Exclusive Avatar Frames", description: "Theme-specific animated avatar borders" },
        { icon: ShieldCheck, title: "Ad-Free", description: "Clean distraction-free experience" },
        { icon: Star, title: "Priority Support", description: "Fast responses within 24 hours" },
        { icon: Rocket, title: "Early Access", description: "Try new features first" },
    ];

    const NavItem = ({ item, index }) => {
        const isActive = pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
            <Link href={item.href} className="group block hover:cursor-pointer" style={{ "--i": index }}>
                <div
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-full transition-all hover:cursor-pointer",
                        "duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
                        "hover:bg-accent/70 hover:translate-x-[1px]",
                        "active:scale-[0.98] active:duration-[var(--duration-quick)]",
                        isActive ? "font-semibold text-foreground" : "font-normal text-foreground/85 hover:text-foreground",
                    )}
                >
                    <div className="relative shrink-0">
                        <Icon
                            className={cn(
                                "w-[15px] h-[15px] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]",
                                isActive ? "text-foreground stroke-[2.2]" : "text-foreground/85 group-hover:text-foreground",
                            )}
                            strokeWidth={isActive ? 2.3 : 1.8}
                        />
                        {item.badge > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-[var(--color-electric-violet)] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background shadow-sm animate-[badgePop_var(--duration-very-slow)_var(--ease-bounce)]">
                                <AnimatedCount value={item.badge} max={9} />
                            </span>
                        )}
                    </div>
                    <span className="hidden lg:block text-[14.5px] leading-none tracking-tight pr-2">
                        {item.label}
                    </span>
                </div>
            </Link>
        );
    };

    return (
        <>
            <aside className="fixed left-0 top-0 h-screen w-[68px] lg:w-[260px] bg-background z-40 hidden md:flex flex-col border-r border-border/40">
                {/* Logo — compact */}
                <div className="shrink-0 px-2.5 lg:px-3 pt-3 pb-1">
                    <Link href="/feed" className="inline-flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-accent/60 hover:cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group">
                        <span className="hidden lg:block font-bold text-[28px] tracking-tight text-foreground">CampusZen</span>
                    </Link>
                </div>

                {/* Nav — compact, small text */}
                <nav ref={navRef} className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 space-y-1 t-stagger custom-scrollbar">
                    <div className="space-y-0.5">
                        {primaryNavItems.map((item, i) => (
                            <div key={item.href} className="t-stagger-line" style={{ "--i": i }}>
                                <NavItem item={item} index={i} />
                            </div>
                        ))}
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-border/30 hidden lg:block">
                        <p className="px-3 mb-1.5 text-[11px] font-semibold text-muted-foreground/60 tracking-wide">More</p>
                        <div className="space-y-0.5">
                            {moreItems.map((item, i) => (
                                <NavItem key={item.href} item={item} index={i + 5} />
                            ))}
                        </div>
                    </div>
                    <div className="lg:hidden pt-2 border-t border-border/30">
                        {moreItems.map((item) => (
                            <NavItem key={item.href} item={item} />
                        ))}
                    </div>

                    <div className="pt-2.5 border-t border-border/30 space-y-0.5">
                        {bottomNavItems.map((item) => (
                            <NavItem key={item.href} item={item} />
                        ))}
                    </div>

                    {adminNavItems.length > 0 && (
                        <div className="pt-2.5 border-t border-border/30">
                            <p className="hidden lg:block px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Admin</p>
                            {adminNavItems.map((item) => (
                                <NavItem key={item.href} item={item} />
                            ))}
                        </div>
                    )}
                    <div className="pt-2 px-1.5 lg:hidden">
                        <Link href="/feed" className="flex justify-center hover:cursor-pointer">
                            <span className="w-10 h-10 rounded-full bg-[var(--color-electric-violet)] hover:bg-[var(--color-deep-iris)] text-white flex items-center justify-center shadow-sm hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                                <Feather className="w-4 h-4" />
                            </span>
                        </Link>
                    </div>
                </nav>

                {/* Bottom — compact profile + separated 3-dots + logout (X-like) */}
                <div className="shrink-0 p-2 space-y-2">
                    {!loading && user && user.username && (
                        <div className="space-y-2">
                            {/* Profile row — profile + 3-dots circle separated, same horizontal */}
                            <div className="flex items-center gap-2">
                                <Link href={`/profile/${user.username}`} className="flex-1 min-w-0 block hover:cursor-pointer">
                                    <div className="flex items-center gap-2.5 p-2 rounded-full hover:bg-accent/70 hover:cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group">
                                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/50 group-hover:ring-border transition-all duration-[var(--duration-fast)]">
                                            <AvatarImage src={user.avatar} alt={user.name} />
                                            <AvatarFallback className="bg-accent font-bold text-xs">{user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="hidden lg:flex flex-col flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold leading-none truncate">{user.name}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                                        </div>
                                    </div>
                                </Link>
                                {/* 3-dots — separated circle */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background hover:bg-accent hover:border-border hover:cursor-pointer transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] text-muted-foreground hover:text-foreground hover:scale-[1.04] active:scale-[0.96] shadow-sm">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="top" align="end" className="w-56 rounded-xl shadow-md border-border/50 p-1.5">
                                        <DropdownMenuItem onClick={() => router.push(`/profile/${user.username}`)} className="hover:cursor-pointer rounded-full text-[13px] gap-2.5 py-2">
                                            <GraduationCap className="w-4 h-4" /> View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/settings")} className="hover:cursor-pointer rounded-full text-[13px] gap-2.5 py-2">
                                            <Settings2 className="w-4 h-4" /> Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={toggleTheme} className="hover:cursor-pointer rounded-full text-[13px] gap-2.5 py-2">
                                            <Monitor className="w-4 h-4" /> {theme === "dark" ? "Light mode" : "Dark mode"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/docs")} className="hover:cursor-pointer rounded-full text-[13px] gap-2.5 py-2">
                                            <HelpCircle className="w-4 h-4" /> Help & Docs
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            {/* Logout — under profile, full width */}
                            <button
                                onClick={handleLogout}
                                className="hidden lg:flex w-full items-center gap-2.5 px-3 py-2 rounded-full hover:bg-accent/60 border border-transparent hover:border-border/40 hover:cursor-pointer transition-all duration-[var(--duration-fast)] text-[13px] font-medium text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="w-4 h-4" />
                                Log out
                            </button>
                            {/* Mobile: icons row */}
                            <div className="lg:hidden flex items-center justify-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-accent hover:cursor-pointer transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="top" align="center" className="w-48 rounded-xl">
                                        <DropdownMenuItem onClick={() => router.push(`/profile/${user.username}`)} className="hover:cursor-pointer rounded-full">View Profile</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push("/settings")} className="hover:cursor-pointer rounded-full">Settings</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLogout} className="hover:cursor-pointer rounded-full text-destructive">Log out</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <button onClick={handleLogout} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:cursor-pointer transition-colors">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="hidden lg:flex items-center gap-1 px-0.5">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-full border border-border/60 hover:border-border hover:bg-accent/60 hover:cursor-pointer transition-all duration-[var(--duration-fast)] text-muted-foreground hover:text-foreground"
                            aria-label="Toggle theme"
                        >
                            <span className="t-icon-swap" data-state={theme === "dark" ? "b" : "a"}>
                                <Sun className="t-icon w-3.5 h-3.5" data-icon="a" />
                                <Moon className="t-icon w-3.5 h-3.5" data-icon="b" />
                            </span>
                            <span className="text-[11px] font-semibold hidden xl:inline">{theme === "dark" ? "Light" : "Dark"}</span>
                        </button>

                        {user?.isPro ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-8 w-8 rounded-full border border-border/60 hover:border-[var(--color-electric-violet)]/30 hover:bg-[var(--color-soft-lilac)]/30 hover:cursor-pointer flex items-center justify-center text-muted-foreground hover:text-[var(--color-electric-violet)] transition-all duration-[var(--duration-fast)]">
                                        <Palette className="w-3.5 h-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="top" align="end" className="w-48 rounded-xl shadow-md border-border/50">
                                    <DropdownMenuLabel className="text-[11px] font-bold tracking-wide">Theme</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setTheme("light")} className="hover:cursor-pointer rounded-full text-xs">
                                        <span className="w-3 h-3 rounded-full bg-white border border-border shrink-0" /> Light {theme === "light" && <Check className="w-3 h-3 ml-auto text-[var(--color-electric-violet)]" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")} className="hover:cursor-pointer rounded-full text-xs">
                                        <span className="w-3 h-3 rounded-full bg-[#0a0a0a] border border-border shrink-0" /> Dark {theme === "dark" && <Check className="w-3 h-3 ml-auto text-[var(--color-electric-violet)]" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-[11px] font-bold tracking-wide">Premium</DropdownMenuLabel>
                                    {PREMIUM_THEMES.map((preset) => (
                                        <DropdownMenuItem key={preset.id} onClick={() => setTheme(preset.id)} className="hover:cursor-pointer rounded-full text-xs">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: preset.colors.primary }} /> {preset.name}
                                            {theme === preset.id && <Check className="w-3 h-3 ml-auto text-[var(--color-electric-violet)]" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="h-8 w-8 rounded-full border border-border/60 hover:border-[var(--color-electric-violet)]/30 hover:bg-[var(--color-soft-lilac)]/20 hover:cursor-pointer flex items-center justify-center text-muted-foreground hover:text-[var(--color-electric-violet)] transition-all duration-[var(--duration-fast)] relative"
                            >
                                <Palette className="w-3.5 h-3.5" />
                                <Lock className="w-2 h-2 absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5" />
                            </button>
                        )}
                    </div>

                    <div className="lg:hidden flex justify-center">
                        <button onClick={toggleTheme} className="w-9 h-9 rounded-full hover:bg-accent/60 hover:cursor-pointer flex items-center justify-center text-muted-foreground transition-colors duration-[var(--duration-fast)]">
                            <span className="t-icon-swap" data-state={theme === "dark" ? "b" : "a"}>
                                <Sun className="t-icon w-3.5 h-3.5" data-icon="a" />
                                <Moon className="t-icon w-3.5 h-3.5" data-icon="b" />
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogContent className="sm:max-w-[440px] rounded-[14px] shadow-md border-border/50 p-0 overflow-hidden">
                    <div className="px-5 pt-5 pb-2">
                        <DialogHeader>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-[var(--color-electric-violet)] flex items-center justify-center text-white shadow-sm">
                                    <Crown className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <DialogTitle className="text-[17px] font-bold tracking-tight">Unlock Premium</DialogTitle>
                                    <DialogDescription className="text-[12px]">Customize everything in violet</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>
                    <div className="px-5 py-3 grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto custom-scrollbar">
                        {proFeatures.map((f) => (
                            <div key={f.title} className="flex gap-2.5 p-2.5 rounded-[12px] border border-border/50 hover:border-[var(--color-soft-lilac)]/60 hover:bg-[var(--color-soft-lilac)]/10 hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                                <f.icon className="w-4 h-4 text-[var(--color-electric-violet)] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[13px] font-semibold leading-none">{f.title}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-5 pt-2">
                        <Button onClick={() => setShowUpgradeModal(false)} className="w-full rounded-full bg-[var(--color-electric-violet)] hover:bg-[var(--color-deep-iris)] text-white font-bold py-5 text-[13px] hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">
                            Upgrade — Keep violet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes badgePop {
                    0% { transform: scale(0.6); filter: blur(var(--blur-small)); }
                    60% { transform: scale(1.08); filter: blur(0); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </>
    );
}
