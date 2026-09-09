import mongoose from "mongoose";

const studyRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    topic: { type: String, default: "", maxlength: 100 },
    college: { type: String, required: true, trim: true },
    collegeDomain: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    requiresVerified: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    livekitRoomName: { type: String, default: "" },
    participantCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studyRoomSchema.index({ college: 1, isActive: 1, lastActiveAt: -1 });
studyRoomSchema.index({ requiresVerified: 1 });

export default mongoose.models.StudyRoom || mongoose.model("StudyRoom", studyRoomSchema);
