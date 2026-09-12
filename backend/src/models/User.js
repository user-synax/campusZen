import mongoose from "mongoose";

// Read-only User model for the chat backend. We only need identification fields
// plus the shop inventory used to resolve a sender's equipped chat-bubble theme.
// `strict: false` + Mixed shop fields avoid schema drift with the full Next.js
// User model — we never write users here, only read.
const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        username: { type: String },
        avatar: { type: String, default: "" },
        isVerified: { type: Boolean, default: false },
        equippedShopItems: { type: mongoose.Schema.Types.Mixed, default: {} },
        ownedShopItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
        // Added for DM/group auth checks — mirrors I:\campusX\models\User.js:196,182,54,177
        dmEnabled: { type: Boolean, default: true },
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
        college: { type: String, default: "" },
        role: { type: String, enum: ["user", "moderator", "admin", "founder"], default: "user" },
        tokenVersion: { type: Number, default: 0 },
    },
    { strict: false, timestamps: false },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
