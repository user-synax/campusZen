import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { refreshUserProStatus } from "@/lib/subscription";
import {
    getAppwriteAdminStorage,
    getFileViewUrlString,
    getUserMediaBucketId,
} from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";

export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const files = formData.getAll("images"); // Accept multiple files!

        if (!files.length) {
            return NextResponse.json(
                { message: "No files uploaded" },
                { status: 400 },
            );
        }

        // Validate files!
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
        ];
        const maxFileSize = 8 * 1024 * 1024; // 8MB per file

        const bucketId = getUserMediaBucketId();
        const storage = getAppwriteAdminStorage();
        const uploadedUrls = [];

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json(
                    { message: `File type not allowed` },
                    { status: 400 },
                );
            }

            if (file.size > maxFileSize) {
                return NextResponse.json(
                    { message: "File must be under 8MB" },
                    { status: 400 },
                );
            }

            const fileId = ID.unique();
            const permissions = [
                Permission.read(Role.any()),
                Permission.delete(Role.user(currentUser._id)),
            ];

            // Upload to Appwrite!
            try {
                const uploadedFile = await storage.createFile(
                    bucketId,
                    fileId,
                    file,
                    permissions,
                );
                const url = getFileViewUrlString(uploadedFile.$id, bucketId);
                uploadedUrls.push(url);
            } catch (uploadError) {
                console.error("Appwrite upload error:", uploadError);
                return NextResponse.json(
                    { message: "Upload failed, please try again" },
                    { status: 500 },
                );
            }
        }

        return NextResponse.json({
            message: "Images uploaded successfully",
            uploadedUrls,
        });
    } catch (error) {
        console.error("Post image upload route error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
