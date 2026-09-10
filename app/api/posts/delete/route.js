import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Post from '@/models/Post';
import User from '@/models/User';
import Comment from '@/models/Comment';
import { getCurrentUser } from '@/lib/auth';
import { validateObjectId } from '@/utils/validators';
import { removeHashtags } from '@/lib/hashtag-utils';
import { deletePostNotifications } from '@/lib/notifications';
import { applyRateLimit } from '@/lib/redis-rate-limit';
import { sanitizeMongoInput } from '@/lib/sanitize';

export async function DELETE(request) {
  try {
    // Rate limit post deletion - 10 per hour per IP
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'post_delete',
      10,
      60 * 60 * 1000
    );
    if (blocked) return rateLimitResponse;

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const cleanBody = sanitizeMongoInput(body);
    const { postId } = cleanBody;

    if (!validateObjectId(postId)) {
      return NextResponse.json({ message: 'Invalid Post ID' }, { status: 400 });
    }

    await connectDB();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    if (post.author.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ message: 'Forbidden: You are not the author of this post' }, { status: 403 });
    }

    await Promise.all([
      Comment.deleteMany({ post: postId }),
      Post.findByIdAndDelete(postId),
      deletePostNotifications(postId),
    ]);

    // Remove this post from all users' bookmarks
    await User.updateMany(
      { bookmarks: postId },
      { $pull: { bookmarks: postId } }
    );

    // Remove hashtags
    if (post.hashtags?.length > 0) {
      await removeHashtags(post.hashtags);
    }

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Post deletion error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
