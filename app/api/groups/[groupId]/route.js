import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import GroupMessage from '@/models/GroupMessage'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeText, sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/rate-limit'
import { triggerPusher } from '@/lib/pusher-server'
import { validateObjectId } from '@/utils/validators'

/**
 * GET /api/groups/[groupId] - Get group details + members
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

    await connectDB()

    // 1. Verify member, get group with populated members
    const group = await GroupChat.findById(groupId)
      .populate('members.userId', 'name username avatar isVerified')
      .lean()

    if (!group || !group.isActive) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // 2. Check current user is in members list
    const isMember = group.members.some(
      m => m.userId && m.userId._id.toString() === currentUser._id.toString()
    )
    if (!isMember) {
      return NextResponse.json({ message: 'Not a member of this group' }, { status: 403 })
    }

    const response = NextResponse.json(group);
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return response;

  } catch (err) {
    console.error('[GroupDetail GET]', err.message)
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 })
  }
}

/**
 * PATCH /api/groups/[groupId] - Update group (admin only)
 */
export async function PATCH(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_patch_api',
      10,
      1 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Find group
    const group = await GroupChat.findById(groupId)
    if (!group || !group.isActive) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // 2. Check currentUser has role: 'admin'
    const member = group.members.find(
      m => m.userId.toString() === currentUser._id.toString()
    )
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can update group details' }, { status: 403 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { name, description, avatar } = sanitizeMongoInput(body)

    // 3. Update only provided fields
    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 60) {
        return NextResponse.json({ message: 'Name must be between 2 and 60 characters' }, { status: 400 })
      }
      group.name = sanitizeText(name)
    }

    if (description !== undefined) {
      if (description.length > 200) {
        return NextResponse.json({ message: 'Description must be under 200 characters' }, { status: 400 })
      }
      group.description = sanitizeText(description)
    }

    if (avatar !== undefined) {
      group.avatar = avatar
    }

    await group.save()

    const populatedGroup = await GroupChat.findById(groupId)
      .populate('members.userId', 'name username avatar isVerified')
      .lean()

    // Trigger Pusher for group update
    triggerPusher(`private-group-${groupId}`, 'group-updated', populatedGroup).catch(err => console.error('Operation failed:', err))

    return NextResponse.json(populatedGroup)

  } catch (err) {
    console.error('[GroupDetail PATCH]', err.message)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

/**
 * DELETE /api/groups/[groupId] - Delete group (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_delete_api',
      5,
      10 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Find group
    const group = await GroupChat.findById(groupId)
    if (!group || !group.isActive) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // 2. Check currentUser has role: 'admin' (creator)
    const member = group.members.find(
      m => m.userId.toString() === currentUser._id.toString()
    )
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can delete groups' }, { status: 403 })
    }

    // 3. Soft delete: isActive = false
    group.isActive = false
    
    // Update last message to indicate deletion
    const deleteMessage = `Group was deleted by ${currentUser.name}`
    group.lastMessage = {
      content: deleteMessage,
      senderName: 'System',
      sentAt: new Date(),
      type: 'system'
    }
    
    await group.save()

    // 4. Send system message
    await GroupMessage.create({
      groupId: group._id,
      sender: currentUser._id,
      content: deleteMessage,
      type: 'system'
    })

    // 5. Trigger Pusher event: 'group-deleted'
    triggerPusher(`private-group-${groupId}`, 'group-deleted', {
      groupId: group._id,
      deletedBy: currentUser.name
    }).catch(err => console.error('Operation failed:', err))

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[GroupDetail DELETE]', err.message)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}
