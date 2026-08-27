import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Clip from "@/models/Clip";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { getFileViewUrlString, getFilePreviewUrlString, createAppwriteAdminClient } from "@/lib/appwrite";
import { Storage } from "node-appwrite";

const MAX_CLIP_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME = ["video/mp4", "video/webm"];

// Verify the actual file content (not the client-declared MIME type).
function isVideoMagic(bytes) {
    if (!bytes || bytes.length < 4) return false;
    // MP4: a 4-byte box size followed by the 'ftyp' brand at offset 4.
    if (
        bytes.length >= 12 &&
        bytes[4] === 0x66 && // f
        bytes[5] === 0x74 && // t
        bytes[6] === 0x79 && // y
        bytes[7] === 0x70 // p
    ) {
        return true;
    }
    // WebM: EBML header magic 0x1A 0x45 0xDF 0xA3.
    if (
        bytes[0] === 0x1a &&
        bytes[1] === 0x45 &&
        bytes[2] === 0xdf &&
        bytes[3] === 0xa3
    ) {
        return true;
    }
    return false;
}

// Stream only the first `n` bytes of the (public) view URL to inspect magic bytes.
async function readHeadBytes(viewUrl, n = 64) {
    try {
        const res = await fetch(viewUrl, { headers: { Range: `bytes=0-${n - 1}` } });
        if (!res.ok && res.status !== 206) return null;
        const buf = new Uint8Array(n);
        let filled = 0;
        if (res.body && typeof res.body.getReader === "function") {
            const reader = res.body.getReader();
            while (filled < n) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    const take = Math.min(value.length, n - filled);
                    buf.set(value.subarray(0, take), filled);
                    filled += take;
                }
            }
        } else {
            const ab = await res.arrayBuffer();
            const take = Math.min(ab.byteLength, n);
            buf.set(new Uint8Array(ab).subarray(0, take), 0);
            filled = take;
        }
        return filled > 0 ? buf.subarray(0, filled) : null;
    } catch {
        return null;
    }
}

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

        const bucketId = process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID;

        // Validate the uploaded file via the Admin SDK (bypasses bucket read perms).
        let fileMeta;
        try {
            const adminStorage = new Storage(createAppwriteAdminClient());
            fileMeta = await adminStorage.getFile(bucketId, videoFileId);
        } catch {
            return NextResponse.json(
                { success: false, error: { message: "Invalid video file" } },
                { status: 400 },
            );
        }

        if (!fileMeta || fileMeta.sizeOriginal == null) {
            return NextResponse.json(
                { success: false, error: { message: "Invalid video file" } },
                { status: 400 },
            );
        }

        // Enforce server-side size cap (independent of any client check).
        if (fileMeta.sizeOriginal > MAX_CLIP_BYTES) {
            return NextResponse.json(
                { success: false, error: { message: "File exceeds size limit" } },
                { status: 400 },
            );
        }

        // Enforce server-side type check from Appwrite's detected MIME type.
        if (!ALLOWED_MIME.includes(fileMeta.mimeType)) {
            return NextResponse.json(
                { success: false, error: { message: "Unsupported video format" } },
                { status: 400 },
            );
        }

        // Ownership: the file must be writable by the requesting user. This blocks
        // attaching another user's (or an anonymously uploaded) file to your clip.
        if (currentUser.appwriteUserId) {
            const owned = (fileMeta.permissions || []).some(
                (p) =>
                    typeof p === "string" &&
                    p.startsWith("write(") &&
                    p.includes(currentUser.appwriteUserId),
            );
            if (!owned) {
                return NextResponse.json(
                    {
                        success: false,
                        error: { message: "File does not belong to you" },
                    },
                    { status: 403 },
                );
            }
        }

        // Magic-byte validation of the real content (not client-declared type).
        const head = await readHeadBytes(getFileViewUrlString(videoFileId, bucketId));
        if (!isVideoMagic(head)) {
            return NextResponse.json(
                {
                    success: false,
                    error: { message: "File content is not a valid video" },
                },
                { status: 400 },
            );
        }

        const clip = await Clip.create({
            userId: currentUser._id,
            videoFileId: sanitizeMongoInput(videoFileId),
            videoUrl: getFileViewUrlString(videoFileId, bucketId),
            thumbnailUrl: getFilePreviewUrlString(videoFileId, bucketId),
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
