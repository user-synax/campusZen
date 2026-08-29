import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: { type: Date, default: null },
        isMuted: { type: Boolean, default: false },
        unreadCount: { type: Number, default: 0 },
    },
    { _id: false },
);

const groupChatSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
            minlength: 2,
        },
        description: { type: String, trim: true, maxlength: 200, default: "" },
        avatar: { type: String, default: "" },
        college: { type: String, trim: true, default: "" },
        members: {
            type: [memberSchema],
            validate: {
                validator: function (arr) {
                    if (this.isGlobal) return true;
                    return arr.length <= 200;
                },
                message: "Group cannot have more than 200 members",
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        messageCount: { type: Number, default: 0 },
        lastMessage: {
            content: String,
            senderName: String,
            sentAt: Date,
            type: { type: String, default: "text" },
        },
        isActive: { type: Boolean, default: true },
        isGlobal: { type: Boolean, default: false },
    },
    { timestamps: true },
);

groupChatSchema.index({ "members.userId": 1 });
groupChatSchema.index({ college: 1, isActive: 1 });
groupChatSchema.index({ "lastMessage.sentAt": -1 });
groupChatSchema.index({ createdBy: 1 });
groupChatSchema.index({ isGlobal: 1 });

export default mongoose.models.GroupChat ||
    mongoose.model("GroupChat", groupChatSchema);
