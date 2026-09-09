"use client";

import { useState, useCallback } from "react";
import { Palette, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BUBBLE_THEMES, getBubbleTheme } from "@/lib/chatBubbleThemes";


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

function ThemeCard({ theme, equipped, onEquip, onUnequip }) {
    const preview = getBubbleTheme(theme.id);

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
                            >
                                Unequip
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onEquip(theme)}
                        >
                            Equip
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BubbleThemePicker({ onThemeChange }) {
    const [open, setOpen] = useState(false);
    const [equippedSlug, setEquippedSlug] = useState("default");

    const handleEquip = useCallback(
        (theme) => {
            setEquippedSlug(theme.id);
            onThemeChange?.(theme.id);
            toast.success(`Equipped ${theme.name}`);
        },
        [onThemeChange],
    );

    const handleUnequip = useCallback(
        (theme) => {
            setEquippedSlug("default");
            onThemeChange?.("default");
            toast.success("Reset to default bubble");
        },
        [onThemeChange],
    );

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
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">
                        Bubble Themes
                    </span>
                </div>

                {/* Theme List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                    {BUBBLE_THEMES.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            equipped={equippedSlug === theme.id}
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
