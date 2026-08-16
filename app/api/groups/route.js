import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import GroupMessage from '@/models/GroupMessage'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { sanitizeText, sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/rate-limit'
import { triggerPusher } from '@/lib/pusher-server'
import { validateObjectId } from '@/utils/validators'

/**
 * GET /api/groups - Get current user's groups (inbox)
 */
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Find all active groups where user is a member
    const groups = await GroupChat.find({
      'members.userId': currentUser._id,
      isActive: true
    })
    .sort({ 'lastMessage.sentAt': -1 })
    .select('name avatar college members lastMessage messageCount createdAt')
    .lean()

    // 2. For each group, read denormalized unread count
    const groupsWithUnread = groups.map((group) => {
      const member = group.members.find(
        m => m.userId.toString() === currentUser._id.toString()
      )

      return {
        ...group,
        unreadCount: member?.unreadCount || 0
      }
    })

    return NextResponse.json({ groups: groupsWithUnread })

  } catch (err) {
    console.error('[Groups GET]', err.message)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

/**
 * POST /api/groups - Create new group
 */
export async function POST(request) {
  try {
    // Standard rate limit - 5 requests per 10 minutes
    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_create_api',
      5,
      10 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    // 1. Business logic rate limit: 3 groups per user per day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = await GroupChat.countDocuments({
      createdBy: currentUser._id,
      createdAt: { $gte: today }
    })
    if (todayCount >= 3) {
      return NextResponse.json({ message: 'Max 3 groups per day allowed' }, { status: 429 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { name, description, avatar, memberIds, college } = sanitizeMongoInput(body)

    // 2. Validate name
    if (!name || name.trim().length < 2 || name.trim().length > 60) {
      return NextResponse.json({ message: 'Name must be between 2 and 60 characters' }, { status: 400 })
    }

    // 3. Validate memberIds
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ message: 'At least one member is required' }, { status: 400 })
    }

    if (memberIds.length > 49) {
      return NextResponse.json({ message: 'Max 49 other members allowed (50 total)' }, { status: 400 })
    }

    // 4. Validate all memberIds are valid ObjectIds
    const validMemberIds = memberIds.filter(id => validateObjectId(id))
    if (validMemberIds.length !== memberIds.length) {
      return NextResponse.json({ message: 'Invalid User IDs provided' }, { status: 400 })
    }

    // 5. Verify memberIds exist in DB
    const users = await User.find({ _id: { $in: validMemberIds } }).select('_id').lean()
    if (users.length !== validMemberIds.length) {
      return NextResponse.json({ message: 'Some users not found' }, { status: 400 })
    }

    // 6. Build members array
    const members = [
      { userId: currentUser._id, role: 'admin', joinedAt: new Date() },
      ...validMemberIds.map(id => ({
        userId: id,
        role: 'member',
        joinedAt: new Date()
      }))
    ]

    // 7. Create group with initial system message
    const group = await GroupChat.create({
      name: sanitizeText(name),
      description: sanitizeText(description || ''),
      avatar: avatar || '',
      college: college || currentUser.college || '',
      members,
      createdBy: currentUser._id,
      lastMessage: {
        content: `${currentUser.name} created the group`,
        senderName: 'System',
        sentAt: new Date(),
        type: 'system'
      }
    })

    // 8. Create the system message in GroupMessage
    await GroupMessage.create({
      groupId: group._id,
      sender: currentUser._id,
      content: `${currentUser.name} created the group`,
      type: 'system'
    })

    // Trigger Pusher for all members to notify them about the new group
    for (const memberId of [currentUser._id, ...validMemberIds]) {
      triggerPusher(`private-user-${memberId}`, 'group-created', group).catch(err => console.error('Operation failed:', err))
    }

    return NextResponse.json(group, { status: 201 })

  } catch (err) {
    console.error('[Groups POST]', err.message)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
