import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { purchaseItem } from "@/lib/shop";

const PURCHASE_ERROR_MESSAGES = {
    missing_identifier: "Item identifier is required",
    not_found: "Item not found",
    unavailable: "This item is not available for purchase",
    no_user: "User not found",
    already_owned: "You already own this item",
    insufficient_balance: "Insufficient balance",
    invalid_amount: "Invalid price for this item",
    duplicate: "Purchase already processed",
    error: "Purchase failed. Please try again.",
};

// POST /api/shop/purchase
// body: { itemId? | slug? }  — price resolved server-side from catalog.
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { message: "Invalid body" },
                { status: 400 },
            );
        }

        const identifier = body.itemId || body.slug;
        if (!identifier) {
            return NextResponse.json(
                { message: "itemId or slug is required" },
                { status: 400 },
            );
        }

        const result = await purchaseItem(currentUser._id, identifier);

        if (!result.purchased) {
            const status = result.reason === "insufficient_balance" ? 402 : 400;
            const message =
                PURCHASE_ERROR_MESSAGES[result.reason] ||
                PURCHASE_ERROR_MESSAGES.error;
            return NextResponse.json(
                { message, success: false, reason: result.reason },
                { status },
            );
        }

        return NextResponse.json({
            success: true,
            item: result.item,
            balance: result.balanceAfter,
        });
    } catch (error) {
        console.error("[ShopPurchase] Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
