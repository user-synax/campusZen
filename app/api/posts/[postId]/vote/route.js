import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Post from '@/models/Post';
import { getCurrentUser } from '@/lib/auth';
import { validateObjectId } from '@/utils/validators';
import { applyRateLimit } from '@/lib/redis-rate-limit';
import { sanitizeMongoInput } from '@/lib/sanitize';
import { createNotification } from '@/lib/notifications';

// POST /api/posts/[postId]/vote
export async function POST(request, { params }) {
  try {
    // Rate limit poll voting - 20 per hour per IP
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'poll_vote',
      20,
      60 * 60 * 1000
    );
    if (blocked) return rateLimitResponse;

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    if (!validateObjectId(postId)) {
      return NextResponse.json({ message: 'Invalid Post ID' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const cleanBody = sanitizeMongoInput(body);
    const { optionId } = cleanBody;

    if (!validateObjectId(optionId)) {
      return NextResponse.json({ message: 'Invalid Option ID' }, { status: 400 });
    }

    await connectDB();

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }

    if (!post.poll || !post.poll.options || post.poll.options.length === 0) {
      return NextResponse.json({ message: 'This post has no poll' }, { status: 400 });
    }

    if (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()) {
      return NextResponse.json({ message: 'Poll has ended' }, { status: 400 });
    }

    const alreadyVoted = post.poll.options.some(o => o.votes.includes(currentUser._id));
    if (alreadyVoted) {
      return NextResponse.json({ message: 'You have already voted' }, { status: 409 });
    }

    const optionExists = post.poll.options.some(o => o._id.toString() === optionId);
    if (!optionExists) {
      return NextResponse.json({ message: 'Option not found' }, { status: 404 });
    }

    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId, 'poll.options._id': optionId },
      { $push: { 'poll.options.$.votes': currentUser._id } },
      { new: true }
    );

    const totalVotes = updatedPost.poll.options.reduce((sum, o) => sum + o.votes.length, 0);
    const results = updatedPost.poll.options.map(o => ({
      _id: o._id,
      text: o.text,
      votes: o.votes.length,
      percentage: totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0,
      userVoted: o._id.toString() === optionId
    }));

    // Notification - ONLY if not anonymous
    if (post && !post.isAnonymous && post.author && post.author.toString() !== currentUser._id.toString()) {
      createNotification({
        recipient: post.author,
        sender: currentUser._id,
        type: 'poll_vote',
        postId: postId,
        meta: { postPreview: post.content?.substring(0, 50) }
      }).catch(err => console.error('Operation failed:', err));
    }

    return NextResponse.json({ 
      results, 
      totalVotes, 
      userVotedOptionId: optionId 
    });
  } catch (error) {
    console.error('Poll voting error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
