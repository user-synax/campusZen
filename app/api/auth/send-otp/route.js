import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Otp from '@/models/Otp'
import User from '@/models/User'
import { generateOTP, sendOtpEmail } from '@/lib/otp-mailer'
import { rateLimit } from '@/lib/redis-rate-limit'
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

    const { email, purpose = 'verification' } = body

    // ── Validate inputs ──
    if (!email || typeof email !== 'string') {
      return errorResponse(new BadRequestError('Email is required'))
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return errorResponse(new BadRequestError('Invalid email format'))
    }

    if (!['signup', 'verification', 'email_change', 'account_delete'].includes(purpose)) {
      return errorResponse(new BadRequestError('Invalid OTP purpose'))
    }

    await connectDB()

    if (purpose === 'signup') {
      const existingEmail = await User.findOne({ email: normalizedEmail }).lean()
      if (existingEmail) {
        return errorResponse(new BadRequestError('Email already registered'))
      }
      if (body.username) {
        const existingUser = await User.findOne({ username: body.username }).lean()
        if (existingUser) {
          return errorResponse(new BadRequestError('Username already taken'))
        }
      }
    }

    // ── Rate limit: max 3 OTP requests per email per hour ──
    const rateLimitResult = await rateLimit(
      `otp_send_${normalizedEmail}`,
      3,
      60 * 60 * 1000 // 1 hour
    )

    if (!rateLimitResult.allowed) {
      return errorResponse(
        new TooManyRequestsError(
          `Too many OTP requests. Try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimitResult.retryAfter
        )
      )
    }

    // ── 60-second cooldown between resends ──
    await connectDB()

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

    // ── Remove any existing OTPs for this email + purpose ──
    await Otp.deleteMany({ email: normalizedEmail, purpose })

    // ── Generate & save OTP ──
    const otp = generateOTP()

    await Otp.create({
      email: normalizedEmail,
      otp,
      purpose,
    })

    // ── Send email ──
    await sendOtpEmail(normalizedEmail, otp, purpose)

    return successResponse(
      {
        message: 'OTP sent successfully',
        email: normalizedEmail,
        expiresIn: 600, // seconds
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[send-otp] Error:', error)
    return errorResponse(error)
  }
}
