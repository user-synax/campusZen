import mongoose from "mongoose";
import reactionSchema from "./reactionSchema.js";

const groupMessageSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "GroupChat",
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
            ref: "GroupMessage",
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

groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ groupId: 1, _id: -1 });
groupMessageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.GroupMessage ||
    mongoose.model("GroupMessage", groupMessageSchema);
