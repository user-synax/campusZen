import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { isValidObjectId } from '@/utils/validators'
import { sanitizeText } from '@/lib/sanitize'
import { createNotification } from '@/lib/notifications'
import { getAppwriteAdminStorage } from '@/lib/appwrite'

/**
 * POST /api/admin/resources/review
 * Auth: Required + Admin only
 * Body: { resourceId, action: 'approve'|'reject', reviewNote? }
 */
export async function POST(request) {
  // ━━━ Admin check ━━━
  const currentUser = await getCurrentUser(request)
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await connectDB()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { resourceId, action, reviewNote } = body

    // ━━━ Validate ━━━
    if (!isValidObjectId(resourceId)) {
      return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 })
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    if (action === 'reject') {
      const note = (reviewNote || '').trim()
      if (note.length < 10) {
        return NextResponse.json(
          { error: 'Rejection reason must be at least 10 characters' },
          { status: 400 }
        )
      }
    }

    // ━━━ Find resource (with fileKey for deletion) ━━━
    const resource = await Resource.findById(resourceId)
      .select('+fileKey +copyrightFlag')

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    
    if (resource.status !== 'pending') {
      return NextResponse.json(
        { error: `Resource already ${resource.status}` },
        { status: 400 }
      )
    }

    // ━━━ Process action ━━━
    if (action === 'reject') {
      // Delete file from Appwrite Storage (save storage quota)
      if (resource.fileKey) {
        try {
          await getAppwriteAdminStorage().deleteFile(
            process.env.NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID,
            resource.fileKey
          )
        } catch (err) {
          // Don't block rejection if storage deletion fails
          console.error('[Admin Review] Appwrite Storage delete failed:', err.message)
        }
      }

      resource.status = 'rejected'
      resource.reviewedBy = currentUser._id
      resource.reviewNote = sanitizeText(reviewNote).slice(0, 300)
      resource.reviewedAt = new Date()
      resource.fileUrl = null  // file is gone
    } else {
      resource.status = 'approved'
      resource.reviewedBy = currentUser._id
      resource.reviewNote = reviewNote
        ? sanitizeText(reviewNote).slice(0, 300)
        : ''
      resource.reviewedAt = new Date()
    }

    await resource.save()

    // ━━━ Notify uploader ━━━
    try {
      await createNotification({
        recipient: resource.uploadedBy,
        sender: currentUser._id,
        type: action === 'approve' ? 'resource_approved' : 'resource_rejected',
        resourceId: resource._id,
        meta: {
          resourceTitle: resource.title,
          reviewNote: action === 'reject' ? resource.reviewNote : null
        },
        dedupe: false
      })
    } catch (notifErr) {
      console.error('[Admin Review] Notification failed:', notifErr.message)
    }

    return NextResponse.json({
      success: true,
      action,
      resourceId: resource._id
    })

  } catch (err) {
    console.error('[Admin Review POST]', err.message)
    return NextResponse.json(
      { error: 'Review failed. Please try again.' },
      { status: 500 }
    )
  }
}
