import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Otp from '@/models/Otp'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { generateOTP, sendOtpEmail } from '@/lib/otp-mailer'
import { rateLimit } from '@/lib/rate-limit'
import {
  successResponse,
  errorResponse,
  BadRequestError,
  TooManyRequestsError,
} from '@/lib/api-response'

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(new BadRequestError('Invalid request body'))
    }

    const { email } = body
    const purpose = 'forgot_password'

    if (!email || typeof email !== 'string') {
      return errorResponse(new BadRequestError('Email is required'))
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return errorResponse(new BadRequestError('Invalid email format'))
    }

    await connectDB()

    // ── Check if user exists ──
    const user = await User.findOne({ email: normalizedEmail }).lean()
    
    // SECURITY: If user doesn't exist, we still return success 
    // to prevent email enumeration attacks.
    if (!user) {
      return successResponse({ 
        success: true, 
        message: 'OTP sent if email exists' 
      })
    }

    // ── Rate limit: max 3 requests per email per hour ──
    const rateLimitResult = rateLimit(
      `otp_forgot_pw_${normalizedEmail}`,
      3,
      60 * 60 * 1000
    )

    if (!rateLimitResult.allowed) {
      return errorResponse(
        new TooManyRequestsError(
          `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimitResult.retryAfter
        )
      )
    }

    // ── 60-second cooldown ──
    const recentOtp = await Otp.findOne({
      email: normalizedEmail,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    }).lean()

    if (recentOtp) {
      const waitSeconds = Math.ceil(
        (60 * 1000 - (Date.now() - new Date(recentOtp.createdAt).getTime())) / 1000
      )
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Please wait ${waitSeconds} seconds before requesting a new OTP`,
            code: 'COOLDOWN_ACTIVE',
            retryAfter: waitSeconds,
          },
        },
        { status: 429 }
      )
    }

    // Clear existing OTPs for this purpose
    await Otp.deleteMany({ email: normalizedEmail, purpose })

    const otp = generateOTP()
    // Hash the OTP at rest; store only the bcrypt digest, never the plaintext.
    const otpHash = await bcrypt.hash(otp, 10)
    await Otp.create({
      email: normalizedEmail,
      otp: otpHash,
      purpose,
    })

    // Send email (the plaintext is delivered to the user, not persisted).
    await sendOtpEmail(normalizedEmail, otp, purpose)

    return successResponse({ 
      success: true, 
      message: 'OTP sent if email exists' 
    })

  } catch (error) {
    console.error('[forgot-password/send-otp] Error:', error)
    return errorResponse(error)
  }
}
