"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Download,
    Loader2,
    Zap,
    Trophy,
    Medal,
    Sparkles,
    Gem,
    CircleDot,
    Pencil,
    Cpu,
    Crown,
    Droplets,
    Palette,
    Shield,
    Shapes,
    Hexagon,
} from "lucide-react";
import { toast } from "sonner";
import { getBannerUrl } from "@/utils/defaultBanner";
import { getRankForLevel } from "@/lib/ranks";

const THEMES = [
    // Free Themes
    {
        id: "midnight",
        name: "Midnight Stealth",
        bgClass:
            "bg-linear-to-br from-neutral-950 via-zinc-900 to-neutral-950 border border-white/10",
        pfpBorder: "border-neutral-900 ring-white/10",
        statsBg: "bg-white/5 border-white/5",
        badgeBg: "bg-white/5 border-white/10",
        progressBarTrack: "bg-white/10",
        isPremium: false,
    },
    {
        id: "brand",
        name: "Campus Zen Blue",
        bgClass:
            "bg-linear-to-br from-slate-950 via-[#1A2E5A] to-slate-950 border border-[#3E63A6]/30",
        pfpBorder: "border-[#0d162d] ring-primary/30",
        statsBg: "bg-primary/5 border-primary/10",
        badgeBg: "bg-primary/5 border-primary/15",
        progressBarTrack: "bg-primary/10",
        isPremium: false,
    },
    {
        id: "sunset",
        name: "Sunset Warmth",
        bgClass:
            "bg-linear-to-br from-[#1E0D1C] via-[#4A1A12] to-neutral-950 border border-orange-500/25",
        pfpBorder: "border-[#1c0c1b] ring-orange-500/30",
        statsBg: "bg-orange-500/5 border-orange-500/10",
        badgeBg: "bg-orange-500/5 border-orange-500/15",
        progressBarTrack: "bg-orange-500/10",
        isPremium: false,
    },
    {
        id: "emerald",
        name: "Emerald Growth",
        bgClass:
            "bg-linear-to-br from-[#0B1E13] via-[#103A20] to-[#0a120e] border border-emerald-500/25",
        pfpBorder: "border-[#0a1b11] ring-emerald-500/30",
        statsBg: "bg-emerald-500/5 border-emerald-500/10",
        badgeBg: "bg-emerald-500/5 border-emerald-500/15",
        progressBarTrack: "bg-emerald-500/10",
        isPremium: false,
    },
    // Premium Exclusive Themes — each one has a single structural signature
    // (shape, shadow logic, or texture), not just a different color stop.
    {
        id: "glassmorphism",
        name: "Crystal Glass",
        icon: Sparkles,
        bgClass: "border border-white/15",
        pfpBorder: "border-white/30 ring-2 ring-indigo-300/50",
        statsBg: "bg-white/5 border-white/15 backdrop-blur-md",
        badgeBg: "bg-white/5 border-white/10 backdrop-blur-md",
        progressBarTrack: "bg-white/10",
        progressFill: "bg-indigo-300",
        chipRadius: "rounded-xl",
        cardRadius: "rounded-[28px]",
        isPremium: true,
        avatarGlow:
            "0 0 0 1px rgba(255,255,255,0.3), 0 0 30px rgba(129,140,248,0.5)",
        cardStyle: {
            background:
                "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)",
            boxShadow:
                "0 25px 50px -12px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 40px rgba(129,140,248,0.06)",
        },
    },
    {
        id: "neumorphism",
        name: "Soft Neo",
        icon: CircleDot,
        bgClass: "border-0",
        pfpBorder: "border-zinc-700/50 ring-2 ring-zinc-400/25",
        // Stat chips read as pressed-in; the avatar (below) reads as raised.
        // That contrast is what actually makes this neumorphic.
        statsBg:
            "bg-zinc-800 border-transparent shadow-[inset_3px_3px_6px_rgba(0,0,0,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.04)]",
        badgeBg:
            "bg-zinc-800 border-transparent shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.04)]",
        progressBarTrack:
            "bg-zinc-800 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]",
        progressFill: "bg-zinc-300",
        chipRadius: "rounded-xl",
        cardRadius: "rounded-[24px]",
        isPremium: true,
        avatarGlow:
            "6px 6px 14px rgba(0,0,0,0.45), -6px -6px 14px rgba(255,255,255,0.05)",
        cardStyle: {
            background:
                "linear-gradient(145deg, #3f3f46 0%, #18181b 50%, #3f3f46 100%)",
            boxShadow:
                "10px 10px 22px rgba(0,0,0,0.45), -8px -8px 22px rgba(255,255,255,0.04)",
        },
    },
    {
        id: "sketch",
        name: "Sketch Art",
        icon: Pencil,
        bgClass: "border-2 border-dashed border-yellow-600/50",
        pfpBorder: "border-yellow-500/50 ring-2 ring-yellow-400/35",
        pfpBorderStyle: "border-dashed",
        statsBg: "bg-amber-900/40 border-2 border-dashed border-yellow-600/30",
        badgeBg: "bg-amber-900/35 border-2 border-dashed border-yellow-600/25",
        progressBarTrack: "bg-amber-900/50",
        progressFill: "bg-yellow-400",
        chipRadius: "rounded-lg",
        cardRadius: "rounded-2xl",
        isPremium: true,
        avatarGlow:
            "0 0 0 2px rgba(245,158,11,0.15), 0 4px 12px rgba(0,0,0,0.3)",
        cardStyle: {
            background:
                "linear-gradient(135deg, #291a00 0%, #451a03 50%, #291a00 100%)",
            boxShadow:
                "0 12px 28px rgba(0,0,0,0.35), inset 0 0 30px rgba(245,158,11,0.05)",
        },
    },
    {
        id: "clay",
        name: "Clay Pop",
        icon: Shapes,
        bgClass: "border-2 border-pink-200/30",
        pfpBorder: "border-pink-200/60 ring-4 ring-pink-100/20",
        pfpBorderStyle: "border-solid",
        statsBg: "bg-pink-50/[0.04] border border-pink-200/10",
        badgeBg: "bg-rose-50/[0.05] border border-rose-200/10",
        progressBarTrack: "bg-pink-100/10",
        progressFill: "bg-gradient-to-r from-pink-300 to-rose-300",
        chipRadius: "rounded-full",
        cardRadius: "rounded-[2.5rem]",
        isPremium: true,
        avatarGlow:
            "0 8px 20px rgba(244,114,182,0.25), inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(190,24,93,0.2)",
        cardStyle: {
            background:
                "radial-gradient(circle at 15% 25%, rgba(251,207,232,0.08) 0%, transparent 30%), radial-gradient(circle at 85% 75%, rgba(254,205,211,0.08) 0%, transparent 30%), linear-gradient(135deg, #3b0a2e 0%, #4a0e38 50%, #3b0a2e 100%)",
            boxShadow:
                "16px 16px 40px rgba(0,0,0,0.35), -8px -8px 24px rgba(251,207,232,0.05), inset 0 2px 4px rgba(255,255,255,0.08), inset 0 -4px 10px rgba(0,0,0,0.25)",
        },
    },

    // 2 — HOLOGRAPHIC GLASS: frosted, iridescent, blurred — complete opposite of clay
    {
        id: "holo",
        name: "Holo Glass",
        icon: Gem,
        bgClass: "backdrop-blur-xl border border-white/15",
        pfpBorder: "border-cyan-300/40 ring-2 ring-fuchsia-300/30",
        pfpBorderStyle: "border-solid",
        statsBg: "bg-white/5 backdrop-blur-md border border-white/10",
        badgeBg:
            "bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 backdrop-blur-sm",
        progressBarTrack: "bg-white/10",
        progressFill:
            "bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200",
        chipRadius: "rounded-2xl",
        cardRadius: "rounded-[2rem]",
        isPremium: true,
        avatarGlow:
            "0 0 0 1px rgba(255,255,255,0.25), 0 0 24px rgba(168,85,247,0.35), 0 8px 20px rgba(0,0,0,0.4)",
        cardStyle: {
            background:
                "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(217,70,239,0.15) 0%, transparent 40%), linear-gradient(135deg, #0c0a1f 0%, #1e1b3a 50%, #0c0a1f 100%)",
            boxShadow:
                "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px rgba(168,85,247,0.08)",
        },
    },

    // 3 — NEON CYBERPUNK: hard edges, grid pattern, glow instead of shadow
    {
        id: "cyber",
        name: "Neon Cyber",
        icon: Zap,
        bgClass: "border-2 border-fuchsia-500/60",
        pfpBorder: "border-cyan-400 ring-2 ring-fuchsia-500/50",
        pfpBorderStyle: "border-solid",
        statsBg: "bg-black/60 border border-cyan-500/30",
        badgeBg: "bg-fuchsia-950/40 border border-fuchsia-500/30",
        progressBarTrack: "bg-black/70",
        progressFill: "bg-gradient-to-r from-cyan-400 to-fuchsia-500",
        chipRadius: "rounded-none",
        cardRadius: "rounded-md",
        isPremium: true,
        avatarGlow:
            "0 0 0 2px rgba(34,211,238,0.4), 0 0 20px rgba(217,70,239,0.5), 0 0 40px rgba(34,211,238,0.25)",
        cardStyle: {
            background:
                "repeating-linear-gradient(0deg, rgba(34,211,238,0.04) 0px, rgba(34,211,238,0.04) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(217,70,239,0.04) 0px, rgba(217,70,239,0.04) 1px, transparent 1px, transparent 24px), linear-gradient(135deg, #0a0014 0%, #1a0033 50%, #0a0014 100%)",
            boxShadow:
                "0 0 30px rgba(217,70,239,0.2), 0 12px 28px rgba(0,0,0,0.5), inset 0 0 30px rgba(34,211,238,0.05)",
        },
    },

    // 4 — ROYAL GOLD MARBLE: veined stone pattern, double border, warm metallic glow
    {
        id: "royal",
        name: "Royal Gold",
        icon: Crown,
        bgClass: "border border-amber-300/40",
        pfpBorder: "border-amber-300/70 ring-2 ring-amber-200/30",
        pfpBorderStyle: "border-double",
        statsBg: "bg-stone-900/50 border border-amber-300/20",
        badgeBg:
            "bg-gradient-to-br from-amber-950/40 to-stone-900/40 border border-amber-300/20",
        progressBarTrack: "bg-stone-900/60",
        progressFill:
            "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400",
        chipRadius: "rounded-sm",
        cardRadius: "rounded-xl",
        isPremium: true,
        avatarGlow:
            "0 0 0 2px rgba(252,211,77,0.3), 0 6px 16px rgba(0,0,0,0.45), 0 0 24px rgba(252,211,77,0.15)",
        cardStyle: {
            background:
                "linear-gradient(120deg, transparent 40%, rgba(252,211,77,0.06) 41%, transparent 42%), linear-gradient(80deg, transparent 60%, rgba(252,211,77,0.04) 61%, transparent 63%), linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)",
            boxShadow:
                "0 14px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(252,211,77,0.15), inset 0 0 40px rgba(252,211,77,0.04)",
        },
    },

    // 5 — CARBON FIBER: woven texture, cool monochrome metal, brushed-steel glow
    {
        id: "carbon",
        name: "Carbon Fiber",
        icon: Hexagon,
        bgClass: "border border-slate-500/40",
        pfpBorder: "border-slate-300/50 ring-2 ring-slate-400/20",
        pfpBorderStyle: "border-solid",
        statsBg: "bg-slate-950/60 border border-slate-600/30",
        badgeBg: "bg-slate-900/50 border border-slate-500/20",
        progressBarTrack: "bg-slate-950/70",
        progressFill: "bg-gradient-to-r from-slate-300 to-slate-100",
        chipRadius: "rounded-md",
        cardRadius: "rounded-lg",
        isPremium: true,
        avatarGlow:
            "0 0 0 2px rgba(203,213,225,0.2), 0 8px 18px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
        cardStyle: {
            background:
                "repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 4px, #0f172a 4px, #0f172a 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 4px, transparent 4px, transparent 8px)",
            boxShadow:
                "0 16px 36px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.4)",
        },
    },
];

// A faint per-theme texture sitting behind the content layer. Negative
// z-index keeps it below normal-flow content regardless of DOM order, so it
// never washes out text or stat numbers.
function ThemeOverlay({ themeId }) {
    const overlayStyles = {
        glassmorphism: {
            background:
                "linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.07) 100%)",
        },
        claymorphism: {
            background:
                "radial-gradient(circle at 85% -10%, rgba(251,113,133,0.35), transparent 55%)",
        },
        neumorphism: {
            backgroundImage:
                "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            opacity: 0.06,
        },
        sketch: {
            backgroundImage:
                "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
            opacity: 0.08,
        },
        cyberpunk: {
            backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)",
            opacity: 0.05,
        },
    };

    const style = overlayStyles[themeId];
    if (!style) return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={style}
        />
    );
}

export default function ProfileCardExportModal({
    open,
    onOpenChange,
    profileUser,
}) {
    // Initialize with free theme if not pro
    const initialTheme =
        !profileUser?.isPro && THEMES[0]?.isPremium
            ? THEMES.find((t) => !t.isPremium) || THEMES[0]
            : THEMES[0];
    const [activeTheme, setActiveTheme] = useState(initialTheme);
    const [exporting, setExporting] = useState(false);
    const cardRef = useRef(null);

    // Ensure user doesn't stay on premium theme if pro status changes
    useEffect(() => {
        if (!profileUser?.isPro && activeTheme.isPremium) {
            setActiveTheme(THEMES.find((t) => !t.isPremium) || THEMES[0]);
        }
    }, [profileUser?.isPro, activeTheme.isPremium]);

    const handleExport = async () => {
        if (!cardRef.current) return;

        setExporting(true);

        try {
            // Wait until all images are loaded
            const images = Array.from(cardRef.current.querySelectorAll("img"));

            await Promise.all(
                images.map((img) => {
                    if (img.complete && img.naturalWidth > 0) {
                        return Promise.resolve();
                    }

                    return new Promise((resolve) => {
                        img.addEventListener("load", resolve, { once: true });
                        img.addEventListener("error", resolve, { once: true });
                    });
                }),
            );

            await new Promise((resolve) =>
                requestAnimationFrame(() => resolve()),
            );

            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
                backgroundColor: null,
                skipFonts: false,

                imagePlaceholder:
                    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",

                fetchRequestInit: {
                    mode: "cors",
                    credentials: "omit",
                },
            });

            const safeUsername = (profileUser.username || "profile").replace(
                /[^\w-]/g,
                "_",
            );

            const link = document.createElement("a");
            link.download = `${safeUsername}-campuszen-card.png`;
            link.href = dataUrl;
            link.click();

            toast.success("Profile card exported successfully!");
            onOpenChange(false);
        } catch (error) {
            console.error("Card export failed:", error);
            toast.error("Unable to export profile card.");
        } finally {
            setExporting(false);
        }
    };

    if (!profileUser) return null;

    // Calculate level progress percentage
    const xpProgress = ((profileUser.xp || 0) % 1000) / 10;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md sm:max-w-md w-[95vw] sm:w-full p-4 sm:p-6 bg-card border-border overflow-y-auto max-h-[90vh] rounded-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold">
                        Export Profile Card
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Showcase your accomplishments on social media with a
                        customized profile card.
                    </DialogDescription>
                </DialogHeader>

                {/* Theme Selector */}
                <div className="space-y-2 mb-6">
                    <span className="text-xs sm:text-sm font-bold uppercase text-muted-foreground tracking-wider">
                        Select Theme
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {THEMES.filter(
                            (theme) => !theme.isPremium || profileUser.isPro,
                        ).map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => setActiveTheme(theme)}
                                className={`py-2.5 px-3 text-xs sm:text-sm font-medium hover:cursor-pointer rounded-xl border text-left transition-all relative ${
                                    activeTheme.id === theme.id
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-muted/50 hover:bg-muted text-foreground border-border"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1.5">
                                    <span className="flex items-center gap-1.5 truncate">
                                        {theme.isPremium && theme.icon && (
                                            <theme.icon className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" />
                                        )}
                                        {theme.name}
                                    </span>
                                    {theme.isPremium && (
                                        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/25 to-amber-400/25 text-yellow-400 border border-yellow-500/40 font-bold tracking-wide shrink-0">
                                            <Crown className="w-2.5 h-2.5" />
                                            PRO
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    {!profileUser.isPro && (
                        <div className="mt-2 p-2.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/25 flex items-center gap-2">
                            <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <p className="text-[10px] sm:text-xs text-yellow-400 font-medium">
                                Upgrade to Pro to unlock 5 exclusive premium
                                themes
                            </p>
                        </div>
                    )}
                </div>

                {/* Card Container (Target for capture) */}
                <div className="flex justify-center mb-6 px-1">
                    <div
                        ref={cardRef}
                        className={`w-full sm:w-[360px] max-w-[360px] p-4 sm:p-5 ${activeTheme.cardRadius || "rounded-2xl"} relative z-0 overflow-hidden flex flex-col text-white select-none ${activeTheme.bgClass}`}
                        style={activeTheme.cardStyle}
                    >
                        <ThemeOverlay themeId={activeTheme.id} />

                        {/* Banner Image */}
                        <div className="h-20 w-full relative rounded-xl overflow-hidden mb-8 border border-white/10 bg-zinc-800">
                            <img
                                src={getBannerUrl(
                                    profileUser.banner,
                                    profileUser.username,
                                )}
                                alt="Banner"
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                                onLoad={() => console.log("Banner loaded")}
                                onError={(e) => {
                                    console.log("Banner failed");
                                    console.log(e.currentTarget.src);
                                }}
                            />
                        </div>

                        {/* Avatar */}
                        <div className="absolute top-[52px] left-1/2 -translate-x-1/2">
                            <div
                                className={`w-16 h-16 rounded-full border-4 ${activeTheme.pfpBorderStyle || ""} overflow-hidden shadow-xl ring-2 ${activeTheme.pfpBorder}`}
                                style={
                                    activeTheme.avatarGlow
                                        ? { boxShadow: activeTheme.avatarGlow }
                                        : undefined
                                }
                            >
                                <img
                                    src={
                                        profileUser.avatar ||
                                        `https://api.dicebear.com/7.x/initials/svg?seed=${profileUser.name}`
                                    }
                                    alt={profileUser.name}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                    onLoad={() => console.log("Avatar loaded")}
                                    onError={(e) => {
                                        console.log("Avatar failed");
                                        console.log(e.currentTarget.src);
                                    }}
                                />
                            </div>
                        </div>

                        {/* User Identifiers */}
                        <div className="text-center space-y-0.5 mb-5 mt-2">
                            <h2 className="text-base font-bold text-white flex items-center justify-center gap-1">
                                {profileUser.name}
                                {profileUser.isVerified && (
                                    <span className="text-sky-400 text-sm">
                                        ✓
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-white/60">
                                @{profileUser.username}
                            </p>

                            {(profileUser.college || profileUser.course) && (
                                <p className="text-[10px] text-white/50 pt-1 font-medium truncate max-w-[280px] mx-auto">
                                    {profileUser.college
                                        ? `🎓 ${profileUser.college}`
                                        : ""}
                                    {profileUser.college && profileUser.course
                                        ? " • "
                                        : ""}
                                    {profileUser.course
                                        ? `${profileUser.course}`
                                        : ""}
                                </p>
                            )}
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            <div
                                className={`p-2 ${activeTheme.chipRadius || "rounded-xl"} flex flex-col items-center justify-center border text-center ${activeTheme.statsBg}`}
                            >
                                <Zap className="w-3.5 h-3.5 text-primary fill-primary mb-1" />
                                <span className="text-sm font-black leading-none">
                                    {profileUser.totalXP || profileUser.xp || 0}
                                </span>
                                <span className="text-[8px] uppercase font-bold text-white/50 tracking-wider mt-0.5">
                                    Total XP
                                </span>
                            </div>

                            <div
                                className={`p-2 ${activeTheme.chipRadius || "rounded-xl"} flex flex-col items-center justify-center border text-center ${activeTheme.statsBg}`}
                            >
                                <Trophy className="w-3.5 h-3.5 text-yellow-500 mb-1" />
                                <span className="text-sm font-black leading-none">
                                    {profileUser.level || 1}
                                </span>
                                <span className="text-[8px] uppercase font-bold text-white/50 tracking-wider mt-0.5">
                                    Level
                                </span>
                            </div>
                        </div>

                        {/* Level Progress */}
                        <div className="space-y-1.5 mb-5">
                            <div className="flex justify-between items-center text-[9px] text-white/55 font-bold uppercase tracking-wider">
                                <span>Level Progress</span>
                                <span>{xpProgress}%</span>
                            </div>
                            <div
                                className={`w-full h-1.5 rounded-full overflow-hidden ${activeTheme.progressBarTrack}`}
                            >
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${activeTheme.progressFill || "bg-primary"}`}
                                    style={{ width: `${xpProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Rank Display */}
                        <div className="space-y-2 mb-5">
                            <div
                                className={`p-2 ${activeTheme.chipRadius || "rounded-lg"} border flex items-center gap-2 ${activeTheme.badgeBg}`}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                    <img
                                        src={
                                            getRankForLevel(
                                                profileUser.level || 1,
                                            ).badge
                                        }
                                        alt={
                                            getRankForLevel(
                                                profileUser.level || 1,
                                            ).name
                                        }
                                        className="w-full h-full object-contain"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display =
                                                "flex";
                                        }}
                                    />
                                    <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-yellow-500 to-amber-600 text-white text-xs font-bold rounded-full">
                                        {getRankForLevel(
                                            profileUser.level || 1,
                                        ).name.charAt(0)}
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">
                                        {
                                            getRankForLevel(
                                                profileUser.level || 1,
                                            ).name
                                        }
                                    </span>
                                    <span className="text-[9px] font-semibold text-white/60">
                                        Level {profileUser.level || 1}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Watermark / Brand Branding */}
                        <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5">
                                <span className="text-base font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent tracking-tight">
                                    CampusZen
                                </span>
                                {activeTheme.isPremium && (
                                    <Crown className="w-3 h-3 text-yellow-400" />
                                )}
                            </div>
                            <span className="text-[8px] text-white/40 font-semibold tracking-wider uppercase">
                                campuszen.tech
                            </span>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between sm:justify-end mt-4">
                    <Button
                        variant="ghost"
                        className="rounded-xl h-11 w-full sm:w-auto"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="rounded-xl h-11 w-full sm:w-auto flex-1 sm:flex-initial"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download PNG
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
