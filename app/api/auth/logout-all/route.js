import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { getAppwriteUsers } from '@/lib/appwrite/server'

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Invalidate all existing legacy JWTs for this user.
    await User.findByIdAndUpdate(currentUser._id, {
      $inc: { tokenVersion: 1 },
    })

    // Revoke the user's Appwrite sessions server-side so the account is
    // inaccessible everywhere (the legacy JWT above is now also rejected).
    if (currentUser.appwriteUserId) {
      try {
        await getAppwriteUsers().deleteSessions(currentUser.appwriteUserId)
      } catch (e) {
        console.error('[LogoutAll] Failed to revoke Appwrite sessions:', e?.message)
      }
    }

    const response = NextResponse.json({ message: 'Logged out from all devices' })

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    }

    // Clear the legacy JWT cookie (correct name: campusx_token).
    response.cookies.set('campusx_token', '', cookieOpts)

    // Clear the Appwrite session cookie as well.
    const appwriteSessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    response.cookies.set(appwriteSessionCookieName, '', cookieOpts)

    return response
  } catch (error) {
    console.error('[LogoutAllPOST] Error:', error.message)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
