import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, { timestamps: true });

// Index for faster lookups
sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
// TTL index: MongoDB auto-deletes expired sessions (expireAfterSeconds: 0
// means delete at the time stored in expiresAt).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
