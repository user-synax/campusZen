import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: { type: Date, default: null },
        isMuted: { type: Boolean, default: false },
        unreadCount: { type: Number, default: 0 },
    },
    { _id: false },
);

const dmConversationSchema = new mongoose.Schema(
    {
        participants: {
            type: [participantSchema],
            required: true,
            validate: {
                validator: (arr) => arr.length === 2,
                message: "Direct message must have exactly 2 participants",
            },
        },
        // Denormalized for performance
        messageCount: { type: Number, default: 0 },
        lastMessage: {
            content: String,
            senderName: String,
            sentAt: Date,
            type: { type: String, default: "text" },
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

// ━━━ Indexes ━━━
// Find all conversations for a user
dmConversationSchema.index({ "participants.userId": 1 });
// For sorting by latest message
dmConversationSchema.index({ "lastMessage.sentAt": -1 });

export default mongoose.models.DMConversation ||
    mongoose.model("DMConversation", dmConversationSchema);
