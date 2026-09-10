import mongoose from "mongoose";

/**
 * Shared student-verification fields extracted from User for P1 bloat fix.
 * Keeps single User collection (denormalized isVerified+college for feed filtering)
 * but isolates schema definition. Full request history lives in StudentVerification
 * collection (models/StudentVerification.js).
 */

export const studentVerificationFields = {
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
        type: String, // Appwrite Storage URL for uploaded college ID card
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
};

// Indexes that belong to verification slice — applied by User model
export const studentVerificationIndexes = [
    [{ collegeEmail: 1 }, { unique: true, sparse: true }],
    [{ verificationStatus: 1, verificationRequestedAt: -1 }, {}],
    // P1: compound for verified-campus feed & admin queue filtering
    [{ isVerified: 1, college: 1 }, {}],
    [{ isVerified: 1, verificationStatus: 1 }, {}],
];

export default studentVerificationFields;
