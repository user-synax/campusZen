import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";

export async function POST(request, { params }) {
    try {
        await connectDB();
        const { clipId } = await params;

        await Clip.updateOne({ _id: clipId }, { $inc: { viewsCount: 1 } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Clip view error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
