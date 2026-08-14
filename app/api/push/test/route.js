import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
import { sendPushToUser } from '@/lib/web-push'

export async function POST(request) {
  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 3 tests per hour 
  const rateLimitResult = applyRateLimit(request, 'push_test', 20, 60 * 60 * 1000)
  if (rateLimitResult.blocked) {
    return rateLimitResult.response
  }

  try {
    await sendPushToUser(currentUser._id, {
      title: 'CampusX ✅',
      body: 'Push notifications are working! You\'ll get notified even when app is closed.',
      icon: currentUser.avatar || '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop', // Beautiful test image
      tag: 'campusx-test',
      data: {
        url: '/notifications',
        notificationId: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Test notification sent!'
    })

  } catch (err) {
    console.error('[Push Test] Error:', err.message)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
} 
