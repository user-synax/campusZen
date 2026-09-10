import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { FOUNDER_USERNAME, isFounder } from '@/lib/founder'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeText } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/redis-rate-limit'

export async function GET() {
  try {
    await connectDB()

    if (!FOUNDER_USERNAME) {
      return NextResponse.json({ broadcast: null })
    }

    const founder = await User.findOne({
      username: FOUNDER_USERNAME.toLowerCase()
    }).lean()

    if (!founder || !founder.founderData?.broadcastActive) {
      const response = NextResponse.json({ broadcast: null })
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
      return response
    }

    const response = NextResponse.json({
      broadcast: {
        message: founder.founderData.broadcastMessage,
        id: founder.founderData.broadcastId,
        createdAt: founder.founderData.broadcastCreatedAt,
      }
    })
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Broadcast GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'founder_broadcast',
      5,
      60 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    await connectDB()
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !isFounder(currentUser.username)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { message, active } = body || {}

    let updatedUser

    if (active) {
      if (!message || message.trim().length === 0) {
        return NextResponse.json({ message: 'Message is required when activating broadcast' }, { status: 400 })
      }
      if (message.length > 200) {
        return NextResponse.json({ message: 'Message must be less than 200 characters' }, { status: 400 })
      }

      const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2)
      const sanitizedMessage = sanitizeText(message)

      updatedUser = await User.findOneAndUpdate(
        { username: FOUNDER_USERNAME.toLowerCase() },
        {
          $set: {
            'founderData.broadcastMessage': sanitizedMessage,
            'founderData.broadcastId': uniqueId,
            'founderData.broadcastActive': true,
            'founderData.broadcastCreatedAt': new Date(),
          }
        },
        { new: true }
      ).select('founderData')
    } else {
      updatedUser = await User.findOneAndUpdate(
        { username: FOUNDER_USERNAME.toLowerCase() },
        { $set: { 'founderData.broadcastActive': false } },
        { new: true }
      ).select('founderData')
    }

    return NextResponse.json({ success: true, broadcast: updatedUser?.founderData })
  } catch (error) {
    console.error('Broadcast POST error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
