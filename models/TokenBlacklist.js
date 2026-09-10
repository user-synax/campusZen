import mongoose from 'mongoose'

/**
 * TTL collection for single-device logout only.
 * Global logout uses User.tokenVersion (jose + tokenVersion).
 * Each doc auto-expires at JWT exp via expiresAt TTL.
 */
const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true })

// TTL: MongoDB deletes doc when expiresAt <= now (0 seconds after)
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
tokenBlacklistSchema.index({ token: 1 }, { unique: true })
 
export default mongoose.models.TokenBlacklist || 
  mongoose.model('TokenBlacklist', tokenBlacklistSchema) 
