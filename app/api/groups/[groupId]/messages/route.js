import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import GroupMessage from '@/models/GroupMessage'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeText, sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/rate-limit'
import { triggerPusher } from '@/lib/pusher-server'
import { createNotification } from '@/lib/notifications'
import { validateObjectId } from '@/utils/validators'

/**
 * GET /api/groups/[groupId]/messages - Get messages for a group (cursor-based pagination)
 */
export async function GET(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit')) || 30, 50)

    await connectDB()

    // 1. Verify member
    const group = await GroupChat.findOne({ _id: groupId, 'members.userId': currentUser._id, isActive: true }).lean()
    if (!group) {
      return NextResponse.json({ message: 'Group not found or not a member' }, { status: 403 })
    }

    // 2. Build query
    const query = { groupId }
    if (cursor && validateObjectId(cursor)) {
      query._id = { $lt: cursor }
    }

    // 3. Fetch messages (newest first)
    const messages = await GroupMessage.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('sender', 'name username avatar isVerified')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name username' }
      })
      .lean()

    // 4. Pagination logic
    const hasMore = messages.length > limit
    const paginatedMessages = messages.slice(0, limit)
    
    // 5. Reverse for display (oldest first)
    const reversedMessages = [...paginatedMessages].reverse()

    // 6. Mark as read (fire and forget)
    GroupChat.findOneAndUpdate(
      { _id: groupId, 'members.userId': currentUser._id },
      { $set: { 'members.$.lastReadAt': new Date() } }
    ).catch(err => console.error('Operation failed:', err))

    return NextResponse.json({
      messages: reversedMessages,
      hasMore,
      nextCursor: hasMore ? paginatedMessages[paginatedMessages.length - 1]._id : null
    })

  } catch (err) {
    console.error('[GroupMessages GET]', err.message)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

/**
 * POST /api/groups/[groupId]/messages - Send message
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

    // 1. Rate limit: 30 messages per minute
    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      `msg_${currentUser._id}_${groupId}`,
      30,
      60 * 1000
    )
    if (blocked) return rateLimitResponse

    await connectDB()

    // 2. Verify member in group
    const group = await GroupChat.findOne({ _id: groupId, 'members.userId': currentUser._id, isActive: true })
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

    const { content, type, imageUrl, clientId, replyTo } = sanitizeMongoInput(body)

    // 3. Validate content/type
    if (!['text', 'image'].includes(type)) {
      return NextResponse.json({ message: 'Invalid message type' }, { status: 400 })
    }

    if (type === 'text') {
      if (!content || !content.trim()) {
        return NextResponse.json({ message: 'Message content required' }, { status: 400 })
      }
      if (content.length > 2000) {
        return NextResponse.json({ message: 'Message too long (max 2000 chars)' }, { status: 400 })
      }
    } else if (type === 'image') {
      if (!imageUrl || !imageUrl.startsWith('https://')) {
        return NextResponse.json({ message: 'Invalid image URL' }, { status: 400 })
      }
    }

    // 4. Create message in DB
    const message = await GroupMessage.create({
      groupId,
      sender: currentUser._id,
      content: type === 'text' ? sanitizeText(content) : '',
      type,
      imageUrl: type === 'image' ? imageUrl : '',
      replyTo: replyTo && validateObjectId(replyTo) ? replyTo : null
    })

    // Fetch original message if this is a reply, to populate it
    let populatedReplyTo = null
    if (message.replyTo) {
      const origMsg = await GroupMessage.findById(message.replyTo)
        .populate('sender', 'name username')
        .lean()
      if (origMsg) {
        populatedReplyTo = origMsg
      }
    }

    // 5. Construct populated message for immediate return & Pusher
    const populated = {
      ...message.toObject(),
      sender: {
        _id: currentUser._id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
        isVerified: currentUser.isVerified || false
      },
      replyTo: populatedReplyTo
    }

    // 5.5 Update group's lastMessage (fire and forget)
    GroupChat.findByIdAndUpdate(groupId, {
      lastMessage: {
        content: type === 'text' ? content.slice(0, 60) : '📷 Image',
        senderName: currentUser.name,
        sentAt: new Date(),
        type
      },
      $inc: { messageCount: 1 }
    }).catch(err => console.error('Operation failed:', err))

    // 6. Trigger Pusher
    // We await this to ensure delivery before function ends in serverless environment
    await triggerPusher(`private-group-${groupId}`, 'new-message', {
      ...populated,
      clientId,
      reactions: []
    })

    // 7. Create in-app notifications for each group member (except sender, respect mute)
    const senderIdStr = currentUser._id.toString()
    for (const member of group.members) {
      const memberIdStr = member.userId.toString()
      if (memberIdStr === senderIdStr) continue
      if (member.isMuted) continue

      await createNotification({
        recipient: member.userId,
        sender: currentUser._id,
        type: 'group_message',
        groupId,
        meta: {
          groupName: group.name,
          messagePreview: content ? content.substring(0, 100) : '📷 Image',
          senderName: currentUser.name
        },
        dedupe: false
      }).catch(err => console.error('[GroupMessage] Notification failed for member:', memberIdStr, err.message))
    }

    return NextResponse.json({ ...populated, clientId }, { status: 201 })

  } catch (err) {
    console.error('[GroupMessages POST]', err.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
