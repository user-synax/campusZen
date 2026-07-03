import mongoose from "mongoose";

const pollOptionSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        votes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { _id: true },
);

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: [2000, "Post cannot exceed 2000 characters"],
        },
        images: {
            type: [String],
            validate: [
                (v) => v.length <= 6,
                "You can upload a maximum of 6 images",
            ],
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: [],
            },
        ],
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
        community: {
            type: String,
            trim: true,
            default: "",
        },
        poll: {
            options: [
                {
                    text: String,
                    votes: [mongoose.Schema.Types.ObjectId],
                },
            ],
            expiresAt: Date,
            active: { type: Boolean, default: true },
        },
        hashtags: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
        studyGroup: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StudyGroup",
        },
        linkPreview: {
            title: String,
            description: String,
            image: String,
            url: String,
        },
        isMarkdown: {
            type: Boolean,
            default: false,
        },
        // Rich content blocks for GIFs and emojis
        contentBlocks: [
            {
                type: {
                    type: String,
                    enum: ["text", "gif", "emoji"],
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                },
                metadata: {
                    type: mongoose.Schema.Types.Mixed,
                    default: {},
                },
            },
        ],
        // Admin & Moderation fields
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isHidden: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        reportCount: { type: Number, default: 0, min: 0 },
        shareCount: { type: Number, default: 0, min: 0 },
        source: {
            type: String,
            trim: true,
            default: "",
        },
        sourceId: {
            type: String,
            trim: true,
            default: "",
        },
        sourceUrl: {
            type: String,
            trim: true,
            default: "",
        },
        subreddit: {
            type: String,
            trim: true,
            default: "",
        },
        sourceAuthor: {
            type: String,
            trim: true,
            default: "",
        },
        sourceCreatedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 }); // Index for tags
postSchema.index({ studyGroup: 1, createdAt: -1 });
postSchema.index({ likes: 1 });
postSchema.index({ likesCount: -1, createdAt: -1 }); // Index for trending posts
postSchema.index({ content: "text" });
postSchema.index({ reportCount: -1, isDeleted: 1 });
postSchema.index({ isFeatured: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, _id: -1 });
postSchema.index({ community: 1, _id: -1 });
postSchema.index({ sourceId: 1 });
postSchema.index({ source: 1 });

postSchema.virtual("hasPoll").get(function () {
    return this.poll?.options?.length > 0;
});

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

export default Post;
