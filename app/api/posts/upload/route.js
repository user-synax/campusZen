import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
    getAppwriteAdminStorage,
    getFileViewUrlString,
    getUserMediaBucketId,
    toInputFile,
} from "@/lib/appwrite";
import { ID, Permission, Role } from "node-appwrite";
import { verifyImageBlob } from "@/lib/file-validation";

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

        let bucketId;
        try {
            bucketId = getUserMediaBucketId();
        } catch (envError) {
            console.error('Missing bucket env:', envError.message);
            return NextResponse.json({ message: 'Storage not configured' }, { status: 500 });
        }
        let storage;
        try {
            storage = getAppwriteAdminStorage();
        } catch (envError) {
            console.error('Appwrite admin client error:', envError.message);
            return NextResponse.json({ message: 'Storage not configured' }, { status: 500 });
        }
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

            // Magic-byte validation of real content (defeats MIME spoofing).
            if (!(await verifyImageBlob(file, allowedTypes))) {
                return NextResponse.json(
                    { message: "File content is not a valid image" },
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
                const inputFile = await toInputFile(file)
                const uploadedFile = await storage.createFile(
                    bucketId,
                    fileId,
                    inputFile,
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
        console.error("Post image upload route error:", error?.message || error, error?.stack);
        // Surface storage misconfig clearly instead of generic 500
        if (error?.message?.includes("Missing env") || error?.message?.includes("Missing Appwrite env") || error?.message?.includes("Storage not configured")) {
            return NextResponse.json({ message: "Storage not configured" }, { status: 500 });
        }
        return NextResponse.json(
            { message: error?.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
