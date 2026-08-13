import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { spendVP } from "@/lib/coins";
import { VP_PRICES } from "@/lib/ranks";
import { validateObjectId } from "@/utils/validators";

// POST /api/wallet/spend
// SERVER-AUTHORITATIVE: client sends ONLY { reason, sourceId }.
// The amount is resolved from VP_PRICES on the server — a client-sent
// amount is NEVER trusted.
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
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const { reason, sourceId } = body;
        if (!reason || typeof reason !== "string") {
            return NextResponse.json(
                { message: "reason is required" },
                { status: 400 },
            );
        }

        // Amount comes from server config, never the body.
        const amount = VP_PRICES[reason];
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { message: "Unknown or unpriced spend reason" },
                { status: 400 },
            );
        }

        // Optional sourceId validation (e.g. a shop item / post id)
        let resolvedSource = sourceId ?? reason;
        if (sourceId && typeof sourceId === "string") {
            // keep as-is; not all sources are ObjectIds
            resolvedSource = sourceId;
        }

        const result = await spendVP(
            currentUser._id,
            reason,
            resolvedSource,
            amount,
        );

        if (!result.spent) {
            const status =
                result.reason === "insufficient_balance" ? 400 : 409;
            return NextResponse.json(
                { message: result.reason, success: false },
                { status },
            );
        }

        return NextResponse.json({
            success: true,
            spent: result.amount,
            balance: result.balanceAfter,
        });
    } catch (error) {
        console.error("[Wallet] spend error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
