import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Otp from '@/models/Otp'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { applyRateLimit, rateLimit } from '@/lib/redis-rate-limit'
import {
  successResponse,
  errorResponse,
  BadRequestError,
} from '@/lib/api-response'

const MAX_VERIFY_ATTEMPTS = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(new BadRequestError('Invalid request body'))
    }

    const { email, otp } = body
    const purpose = 'forgot_password'

    if (!email || typeof email !== 'string') {
      return errorResponse(new BadRequestError('Email is required'))
    }
    if (!otp || typeof otp !== 'string') {
      return errorResponse(new BadRequestError('OTP is required'))
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Rate limiting (Redis-backed) ──
    // Per-IP limit (rotating IPs still bounded per endpoint).
    const ipLimit = await applyRateLimit(
      request,
      'forgot_pw_verify_ip',
      20,
      15 * 60 * 1000,
    )
    if (ipLimit.blocked) return ipLimit.response

    // Per-account limit keyed purely by email so rotating IPs cannot bypass it.
    const acctLimit = await rateLimit(
      normalizedEmail,
      'forgot_pw_verify_acct',
      10,
      15 * 60 * 1000,
    )
    if (!acctLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many attempts',
          message: `Too many attempts for this account. Try again in ${acctLimit.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(acctLimit.retryAfter) },
        },
      )
    }

    await connectDB()

    const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose })

    // Generic response to avoid account enumeration.
    if (!otpRecord) {
      return errorResponse(new BadRequestError('Invalid or expired OTP'))
    }

    // Account-level lockout after too many failed attempts.
    if (otpRecord.lockedUntil && otpRecord.lockedUntil > new Date()) {
      const retryAfter = Math.ceil(
        (otpRecord.lockedUntil.getTime() - Date.now()) / 1000,
      )
      return NextResponse.json(
        {
          error: 'Locked',
          message: `Too many incorrect attempts. Try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      )
    }

    // Constant-time comparison against the hashed OTP at rest.
    const matches = await bcrypt.compare(otp.trim(), otpRecord.otp)
    if (!matches) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1
      if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
        otpRecord.lockedUntil = new Date(Date.now() + LOCK_WINDOW_MS)
      }
      await otpRecord.save()

      if (otpRecord.lockedUntil) {
        return NextResponse.json(
          {
            error: 'Locked',
            message: `Too many incorrect attempts. Try again in ${Math.ceil(LOCK_WINDOW_MS / 1000)} seconds.`,
          },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil(LOCK_WINDOW_MS / 1000)) },
          },
        )
      }

      const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - otpRecord.attempts)
      return errorResponse(
        new BadRequestError(
          `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        ),
      )
    }

    // ── OTP verified: only NOW issue a reset token ──
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return errorResponse(new BadRequestError('User not found'))
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000)

    await User.updateOne(
      { _id: user._id },
      { resetToken, resetTokenExpiry },
    )

    // Consume the OTP so it cannot be reused.
    await Otp.deleteOne({ _id: otpRecord._id })

    return successResponse({
      success: true,
      resetToken,
      message: 'OTP verified successfully',
    })
  } catch (error) {
    console.error('[forgot-password/verify-otp] Error:', error)
    return errorResponse(error)
  }
}
