import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import { getCurrentUser } from "@/lib/auth";

// Subscribe user
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );

        await connectDB();
        const { subscription } = await request.json();

        // Validate subscription has required encryption keys
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json(
                { error: "Invalid subscription: missing endpoint or encryption keys" },
                { status: 400 },
            );
        }

        // Update or create subscription
        await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                userId: currentUser._id,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userAgent: request.headers.get("user-agent"),
                lastActive: new Date(),
            },
            { upsert: true, new: true },
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Subscribe]", err.message);
        return NextResponse.json(
            { error: "Failed to save subscription" },
            { status: 500 },
        );
    }
}

// Unsubscribe user
export async function DELETE(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );

        await connectDB();

        // Delete all push subscriptions for this user
        // No body required — the authenticated user is sufficient
        await PushSubscription.deleteMany({ userId: currentUser._id });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Unsubscribe]", err.message);
        return NextResponse.json(
            { error: "Failed to delete subscription" },
            { status: 500 },
        );
    }
}
