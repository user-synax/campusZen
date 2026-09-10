import mongoose from "mongoose";

/**
 * Shared shop / VP economy fields extracted from User for P1 bloat fix.
 * User remains the source of truth for cached balance (vp) and equipped state.
 * Catalog lives in ShopItem collection; per-user history in ownedShopItems.
 */

export const ownedShopItemSchema = new mongoose.Schema(
    {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
        slug: { type: String },
        name: { type: String },
        category: { type: String },
        rarity: { type: String, default: "common" },
        price: { type: Number, default: 0 },
        visual: {
            icon: { type: String, default: "Package" },
            color: { type: String, default: "#94a3b8" },
            className: { type: String, default: "" },
            imageUrl: { type: String, default: "" },
            frameAssetUrl: { type: String, default: "" },
        },
        purchasedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

export const shopFields = {
    // VP (Viper Coins) — cached, atomically-updated balance. Never read from ledger.
    vp: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Shop / cosmetic inventory — self-contained snapshot so rendering works even if catalog removed
    ownedShopItems: {
        type: [ownedShopItemSchema],
        default: [],
    },
    // Currently equipped item per category (category -> owned item's _id)
    equippedShopItems: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    // Calendar-day gate for daily login reward (server-checked)
    lastLoginRewardAt: {
        type: Date,
        default: null,
    },
};

export const shopIndexes = [
    [{ vp: -1 }, {}],
    [{ "ownedShopItems.itemId": 1 }, {}],
];

export default shopFields;
