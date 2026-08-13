import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { equipItem, unequipItem } from "@/lib/shop";

// POST /api/shop/equip
// Equip:  { itemId }
// Unequip:{ category }  (itemId omitted/null)
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ message: "Invalid body" }, { status: 400 });
        }

        if (body.itemId) {
            const result = await equipItem(currentUser._id, body.itemId);
            if (!result.equipped) {
                return NextResponse.json(
                    { message: result.reason, success: false },
                    { status: result.reason === "not_owned" ? 400 : 409 },
                );
            }
            return NextResponse.json({ success: true, ...result });
        }

        if (body.category) {
            const result = await unequipItem(currentUser._id, body.category);
            if (!result.unequipped) {
                return NextResponse.json(
                    { message: result.reason, success: false },
                    { status: 409 },
                );
            }
            return NextResponse.json({ success: true, ...result });
        }

        return NextResponse.json(
            { message: "itemId or category required" },
            { status: 400 },
        );
    } catch (error) {
        console.error("[ShopEquip] Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
