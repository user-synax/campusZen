import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import ClipLike from "@/models/ClipLike";
import ClipSave from "@/models/ClipSave";
import ClipComment from "@/models/ClipComment";
import { getCurrentUser } from "@/lib/auth";
import { getAppwriteAdminStorage } from "@/lib/appwrite";

export async function DELETE(request, { params }) {
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

        // Find the clip
        const clip = await Clip.findById(clipId);
        if (!clip) {
            return NextResponse.json(
                { success: false, error: { message: "Clip not found" } },
                { status: 404 },
            );
        }

        // Check ownership
        if (clip.userId.toString() !== currentUser._id.toString()) {
            return NextResponse.json(
                {
                    success: false,
                    error: { message: "You don't own this clip" },
                },
                { status: 403 },
            );
        }

        // Delete from Appwrite storage
        try {
            const storage = getAppwriteAdminStorage();
            await storage.deleteFile(
                process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
                clip.videoFileId,
            );
        } catch (storageError) {
            console.error("Failed to delete file from Appwrite:", storageError);
            // Continue deleting from DB even if storage fails to avoid inconsistency
        }

        // Delete all related data
        await Promise.all([
            ClipLike.deleteMany({ clipId }),
            ClipSave.deleteMany({ clipId }),
            ClipComment.deleteMany({ clipId }),
            Clip.deleteOne({ _id: clipId }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete clip error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
