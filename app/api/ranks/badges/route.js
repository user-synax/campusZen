import { NextResponse } from "next/server";
import Badge from "@/models/Badge";
import { PREDEFINED_BADGES, initPredefinedBadges } from "@/lib/gamification";
import connectDB from "@/lib/db";

export async function GET() {
    await connectDB();
    await initPredefinedBadges();
    try {
        const allBadges = await Badge.find({}).lean();
        return NextResponse.json({ badges: allBadges });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
