// Standalone seed/sync script for code-defined shop items.
// Run with: `npm run sync:shop` (loads .env.local/.env, connects to MongoDB,
// upserts lib/shopItems.js CODE_SHOP_ITEMS by slug).
//
// This mirrors how the runtime sync works (lib/shop.js → syncCodeShopItems):
// code is the source of truth for definitions, the DB for runtime state.
// Code items are written with source: "code" and never overwrite an
// admin-owned item that shares the same slug.

import dotenv from "dotenv";
import mongoose from "mongoose";
import { CODE_SHOP_ITEMS } from "../lib/shopItems.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Minimal schema mirroring models/ShopItem.js (only the fields we write).
// Kept deliberately small — definitions live in CODE_SHOP_ITEMS, not here.
const visualSchema = new mongoose.Schema(
    {
        icon: { type: String, default: "Package" },
        color: { type: String, default: "#94a3b8" },
        className: { type: String, default: "" },
        imageUrl: { type: String, default: "" },
    },
    { _id: false },
);

const shopItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    rarity: { type: String, default: "common" },
    visual: { type: visualSchema, default: () => ({}) },
    sortOrder: { type: Number, default: 0 },
    isLimited: { type: Boolean, default: false },
    limitedUntil: { type: Date, default: null },
    maxStock: { type: Number, default: null },
    soldCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    source: { type: String, enum: ["code", "admin"], default: "admin" },
});

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is not set");
        process.exit(1);
    }

    await mongoose.connect(uri);
    const ShopItem =
        mongoose.models.ShopItem ||
        mongoose.model("ShopItem", shopItemSchema);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of CODE_SHOP_ITEMS) {
        const existing = await ShopItem.findOne({ slug: item.slug }).lean();
        if (existing && existing.source === "admin") {
            console.warn(
                `skip: slug "${item.slug}" owned by an admin item`,
            );
            skipped++;
            continue;
        }

        const visual = {
            icon: item.visual?.icon || "Package",
            color: item.visual?.color || "#94a3b8",
            className: item.visual?.className || "",
            imageUrl: item.visual?.imageUrl ? item.visual.imageUrl : "",
        };

        const update = {
            name: item.name,
            description: item.description || "",
            category: item.category,
            price: Number(item.price) || 0,
            rarity: item.rarity || "common",
            visual,
            sortOrder: Number(item.sortOrder) || 0,
            isLimited: !!item.isLimited,
            limitedUntil: item.isLimited ? item.limitedUntil || null : null,
            maxStock: item.maxStock ? Number(item.maxStock) : null,
            source: "code",
        };

        const result = await ShopItem.findOneAndUpdate(
            { slug: item.slug },
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        if (existing) updated++;
        else created++;
        console.log(
            `${existing ? "update" : "create"}: ${item.name} (${item.slug})`,
        );
    }

    console.log(
        `\nDone. created=${created} updated=${updated} skipped=${skipped}`,
    );
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
