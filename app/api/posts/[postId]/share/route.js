import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Post from '@/models/Post'
import { getCurrentUser } from '@/lib/auth'
import { validateObjectId } from '@/utils/validators'
import { awardVP } from '@/lib/coins'

export async function POST(request, { params }) {
  try {
    const { postId } = await params

    if (!validateObjectId(postId)) {
      return NextResponse.json({ message: 'Invalid post ID' }, { status: 400 })
    }

    await connectDB()

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { shareCount: 1 } },
      { new: true }
    )

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    // Award VP for sharing (actor earns, idempotent per post per user)
    const currentUser = await getCurrentUser(request)
    if (currentUser) {
      awardVP(currentUser._id, 'resource_share', postId).catch((err) =>
        console.error('VP award error:', err)
      )
    }

    return NextResponse.json({ 
      message: 'Share tracked',
      shareCount: post.shareCount 
    })
  } catch (error) {
    console.error('[SharePOST] Error:', error.message)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}