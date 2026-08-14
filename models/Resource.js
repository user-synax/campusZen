import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
    {
        // ━━━ Content ━━━
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [5, "Title must be at least 5 characters"],
            maxlength: [150, "Title cannot exceed 150 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
            default: "",
        },

        // ━━━ Categorization ━━━
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: {
                values: [
                    "notes",
                    "pyq",
                    "coding",
                    "formula",
                    "lab",
                    "interview",
                    "project",
                    "other",
                ],
                message: "Invalid category",
            },
        },
        subject: {
            type: String,
            trim: true,
            maxlength: [100, "Subject too long"],
            default: "",
        },
        college: {
            type: String,
            trim: true,
            default: "",
        },
        semester: {
            type: Number,
            min: [1, "Semester must be between 1-12"],
            max: [12, "Semester must be between 1-12"],
            default: null,
        },
        tags: {
            type: [String],
            validate: {
                validator: (arr) => arr.length <= 5,
                message: "Maximum 5 tags allowed",
            },
            default: [],
        },

        // ━━━ File Info (from Appwrite Storage) ━━━
        fileUrl: {
            type: String,
            required: [true, "File URL is required"],
        },
        // fileKey is for server-side deletion only
        // NEVER expose this in public API responses
        fileKey: {
            type: String,
            required: [true, "File key is required"],
            select: false, // excluded from queries by default
        },
        fileName: {
            type: String,
            required: true,
            maxlength: 255,
        },
        fileSize: {
            type: Number,
            required: true,
            min: 0,
        },
        fileType: {
            type: String,
            required: true,
            enum: ["pdf", "image"],
        },

        // ━━━ Uploader ━━━
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // ━━━ Moderation ━━━
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            select: false, // internal — don't expose reviewer identity
        },
        reviewNote: {
            type: String,
            maxlength: [300, "Review note too long"],
            default: "",
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        // Auto-flagged by copyright keyword detector
        copyrightFlag: {
            type: Boolean,
            default: false,
            select: false, // internal field
        },

        // ━━━ Engagement Stats ━━━
        downloadCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Denormalized save count — avoids $size on array in queries
        saveCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        saves: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: [],
            select: false, // don't expose who saved (privacy)
        },

        // ━━━ Reports ━━━
        reportCount: {
            type: Number,
            default: 0,
            min: 0,
            select: false,
        },
        // Auto-hide after 5 reports
        isHidden: {
            type: Boolean,
            default: false,
        },

        // Featured by admin
        isFeatured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ━━━ INDEXES — Every query must use one ━━━

// Public browse — most common query
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ status: 1, downloadCount: -1 });
resourceSchema.index({ status: 1, saveCount: -1 });

// Filtered browse
resourceSchema.index({ category: 1, status: 1, createdAt: -1 });
resourceSchema.index({ college: 1, status: 1, createdAt: -1 });
resourceSchema.index({ semester: 1, status: 1 });
resourceSchema.index({ tags: 1, status: 1 });
resourceSchema.index({ subject: 1, status: 1 });

// User's uploads
resourceSchema.index({ uploadedBy: 1, createdAt: -1 });

// Admin review queue — FIFO (oldest first)
resourceSchema.index({ status: 1, createdAt: 1 });

// Featured resources
resourceSchema.index({ isFeatured: 1, status: 1 });

// Full text search
resourceSchema.index(
    { title: "text", subject: "text", tags: "text" },
    {
        weights: { title: 10, subject: 5, tags: 3 },
        name: "resource_text_search",
    },
);

// Virtual: human-readable file size
resourceSchema.virtual("fileSizeFormatted").get(function () {
    const bytes = this.fileSize;
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

export default mongoose.models.Resource ||
    mongoose.model("Resource", resourceSchema);
