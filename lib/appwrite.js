// Appwrite is storage-only — no Appwrite session, no Account auth.
// Auth is JWT-only via jose + tokenVersion (see lib/auth.js).
import { Client as BrowserClient, Account, Storage as BrowserStorage } from "appwrite";
import { Client as ServerClient, Storage as ServerStorage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

/**
 * Wrap a Web API File into a node-appwrite InputFile for server-side uploads.
 * node-appwrite's chunkedUpload only accepts undici.File or InputFile instances.
 * Browser SDK's Storage.chunkedUpload checks `value instanceof File` only,
 * so using `appwrite` Storage with InputFile throws "File not found in payload".
 * Must use `node-appwrite` Storage (ServerStorage) with InputFile.
 */
export const toInputFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    // Use Buffer for reliable binary handling; preserve original filename with extension
    const filename = file.name || `upload-${Date.now()}`;
    return InputFile.fromBuffer(Buffer.from(arrayBuffer), filename);
};

// Client-side Appwrite instance (browser SDK) — storage only
export const createAppwriteClient = () => {
    const client = new BrowserClient();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    return client;
};

/** @deprecated Auth removed — Account is unused. Kept for storage interop via createAppwriteClient. */
export const getAppwriteAccount = (client) => new Account(client);
export const getAppwriteStorage = (client) => new BrowserStorage(client);

// Server-side Appwrite admin client (node-appwrite SDK)
// Supports both NEXT_PUBLIC_* (Vercel build-time inlined) and plain APPWRITE_*
// server-only names so a missing NEXT_PUBLIC_ prefix on Vercel doesn't break prod.
export const createAppwriteAdminClient = () => {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!endpoint || !projectId || !apiKey) {
        throw new Error(
            `Missing Appwrite env: endpoint(${!!endpoint}) projectId(${!!projectId}) APPWRITE_API_KEY(${!!apiKey}) — set NEXT_PUBLIC_APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_PROJECT_ID + APPWRITE_API_KEY on Vercel (Production env) and redeploy.`
        );
    }
    const client = new ServerClient();
    client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    return client;
};

export const getAppwriteAdminStorage = () => {
    const client = createAppwriteAdminClient();
    return new ServerStorage(client);
};

// File URL helpers using Appwrite SDK methods (more reliable)
export const getFileViewUrl = (storage, fileId) => {
    return storage.getFileView(
        process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
        fileId,
    );
};

export const getFilePreviewUrl = (storage, fileId) => {
    return storage.getFilePreview(
        process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
        fileId,
    );
};

// Helper to get file URL without storage instance (for server-side)
const resolveAppwriteEndpoint = () => process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || "";
const resolveAppwriteProjectId = () => process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || "";

export const getFileViewUrlString = (
    fileId,
    bucketId = process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID || process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID || process.env.APPWRITE_USER_MEDIA_BUCKET_ID,
) => {
    const endpoint = resolveAppwriteEndpoint();
    const projectId = resolveAppwriteProjectId();
    return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
};

export const getFilePreviewUrlString = (
    fileId,
    bucketId = process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID || process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID || process.env.APPWRITE_USER_MEDIA_BUCKET_ID,
) => {
    const endpoint = resolveAppwriteEndpoint();
    const projectId = resolveAppwriteProjectId();
    return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${projectId}`;
};

// User Media Storage Helpers
export const getUserMediaBucketId = () => {
    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID || process.env.APPWRITE_USER_MEDIA_BUCKET_ID;
    if (!bucketId) {
        throw new Error("Missing env NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID (or APPWRITE_USER_MEDIA_BUCKET_ID) — add it in Vercel → Settings → Environment Variables (Production) and redeploy");
    }
    return bucketId;
};

export const uploadFileToAppwrite = async (
    file,
    fileId,
    bucketId,
    permissions = [],
) => {
    const storage = getAppwriteAdminStorage();

    // If fileId exists, delete it first
    try {
        await storage.deleteFile(bucketId, fileId);
    } catch (err) {
        // Ignore error if file doesn't exist
    }

    return await storage.createFile(bucketId, fileId, file, permissions);
};
