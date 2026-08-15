import mongoose from "mongoose";

// Shop categories — must stay in sync with AdminShopManager CATEGORIES.
export const SHOP_CATEGORIES = [
    "avatar_frame",
    "username_color",
    "profile_banner",
    "post_badge",
    "chat_bubble",
    "bio_theme",
    "special_badge",
    "profile_theme",
    "effect",
    "entry_effect",
    // Profile-only cosmetics (MVP shop items)
    "profile_bg",
    "profile_layout",
];

export const SHOP_RARITIES = [
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "mythic",
];

const visualSchema = new mongoose.Schema(
    {
        icon: { type: String, default: "Package" },
        color: { type: String, default: "#94a3b8" },
        className: { type: String, default: "" },
        // Static image URL (e.g. profile banner). Optional — most items
        // are pure CSS (icon/color/className) and leave this empty.
        imageUrl: { type: String, default: "" },
        // Avatar-frame overlay asset: a transparent-center GIF/WebM/APNG
        // that sits ON TOP of the avatar image (Discord-style). When set,
        // the profile render uses the overlay approach instead of (or in
        // addition to) the CSS border/glow.
        frameAssetUrl: { type: String, default: "" },
    },
    { _id: false },
);

const ownedSnapshotSchema = new mongoose.Schema(
    {
        // Reference to the catalog item (kept for auditing / re-sync).
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ShopItem",
        },
        slug: { type: String },
        name: { type: String },
        category: { type: String, enum: SHOP_CATEGORIES },
                rarity: { type: String, enum: SHOP_RARITIES, default: "common" },
                price: { type: Number, default: 0 },
                // Self-contained visual snapshot so rendering works even if a
                // catalog item is later deleted.
                visual: {
                    icon: { type: String, default: "Package" },
                    color: { type: String, default: "#94a3b8" },
                    className: { type: String, default: "" },
                    imageUrl: { type: String, default: "" },
                    frameAssetUrl: { type: String, default: "" },
                },
    },
    { _id: false },
);

const shopItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: { type: String, default: "", maxlength: 100 },
        category: {
            type: String,
            enum: SHOP_CATEGORIES,
            required: true,
        },
        // Price in VP (Viper Coins). Resolved server-side at purchase.
        price: { type: Number, required: true, min: 0 },
        rarity: {
            type: String,
            enum: SHOP_RARITIES,
            default: "common",
        },
        visual: { type: visualSchema, default: () => ({}) },
        sortOrder: { type: Number, default: 0 },
        isLimited: { type: Boolean, default: false },
        limitedUntil: { type: Date, default: null },
        // null = unlimited stock
        maxStock: { type: Number, default: null },
        soldCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        // Origin of the definition. `code` items are seeded from lib/shopItems.js
        // and are read-only in the admin panel; `admin` items are UI-created.
        source: {
            type: String,
            enum: ["code", "admin"],
            default: "admin",
        },
    },
    { timestamps: true },
);

// Indexes
shopItemSchema.index({ category: 1, sortOrder: 1, createdAt: -1 });
shopItemSchema.index({ isActive: 1 });

// Attach the per-user inventory subdocs onto the User schema via a shared
// schema fragment (imported by models/User.js).
export const ownedShopItemSubdoc = ownedSnapshotSchema;

const ShopItem =
    mongoose.models.ShopItem || mongoose.model("ShopItem", shopItemSchema);

export default ShopItem;
