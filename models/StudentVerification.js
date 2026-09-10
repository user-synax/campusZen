import mongoose from "mongoose";

/**
 * StudentVerification — separate collection for verification request history.
 * P1 split: User keeps denormalized isVerified/college for fast feed filtering,
 * but full audit trail + admin queue lives here (was previously only User fields).
 * Existing OTP collection remains models/Verification.js (identifier/value).
 */

const studentVerificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        collegeEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        collegeIdUrl: {
            type: String, // Appwrite Storage URL
        },
        verificationType: {
            type: String,
            enum: ["college_email", "id_card"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending",
            index: true,
        },
        rejectedReason: {
            type: String,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        reviewedAt: {
            type: Date,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // Snapshot of college at request time for compound isVerified+college queries
        college: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

studentVerificationSchema.index({ userId: 1, status: 1 });
studentVerificationSchema.index({ status: 1, requestedAt: -1 });
studentVerificationSchema.index({ college: 1, status: 1 });
studentVerificationSchema.index({ collegeEmail: 1 }, { unique: true, sparse: true });

const StudentVerification =
    mongoose.models.StudentVerification ||
    mongoose.model("StudentVerification", studentVerificationSchema);

export default StudentVerification;
