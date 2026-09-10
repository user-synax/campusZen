import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
    studentVerificationFields,
    studentVerificationIndexes,
} from "./shared/userVerification.js";
import { shopFields, shopIndexes } from "./shared/userShop.js";

/**
 * User — P1 UserCore (352 → ~200 lines). Verification + Shop extracted to
 * shared schemas (models/shared/userVerification.js, models/shared/userShop.js)
 * while keeping single User collection for backwards compat and fast
 * isVerified+college filtering. Full history lives in StudentVerification.
 */

const userSchema = new mongoose.Schema(
    {
        // ── Core identity ──
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-zA-Z0-9_]{3,20}$/,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
        },
        phone: {
            type: String,
            trim: true,
            default: "",
        },
        college: {
            type: String,
            trim: true,
            default: "",
        },
        course: {
            type: String,
            trim: true,
            default: "",
        },
        branch: {
            type: String,
            trim: true,
            default: "",
        },
        year: {
            type: Number,
            min: 1,
            max: 6,
            default: 1,
        },
        bio: {
            type: String,
            maxlength: 160,
            default: "",
        },
        avatar: {
            type: String,
            default: "",
        },
        banner: {
            type: String,
            default: "",
        },
        gender: {
            type: String,
            enum: ["male", "female", "other", "unspecified"],
            default: "unspecified",
        },

        // ── Relations ──
        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        connections: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        bookmarks: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post",
                default: [],
            },
        ],

        // ── Founder (only populated for founder account) ──
        founderData: {
            roadmap: {
                type: [
                    {
                        title: String,
                        status: {
                            type: String,
                            enum: ["done", "inprogress", "upcoming"],
                            default: "upcoming",
                        },
                        emoji: String,
                        order: Number,
                    },
                ],
                default: [],
            },
            broadcastMessage: String,
            broadcastId: String,
            broadcastActive: Boolean,
            broadcastCreatedAt: Date,
            profileViews: { type: Number, default: 0 },
            profileViewsToday: { type: Number, default: 0 },
            profileViewsResetAt: Date,
            totalUsersAtJoining: { type: Number, default: 0 },
        },

        // ── Gamification ──
        xp: {
            type: Number,
            default: 0,
        },
        level: {
            type: Number,
            default: 1,
        },
        totalXP: {
            type: Number,
            default: 0,
        },
        weeklyXP: {
            type: Number,
            default: 0,
        },

        // ── Shop / VP (extracted) ──
        ...shopFields,

        // ── Student Verification (extracted, denormalized for feed) ──
        ...studentVerificationFields,

        pinnedPost: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        role: {
            type: String,
            enum: ["user", "moderator", "admin", "founder"],
            default: "user",
        },
        // Moderation
        isBanned: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        tokenVersion: { type: Number, default: 0 },

        // Mute/Block
        mutedUsers: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
        ],
        blockedUsers: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
        ],

        // Chat privacy
        chatPrivacy: {
            type: String,
            enum: ["everyone", "verified", "college", "followers", "none"],
            default: "everyone",
        },
        dmEnabled: {
            type: Boolean,
            default: true,
        },
        receivedChatRequests: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ChatRequest",
                default: [],
            },
        ],
        sentChatRequests: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ChatRequest",
                default: [],
            },
        ],

        // Profile
        interests: {
            type: [String],
            validate: {
                validator: (arr) => arr.length <= 10,
                message: "Maximum 10 interests allowed",
            },
            default: [],
        },
        socialLinks: {
            twitter: { type: String, default: "" },
            instagram: { type: String, default: "" },
            linkedin: { type: String, default: "" },
            github: { type: String, default: "" },
            website: { type: String, default: "" },
        },
        // Password reset
        resetToken: { type: String, default: null },
        resetTokenExpiry: { type: Date, default: null },
        // Google OAuth
        googleId: { type: String, unique: true, sparse: true },
        googleAccessToken: { type: String },
        googleRefreshToken: { type: String },
        googleProfile: { type: mongoose.Schema.Types.Mixed },
        authProvider: {
            type: String,
            enum: ["email", "google"],
            default: "email",
        },
        isPro: {
            type: Boolean,
            default: false,
        },
        isBot: {
            type: Boolean,
            default: false,
        },
        botType: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

userSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toSafeObject = function () {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

// ── Core indexes ──
userSchema.index({ college: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ connections: 1 });
userSchema.index({ totalXP: -1 });
userSchema.index({ weeklyXP: -1 });
userSchema.index({ college: 1, weeklyXP: -1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ mutedUsers: 1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ chatPrivacy: 1 });
userSchema.index({ dmEnabled: 1 });
userSchema.index({ receivedChatRequests: 1 });
userSchema.index({ sentChatRequests: 1 });

// ── Verification indexes (from shared) ──
for (const [fields, opts] of studentVerificationIndexes) {
    userSchema.index(fields, opts);
}

// ── Shop indexes (from shared) ──
for (const [fields, opts] of shopIndexes) {
    userSchema.index(fields, opts);
}

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
