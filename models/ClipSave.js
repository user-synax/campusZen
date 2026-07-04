import mongoose from "mongoose";

const clipSaveSchema = new mongoose.Schema(
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

clipSaveSchema.index({ clipId: 1, userId: 1 }, { unique: true });

const ClipSave =
    mongoose.models.ClipSave || mongoose.model("ClipSave", clipSaveSchema);

export default ClipSave;
