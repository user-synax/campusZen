import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { FOUNDER_USERNAME, isFounder } from '@/lib/founder'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { withCache, deleteCache } from '@/lib/cache'
import { sanitizeText, sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/redis-rate-limit'

export async function GET() {
  try {
    const data = await withCache('founder_roadmap', 60, async () => {
      await connectDB()

      if (!FOUNDER_USERNAME) {
        return { roadmap: [] }
      }

      const founderQuery = { username: { $regex: new RegExp(`^${FOUNDER_USERNAME}$`, 'i') } };
      const founder = await User.findOne(founderQuery)
        .select('founderData.roadmap')
        .lean()

      const roadmap = founder?.founderData?.roadmap || []
      const sortedRoadmap = [...roadmap].sort((a, b) => (a.order || 0) - (b.order || 0))

      return { roadmap: sortedRoadmap }
    });

    return NextResponse.json(data)
  } catch (error) {
    console.error('Roadmap GET error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    // Rate limit founder roadmap - 5 per hour per IP
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'founder_roadmap',
      5,
      60 * 60 * 1000
    );
    if (blocked) return rateLimitResponse;

    await connectDB()

    // Auth check
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await User.findById(decoded.userId).select('username').lean()
    if (!user || !isFounder(user.username)) {
      return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const sanitizedBody = sanitizeMongoInput(body) || {}
    const { roadmap } = sanitizedBody
    if (!Array.isArray(roadmap)) {
      return NextResponse.json({ message: 'Roadmap must be an array' }, { status: 400 })
    }

    if (roadmap.length > 20) {
      return NextResponse.json({ message: 'Max 20 roadmap items allowed' }, { status: 400 })
    }

    const validatedRoadmap = roadmap.map((item, index) => {
      const { title, status, emoji, order } = item      
      if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 60) {
        throw new Error(`Invalid title for item at index ${index}`)
      }

      const validStatuses = ['done', 'inprogress', 'upcoming']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status for item at index ${index}`)
      }

      return {
        title: sanitizeText(title),
        status,
        emoji: (emoji && typeof emoji === 'string') ? sanitizeText(emoji).substring(0, 4) : '📌',
        order: typeof order === 'number' ? order : index
      }
    })

    // Use findByIdAndUpdate for reliability since we already have the decoded userId
    const updatedFounder = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: { 'founderData.roadmap': validatedRoadmap } },
      { new: true, runValidators: true }
    ).select('founderData.roadmap')

    if (!updatedFounder) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Invalidate cache
    deleteCache('founder_roadmap')

    const roadmapResult = updatedFounder.founderData?.roadmap || []
    return NextResponse.json({ roadmap: roadmapResult })
  } catch (error) {
    console.error('Roadmap PATCH error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: error.message ? 400 : 500 })
  }
}
