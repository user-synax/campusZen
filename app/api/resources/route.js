import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
import { getFileViewUrlString } from '@/lib/appwrite'
import { awardXP } from '@/lib/gamification'
import { awardVP } from '@/lib/coins'
import { applyRateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'
import { 
  detectCopyrightRisk, 
  processTags, 
  validateSemester, 
  getFileTypeFromMime 
} from '@/utils/resource-helpers'

/**
 * POST /api/resources — Save resource after Appwrite Storage upload
 * Called by client AFTER the direct Appwrite Storage upload completes.
 */
export async function POST(request) {
  // ━━━ 1. Rate limit FIRST ━━━
  const { blocked, response: limitRes } = applyRateLimit(
    request, 'resource_upload', 5, 60 * 60 * 1000 // 5 uploads per hour
  )
  if (blocked) return limitRes

  // ━━━ 2. Auth ━━━
  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    // ━━━ 3. Parse body ━━━
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      fileId, fileName,
      fileSize, fileType: mimeType,
      title, description, category,
      subject, semester, tags: tagsRaw
    } = body

    // ━━━ 4. Validate file fields ━━━
    if (!fileId || !fileName || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing file information' }, { status: 400 })
    }

    // Derive the public view URL server-side from the Appwrite file ID
    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID
    const fileUrl = getFileViewUrlString(fileId, bucketId)

    // ━━━ 5. Validate content fields ━━━
    const errors = []

    const cleanTitle = sanitizeText(title || '')
    if (!cleanTitle || cleanTitle.length < 5) {
      errors.push('Title must be at least 5 characters')
    }
    if (cleanTitle.length > 150) {
      errors.push('Title too long (max 150 characters)')
    }

    const validCategories = [
      'notes', 'pyq', 'coding', 'formula',
      'lab', 'interview', 'project', 'other'
    ]
    if (!category || !validCategories.includes(category)) {
      errors.push('Invalid or missing category')
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    // ━━━ 6. Process optional fields ━━━
    const cleanDescription = sanitizeText(description || '').slice(0, 500)
    const cleanSubject = sanitizeText(subject || '').slice(0, 100)
    const cleanSemester = validateSemester(semester)
    const cleanTags = processTags(tagsRaw)
    const fileTypeParsed = getFileTypeFromMime(mimeType)

    if (!fileTypeParsed) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // ━━━ 7. Copyright risk detection ━━━
    const isFlagged = detectCopyrightRisk(cleanTitle, fileName)

    // ━━━ 9. Save to MongoDB ━━━
    const resource = await Resource.create({
      title: cleanTitle,
      description: cleanDescription,
      category,
      subject: cleanSubject,
      college: currentUser.college || '',
      semester: cleanSemester,
      tags: cleanTags,
      fileUrl,
      fileKey: fileId,       // Appwrite file $id, select: false — never in responses
      fileName: sanitizeText(fileName).slice(0, 255),
      fileSize: Number(fileSize),
      fileType: fileTypeParsed,
      uploadedBy: currentUser._id,
      status: 'pending',
      copyrightFlag: isFlagged,
      reviewNote: isFlagged 
        ? '⚠️ AUTO-FLAG: Possible copyrighted content' 
        : ''
    })

    // Award XP for uploading (background)
    awardXP(currentUser._id, 'resource_upload').catch(err => console.error('XP award error:', err));

    // Award VP for uploading a resource (background, idempotent)
    awardVP(currentUser._id, 'resource_upload', resource._id).catch(err => console.error('VP award error:', err));

    // ━━━ 10. Return success ━━━
    return NextResponse.json({
      success: true,
      resource: {
        _id: resource._id,
        title: resource.title,
        status: resource.status,
        category: resource.category
      },
      message: 'Resource submitted! It will be reviewed and published soon.'
    }, { status: 201 })

  } catch (err) {
    console.error('[Resource Upload]', err.message)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
