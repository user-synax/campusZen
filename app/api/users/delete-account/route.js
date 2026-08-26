import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { getCurrentUser, clearAuthCookie } from '@/lib/auth';
import { 
  successResponse, 
  errorResponse, 
  BadRequestError, 
  UnauthorizedError 
} from '@/lib/api-response';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    // Rate limit account deletion - 1 attempt per hour per user
    const { blocked, response: rateLimitResponse } = applyRateLimit(
      request,
      'delete_account',
      1,
      60 * 60 * 1000
    );
    if (blocked) return rateLimitResponse;

    await connectDB();
    
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return errorResponse(new UnauthorizedError('Please log in to delete your account'));
    }

    const body = await request.json();
    const { otp } = body;

    if (!otp) {
      return errorResponse(new BadRequestError('OTP is required for account deletion'));
    }

    // 1. Verify OTP
    const otpDoc = await Otp.findOne({
      email: currentUser.email,
      otp,
      purpose: 'account_delete'
    });

    if (!otpDoc) {
      return errorResponse(new BadRequestError('Invalid or expired OTP'));
    }

    // 2. Soft delete user and anonymize
    const userId = currentUser._id;
    const timestamp = Date.now();
    const anonymizedEmail = `deleted_${userId}_${timestamp}@deleted.campuszen.live`;
    const anonymizedName = 'Deleted User';

    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      name: anonymizedName,
      email: anonymizedEmail,
      username: `deleted_${userId.toString().slice(-6)}`,
      avatar: '',
      bio: '',
      tokenVersion: (currentUser.tokenVersion || 0) + 1,
      // Clear other sensitive fields if necessary
      college: '',
      course: '',
      socialLinks: {
        twitter: '',
        instagram: '',
        linkedin: '',
        github: '',
        website: ''
      }
    });

    // 3. Delete OTP
    await Otp.deleteOne({ _id: otpDoc._id });

    // 4. Create response and clear auth cookie
    const response = successResponse({ message: 'Account deleted successfully' });
    await clearAuthCookie(response);

    return response;
  } catch (error) {
    console.error('[delete-account] Error:', error);
    return errorResponse(error);
  }
}
