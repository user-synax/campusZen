import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
    updateShopItem,
    deleteShopItem,
} from "@/lib/shop";

// GET /api/admin/shop/[id] — single item (admin)
export async function GET(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const { id } = await params;
        const { default: ShopItem } = await import("@/models/ShopItem");
        const item = await ShopItem.findById(id).lean();
        if (!item) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ item });
    } catch (error) {
        console.error("[AdminShopItemGET] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/admin/shop/[id] — update item (admin)
// Accepts either a full edit payload or a partial { isActive } toggle.
export async function PATCH(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const { id } = await params;

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        const item = await updateShopItem(id, body);
        if (!item) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ item });
    } catch (error) {
        console.error("[AdminShopItemPATCH] Error:", error.message);
        if (error.code === 11000) {
            return NextResponse.json(
                { error: "Slug already exists" },
                { status: 409 },
            );
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/admin/shop/[id] — remove item (admin)
export async function DELETE(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const { id } = await params;
        const result = await deleteShopItem(id);
        if (!result) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminShopItemDELETE] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
