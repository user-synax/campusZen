import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
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

        if (!isAdmin(currentUser)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("avatar");

        if (!file) {
            return NextResponse.json(
                { message: "No file uploaded" },
                { status: 400 },
            );
        }

        // Validate file type
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { message: "Only JPG, PNG, and WebP images allowed" },
                { status: 400 },
            );
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { message: "Image must be under 5MB" },
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
        const fileId = ID.unique();
        const permissions = [Permission.read(Role.any())];

        // Upload to Appwrite
        let uploadedFile;
        try {
            const inputFile = await toInputFile(file)
            uploadedFile = await storage.createFile(
                bucketId,
                fileId,
                inputFile,
                permissions,
            );
        } catch (uploadError) {
            console.error("Appwrite upload error:", uploadError);
            return NextResponse.json(
                { message: "Upload failed, please try again" },
                { status: 500 },
            );
        }

        const avatarUrl = getFileViewUrlString(uploadedFile.$id, bucketId);

        return NextResponse.json({
            message: "Group avatar uploaded successfully",
            avatarUrl,
        });
    } catch (error) {
        console.error("Group avatar upload route error:", error?.message || error, error?.stack);
        if (error?.message?.includes("Missing env") || error?.message?.includes("Missing Appwrite env")) {
            return NextResponse.json({ message: "Storage not configured" }, { status: 500 });
        }
        return NextResponse.json(
            { message: error?.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
