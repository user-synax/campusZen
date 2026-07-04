import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import ClipLike from "@/models/ClipLike";
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

        const existingLike = await ClipLike.findOne({
            clipId,
            userId: currentUser._id,
        });

        if (existingLike) {
            // Unlike
            await ClipLike.deleteOne({ _id: existingLike._id });
            await Clip.updateOne({ _id: clipId }, { $inc: { likesCount: -1 } });
            return NextResponse.json({ success: true, liked: false });
        } else {
            // Like
            await ClipLike.create({ clipId, userId: currentUser._id });
            await Clip.updateOne({ _id: clipId }, { $inc: { likesCount: 1 } });
            return NextResponse.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error("Clip like error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
