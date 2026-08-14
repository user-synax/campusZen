import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/db'
import GroupChat from '@/models/GroupChat'
import { getCurrentUser } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
import { validateObjectId } from '@/utils/validators'

/**
 * POST /api/groups/[groupId]/read - Mark group as read
 */
export async function POST(request, { params }) {
  try {
    const { groupId } = await params
    if (!validateObjectId(groupId)) {
      return NextResponse.json({ message: 'Invalid Group ID' }, { status: 400 })
    }

    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'group_read_api',
      60,
      1 * 60 * 1000
    )
    if (blocked) return rateLimitResponse

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Find group and update the specific member's lastReadAt and unreadCount
    const updatedGroup = await GroupChat.findOneAndUpdate(
      { 
        _id: groupId, 
        'members.userId': new mongoose.Types.ObjectId(currentUser._id) 
      },
      { 
        $set: { 
          'members.$.lastReadAt': new Date(),
          'members.$.unreadCount': 0
        } 
      },
      { new: true }
    )

    if (!updatedGroup) {
      return NextResponse.json({ message: 'Group not found or you are not a member' }, { status: 404 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[GroupRead POST]', err.message)
    return NextResponse.json({ error: 'Failed to mark group as read' }, { status: 500 })
  }
}
