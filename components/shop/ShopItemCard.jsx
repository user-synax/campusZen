"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ShopItemIcon from "@/components/shared/ShopItemIcon";
import useInView from "@/hooks/useInView";
import Image from "next/image";

const RARITY_STYLES = {
    common: "text-gray-400 border-gray-400/20 bg-gray-400/10",
    uncommon: "text-green-400 border-green-400/20 bg-green-400/10",
    rare: "text-blue-400 border-blue-400/20 bg-blue-400/10",
    epic: "text-purple-400 border-purple-400/20 bg-purple-400/10",
    legendary: "text-amber-400 border-amber-400/20 bg-amber-400/10",
    mythic: "text-red-400 border-red-400/20 bg-red-400/10",
};

// ── Helpers ──

// Reuse the EXACT same extension detection pattern as the profile
// banner/frame renderer (ProfileClient.js lines 412-413) — keep
// GIF-vs-video logic consistent across the app rather than writing new.
function isVideoUrl(url) {
    return typeof url === "string" && /\.(webm|mp4|ogg)$/i.test(url);
}

// Banner items get a full-width strip preview (matches the profile
// banner aspect — roughly 16:5 strip, no square icon slot).
function BannerPreviewSlot({ item }) {
    const imageUrl = item.visual?.imageUrl;
    const hasAsset = !!imageUrl;

    // once = false → continuously track inView so we can pause videos
    // when they scroll back out of viewport (performance).
    const { ref: obsRef, isInView } = useInView({
        once: false,
        rootMargin: "300px",
        threshold: 0.05,
    });

    // Mount media lazily: don't create <img>/<video> node at all until
    // the card first enters viewport. Saves DOM nodes + network bytes
    // for banners far below the fold.
    const [everInView, setEverInView] = useState(false);
    useEffect(() => {
        if (isInView) setEverInView(true);
    }, [isInView]);

    // Video element ref — pause when scrolled out, play when back in.
    const videoRef = useRef(null);
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isInView) {
            v.play().catch(() => {});
        } else {
            v.pause();
        }
    }, [isInView]);

    // Also respect prefers-reduced-motion — no auto-play videos.
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        try {
            const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
            const apply = () => setReducedMotion(mql.matches);
            apply();
            mql.addEventListener?.("change", apply);
            return () => mql.removeEventListener?.("change", apply);
        } catch {
            /* SSR or old UA — ignore */
        }
    }, []);

    // The outer slot is a row in the card's layout. Combine the IO
    // observer ref with the outer div (single element for the card).
    const setRefs = (node) => {
        obsRef.current = node;
    };

    return (
        <div
            ref={setRefs}
            className={cn(
                "w-full h-24 sm:h-28 rounded-xl overflow-hidden shrink-0",
                "border border-border/50 bg-accent/40 relative",
            )}
        >
            {!hasAsset ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ShopItemIcon
                        iconName={item.visual?.icon}
                        rarity={item.rarity}
                        visual={item.visual}
                        className="w-12 h-12"
                    />
                </div>
            ) : !everInView ? (
                // Lightweight placeholder until card scrolls near viewport
                <Skeleton className="absolute inset-0 rounded-none" />
            ) : isVideoUrl(imageUrl) ? (
                <video
                    ref={videoRef}
                    src={imageUrl}
                    muted
                    loop
                    playsInline
                    autoPlay={isInView && !reducedMotion}
                    poster=""
                    className="absolute inset-0 w-full h-full object-cover select-none"
                    preload="none"
                />
            ) : (
                <img
                    src={imageUrl}
                    alt={`${item.name} preview`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                    onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                    }}
                />
            )}

            {/* Subtle bottom edge to visually separate preview from card
                content — same as the profile banner's bottom gradient. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background/70 to-transparent" />

            {/* Ownership/equipped banner-overlay chip — lives inside the
                preview so it doesn't shift the card grid. */}
            {item.owned && item.equipped && (
                <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter border border-border/40 text-primary">
                    <Check className="w-3 h-3" /> Equipped
                </div>
            )}
            {item.owned && !item.equipped && (
                <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-border/30">
                    Owned
                </div>
            )}
        </div>
    );
}

// ── Standard icon slot for non-banner categories ──
function IconSlot({ item }) {
    return (
        <ShopItemIcon
            iconName={item.visual?.icon}
            rarity={item.rarity}
            visual={item.visual}
            className="w-14 h-14 shrink-0"
        />
    );
}

export default function ShopItemCard({ item, onPurchase, onEquip, onUnequip }) {
    const [busy, setBusy] = useState(false);
    const rarity = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
    const isBanner = item.category === "profile_banner";

    const withBusy = async (fn) => {
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    };

    const renderEquippedChip = isBanner; // banner shows chip on preview

    return (
        <div
            className={cn(
                "card-chunky flex flex-col p-4 gap-3 bg-accent/20",
                item.rarity,
            )}
        >
            {isBanner ? (
                <BannerPreviewSlot item={item} />
            ) : (
                <div className="flex items-start gap-3">
                    <IconSlot item={item} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold truncate">{item.name}</p>
                            <span
                                className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter",
                                    rarity,
                                )}
                            >
                                {item.rarity}
                            </span>
                        </div>
                        {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {item.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Banners show the name+rarity+description UNDER the preview
                (matches how they were laid out above — just moves the text
                block below instead of next to the icon). */}
            {isBanner && (
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold truncate">{item.name}</p>
                        <span
                            className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter",
                                rarity,
                            )}
                        >
                            {item.rarity}
                        </span>
                    </div>
                    {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                        </p>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-1">
                <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                    <Image
                        src="/icon/vp-coin.png"
                        width={24}
                        height={24}
                        className="w-4 h-4 text-primary"
                    />{" "}
                    {item.price} VP
                </span>

                {/* Equipped badge on non-banner cards (banner shows it on preview) */}
                {!renderEquippedChip && item.owned && item.equipped && (
                    <span className="hidden" aria-hidden />
                )}

                {!item.owned ? (
                    <Button
                        size="sm"
                        onClick={() => withBusy(() => onPurchase(item))}
                        disabled={busy}
                        className="pill-chunky"
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        Buy
                    </Button>
                ) : item.equipped ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => withBusy(() => onUnequip(item))}
                        disabled={busy}
                        className="pill-chunky"
                    >
                        {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Equipped
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={() => withBusy(() => onEquip(item))}
                        disabled={busy}
                        className="pill-chunky"
                    >
                        Equip
                    </Button>
                )}
            </div>
        </div>
    );
}
