import mongoose from "mongoose";

const clipCommentSchema = new mongoose.Schema(
    {
        clipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Clip",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [280, "Comment cannot exceed 280 characters"],
        },
    },
    { timestamps: true },
);

clipCommentSchema.index({ clipId: 1, createdAt: -1 });

const ClipComment =
    mongoose.models.ClipComment ||
    mongoose.model("ClipComment", clipCommentSchema);

export default ClipComment;
