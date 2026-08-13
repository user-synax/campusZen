import mongoose from "mongoose";

// ============================================
// WalletTransaction (CoinLedger)
// Immutable audit trail of every VP balance change.
// Live balance is NEVER computed from this collection —
// it lives on User.vp and is updated atomically alongside.
// ============================================

const walletTransactionSchema = new mongoose.Schema(
    {
        // Who the transaction belongs to
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Signed amount: positive = earn, negative = spend
        amount: {
            type: Number,
            required: true,
        },

        // Direction
        type: {
            type: String,
            enum: ["earn", "spend"],
            required: true,
        },

        // Why the change happened (drives idempotency + analytics)
        reason: {
            type: String,
            enum: [
                "post",
                "like",
                "comment",
                "follow",
                "resource_share",
                "resource_upload",
                "daily_login",
                "event_rsvp",
                "purchase",
                "shop_purchase",
                "admin_adjust",
                "admin_gift",
                "gift",
                "refund",
            ],
            required: true,
        },

        // The entity that triggered it (postId / commentId / targetUserId /
        // date-string for daily_login / uuid for admin_adjust).
        // Nullable only when a reason has no natural source.
        sourceId: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        // Snapshot of User.vp right after this transaction (audit).
        balanceAfter: {
            type: Number,
            default: 0,
        },

        // Optional human context (e.g. item name for purchases)
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true },
);

// ━━━ INDEXES ━━━

// History query + pagination (newest first)
walletTransactionSchema.index({ userId: 1, createdAt: -1 });

// Reason rollups / analytics
walletTransactionSchema.index({ userId: 1, reason: 1 });

// IDEMPOTENCY: prevent double-earning the same action.
// sparse = multiple null sourceId values allowed (only enforced when set).
walletTransactionSchema.index(
    { userId: 1, reason: 1, sourceId: 1 },
    { unique: true, sparse: true },
);

// Ledger pruning — keep 365 days of audit history
walletTransactionSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

export default mongoose.models.WalletTransaction ||
    mongoose.model("WalletTransaction", walletTransactionSchema);
