import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Post from '@/models/Post';
import Resource from '@/models/Resource';
import { applyRateLimit } from '@/lib/rate-limit';
import { withErrorHandler, APIError } from '@/lib/api-response';

export const GET = withErrorHandler(async (request) => {
  try {
    // Rate limit: 60 requests/minute for stats
    const { blocked, response: rateLimitResponse } = applyRateLimit(request, 'public_stats', 60, 60000);
    if (blocked) return rateLimitResponse;

    await connectDB();

    // Parallel queries for high performance
    const [users, posts, resources, colleges] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Resource.countDocuments({ status: 'approved' }),
      User.distinct('college').lean()
    ]);

    // Filter out empty strings from distinct college query
    const communitiesCount = colleges.filter(c => c && c.trim() !== '').length;

    const data = { 
      users: users || 0, 
      posts: posts || 0, 
      resources: resources || 0,
      communities: communitiesCount || 0 
    };

    const response = NextResponse.json(data);
    
    // Public cache for landing page performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error('[Public Stats API Error]:', error);
    return NextResponse.json({ users: 0, posts: 0, resources: 0, communities: 0 });
  }
});
