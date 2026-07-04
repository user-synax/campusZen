import mongoose from "mongoose";

const clipSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        videoFileId: {
            type: String,
            required: true,
            trim: true,
        },
        videoUrl: {
            type: String,
            required: true,
            trim: true,
        },
        thumbnailUrl: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [300, "Description cannot exceed 300 characters"],
            default: "",
        },
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        savesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true },
);

clipSchema.index({ createdAt: -1 });
clipSchema.index({ userId: 1, createdAt: -1 });

const Clip = mongoose.models.Clip || mongoose.model("Clip", clipSchema);

export default Clip;
