// ============================================
// CHAT BUBBLE THEME REGISTRY
// Single source of truth for bubble theme definitions.
//
// Adding a new theme = adding one object here + one matching
// ShopItem in lib/shopItems.js (category: "chat_bubble",
// slug matches the theme id). No other files need changes.
//
// Each theme defines CSS for two contexts:
//   ownBubble   — styling for the current user's sent messages
//   otherBubble — styling for messages from other users
//
// Properties:
//   id          — unique key, matches ShopItem slug
//   name        — display name
//   rarity      — common | uncommon | rare | epic | legendary | mythic
//   priceVP     — price in Viper Coins
//   borderStyle — "static" | "animated"
//   ownBubble   — { className, style } applied to own-message bubble div
//   otherBubble — { className, style } applied to other-message bubble div
//   pattern     — null | { type: "svg", value: "<svg>...</svg>" }
//                 SVG patterns use currentColor / CSS vars for theme adaptivity
// ============================================

export const BUBBLE_THEMES = [
    // ── Default (no theme equipped) ──
    // This is the fallback when a user has no chat_bubble equipped.
    // It is NOT a purchasable item — it represents the current plain bubble.
    {
        id: "default",
        name: "Default",
        rarity: "common",
        priceVP: 0,
        borderStyle: "static",
        ownBubble: {
            className:
                "bg-linear-to-br from-[#7130f3] to-[#5b1fd0] text-white rounded-br-md",
            style: {},
        },
        otherBubble: {
            className: "bg-card border border-border text-foreground rounded-bl-md",
            style: {},
        },
        pattern: null,
    },

    // ── Purchasable Themes ──

    {
        id: "neon-glow",
        name: "Neon Glow",
        rarity: "rare",
        priceVP: 300,
        borderStyle: "animated",
        ownBubble: {
            className:
                "bg-black text-green-400 rounded-br-md border border-green-500/50",
            style: {
                boxShadow: "0 0 8px rgba(34,197,94,0.4), inset 0 0 8px rgba(34,197,94,0.1)",
            },
        },
        otherBubble: {
            className:
                "bg-black/80 text-green-400 rounded-bl-md border border-green-500/30",
            style: {
                boxShadow: "0 0 6px rgba(34,197,94,0.3)",
            },
        },
        pattern: null,
    },

    {
        id: "frosted-glass",
        name: "Frosted Glass",
        rarity: "epic",
        priceVP: 400,
        borderStyle: "static",
        ownBubble: {
            className:
                "bg-white/10 text-white rounded-br-md backdrop-blur-md border border-white/20",
            style: {},
        },
        otherBubble: {
            className:
                "bg-muted/30 text-foreground rounded-bl-md backdrop-blur-md border border-border/40",
            style: {},
        },
        pattern: null,
    },

    {
        id: "sunset-fire",
        name: "Sunset Fire",
        rarity: "legendary",
        priceVP: 500,
        borderStyle: "animated",
        ownBubble: {
            className:
                "bg-linear-to-br from-orange-500 to-red-600 text-white rounded-br-md border border-orange-400/40",
            style: {},
        },
        otherBubble: {
            className:
                "bg-linear-to-br from-orange-500/10 to-red-600/10 text-foreground rounded-bl-md border border-orange-400/30",
            style: {},
        },
        pattern: null,
    },
    {
        id: "circuit-trace",
        name: "Circuit Trace",
        rarity: "rare",
        priceVP: 300,
        borderStyle: "static",
        ownBubble: {
            className:
                "bg-black text-cyan-300 rounded-br-md border border-cyan-500/50",
            style: {},
        },
        otherBubble: {
            className:
                "bg-black/80 text-cyan-300 rounded-bl-md border border-cyan-500/30",
            style: {},
        },
        pattern: {
            type: "svg",
            value:
                "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 20h12M20 0v12M20 28v12M28 20h12M20 12a8 8 0 100 16 8 8 0 000-16z' stroke='currentColor' stroke-width='1' fill='none'/></svg>",
        },
    },

    {
        id: "ocean-depth",
        name: "Ocean Depth",
        rarity: "epic",
        priceVP: 400,
        borderStyle: "static",
        ownBubble: {
            className:
                "bg-linear-to-br from-cyan-600 to-blue-700 text-white rounded-br-md border border-cyan-400/30",
            style: {},
        },
        otherBubble: {
            className:
                "bg-linear-to-br from-cyan-600/10 to-blue-700/10 text-foreground rounded-bl-md border border-cyan-400/20",
            style: {},
        },
        pattern: null,
    },

    {
        id: "matrix-rain",
        name: "Matrix Rain",
        rarity: "mythic",
        priceVP: 500,
        borderStyle: "animated",
        ownBubble: {
            className:
                "bg-black text-green-400 rounded-br-md border border-green-600/50",
            style: {
                textShadow: "0 0 4px rgba(34,197,94,0.6)",
            },
        },
        otherBubble: {
            className:
                "bg-black/90 text-green-400 rounded-bl-md border border-green-600/30",
            style: {
                textShadow: "0 0 3px rgba(34,197,94,0.4)",
            },
        },
        pattern: {
            type: "svg",
            value:
                '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="matrix-rain-pat" width="20" height="20" patternUnits="userSpaceOnUse"><text x="2" y="14" font-family="monospace" font-size="10" fill="currentColor">01</text></pattern></defs><rect width="100%" height="100%" fill="url(%23matrix-rain-pat)"/></svg>',
        },
    },

    {
        id: "cyber-punk",
        name: "Cyber Punk",
        rarity: "legendary",
        priceVP: 500,
        borderStyle: "animated",
        ownBubble: {
            className:
                "bg-black text-fuchsia-400 rounded-br-md border border-fuchsia-500/50",
            style: {
                boxShadow:
                    "0 0 8px rgba(217,70,239,0.3), 0 0 20px rgba(217,70,239,0.1)",
            },
        },
        otherBubble: {
            className:
                "bg-black/80 text-fuchsia-400 rounded-bl-md border border-fuchsia-500/30",
            style: {
                boxShadow: "0 0 6px rgba(217,70,239,0.2)",
            },
        },
        pattern: null,
    },
    {
        id: "hatch-lines",
        name: "Hatch Lines",
        rarity: "common",
        priceVP: 100,
        borderStyle: "static",
        ownBubble: { className: "bg-card text-foreground rounded-br-md border border-border", style: {} },
        otherBubble: { className: "bg-card/90 text-foreground rounded-bl-md border border-border", style: {} },
        pattern: { type: "css", value: "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 6px)" },
    },
    {
        id: "terrain-waves",
        name: "Terrain Waves",
        rarity: "uncommon",
        priceVP: 175,
        borderStyle: "static",
        ownBubble: { className: "bg-black text-teal-300 rounded-br-md border border-teal-500/40", style: {} },
        otherBubble: { className: "bg-black/85 text-teal-300 rounded-bl-md border border-teal-500/25", style: {} },
        pattern: { type: "css", value: "repeating-radial-gradient(circle at 0 0, currentColor 0 1px, transparent 1px 12px)" },
    },
    {
        id: "starburst",
        name: "Starburst",
        rarity: "rare",
        priceVP: 300,
        borderStyle: "static",
        ownBubble: { className: "bg-black text-violet-300 rounded-br-md border border-violet-500/45", style: {} },
        otherBubble: { className: "bg-black/85 text-violet-300 rounded-bl-md border border-violet-500/30", style: {} },
        pattern: { type: "css", value: "repeating-conic-gradient(from 0deg, currentColor 0deg 1deg, transparent 1deg 18deg)" },
    },
    {
        id: "hex-frame",
        name: "Hex Frame",
        rarity: "rare",
        priceVP: 300,
        borderStyle: "animated",
        ownBubble: { className: "bg-black text-amber-300 rounded-br-md border border-amber-500/45", style: {} },
        otherBubble: { className: "bg-black/85 text-amber-300 rounded-bl-md border border-amber-500/30", style: {} },
        pattern: { type: "css", value: "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 14px), repeating-linear-gradient(60deg, currentColor 0 1px, transparent 1px 14px), repeating-linear-gradient(120deg, currentColor 0 1px, transparent 1px 14px)" },
    },
    {
        id: "prism-fracture",
        name: "Prism Fracture",
        rarity: "legendary",
        priceVP: 500,
        borderStyle: "animated",
        ownBubble: { className: "bg-black text-pink-300 rounded-br-md border border-pink-500/50", style: {} },
        otherBubble: { className: "bg-black/85 text-pink-300 rounded-bl-md border border-pink-500/35", style: {} },
        pattern: { type: "css", value: "repeating-linear-gradient(30deg, currentColor 0 1px, transparent 1px 11px), repeating-linear-gradient(-30deg, currentColor 0 1px, transparent 1px 11px)" },
    },
];

// ── Lookup helpers ──

/** Get theme by id. Returns the "default" theme if id is null/undefined/unknown. */
export function getBubbleTheme(themeId) {
    if (!themeId) return BUBBLE_THEMES[0];
    return BUBBLE_THEMES.find((t) => t.id === themeId) || BUBBLE_THEMES[0];
}

/** Check if a theme id is the built-in default (not a purchased item). */
export function isDefaultTheme(themeId) {
    return !themeId || themeId === "default";
}