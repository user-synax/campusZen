import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        durationDays: {
            type: Number,
            required: true,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        maxUses: {
            type: Number,
            default: 1,
        },
        useCount: {
            type: Number,
            default: 0,
        },
        usedBy: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                usedAt: { type: Date, default: Date.now },
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        expiresAt: {
            type: Date,
        },
    },
    { timestamps: true },
);

promoCodeSchema.index({ isActive: 1 });

const PromoCode =
    mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);

export default PromoCode;
