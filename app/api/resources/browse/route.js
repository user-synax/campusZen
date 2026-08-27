import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Resource from '@/models/Resource'
import { getCurrentUser } from '@/lib/auth'
import { sanitizeMongoInput } from '@/lib/sanitize'

/**
 * GET /api/resources/browse
 * Params: category, college, search, sort, page, limit
 * Auth: Optional (isSaved flag requires auth)
 */
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const college = searchParams.get('college')?.trim()
    const search = searchParams.get('search')?.trim()
    const isSavedFilter = searchParams.get('saved') === 'true'
    const sort = searchParams.get('sort') || 'newest'
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(20, Number(searchParams.get('limit')) || 12)
    const skip = (page - 1) * limit

    // ━━━ Get current user (optional) ━━━
    let currentUserId = null
    try {
      const user = await getCurrentUser(request)
      currentUserId = user?._id
    } catch (authErr) {
      // Optional auth failed — continue as guest
    }

    // ━━━ Build query ━━━
    const query = {
      status: 'approved',
      isHidden: false
    }

    if (category && category !== 'all') {
      query.category = category
    }
    
    if (college) {
      // Case-insensitive regex search on college field (regex-escaped)
      query.college = { $regex: sanitizeMongoInput(college), $options: 'i' }
    }
    
    if (search && search.length >= 2) {
      // Sanitize search string for text search
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$text = { $search: safeSearch }
    }

    if (isSavedFilter && currentUserId) {
      query.saves = currentUserId
    }

    // ━━━ Sort options ━━━
    const sortMap = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt: 1 },
      popular: { downloadCount: -1 },
      saved:   { saveCount: -1 }
    }
    const sortQuery = sortMap[sort] || sortMap.newest

    // ━━━ Parallel queries ━━━
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name username college isVerified avatar')
        .select('-fileKey -reviewedBy -copyrightFlag -reportCount -saves')
        .lean(),
      Resource.countDocuments(query)
    ])

    // ━━━ Add isSaved flag ━━━
    let finalResources = resources
    if (currentUserId && resources.length > 0) {
      // Efficiently check which resources are saved by the user
      const savedResources = await Resource.find({
        _id: { $in: resources.map(r => r._id) },
        saves: currentUserId
      }).select('_id').lean()
      
      const savedIds = new Set(savedResources.map(r => r._id.toString()))
      
      finalResources = resources.map(r => ({
        ...r,
        isSaved: savedIds.has(r._id.toString())
      }))
    } else {
      finalResources = resources.map(r => ({
        ...r,
        isSaved: false
      }))
    }

    // ━━━ Build response with cache headers ━━━
    const response = NextResponse.json({
      resources: finalResources,
      total,
      hasMore: skip + resources.length < total,
      page,
      limit
    })

    // Conditional Cache Control
    if (currentUserId) {
      // Personalized for user — never cache publicly
      response.headers.set('Cache-Control', 'private, max-age=0, no-cache, no-store, must-revalidate')
    } else {
      // Generic results for guests — public cache: 60s max-age, 30s stale-while-revalidate
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=30'
      )
    }

    return response

  } catch (err) {
    console.error('[Browse Resources GET]', err.message)
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}
