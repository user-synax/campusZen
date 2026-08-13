"use client";

import ShopItemIcon from "@/components/shared/ShopItemIcon";

// Renders a purchased cosmetic badge flair near the username on a profile.
// Deliberately styled differently from earned/verification badges:
// dashed ring + tinted pill so users don't confuse a bought flex with an
// achievement/verification.
export default function CosmeticBadge({ item }) {
    if (!item) return null;
    const color = item.visual?.color || "#94a3b8";
    const name = item.name || "Cosmetic";

    return (
        <span
            title={`${name} · shop item`}
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] font-bold shrink-0"
            style={{
                borderColor: `${color}99`,
                color,
                background: `${color}14`,
            }}
        >
            <ShopItemIcon
                iconName={item.visual?.icon}
                rarity={item.rarity}
                visual={item.visual}
                className="w-3.5 h-3.5"
            />
            {name}
        </span>
    );
}
