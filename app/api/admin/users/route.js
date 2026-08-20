import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Post from '@/models/Post'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET(request) {
  try {
    await connectDB()
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    const query = { isDeleted: { $ne: true } }

    if (filter === 'banned') query.isBanned = true
    if (filter === 'verified') query.isVerified = true
    if (filter === 'admin') query.isAdmin = true

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ]
    }

    const [users, total, bannedCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name username email college isVerified isAdmin isBanned createdAt avatar')
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ isBanned: true, isDeleted: { $ne: true } })
    ])

    const userIds = users.map(u => u._id)
    const postCounts = await Post.aggregate([
      { $match: { author: { $in: userIds }, isDeleted: { $ne: true } } },
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ])

    const postCountMap = postCounts.reduce((acc, p) => {
      acc[p._id.toString()] = p.count
      return acc
    }, {})

    const usersWithCounts = users.map(u => ({
      ...u,
      postCount: postCountMap[u._id.toString()] || 0
    }))

    return NextResponse.json({
      users: usersWithCounts,
      total,
      bannedCount,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('[AdminUsersGET] Error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
