import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBalance } from "@/lib/coins";
import { CURRENCY } from "@/lib/currency";

// GET /api/wallet — current VP balance (cached field, never live-summed)
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const balance = await getBalance(currentUser._id);

        return NextResponse.json({
            balance,
            currency: CURRENCY.shortName,
            currencyName: CURRENCY.name,
        });
    } catch (error) {
        console.error("[Wallet] balance error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
