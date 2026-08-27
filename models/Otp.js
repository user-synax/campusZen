import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'verification', 'forgot_password', 'email_change', 'account_delete'],
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // TTL index — auto-deletes after 10 minutes
  },
})

// Compound index for lookups: find OTP by email + purpose
otpSchema.index({ email: 1, purpose: 1 })

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema)

export default Otp
