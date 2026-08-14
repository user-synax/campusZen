import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
import { isValidObjectId } from '@/utils/validators'
import { getAppwriteAdminStorage } from '@/lib/appwrite'

/**
 * DELETE /api/resources/[resourceId]
 * Deletes own resource (if not already approved)
 */
export async function DELETE(request, { params }) {
  const { resourceId } = await params

  // 1. Validate ID
  if (!isValidObjectId(resourceId)) {
    return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 })
  }

  // 2. Auth
  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    // 3. Find resource (need fileKey for UT deletion)
    const resource = await Resource.findById(resourceId).select('+fileKey').lean()
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // 4. Owner check
    if (resource.uploadedBy.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. Status check — Approved resources cannot be deleted by users
    if (resource.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete approved resources. Contact admin to remove.' },
        { status: 400 }
      )
    }

    // 6. Delete from Appwrite Storage
    if (resource.fileKey) {
      try {
        await getAppwriteAdminStorage().deleteFile(
          process.env.NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID,
          resource.fileKey
        )
      } catch (awErr) {
        console.error('[Resource Delete] Appwrite Storage error:', awErr.message)
        // We continue deleting from DB even if storage deletion fails to avoid broken states
      }
    }

    // 7. Delete from MongoDB
    await Resource.findByIdAndDelete(resourceId)

    return NextResponse.json({ success: true, message: 'Resource deleted' })

  } catch (err) {
    console.error('[Resource DELETE]', err.message)
    return NextResponse.json(
      { error: 'Delete failed. Please try again.' },
      { status: 500 }
    )
  }
}
