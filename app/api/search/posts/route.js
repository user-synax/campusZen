import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Post from '@/models/Post';
import { getCurrentUser } from '@/lib/auth';
import { applyRateLimit } from '@/lib/redis-rate-limit';
import { sanitizeMongoInput, sanitizeUser } from '@/lib/sanitize';

export async function GET(request) {
  try {
    // Rate limit search - 30 searches per minute per IP
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'search_posts',
      30,
      60 * 1000
    );
    if (blocked) return rateLimitResponse;

    const currentUser = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    let q = sanitizeMongoInput(searchParams.get('q') || '');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50);
    const skip = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ message: 'Query too short' }, { status: 400 });
    }

    if (q.length > 100) {
      q = q.toString().substring(0, 100);
    }

    // Sanitize: remove special regex characters
    let sanitizedQuery = q.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Sanitize @ prefix
    if (sanitizedQuery.startsWith('@')) {
      sanitizedQuery = sanitizedQuery.substring(1);
    }

    await connectDB();

    let posts = [];
    let total = 0;

    // Strategy A: MongoDB $text search
    const textQuery = { $text: { $search: sanitizedQuery } };

    [posts, total] = await Promise.all([
      Post.find(textQuery)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name username avatar college')
        .lean(),
      Post.countDocuments(textQuery)
    ]);

    if (posts.length === 0) {
      // Strategy B: Fallback regex search
      const regexQuery = { content: { $regex: sanitizedQuery, $options: 'i' } };

      [posts, total] = await Promise.all([
        Post.find(regexQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('author', 'name username avatar college')
          .lean(),
        Post.countDocuments(regexQuery)
      ]);
    }

    const postsWithReactions = posts.map(post => {
      const isLiked = currentUser ? post.likes?.some(id => id.toString() === currentUser._id.toString()) : false;

      const { likes, author, ...postData } = post;

      return {
        ...postData,
        likesCount: post.likesCount ?? post.likes?.length ?? 0,
        author: sanitizeUser(author),
        _isLiked: isLiked
      };
    });

    return NextResponse.json({
      posts: postsWithReactions,
      total,
      hasMore: skip + posts.length < total,
      query: sanitizedQuery
    });
  } catch (error) {
    console.error('Search posts error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
