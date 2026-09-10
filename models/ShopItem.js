import mongoose from "mongoose";

/**
 * ShopItem — catalog for VP shop. P1 ShopInventory split.
 * User.ownedShopItems stores a snapshot of the item at purchase time,
 * so this catalog can evolve without breaking historical ownership.
 */

const shopItemSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            required: true,
            index: true,
            // e.g. avatar_frame, badge, theme, title
        },
        rarity: {
            type: String,
            enum: ["common", "rare", "epic", "legendary"],
            default: "common",
            index: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        visual: {
            icon: { type: String, default: "Package" },
            color: { type: String, default: "#94a3b8" },
            className: { type: String, default: "" },
            imageUrl: { type: String, default: "" },
            frameAssetUrl: { type: String, default: "" },
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

shopItemSchema.index({ category: 1, rarity: 1 });
shopItemSchema.index({ price: 1 });
shopItemSchema.index({ isActive: 1, sortOrder: 1 });

const ShopItem = mongoose.models.ShopItem || mongoose.model("ShopItem", shopItemSchema);

export default ShopItem;
