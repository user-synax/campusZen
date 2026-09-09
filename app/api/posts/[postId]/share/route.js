import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Post from '@/models/Post'
import { getCurrentUser } from '@/lib/auth'
import { validateObjectId } from '@/utils/validators'

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

    return NextResponse.json({ 
      message: 'Share tracked',
      shareCount: post.shareCount 
    })
  } catch (error) {
    console.error('[SharePOST] Error:', error.message)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}