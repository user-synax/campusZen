import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getShopCatalog } from "@/lib/shop";

// GET /api/shop?category=avatar_frame
// Public (auth required) catalog of purchasable items with ownership flags.
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");

        const items = await getShopCatalog(currentUser._id, { category });
        return NextResponse.json({ items });
    } catch (error) {
        console.error("[ShopGET] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
