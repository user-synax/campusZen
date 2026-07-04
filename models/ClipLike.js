import mongoose from "mongoose";

const clipLikeSchema = new mongoose.Schema(
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
    },
    { timestamps: true },
);

clipLikeSchema.index({ clipId: 1, userId: 1 }, { unique: true });

const ClipLike =
    mongoose.models.ClipLike || mongoose.model("ClipLike", clipLikeSchema);

export default ClipLike;
