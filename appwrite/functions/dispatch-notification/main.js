import { Client, Databases, ID, Permission, Role } from "appwrite";

export default async function ({ req, res, log, error }) {
    try {
        log("Starting notification dispatch...");

        // Initialize Appwrite client
        const client = new Client();
        client
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);

        const databases = new Databases(client);

        // Parse request body
        const payload = req.body;
        log("Received payload:", payload);

        // Validate required fields
        const requiredFields = ["recipientId", "type", "message"];
        const missingFields = requiredFields.filter((field) => !payload[field]);
        if (missingFields.length > 0) {
            return res.json(
                {
                    success: false,
                    error: `Missing required fields: ${missingFields.join(", ")}`,
                },
                400,
            );
        }

        const {
            recipientId,
            senderId,
            type,
            entityId,
            message,
            meta,
            postId,
            commentId,
            groupId,
            eventId,
            resourceId,
        } = payload;

        // Create notification document in Appwrite DB (auto-triggers Realtime)
        const notificationDoc = await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_NOTIFICATIONS_COLLECTION_ID,
            ID.unique(),
            {
                recipientId,
                senderId: senderId || null,
                type,
                entityId: entityId || null,
                message,
                read: false,
                meta: meta || null,
                postId: postId || null,
                commentId: commentId || null,
                groupId: groupId || null,
                eventId: eventId || null,
                resourceId: resourceId || null,
            },
            [
                Permission.read(Role.user(recipientId)),
                Permission.update(Role.user(recipientId)),
                Permission.delete(Role.user(recipientId)),
            ],
        );

        log("Notification document created:", notificationDoc.$id);

        // Check if recipient has active presence (using Appwrite DB or Redis)
        // For now, we'll just always send push notifications as a fallback
        // You could implement presence tracking by having clients update a "presence" document with a TTL

        // Try to send push notification via Appwrite Messaging (FCM)
        try {
            // Note: Appwrite Messaging API is used here - replace with your actual provider setup
            // For this example, we're assuming you've set up FCM in Appwrite Console
            log("Attempting to send push notification...");

            // Get user's push token from your push tokens collection
            let pushToken = null;
            try {
                const pushTokens = await databases.listDocuments(
                    process.env.APPWRITE_DATABASE_ID,
                    process.env.APPWRITE_PUSH_TOKENS_COLLECTION_ID,
                    [`equal("userId", ["${recipientId}"])`, `limit(1)`],
                );
                if (pushTokens.documents.length > 0) {
                    pushToken = pushTokens.documents[0].token;
                }
            } catch (e) {
                log("No push token found or error retrieving:", e.message);
            }

            // If push token exists, send notification
            if (pushToken) {
                log("Push token found, sending notification...");
                // In a real implementation, you'd use Appwrite Messaging API here
                // For now, we'll just log that we would send it
                log(`Would send push notification to token: ${pushToken}`);
            }
        } catch (pushErr) {
            error("Failed to send push notification:", pushErr.message);
        }

        return res.json(
            {
                success: true,
                notificationId: notificationDoc.$id,
            },
            200,
        );
    } catch (err) {
        error("Dispatch notification failed:", err.message);
        return res.json(
            {
                success: false,
                error: err.message,
            },
            500,
        );
    }
}
