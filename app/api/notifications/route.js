import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import connectDB from '@/lib/db'
import Notification from '@/models/Notification'
import '@/models/User'
import '@/models/Post'
import '@/models/Comment'
import '@/models/GroupChat'
import { getNotificationText, getNotificationIcon, getNotificationURL } from '@/lib/notifications'
 
export async function GET(request) { 
  try { 
    const currentUser = await getCurrentUser(request) 
    if (!currentUser) { 
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    } 
 
    const { searchParams } = new URL(request.url) 
    const page = parseInt(searchParams.get('page')) || 1 
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50) 
    const filter = searchParams.get('filter') || 'all' 
    const skip = (page - 1) * limit 
 
    await connectDB() 
 
    // 1. Build query
    const query = { recipient: currentUser._id } 
    if (filter === 'unread') { 
      query.read = false 
    } 
 
    // 2. Parallel fetch — notifications + total + unreadCount
    const [notifications, total, unreadCount] = await Promise.all([ 
      Notification.find(query).lean() 
        .sort({ createdAt: -1 }) 
        .skip(skip) 
        .limit(limit) 
        .populate('sender', 'name username avatar') 
        .lean(), 
      Notification.countDocuments(query), 
      Notification.countDocuments({ 
        recipient: currentUser._id, 
        read: false 
      }) 
    ]) 
 
    // 3. Add computed fields
    const withComputed = notifications.map(n => ({ 
      ...n, 
      text: getNotificationText(n.type, n.sender?.name, n.meta), 
      icon: getNotificationIcon(n.type), 
      url: getNotificationURL(n) 
    })) 
 
    return NextResponse.json({ 
      notifications: withComputed, 
      total, 
      hasMore: total > skip + notifications.length, 
      unreadCount 
    }) 
 
  } catch (err) { 
    console.error('[Notifications GET] Error:', err) 
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 }) 
  } 
} 
