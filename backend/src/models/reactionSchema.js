import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String, maxlength: 4 },
    },
    { _id: false },
);

export default reactionSchema;
