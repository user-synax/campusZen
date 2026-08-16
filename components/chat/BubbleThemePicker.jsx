"use client";

import { useState, useCallback } from "react";
import { Palette, Check, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BUBBLE_THEMES, getBubbleTheme } from "@/lib/chatBubbleThemes";
import useUser from "@/hooks/useUser";

const RARITY_LABELS = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
};

const RARITY_COLORS = {
    common: "text-gray-400",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
    mythic: "text-red-400",
};

function ThemeCard({ theme, owned, equipped, onBuy, onEquip, onUnequip, busy, coins }) {
    const preview = getBubbleTheme(theme.id);
    const canAfford = coins >= theme.priceVP;

    return (
        <div
            className={cn(
                "rounded-lg border p-3 transition-all",
                equipped
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card/50 hover:border-border",
            )}
        >
            <div className="flex items-start gap-3">
                {/* Bubble Preview */}
                <div className="flex-shrink-0 w-16 h-10 flex items-end justify-end overflow-hidden">
                    <div
                        className={cn(
                            "px-2.5 py-1 text-[10px] font-medium leading-tight max-w-full truncate",
                            preview.ownBubble.className,
                        )}
                        style={preview.ownBubble.style}
                    >
                        Hey!
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                            {theme.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span
                            className={cn(
                                "text-[10px] font-medium uppercase tracking-wider",
                                RARITY_COLORS[theme.rarity],
                            )}
                        >
                            {RARITY_LABELS[theme.rarity]}
                        </span>
                        {!owned && (
                            <span className="text-[10px] text-muted-foreground">
                                {theme.priceVP.toLocaleString()} coins
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                    {equipped ? (
                        <div className="flex items-center gap-1">
                            <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
                                <Check className="w-3 h-3" /> Equipped
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => onUnequip(theme)}
                                disabled={busy}
                            >
                                {busy ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    "Unequip"
                                )}
                            </Button>
                        </div>
                    ) : owned ? (
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onEquip(theme)}
                            disabled={busy}
                        >
                            {busy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                "Equip"
                            )}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant={canAfford ? "default" : "outline"}
                            className={cn(
                                "h-7 text-xs",
                                !canAfford && "opacity-50",
                            )}
                            onClick={() => onBuy(theme)}
                            disabled={busy || !canAfford}
                        >
                            {busy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : canAfford ? (
                                "Buy"
                            ) : (
                                <Lock className="w-3 h-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BubbleThemePicker({ onThemeChange }) {
    const { user: currentUser, refetch } = useUser();
    const [open, setOpen] = useState(false);
    const [busyThemeId, setBusyThemeId] = useState(null);

    const equippedBubbleItemId = currentUser?.equippedShopItems?.chat_bubble;

    const getOwnedMap = useCallback(() => {
        if (!currentUser?.ownedShopItems) return new Map();
        const map = new Map();
        currentUser.ownedShopItems
            .filter((o) => o.category === "chat_bubble")
            .forEach((o) => map.set(o.slug, o));
        return map;
    }, [currentUser]);

    const getEquippedSlug = useCallback(() => {
        if (!equippedBubbleItemId || !currentUser?.ownedShopItems) return null;
        const match = currentUser.ownedShopItems.find(
            (o) => o.itemId?.toString() === equippedBubbleItemId.toString(),
        );
        return match?.slug || null;
    }, [equippedBubbleItemId, currentUser]);

    const handleBuy = useCallback(
        async (theme) => {
            setBusyThemeId(theme.id);
            try {
                const res = await fetch("/api/shop/purchase", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slug: theme.id }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    toast.success(`Purchased ${theme.name}`);
                    await refetch();
                    onThemeChange?.(theme.id);
                } else {
                    toast.error(data.message || "Purchase failed");
                }
            } catch {
                toast.error("Network error");
            } finally {
                setBusyThemeId(null);
            }
        },
        [refetch],
    );

    const handleEquip = useCallback(
        async (theme) => {
            setBusyThemeId(theme.id);
            try {
                const ownedMap = getOwnedMap();
                const ownedEntry = ownedMap.get(theme.id);
                if (!ownedEntry?.itemId) {
                    toast.error("Item not found in inventory");
                    setBusyThemeId(null);
                    return;
                }
                const res = await fetch("/api/shop/equip", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ itemId: ownedEntry.itemId }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    toast.success(`Equipped ${theme.name}`);
                    await refetch();
                    onThemeChange?.(theme.id);
                } else {
                    toast.error(data.message || "Equip failed");
                }
            } catch {
                toast.error("Network error");
            } finally {
                setBusyThemeId(null);
            }
        },
        [refetch, getOwnedMap, onThemeChange],
    );

    const handleUnequip = useCallback(
        async (theme) => {
            setBusyThemeId(theme.id);
            try {
                const res = await fetch("/api/shop/equip", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ category: "chat_bubble" }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    toast.success("Unequipped bubble theme");
                    await refetch();
                    onThemeChange?.("default");
                } else {
                    toast.error(data.message || "Unequip failed");
                }
            } catch {
                toast.error("Network error");
            } finally {
                setBusyThemeId(null);
            }
        },
        [refetch, onThemeChange],
    );

    const ownedMap = getOwnedMap();
    const ownedSlugs = new Set(ownedMap.keys());
    const equippedSlug = getEquippedSlug();
    const coins = currentUser?.vp || 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full relative"
                    title="Chat bubble themes"
                >
                    <Palette className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">
                            Bubble Themes
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {coins.toLocaleString()} coins
                    </span>
                </div>

                {/* Theme List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                    {BUBBLE_THEMES.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            owned={
                                theme.id === "default" || ownedSlugs.has(theme.id)
                            }
                            equipped={
                                theme.id === "default"
                                    ? !equippedSlug
                                    : equippedSlug === theme.id
                            }
                            onBuy={handleBuy}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                            busy={busyThemeId === theme.id}
                            coins={coins}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
