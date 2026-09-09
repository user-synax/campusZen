import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import { getCurrentUser } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
// Typing is now handled by the Socket.IO backend (typing:start / typing:stop).
// This HTTP route is kept for backward compatibility but is a no-op for emits.
import { validateObjectId } from '@/utils/validators'
import { sanitizeMongoInput } from '@/lib/sanitize'

/**
 * POST /api/groups/[groupId]/typing - Broadcast typing indicator
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Rate limit: 10 requests per 5 seconds (typing indicators fire rapidly)
    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      `typing_${currentUser._id}_${groupId}`,
      10,
      5000
    )
    if (blocked) return rateLimitResponse

    await connectDB()

    // 2. Verify member in group
    const group = await GroupChat.findOne({ _id: groupId, 'members.userId': currentUser._id, isActive: true }).lean()
    if (!group) {
      return NextResponse.json({ message: 'Group not found or not a member' }, { status: 403 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { isTyping } = sanitizeMongoInput(body)

    // Typing is now socket-native — no Pusher emit needed

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[GroupTyping POST]', err.message)
    return NextResponse.json({ error: 'Failed to broadcast typing state' }, { status: 500 })
  }
}
