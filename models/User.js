import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
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
        // Founder-related fields (only populated for founder account)
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
            broadcastMessage: String, // current site-wide announcement
            broadcastId: String, // unique ID per announcement (for dismiss tracking)
            broadcastActive: Boolean,
            broadcastCreatedAt: Date,
            profileViews: { type: Number, default: 0 },
            profileViewsToday: { type: Number, default: 0 },
            profileViewsResetAt: Date,
            totalUsersAtJoining: { type: Number, default: 0 },
        },
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
        // ── VP (Viper Coins) Economy ──
        // Cached, atomically-updated balance. Never read from ledger.
        vp: {
            type: Number,
            default: 0,
            min: 0,
        },
        // ── Shop / Cosmetic Inventory ──
        // Items the user has purchased. Self-contained snapshot so rendering
        // works even if the catalog item is later removed.
        ownedShopItems: [
            {
                itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopItem" },
                slug: { type: String },
                name: { type: String },
                category: { type: String },
                rarity: { type: String, default: "common" },
                price: { type: Number, default: 0 },
                visual: {
                    icon: { type: String, default: "Package" },
                    color: { type: String, default: "#94a3b8" },
                    className: { type: String, default: "" },
                    imageUrl: { type: String, default: "" },
                    frameAssetUrl: { type: String, default: "" },
                },
                purchasedAt: { type: Date, default: Date.now },
            },
        ],
        // Currently equipped item per category (category -> owned item's _id).
        // Only one item equipped per category at a time.
        equippedShopItems: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Calendar-day gate for daily login reward (server-checked)
        lastLoginRewardAt: {
            type: Date,
            default: null,
        },
        // ── Student Verification System ──
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationStatus: {
            type: String,
            enum: ["none", "pending", "verified", "rejected"],
            default: "none",
        },
        verificationType: {
            type: String,
            enum: ["college_email", "id_card"],
        },
        collegeEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        collegeIdUrl: {
            type: String, // Cloudinary URL for uploaded college ID card
        },
        verificationRejectedReason: {
            type: String,
        },
        verificationRequestedAt: {
            type: Date,
        },
        verificationApprovedAt: {
            type: Date,
        },
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
        // Moderation fields
        isBanned: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false }, // soft delete
        deletedAt: { type: Date, default: null },
        tokenVersion: { type: Number, default: 0 }, // For force logout

        // Mute/Block
        mutedUsers: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
        ],
        blockedUsers: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
        ],

        // Chat privacy settings
        chatPrivacy: {
            type: String,
            enum: ["everyone", "verified", "college", "followers", "none"],
            default: "everyone",
        },
        // DM enabled setting (user can toggle DM access on/off)
        dmEnabled: {
            type: Boolean,
            default: true,
        },
        // Chat requests
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

        // Profile customization
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
        // Password reset fields
        resetToken: { type: String, default: null },
        resetTokenExpiry: { type: Date, default: null },
        // Google OAuth
        googleId: { type: String, unique: true, sparse: true },
        googleAccessToken: { type: String },
        googleRefreshToken: { type: String },
        googleProfile: { type: mongoose.Schema.Types.Mixed },
        // Appwrite fields
        appwriteUserId: {
            type: String,
            unique: true,
            sparse: true,
        },
        authMigrated: {
            type: Boolean,
            default: false,
        },
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
    { timestamps: true },
);

userSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toSafeObject = function () {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

userSchema.index({ college: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ connections: 1 });
userSchema.index({ totalXP: -1 });
userSchema.index({ weeklyXP: -1 });
userSchema.index({ college: 1, weeklyXP: -1 });
// VP economy indexes
userSchema.index({ vp: -1 });
// Shop inventory indexes
userSchema.index({ "ownedShopItems.itemId": 1 });
// Moderation index
userSchema.index({ isBanned: 1 });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ mutedUsers: 1 });
userSchema.index({ blockedUsers: 1 });
// Verification indexes
userSchema.index({ collegeEmail: 1 }, { unique: true, sparse: true });
userSchema.index({ verificationStatus: 1, verificationRequestedAt: -1 });
// Chat privacy indexes
userSchema.index({ chatPrivacy: 1 });
userSchema.index({ dmEnabled: 1 });
userSchema.index({ receivedChatRequests: 1 });
userSchema.index({ sentChatRequests: 1 });


const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
