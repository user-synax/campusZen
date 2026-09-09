import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import GroupMessage from '@/models/GroupMessage'
import { getCurrentUser } from '@/lib/auth'
import { emitToGroup } from '@/lib/realtime'
import { validateObjectId } from '@/utils/validators'

/**
 * DELETE /api/groups/[groupId]/messages/[messageId] - Soft delete message
 */
export async function DELETE(request, { params }) {
  try {
    const { groupId, messageId } = await params
    if (!validateObjectId(groupId) || !validateObjectId(messageId)) {
      return NextResponse.json({ message: 'Invalid Group or Message ID' }, { status: 400 })
    }

    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Find message
    const message = await GroupMessage.findOne({ _id: messageId, groupId })
    if (!message) {
      return NextResponse.json({ message: 'Message not found' }, { status: 404 })
    }

    // 2. Check sender === currentUser._id
    if (message.sender.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ message: 'Unauthorized: Only the sender can delete the message' }, { status: 403 })
    }

    // 3. Soft delete:
    if (!message.isDeleted) {
      message.isDeleted = true
      message.content = ''
      message.imageUrl = ''
      message.deletedAt = new Date()
      await message.save()

      // 4. Emit message:deleted to group room
      await emitToGroup(groupId, 'message:deleted', {
        messageId: message._id
      })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[GroupMessage DELETE]', err.message)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
