import mongoose from "mongoose";
import reactionSchema from "./reactionSchema.js";

const dmMessageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DMConversation",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },
        type: {
            type: String,
            enum: ["text", "image", "system"],
            default: "text",
        },
        imageUrl: { type: String, default: "" },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DMMessage",
            default: null,
        },
        reactions: {
            type: [reactionSchema],
            default: [],
        },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

dmMessageSchema.index({ conversationId: 1, createdAt: -1 });
dmMessageSchema.index({ conversationId: 1, _id: -1 });
dmMessageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.DMMessage ||
    mongoose.model("DMMessage", dmMessageSchema);
