import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
    getAdminCatalog,
    createShopItem,
} from "@/lib/shop";

// GET /api/admin/shop — list all items (admin)
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        const items = await getAdminCatalog();
        return NextResponse.json({ items });
    } catch (error) {
        console.error("[AdminShopGET] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/admin/shop — create item (admin)
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        if (!body.name || !body.slug) {
            return NextResponse.json(
                { error: "name and slug are required" },
                { status: 400 },
            );
        }

        const item = await createShopItem(body);
        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        console.error("[AdminShopPOST] Error:", error.message);
        if (error.code === 11000) {
            return NextResponse.json(
                { error: "Slug already exists" },
                { status: 409 },
            );
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
