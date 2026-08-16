import mongoose from "mongoose";

/**
 * Shared reaction schema used by both DMMessage and GroupMessage.
 * Prevents field/index drift between the two models.
 */
const reactionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String, maxlength: 4 },
    },
    { _id: false },
);

export default reactionSchema;