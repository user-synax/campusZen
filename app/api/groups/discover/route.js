import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/redis-rate-limit'

/**
 * GET /api/groups/discover - Discover public groups
 */
export async function GET(request) {
  try {
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'group_discover_api',
      20,
      1 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = sanitizeMongoInput(searchParams.get('q') || '')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50)
    const skip = (page - 1) * limit

    await connectDB()

    // 1. Find active groups from same college that user hasn't joined
    const query = {
      isActive: true,
      college: { $regex: new RegExp(`^${currentUser.college}$`, 'i') },
      'members.userId': { $nin: [currentUser._id] }
    }

    // 2. If search param provided
    if (q && q.trim().length >= 2) {
      // Use text search or simple regex on name/description
      query.$or = [
        { name: { $regex: new RegExp(q.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
        { description: { $regex: new RegExp(q.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
      ]
    }

    const [groups, total] = await Promise.all([
      GroupChat.find(query)
        .sort({ messageCount: -1 })
        .skip(skip)
        .limit(limit)
        .select('name description avatar college members messageCount createdAt')
        .lean(),
      GroupChat.countDocuments(query)
    ])

    return NextResponse.json({
      groups,
      total,
      hasMore: skip + groups.length < total,
      page
    })

  } catch (err) {
    console.error('[GroupsDiscover GET]', err.message)
    return NextResponse.json({ error: 'Failed to discover groups' }, { status: 500 })
  }
}
