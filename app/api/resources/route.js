import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
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
 * POST /api/resources — Save resource after UploadThing upload
 * Called by client AFTER UploadThing upload completes.
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
      fileUrl, fileKey, fileName,
      fileSize, fileType: mimeType,
      title, description, category,
      subject, semester, tags: tagsRaw
    } = body

    // ━━━ 4. Validate file fields ━━━
    if (!fileUrl || !fileKey || !fileName || !fileSize || !mimeType) {
      return NextResponse.json({ error: 'Missing file information' }, { status: 400 })
    }

    // Validate fileUrl is from trusted domains
    const allowedDomains = ['utfs.io', 'uploadthing.com', 'ufs.sh']
    const isValidUrl = allowedDomains.some(domain => fileUrl.includes(domain))
    if (!isValidUrl) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }

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

    // ━━━ 7. Duplicate file check ━━━
    const existing = await Resource.findOne({ fileKey }).lean()
    if (existing) {
      return NextResponse.json({ error: 'This file has already been uploaded' }, { status: 409 })
    }

    // ━━━ 8. Copyright risk detection ━━━
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
      fileKey,       // stored but select: false — never in responses
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
