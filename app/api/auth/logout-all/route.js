import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    await User.findByIdAndUpdate(currentUser._id, { $inc: { tokenVersion: 1 } })

    const response = NextResponse.json({ message: 'Logged out from all devices' })
    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' }
    response.cookies.set('campusx_token', '', cookieOpts)
    return response
  } catch (error) {
    console.error('[LogoutAllPOST] Error:', error.message)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
