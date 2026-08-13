import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserInventory } from "@/lib/shop";

// GET /api/shop/inventory
// Returns the current user's owned items + equipped-per-category map.
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        const inventory = await getUserInventory(currentUser._id);
        return NextResponse.json(inventory);
    } catch (error) {
        console.error("[ShopInventory] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
