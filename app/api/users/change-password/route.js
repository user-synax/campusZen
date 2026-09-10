import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getCurrentUser, signToken, setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { 
  successResponse, 
  errorResponse, 
  BadRequestError, 
  UnauthorizedError 
} from '@/lib/api-response';
import { applyRateLimit } from '@/lib/redis-rate-limit';

export async function POST(request) {
  try {
    // Rate limit password changes - 3 attempts per hour per user
    const { blocked, response: rateLimitResponse } = await applyRateLimit(
      request,
      'change_password',
      3,
      60 * 60 * 1000
    );
    if (blocked) return rateLimitResponse;

    await connectDB();
    
    const user = await getCurrentUser(request);
    if (!user) {
      return errorResponse(new UnauthorizedError('Please log in to change your password'));
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return errorResponse(new BadRequestError('Old and new passwords are required'));
    }

    // Find user with password field
    const dbUser = await User.findById(user._id).select('+password');
    if (!dbUser) {
      return errorResponse(new BadRequestError('User not found'));
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, dbUser.password);
    if (!isMatch) {
      return errorResponse(new BadRequestError('Current password is incorrect'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    dbUser.password = hashedPassword;
    // Increment tokenVersion to invalidate OTHER sessions, but keep THIS
    // session alive by re-issuing a fresh JWT with the new version.
    // Previous code incremented version without re-issuing, so the current
    // cookie's version became < DB version -> getCurrentUserLegacy returned
    // null on the very next request -> user appeared logged out after changing
    // password and was forced to sign up/login again.
    dbUser.tokenVersion = (dbUser.tokenVersion || 0) + 1;
    await dbUser.save();

    const newToken = await signToken({ userId: dbUser._id.toString(), username: dbUser.username, version: dbUser.tokenVersion });
    const response = successResponse({ message: 'Password updated successfully' });
    await setAuthCookie(response, newToken);
    return response;
  } catch (error) {
    console.error('[change-password] Error:', error);
    return errorResponse(error);
  }
}
