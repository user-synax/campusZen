import mongoose from 'mongoose'

const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    emoji: { type: String, default: '🌐' },
    description: { type: String, trim: true, maxlength: 200 },
    type: { type: String, enum: ['college', 'interest'], default: 'interest' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    postCount: { type: Number, default: 0 },
    verifiedMemberCount: { type: Number, default: 0 },
    collegeDomain: { type: String, default: "" },
}, { timestamps: true })

CommunitySchema.index({ type: 1, verifiedMemberCount: -1 })
CommunitySchema.index({ verifiedMemberCount: -1, postCount: -1 })

export default mongoose.models.Community || mongoose.model('Community', CommunitySchema)