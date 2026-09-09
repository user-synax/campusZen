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

// Client-side Appwrite instance (browser SDK)
export const createAppwriteClient = () => {
    const client = new BrowserClient();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    return client;
};

export const getAppwriteAccount = (client) => new Account(client);
export const getAppwriteStorage = (client) => new BrowserStorage(client);

// Server-side Appwrite admin client (node-appwrite SDK)
export const createAppwriteAdminClient = () => {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    if (!endpoint || !projectId || !apiKey) {
        throw new Error(
            `Missing Appwrite env: NEXT_PUBLIC_APPWRITE_ENDPOINT=${!!endpoint}, NEXT_PUBLIC_APPWRITE_PROJECT_ID=${!!projectId}, APPWRITE_API_KEY=${!!apiKey}`
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
export const getFileViewUrlString = (
    fileId,
    bucketId = process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
) => {
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
};

export const getFilePreviewUrlString = (
    fileId,
    bucketId = process.env.NEXT_PUBLIC_APPWRITE_CLIPS_BUCKET_ID,
) => {
    return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
};

// User Media Storage Helpers
export const getUserMediaBucketId = () => {
    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID;
    if (!bucketId) {
        throw new Error("Missing env NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID");
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
