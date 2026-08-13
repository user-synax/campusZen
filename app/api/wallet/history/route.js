import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWalletHistory } from "@/lib/coins";

// GET /api/wallet/history?limit=20&cursor=ISO_DATE
// Paginated ledger — never returns the full collection.
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get("limit")) || 20,
            50,
        );
        const cursor = searchParams.get("cursor") || null;

        const result = await getWalletHistory(currentUser._id, {
            limit,
            cursor,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Wallet] history error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
