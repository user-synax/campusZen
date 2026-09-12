import connectDB from '@/lib/db'
import Otp from '@/models/Otp'
import {
  successResponse,
  errorResponse,
  BadRequestError,
} from '@/lib/api-response'
import { rateLimit } from '@/lib/redis-rate-limit'

const MAX_VERIFY_ATTEMPTS = 5

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(new BadRequestError('Invalid request body'))
    }

    const { email, otp, purpose = 'verification' } = body

    // ── Validate inputs ──
    if (!email || typeof email !== 'string' || String(email).trim() === '') {
      return errorResponse(new BadRequestError('Email is required'))
    }
    if (otp === undefined || otp === null || String(otp).trim() === '') {
      return errorResponse(new BadRequestError('OTP is required'))
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedOtp = String(otp).trim()

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return errorResponse(new BadRequestError('OTP must be a 6-digit code'))
    }

    if (!['signup', 'verification'].includes(purpose)) {
      return errorResponse(new BadRequestError('Invalid OTP purpose'))
    }

    // ── Rate limit verification attempts: 10 per email per 15 min ──
    const rateLimitResult = await rateLimit(
      `otp_verify_${normalizedEmail}`,
      10,
      15 * 60 * 1000
    )

    if (!rateLimitResult.allowed) {
      return errorResponse(
        new BadRequestError(
          `Too many verification attempts. Try again in ${rateLimitResult.retryAfter} seconds.`
        )
      )
    }

    // ── Look up the OTP ──
    await connectDB()

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose,
    })

    if (!otpRecord) {
      return errorResponse(
        new BadRequestError('OTP expired or not found. Please request a new one.')
      )
    }

    // ── Check max attempts on this specific OTP ──
    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id })
      return errorResponse(
        new BadRequestError(
          'Too many incorrect attempts. This OTP has been invalidated. Please request a new one.'
        )
      )
    }

    // ── Verify ──
    if (otpRecord.otp !== normalizedOtp) {
      otpRecord.attempts += 1
      await otpRecord.save()

      const remaining = MAX_VERIFY_ATTEMPTS - otpRecord.attempts
      return errorResponse(
        new BadRequestError(
          `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        )
      )
    }

    // ── Success — delete the used OTP ──
    await Otp.deleteOne({ _id: otpRecord._id })

    return successResponse({
      message: 'OTP verified successfully',
      email: normalizedEmail,
      purpose,
      verified: true,
    })
  } catch (error) {
    console.error('[verify-otp] Error:', error)
    return errorResponse(error)
  }
}
