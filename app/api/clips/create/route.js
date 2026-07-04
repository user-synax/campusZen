import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { getFileViewUrlString, getFilePreviewUrlString } from "@/lib/appwrite";

export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized" } },
                { status: 401 },
            );
        }

        await connectDB();
        const body = await request.json();
        const { videoFileId, description } = body;

        if (!videoFileId) {
            return NextResponse.json(
                {
                    success: false,
                    error: { message: "Video file ID is required" },
                },
                { status: 400 },
            );
        }

        const clip = await Clip.create({
            userId: currentUser._id,
            videoFileId: sanitizeMongoInput(videoFileId),
            videoUrl: getFileViewUrlString(videoFileId),
            thumbnailUrl: getFilePreviewUrlString(videoFileId),
            description: sanitizeMongoInput(description || ""),
        });

        await clip.populate("userId", "name username avatar isVerified");

        return NextResponse.json({
            success: true,
            clip: {
                ...clip.toObject(),
                user: clip.userId,
                _isLiked: false,
                _isSaved: false,
            },
        });
    } catch (error) {
        console.error("Create clip error:", error);
        return NextResponse.json(
            { success: false, error: { message: "Internal Server Error" } },
            { status: 500 },
        );
    }
}
