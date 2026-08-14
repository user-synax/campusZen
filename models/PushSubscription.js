import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        endpoint: { type: String, required: true, unique: true },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
        userAgent: { type: String },
        isActive: { type: Boolean, default: true },
        lastActive: { type: Date, default: Date.now },
        deactivatedAt: { type: Date, default: null },
        malformedKeysDetectedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

// Auto-delete inactive subscriptions after 30 days
pushSubscriptionSchema.index(
    { deactivatedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { isActive: false } }
);

export default mongoose.models.PushSubscription ||
    mongoose.model("PushSubscription", pushSubscriptionSchema);
