"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ThemeContext = createContext({
    theme: "light",
    setTheme: () => { },
    toggleTheme: () => { },
    customThemes: [],
    addCustomTheme: () => { },
    deleteCustomTheme: () => { },
    editCustomTheme: () => { },
});

// PREMIUM THEME PRESETS
export const PREMIUM_THEMES = [
    {
        id: "nebula",
        name: "Nebula",
        colors: {
            primary: "#a855f7",
            background: "#0f0a1a",
            foreground: "#f8fafc",
            card: "#1a122b",
            cardForeground: "#f8fafc",
            muted: "#251a3d",
            mutedForeground: "#94a3b8",
            accent: "#2d1b4e",
            accentForeground: "#f8fafc",
            border: "#3e2a66",
        },
        isPremium: true,
    },
    {
        id: "sunset",
        name: "Sunset",
        colors: {
            primary: "#f97316",
            background: "#1a0f0a",
            foreground: "#fff7ed",
            card: "#2a1410",
            cardForeground: "#fff7ed",
            muted: "#3d1a12",
            mutedForeground: "#fed7aa",
            accent: "#4e1f15",
            accentForeground: "#fff7ed",
            border: "#662a1e",
        },
        isPremium: true,
    },
    {
        id: "cyberpunk",
        name: "Cyberpunk",
        colors: {
            primary: "#06b6d4",
            background: "#0a0a12",
            foreground: "#f0f9ff",
            card: "#121223",
            cardForeground: "#f0f9ff",
            muted: "#1a1a33",
            mutedForeground: "#7dd3fc",
            accent: "#222244",
            accentForeground: "#f0f9ff",
            border: "#333366",
        },
        isPremium: true,
    },
    {
        id: "forest",
        name: "Forest",
        colors: {
            primary: "#10b981",
            background: "#0a120a",
            foreground: "#ecfdf5",
            card: "#102010",
            cardForeground: "#ecfdf5",
            muted: "#1a331a",
            mutedForeground: "#86efac",
            accent: "#224422",
            accentForeground: "#ecfdf5",
            border: "#336633",
        },
        isPremium: true,
    },
    {
        id: "obsidian",
        name: "Obsidian",
        colors: {
            primary: "#8B7CFF",
            background: "#0B0C10",
            foreground: "#F6F7FB",
            card: "#14161C",
            cardForeground: "#F6F7FB",
            muted: "#1D212A",
            mutedForeground: "#A4ADBC",
            accent: "#252B38",
            accentForeground: "#FFFFFF",
            border: "#2F3645",
        },
        isPremium: true,
    },
    {
        id: "bordeaux",
        name: "Bordeaux",
        colors: {
            primary: "#D85C7A",
            background: "#130D11",
            foreground: "#FAF5F7",
            card: "#1C1519",
            cardForeground: "#FAF5F7",
            muted: "#2C2328",
            mutedForeground: "#C1AAB3",
            accent: "#433039",
            accentForeground: "#FFFFFF",
            border: "#5A434C",
        },
        isPremium: true,
    },
    {
        id: "arctic",
        name: "Arctic",
        colors: {
            primary: "#69A7FF",
            background: "#0E1723",
            foreground: "#F6FAFF",
            card: "#172230",
            cardForeground: "#F6FAFF",
            muted: "#233244",
            mutedForeground: "#A3B6CA",
            accent: "#2D425A",
            accentForeground: "#FFFFFF",
            border: "#3F5772",
        },
        isPremium: true,
    },
    {
        id: "emerald-noir",
        name: "Emerald Noir",
        colors: {
            primary: "#3FCF9B",
            background: "#09120F",
            foreground: "#F3FCF8",
            card: "#121D19",
            cardForeground: "#F3FCF8",
            muted: "#1D2F28",
            mutedForeground: "#9CB7AD",
            accent: "#284139",
            accentForeground: "#FFFFFF",
            border: "#37544A",
        },
        isPremium: true,
    },
    {
        id: "royal",
        name: "Royal",
        colors: {
            primary: "#9A7CFF",
            background: "#120F1E",
            foreground: "#F8F7FD",
            card: "#1B1830",
            cardForeground: "#F8F7FD",
            muted: "#292344",
            mutedForeground: "#AEA7CB",
            accent: "#39315D",
            accentForeground: "#FFFFFF",
            border: "#4D4378",
        },
        isPremium: true,
    },
    {
        id: "walnut",
        name: "Walnut",
        colors: {
            primary: "#D8A06A",
            background: "#171311",
            foreground: "#F8F3EE",
            card: "#221B18",
            cardForeground: "#F8F3EE",
            muted: "#302724",
            mutedForeground: "#BBAAA0",
            accent: "#43342D",
            accentForeground: "#FFF9F5",
            border: "#56453D",
        },
        isPremium: true,
    },
    {
        id: "rose-gold",
        name: "Rose Gold",
        colors: {
            primary: "#F28AAE",
            background: "#171114",
            foreground: "#FFF8FA",
            card: "#22181D",
            cardForeground: "#FFF8FA",
            muted: "#32252C",
            mutedForeground: "#C6AAB6",
            accent: "#47323D",
            accentForeground: "#FFFFFF",
            border: "#5D4350",
        },
        isPremium: true,
    },
    {
        id: "midnight",
        name: "Midnight",
        colors: {
            primary: "#5E8CFF",
            background: "#0A101A",
            foreground: "#F5F8FD",
            card: "#121A26",
            cardForeground: "#F5F8FD",
            muted: "#1D2838",
            mutedForeground: "#A3B0C4",
            accent: "#29384C",
            accentForeground: "#FFFFFF",
            border: "#3A4B63",
        },
        isPremium: true,
    },
    {
        id: "graphite",
        name: "Graphite",
        colors: {
            primary: "#8FA4C7",
            background: "#111214",
            foreground: "#F5F5F4",
            card: "#181A1F",
            cardForeground: "#F5F5F4",
            muted: "#23262C",
            mutedForeground: "#A1A1AA",
            accent: "#2D313A",
            accentForeground: "#FFFFFF",
            border: "#3D424D",
        },
        isPremium: true,
    },
    {
        id: "aurora",
        name: "Aurora",
        colors: {
            primary: "#62D6C8",
            background: "#0A1014",
            foreground: "#F4FBFC",
            card: "#131D24",
            cardForeground: "#F4FBFC",
            muted: "#1D2C35",
            mutedForeground: "#A0B8BE",
            accent: "#27404B",
            accentForeground: "#FFFFFF",
            border: "#395562",
        },
        isPremium: true,
    },
    {
        id: "ivory",
        name: "Ivory",
        colors: {
            primary: "#B8864A",
            background: "#FAF7F2",
            foreground: "#2B241D",
            card: "#FFFFFF",
            cardForeground: "#2B241D",
            muted: "#F1E8DD",
            mutedForeground: "#7A6A5C",
            accent: "#F6E2CA",
            accentForeground: "#8A531C",
            border: "#E4D5C4",
        },
        isPremium: true,
    },
    {
        id: "arctic-light",
        name: "Arctic Light",
        colors: {
            primary: "#4C7EFF",
            background: "#F5F9FF",
            foreground: "#182433",
            card: "#FFFFFF",
            cardForeground: "#182433",
            muted: "#EAF1FB",
            mutedForeground: "#64748B",
            accent: "#DCE9FF",
            accentForeground: "#2952C8",
            border: "#D5E0EF",
        },
        isPremium: true,
    },
    {
        id: "sage",
        name: "Sage",
        colors: {
            primary: "#3FAE8D",
            background: "#F4FAF6",
            foreground: "#1F2C28",
            card: "#FFFFFF",
            cardForeground: "#1F2C28",
            muted: "#E6F2EC",
            mutedForeground: "#70857C",
            accent: "#D9F0E4",
            accentForeground: "#22634D",
            border: "#CBDDD4",
        },
        isPremium: true,
    },
    {
        id: "lavender",
        name: "Lavender",
        colors: {
            primary: "#7C6CFF",
            background: "#FBFAFF",
            foreground: "#2B2440",
            card: "#FFFFFF",
            cardForeground: "#2B2440",
            muted: "#F1EDFA",
            mutedForeground: "#786F92",
            accent: "#E8DFFF",
            accentForeground: "#5B42CC",
            border: "#DED5F3",
        },
        isPremium: true,
    },
    {
        id: "mist",
        name: "Mist",
        colors: {
            primary: "#5F8DFF",
            background: "#F7F8FA",
            foreground: "#1F2937",
            card: "#FFFFFF",
            cardForeground: "#1F2937",
            muted: "#ECEFF3",
            mutedForeground: "#6B7280",
            accent: "#E4EBFF",
            accentForeground: "#3654C5",
            border: "#D8DEE8",
        },
        isPremium: true,
    },
    {
        id: "champagne",
        name: "Champagne",
        colors: {
            primary: "#C69258",
            background: "#FCF8F2",
            foreground: "#2F271F",
            card: "#FFFFFF",
            cardForeground: "#2F271F",
            muted: "#F3EBDF",
            mutedForeground: "#78695A",
            accent: "#F8E3C8",
            accentForeground: "#8B551D",
            border: "#E7D8C7",
        },
        isPremium: true,
    },
    {
        id: "pearl",
        name: "Pearl",
        colors: {
            primary: "#6B82FF",
            background: "#F9FAFC",
            foreground: "#202938",
            card: "#FFFFFF",
            cardForeground: "#202938",
            muted: "#EEF1F5",
            mutedForeground: "#6E7788",
            accent: "#E2E9FF",
            accentForeground: "#3B57C6",
            border: "#DCE2EB",
        },
        isPremium: true,
    },
    {
        id: "blush",
        name: "Blush",
        colors: {
            primary: "#E97A9A",
            background: "#FFF9FB",
            foreground: "#382630",
            card: "#FFFFFF",
            cardForeground: "#382630",
            muted: "#F8EDF2",
            mutedForeground: "#8A6F7B",
            accent: "#FFE1EB",
            accentForeground: "#B33B67",
            border: "#ECD7E0",
        },
        isPremium: true,
    },
    {
        id: "mint",
        name: "Mint",
        colors: {
            primary: "#31B99A",
            background: "#F5FCFA",
            foreground: "#1C2E2A",
            card: "#FFFFFF",
            cardForeground: "#1C2E2A",
            muted: "#E7F5F1",
            mutedForeground: "#6C857D",
            accent: "#D5F3E8",
            accentForeground: "#1D755B",
            border: "#CBE3DA",
        },
        isPremium: true,
    },
    {
        id: "sky",
        name: "Sky",
        colors: {
            primary: "#4F80FF",
            background: "#F4F9FF",
            foreground: "#1D2938",
            card: "#FFFFFF",
            cardForeground: "#1D2938",
            muted: "#E7F0FB",
            mutedForeground: "#66788E",
            accent: "#D8E8FF",
            accentForeground: "#2C58C5",
            border: "#D0DCEB",
        },
        isPremium: true,
    },
    {
        id: "midnight_neon",
        name: "Midnight Neon",
        colors: {
            primary: "#7C5CFF",
            background: "#0B0F1A",
            foreground: "#E6E8EF",
            card: "#11182A",
            cardForeground: "#E6E8EF",
            muted: "#1A2238",
            mutedForeground: "#9AA4B2",
            accent: "#1F2A44",
            accentForeground: "#B8C0FF",
            border: "#24304D",
        },
        isPremium: true,
    },
    {
        id: "obsidian_gold",
        name: "Obsidian Gold",
        colors: {
            primary: "#D4AF37",
            background: "#0A0A0B",
            foreground: "#F5F5F5",
            card: "#121214",
            cardForeground: "#F5F5F5",
            muted: "#1C1C1F",
            mutedForeground: "#A1A1AA",
            accent: "#2A2415",
            accentForeground: "#E7C76A",
            border: "#2B2B30",
        },
        isPremium: true,
    },
    {
        id: "aurora_dark",
        name: "Aurora Dark",
        colors: {
            primary: "#2EE6A6",
            background: "#050A0F",
            foreground: "#EAFBF6",
            card: "#0C141C",
            cardForeground: "#EAFBF6",
            muted: "#12212C",
            mutedForeground: "#93A4B3",
            accent: "#163A2F",
            accentForeground: "#5CF2C2",
            border: "#1A2A36",
        },
        isPremium: true,
    },
    {
        id: "sunset_pearl",
        name: "Sunset Pearl",
        colors: {
            primary: "#F97316",
            background: "#FFF8F3",
            foreground: "#1C1B1A",
            card: "#FFFFFF",
            cardForeground: "#1C1B1A",
            muted: "#FDEEE3",
            mutedForeground: "#7A6A63",
            accent: "#FFE2CC",
            accentForeground: "#C2410C",
            border: "#F3D5C6",
        },
        isPremium: true,
    },
    {
        id: "executive_slate",
        name: "Executive Slate",
        colors: {
            primary: "#2563EB",
            background: "#F8FAFC",
            foreground: "#0F172A",
            card: "#FFFFFF",
            cardForeground: "#0F172A",
            muted: "#EEF2F7",
            mutedForeground: "#64748B",
            accent: "#E2E8F0",
            accentForeground: "#1D4ED8",
            border: "#D9E2EC",
        },
        isPremium: true,
    },
    {
        id: "creator_blush",
        name: "Creator Blush",
        colors: {
            primary: "#EC4899",
            background: "#FFF7FB",
            foreground: "#1F1D2B",
            card: "#FFFFFF",
            cardForeground: "#1F1D2B",
            muted: "#FDE7F3",
            mutedForeground: "#6B5B6E",
            accent: "#FBCFE8",
            accentForeground: "#BE185D",
            border: "#F3D1E6",
        },
        isPremium: true,
    },
    {
        id: "developer_mint",
        name: "Developer Mint",
        colors: {
            primary: "#10B981",
            background: "#F6FFFB",
            foreground: "#0F172A",
            card: "#FFFFFF",
            cardForeground: "#0F172A",
            muted: "#E6F7F1",
            mutedForeground: "#5B7B6F",
            accent: "#CFFAEA",
            accentForeground: "#047857",
            border: "#BFE7DA",
        },
        isPremium: true,
    },
    {
        id: "quantum_glass",
        name: "Quantum Glass",
        colors: {
            primary: "#00D4FF",
            background: "#F6FBFF",
            foreground: "#0B1B2B",
            card: "rgba(255,255,255,0.7)",
            cardForeground: "#0B1B2B",
            muted: "#EAF6FF",
            mutedForeground: "#5B728A",
            accent: "#D9F3FF",
            accentForeground: "#007A99",
            border: "#CFE9F7",
        },
        isPremium: true,
    },
    {
        id: "hologram_iris",
        name: "Hologram Iris",
        colors: {
            primary: "#6D5BFF",
            background: "#F9FAFF",
            foreground: "#1A1B2E",
            card: "#FFFFFF",
            cardForeground: "#1A1B2E",
            muted: "#F1F2FF",
            mutedForeground: "#6B6F8A",
            accent: "#E8E6FF",
            accentForeground: "#4B3FFF",
            border: "#DADCFB",
        },
        isPremium: true,
    },
    {
        id: "plasma_drift",
        name: "Plasma Drift",
        colors: {
            primary: "#FF4FD8",
            background: "#FDF7FF",
            foreground: "#1F1235",
            card: "#FFFFFF",
            cardForeground: "#1F1235",
            muted: "#F6E9FF",
            mutedForeground: "#6E5A7A",
            accent: "#FFE0FA",
            accentForeground: "#C218A0",
            border: "#EDD4FF",
        },
        isPremium: true,
    },
    {
        id: "void_matrix",
        name: "Void Matrix",
        colors: {
            primary: "#00F5D4",
            background: "#050607",
            foreground: "#E6FFFB",
            card: "#0B0F12",
            cardForeground: "#E6FFFB",
            muted: "#11181D",
            mutedForeground: "#8AA6A3",
            accent: "#0E1F1C",
            accentForeground: "#00F5D4",
            border: "#1B2A2A",
        },
        isPremium: true,
    },
    {
        id: "cosmic_ember",
        name: "Cosmic Ember",
        colors: {
            primary: "#FF6B3D",
            background: "#0B0A10",
            foreground: "#F5F3FF",
            card: "#14101C",
            cardForeground: "#F5F3FF",
            muted: "#1E1826",
            mutedForeground: "#B3A8C6",
            accent: "#2A1E2B",
            accentForeground: "#FF9B6A",
            border: "#32263A",
        },
        isPremium: true,
    },
    {
        id: "phantom_indigo",
        name: "Phantom Indigo",
        colors: {
            primary: "#6366F1",
            background: "#0A0B14",
            foreground: "#EDEFFF",
            card: "#121427",
            cardForeground: "#EDEFFF",
            muted: "#1A1D36",
            mutedForeground: "#9AA3C7",
            accent: "#23264A",
            accentForeground: "#A5ADFF",
            border: "#2C2F55",
        },
        isPremium: true,
    },
    {
        id: "synapse_dark",
        name: "Synapse Dark",
        colors: {
            primary: "#00E5FF",
            background: "#05070A",
            foreground: "#EAFBFF",
            card: "#0C1117",
            cardForeground: "#EAFBFF",
            muted: "#111A22",
            mutedForeground: "#8FB6C2",
            accent: "#0E2A33",
            accentForeground: "#3DF0FF",
            border: "#1B2F3A",
        },
        isPremium: true,
    },
    {
        id: "crimson_eclipse",
        name: "Crimson Eclipse",
        colors: {
            primary: "#FF4D6D",
            background: "#14070C",
            foreground: "#FFF4F6",
            card: "#221017",
            cardForeground: "#FFF4F6",
            muted: "#31171F",
            mutedForeground: "#C9A7AF",
            accent: "#431A27",
            accentForeground: "#FF9CB1",
            border: "#5A2736",
        },
        isPremium: true,
    },
    {
        id: "citrus_fusion",
        name: "Citrus Fusion",
        colors: {
            primary: "#CFCE27",
            background: "#FBFDF2",
            foreground: "#2E330F",
            card: "#F5F8DC",
            cardForeground: "#2E330F",
            muted: "#E9EEBE",
            mutedForeground: "#6F7340",
            accent: "#E2E76A",
            accentForeground: "#4B510A",
            border: "#D7DE8A",
        },
        isPremium: true,
    },
    {
        id: "lime_bloom",
        name: "Lime Bloom",
        colors: {
            primary: "#8AE831",
            background: "#F7FFF2",
            foreground: "#18310D",
            card: "#ECFBDD",
            cardForeground: "#18310D",
            muted: "#D8F2BF",
            mutedForeground: "#557044",
            accent: "#B7F06F",
            accentForeground: "#2C5A10",
            border: "#C5E89B",
        },
        isPremium: true,
    },
    {
        id: "ocean_breeze",
        name: "Ocean Breeze",
        colors: {
            primary: "#0EA5E9",
            background: "#F0FAFF",
            foreground: "#0C2233",
            card: "#FFFFFF",
            cardForeground: "#0C2233",
            muted: "#E1F3FC",
            mutedForeground: "#4E6C7E",
            accent: "#CBEBFB",
            accentForeground: "#0369A1",
            border: "#C5E2EF",
        },
        isPremium: true,
    },
    {
        id: "copper_forge",
        name: "Copper Forge",
        colors: {
            primary: "#E0793C",
            background: "#150F0B",
            foreground: "#FBF1E9",
            card: "#221912",
            cardForeground: "#FBF1E9",
            muted: "#31241A",
            mutedForeground: "#CDA98D",
            accent: "#402C1D",
            accentForeground: "#FFB784",
            border: "#54392A",
        },
        isPremium: true,
    },
    {
        id: "velvet_night",
        name: "Velvet Night",
        colors: {
            primary: "#B14FE0",
            background: "#100916",
            foreground: "#F7EEFB",
            card: "#1B1023",
            cardForeground: "#F7EEFB",
            muted: "#281734",
            mutedForeground: "#BDA1CC",
            accent: "#37204A",
            accentForeground: "#E7A8FF",
            border: "#4A2C5F",
        },
        isPremium: true,
    },
    {
        id: "peach_fuzz",
        name: "Peach Fuzz",
        colors: {
            primary: "#FF8C69",
            background: "#FFF9F5",
            foreground: "#332018",
            card: "#FFFFFF",
            cardForeground: "#332018",
            muted: "#FDECE3",
            mutedForeground: "#8A6C5D",
            accent: "#FFDCC9",
            accentForeground: "#B84B22",
            border: "#F2D9CA",
        },
        isPremium: true,
    },
    {
        id: "steel_blue",
        name: "Steel Blue",
        colors: {
            primary: "#4A6FA5",
            background: "#0D1420",
            foreground: "#EDF2FA",
            card: "#151F2E",
            cardForeground: "#EDF2FA",
            muted: "#1E2C40",
            mutedForeground: "#93A5BE",
            accent: "#26374F",
            accentForeground: "#9FC1F0",
            border: "#324863",
        },
        isPremium: true,
    },
    {
        id: "coral_reef",
        name: "Coral Reef",
        colors: {
            primary: "#FF6F61",
            background: "#FFF7F6",
            foreground: "#2E1714",
            card: "#FFFFFF",
            cardForeground: "#2E1714",
            muted: "#FDE7E4",
            mutedForeground: "#8C6560",
            accent: "#FFD5CE",
            accentForeground: "#C23B2C",
            border: "#F1D2CC",
        },
        isPremium: true,
    },
    {
        id: "golden_hour",
        name: "Golden Hour",
        colors: {
            primary: "#F5B942",
            background: "#180F05",
            foreground: "#FDF6E8",
            card: "#241708",
            cardForeground: "#FDF6E8",
            muted: "#332208",
            mutedForeground: "#D9C39A",
            accent: "#452E0B",
            accentForeground: "#FFD989",
            border: "#5A3E11",
        },
        isPremium: true,
    },
    {
        id: "frost",
        name: "Frost",
        colors: {
            primary: "#38BDF8",
            background: "#FBFEFF",
            foreground: "#0F2733",
            card: "#FFFFFF",
            cardForeground: "#0F2733",
            muted: "#E6F6FD",
            mutedForeground: "#5A7A88",
            accent: "#D2EFFC",
            accentForeground: "#0A6E9E",
            border: "#CDE7F3",
        },
        isPremium: true,
    },
];

function parseColorToRgb(color) {
    if (color.startsWith("#")) {
        return {
            r: parseInt(color.slice(1, 3), 16) / 255,
            g: parseInt(color.slice(3, 5), 16) / 255,
            b: parseInt(color.slice(5, 7), 16) / 255,
        };
    }
    const rgbaMatch = color.match(
        /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
    );
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1]) / 255,
            g: parseInt(rgbaMatch[2]) / 255,
            b: parseInt(rgbaMatch[3]) / 255,
        };
    }
    return { r: 0, g: 0, b: 0 };
}

function hexToHsl(color) {
    const { r, g, b } = parseColorToRgb(color);

    let max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h,
        s,
        l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const CSS_VARS = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
    "--input",
    "--ring",
];

function removeCssVars(root) {
    CSS_VARS.forEach((v) => root.style.removeProperty(v));
}

function findThemeColors(themeId, customThemes) {
    const custom = customThemes.find((t) => t.id === themeId);
    if (custom) return custom.colors;
    const premium = PREMIUM_THEMES.find((t) => t.id === themeId);
    if (premium) return premium.colors;
    return null;
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(undefined);
    const [customThemes, setCustomThemes] = useState([]);
    const pathname = usePathname();

    const isPublicOrAuthRoute =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/privacy") ||
        pathname.startsWith("/terms") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/docs");

    // Initialize custom themes and selected theme
    useEffect(() => {
        const storedCustomThemes = localStorage.getItem("customThemes");
        if (storedCustomThemes) {
            setCustomThemes(JSON.parse(storedCustomThemes));
        }

        const storedTheme = localStorage.getItem("theme");
        if (storedTheme) {
            setThemeState(storedTheme);
        } else {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches;
            setThemeState(prefersDark ? "dark" : "light");
        }
    }, []);

    // Apply theme styles
    useEffect(() => {
        if (!theme) return;

        const root = window.document.documentElement;

        if (isPublicOrAuthRoute) {
            root.classList.remove("light");
            root.classList.add("dark");
            removeCssVars(root);
            return;
        }

        root.classList.remove("light", "dark");
        removeCssVars(root);

        if (theme === "light" || theme === "dark") {
            root.classList.add(theme);
        } else {
            const colors = findThemeColors(theme, customThemes);
            if (colors) {
                root.style.setProperty("--background", hexToHsl(colors.background));
                root.style.setProperty("--foreground", hexToHsl(colors.foreground));
                root.style.setProperty("--card", hexToHsl(colors.card));
                root.style.setProperty("--card-foreground", hexToHsl(colors.cardForeground));
                root.style.setProperty("--popover", hexToHsl(colors.card));
                root.style.setProperty("--popover-foreground", hexToHsl(colors.cardForeground));
                root.style.setProperty("--primary", hexToHsl(colors.primary));
                root.style.setProperty("--primary-foreground", hexToHsl(colors.background));
                root.style.setProperty("--secondary", hexToHsl(colors.muted));
                root.style.setProperty("--secondary-foreground", hexToHsl(colors.foreground));
                root.style.setProperty("--muted", hexToHsl(colors.muted));
                root.style.setProperty("--muted-foreground", hexToHsl(colors.mutedForeground));
                root.style.setProperty("--accent", hexToHsl(colors.accent));
                root.style.setProperty("--accent-foreground", hexToHsl(colors.accentForeground));
                root.style.setProperty("--destructive", hexToHsl("#ef4444"));
                root.style.setProperty("--destructive-foreground", hexToHsl("#ffffff"));
                root.style.setProperty("--border", hexToHsl(colors.border));
                root.style.setProperty("--input", hexToHsl(colors.border));
                root.style.setProperty("--ring", hexToHsl(colors.primary));
            }
        }
    }, [theme, customThemes, isPublicOrAuthRoute]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (!localStorage.getItem("theme")) {
                setThemeState(mediaQuery.matches ? "dark" : "light");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const setTheme = (newTheme) => {
        localStorage.setItem("theme", newTheme);
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        if (theme === "dark") {
            setTheme("light");
        } else if (theme === "light") {
            setTheme("dark");
        } else {
            setTheme("light");
        }
    };

    const addCustomTheme = (newTheme) => {
        const updated = [...customThemes, newTheme];
        setCustomThemes(updated);
        localStorage.setItem("customThemes", JSON.stringify(updated));
    };

    const deleteCustomTheme = (themeId) => {
        const updated = customThemes.filter((t) => t.id !== themeId);
        setCustomThemes(updated);
        localStorage.setItem("customThemes", JSON.stringify(updated));

        if (theme === themeId) {
            setTheme("light");
        }
    };

    const editCustomTheme = (updatedTheme) => {
        const updated = customThemes.map((t) =>
            t.id === updatedTheme.id ? updatedTheme : t,
        );
        setCustomThemes(updated);
        localStorage.setItem("customThemes", JSON.stringify(updated));
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
                customThemes,
                addCustomTheme,
                deleteCustomTheme,
                editCustomTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
