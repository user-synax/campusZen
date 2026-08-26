import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getLeaderboard } from '@/lib/gamification';
import { getCurrentUser } from '@/lib/auth';
import { withErrorHandler, APIError, BadRequestError } from '@/lib/api-response';

export const GET = withErrorHandler(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'global'; // global, weekly, college
    const limit = parseInt(searchParams.get('limit')) || 20;

    await connectDB();
    const currentUser = await getCurrentUser(request);

    let college = null;
    if (type === 'college') {
      if (!currentUser || !currentUser.college) {
        return errorResponse(new BadRequestError('College information not found.'));
      }
      college = currentUser.college;
    }

    const leaderboard = await getLeaderboard(type, college, limit);

    return NextResponse.json({
      leaderboard,
      type,
      college
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return errorResponse(new APIError('Failed to load leaderboard.', 500, 'INTERNAL_ERROR'));
  }
});
