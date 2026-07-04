import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import ClipSave from "@/models/ClipSave";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized" } },
                { status: 401 },
            );
        }

        await connectDB();
        const { clipId } = await params;

        const existingSave = await ClipSave.findOne({
            clipId,
            userId: currentUser._id,
        });

        if (existingSave) {
            // Unsave
            await ClipSave.deleteOne({ _id: existingSave._id });
            await Clip.updateOne({ _id: clipId }, { $inc: { savesCount: -1 } });
            return NextResponse.json({ success: true, saved: false });
        } else {
            // Save
            await ClipSave.create({ clipId, userId: currentUser._id });
            await Clip.updateOne({ _id: clipId }, { $inc: { savesCount: 1 } });
            return NextResponse.json({ success: true, saved: true });
        }
    } catch (error) {
        console.error("Clip save error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
