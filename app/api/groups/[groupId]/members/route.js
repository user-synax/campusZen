import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import GroupMessage from '@/models/GroupMessage'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeMongoInput } from '@/lib/sanitize'
import { applyRateLimit } from '@/lib/rate-limit'
import { triggerPusher } from '@/lib/pusher-server'
import { validateObjectId } from '@/utils/validators'
import { createNotification } from '@/lib/notifications'

/**
 * POST /api/groups/[groupId]/members - Add member (admin only)
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_member_add_api',
      10,
      1 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Check caller is admin
    const group = await GroupChat.findById(groupId)
    if (!group || !group.isActive) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    const callerMember = group.members.find(
      m => m.userId.toString() === currentUser._id.toString()
    )
    if (!callerMember || callerMember.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can add members' }, { status: 403 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { userId } = sanitizeMongoInput(body)
    if (!validateObjectId(userId)) {
      return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 })
    }

    // 2. Check userId not already a member
    const alreadyMember = group.members.some(
      m => m.userId.toString() === userId.toString()
    )
    if (alreadyMember) {
      return NextResponse.json({ message: 'User is already a member of this group' }, { status: 409 })
    }

    // 3. Check group size < 200
    if (group.members.length >= 200) {
      return NextResponse.json({ message: 'Group is full (max 200 members)' }, { status: 400 })
    }

    // 4. Verify user exists in DB
    const userToAdd = await User.findById(userId).select('name username avatar isVerified').lean()
    if (!userToAdd) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 5. $push to members array
    const newMember = { userId, role: 'member', joinedAt: new Date() }
    group.members.push(newMember)
    
    const systemMessage = `${currentUser.name} added ${userToAdd.name} to the group`
    group.lastMessage = {
      content: systemMessage,
      senderName: 'System',
      sentAt: new Date(),
      type: 'system'
    }
    
    await group.save()

    // 6. Create system message
    await GroupMessage.create({
      groupId: group._id,
      sender: currentUser._id,
      content: systemMessage,
      type: 'system'
    })

    // 7. Create notification for the added user
    createNotification({
      recipient: userId,
      sender: currentUser._id,
      type: 'group_invite',
      groupId: group._id,
      meta: { groupName: group.name },
      dedupe: false
    }).catch(err => console.error('Operation failed:', err))

    // 8. Trigger Pusher events
    // Trigger on group channel for existing members
    triggerPusher(`private-group-${groupId}`, 'member-added', {
      member: {
        userId: userToAdd._id,
        name: userToAdd.name,
        username: userToAdd.username,
        avatar: userToAdd.avatar,
        isVerified: userToAdd.isVerified,
        role: 'member',
        joinedAt: new Date()
      },
      message: systemMessage
    }).catch(err => console.error('Operation failed:', err))

    // Trigger on user's personal channel to notify them about being added
    triggerPusher(`private-user-${userId}`, 'group-joined', group).catch(err => console.error('Operation failed:', err))

    return NextResponse.json({ 
      success: true, 
      member: {
        userId: userToAdd._id,
        name: userToAdd.name,
        username: userToAdd.username,
        avatar: userToAdd.avatar,
        isVerified: userToAdd.isVerified
      }
    })

  } catch (err) {
    console.error('[GroupMembers POST]', err.message)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

/**
 * DELETE /api/groups/[groupId]/members - Remove member (admin only, or self-leave)
 */
export async function DELETE(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_member_remove_api',
      10,
      1 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const group = await GroupChat.findById(groupId)
    if (!group || !group.isActive) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // Body validation
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { userId } = sanitizeMongoInput(body)
    if (!validateObjectId(userId)) {
      return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 })
    }

    const targetUserIdStr = userId.toString()
    const currentUserIdStr = currentUser._id.toString()
    
    // Check if target is in group
    const targetMemberIndex = group.members.findIndex(m => m.userId.toString() === targetUserIdStr)
    if (targetMemberIndex === -1) {
      return NextResponse.json({ message: 'User is not a member of this group' }, { status: 404 })
    }

    const targetMember = group.members[targetMemberIndex]
    const isSelfLeave = targetUserIdStr === currentUserIdStr
    const callerMember = group.members.find(m => m.userId.toString() === currentUserIdStr)

    // A. Admin removing someone
    if (!isSelfLeave) {
      if (!callerMember || callerMember.role !== 'admin') {
        return NextResponse.json({ message: 'Only admins can remove members' }, { status: 403 })
      }
      // Cannot remove another admin if you are not the creator (or just simpler: cannot remove admins)
      // Actually, instructions say "Cannot remove the creator/admin"
      if (targetMember.role === 'admin' && group.createdBy.toString() === targetUserIdStr) {
        return NextResponse.json({ message: 'Group creator cannot be removed' }, { status: 400 })
      }
    } else {
      // B. User leaving themselves
      // Creator CANNOT leave (must delete group)
      if (group.createdBy.toString() === currentUserIdStr) {
        return NextResponse.json({ message: 'Group creator cannot leave, delete group instead' }, { status: 400 })
      }
    }

    // Get target user info for message
    const targetUser = await User.findById(userId).select('name username').lean()
    if (!targetUser) {
      return NextResponse.json({ message: 'Target user not found' }, { status: 404 })
    }

    // 1. Remove from members
    group.members.splice(targetMemberIndex, 1)

    const systemMessage = isSelfLeave 
      ? `${targetUser.name} left the group`
      : `${currentUser.name} removed ${targetUser.name}`

    group.lastMessage = {
      content: systemMessage,
      senderName: 'System',
      sentAt: new Date(),
      type: 'system'
    }
    
    await group.save()

    // 2. Create system message
    await GroupMessage.create({
      groupId: group._id,
      sender: currentUser._id,
      content: systemMessage,
      type: 'system'
    })

    // 3. Trigger Pusher events
    triggerPusher(`private-group-${groupId}`, 'member-removed', {
      userId: targetUserIdStr,
      message: systemMessage
    }).catch(err => console.error('Operation failed:', err))

    // Trigger on user's personal channel to notify them about being removed/left
    triggerPusher(`private-user-${targetUserIdStr}`, 'group-left', { groupId: group._id }).catch(err => console.error('Operation failed:', err))

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[GroupMembers DELETE]', err.message)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
