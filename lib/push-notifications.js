import webpush from "web-push";

// Configure VAPID keys
export function configurePushNotifications() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@campuszen.tech";

    if (!publicKey || !privateKey) {
        console.warn(
            "[Push] VAPID keys not configured, push notifications will not work",
        );
        return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
}

// Send push notification to a user
export async function sendPushNotification(subscription, payload) {
    try {
        if (!subscription) {
            throw new Error("No subscription provided");
        }

        // Serialize payload as JSON string
        const payloadStr =
            typeof payload === "string" ? payload : JSON.stringify(payload);

        const options = {
            TTL: 86400, // 24 hours
            urgency: "high",
        };

        const result = await webpush.sendNotification(
            subscription,
            payloadStr,
            options,
        );
        console.log("[Push] Notification sent successfully");
        return { success: true };
    } catch (err) {
        console.error("[Push] Error sending notification:", err);
        // If subscription is invalid, return error
        if (err.statusCode === 404 || err.statusCode === 410) {
            return {
                success: false,
                error: "Invalid subscription",
                shouldDelete: true,
            };
        }
        return { success: false, error: err.message };
    }
}
