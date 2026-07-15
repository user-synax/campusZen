import { Client, Account, Storage, ID, Permission, Role } from "appwrite";

// Client-side Appwrite instance
export const createAppwriteClient = () => {
    const client = new Client();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
    return client;
};

export const getAppwriteAccount = (client) => new Account(client);
export const getAppwriteStorage = (client) => new Storage(client);

// Server-side Appwrite admin client
export const createAppwriteAdminClient = () => {
    const client = new Client();
    client
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

    // Set API key manually as header
    client.headers["X-Appwrite-Key"] = process.env.APPWRITE_API_KEY;

    return client;
};

export const getAppwriteAdminStorage = () => {
    const client = createAppwriteAdminClient();
    return new Storage(client);
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
export const getUserMediaBucketId = () =>
    process.env.NEXT_PUBLIC_APPWRITE_USER_MEDIA_BUCKET_ID;

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
