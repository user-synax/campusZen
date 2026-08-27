import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
import { getFileViewUrlString, createAppwriteAdminClient } from '@/lib/appwrite'
import { Storage } from 'node-appwrite'
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

const MAX_RESOURCE_BYTES = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/jpg',
  'image/png', 'image/webp',
]

// Validate the REAL file content (not the client-declared MIME type).
function detectResourceType(head) {
  if (!head || head.length < 4) return null
  // PDF: %PDF
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
    return 'pdf'
  }
  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'image'
  }
  // PNG: 89 50 4E 47
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return 'image'
  }
  // WebP: RIFF....WEBP
  if (
    head.length >= 12 &&
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return 'image'
  }
  return null
}

// Stream only the first bytes of the (public) view URL to inspect magic bytes.
async function readHeadBytes(viewUrl, n = 64) {
  try {
    const res = await fetch(viewUrl, { headers: { Range: `bytes=0-${n - 1}` } })
    if (!res.ok && res.status !== 206) return null
    const buf = new Uint8Array(n)
    let filled = 0
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader()
      while (filled < n) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const take = Math.min(value.length, n - filled)
          buf.set(value.subarray(0, take), filled)
          filled += take
        }
      }
    } else {
      const ab = await res.arrayBuffer()
      const take = Math.min(ab.byteLength, n)
      buf.set(new Uint8Array(ab).subarray(0, take), 0)
      filled = take
    }
    return filled > 0 ? buf.subarray(0, filled) : null
  } catch {
    return null
  }
}

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

    // ━━━ Server-side file validation (magic bytes, size, ownership) ━━━
    let fileMeta
    try {
      const adminStorage = new Storage(createAppwriteAdminClient())
      fileMeta = await adminStorage.getFile(bucketId, fileId)
    } catch {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    if (!fileMeta || fileMeta.sizeOriginal == null) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    if (fileMeta.sizeOriginal > MAX_RESOURCE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }
    if (!ALLOWED_MIME.includes(fileMeta.mimeType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }
    // Ownership: the file must be writable by the requesting user.
    if (currentUser.appwriteUserId) {
      const owned = (fileMeta.permissions || []).some(
        (p) =>
          typeof p === 'string' &&
          p.startsWith('write(') &&
          p.includes(currentUser.appwriteUserId),
      )
      if (!owned) {
        return NextResponse.json(
          { error: 'File does not belong to you' },
          { status: 403 },
        )
      }
    }
    // Magic-byte validation of the real content (not client-declared type).
    const head = await readHeadBytes(fileUrl)
    const detected = detectResourceType(head)
    if (!detected) {
      return NextResponse.json(
        { error: 'File content is not a valid PDF or image' },
        { status: 400 },
      )
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
    // Use the server-validated MIME type, not the client-supplied value.
    const fileTypeParsed = getFileTypeFromMime(fileMeta.mimeType)

    if (!fileTypeParsed) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // ━━━ 7. Copyright risk detection ━━━
    const isFlagged = detectCopyrightRisk(cleanTitle, fileMeta.name)

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
      fileName: sanitizeText(fileMeta.name || fileName).slice(0, 255),
      fileSize: Number(fileMeta.sizeOriginal),
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
