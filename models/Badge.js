import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        instructions: {
            type: String,
            required: true,
        },
        icon: {
            type: String, // Path to PNG asset or emoji
            required: true,
        },
        category: {
            type: String,
            enum: ["activity", "community", "special", "milestone"],
            default: "activity",
        },
        criteria: {
            type: {
                action: String, // 'post', 'like', 'follow', 'streak'
                count: Number,
            },
            required: true,
        },
        color: {
            type: String,
            default: "primary",
        },
    },
    { timestamps: true },
);

// Add pre-defined badges after model initialization if needed
const Badge = mongoose.models.Badge || mongoose.model("Badge", badgeSchema);

export default Badge;
