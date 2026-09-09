import { NextResponse } from 'next/server' 
import { getCurrentUser } from '@/lib/auth' 
import connectDB from '@/lib/db' 
import Notification from '@/models/Notification' 
import { emitToUser } from '@/lib/realtime' 
import { validateObjectId } from '@/utils/validators' 
 
export async function PATCH(request) { 
  try { 
    const currentUser = await getCurrentUser(request) 
    if (!currentUser) { 
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    } 
 
    const { notificationId } = await request.json().catch(err => { console.error('Failed to parse request body:', err); return {} }) 
 
    await connectDB() 
 
    if (notificationId) { 
      if (!validateObjectId(notificationId)) { 
        return NextResponse.json({ error: 'Invalid Notification ID' }, { status: 400 }) 
      } 
 
      await Notification.findOneAndUpdate( 
        { 
          _id: notificationId, 
          recipient: currentUser._id 
        }, 
        { read: true } 
      ) 
    } else { 
      await Notification.updateMany( 
        { recipient: currentUser._id, read: false }, 
        { read: true } 
      ) 
    } 
 
    // Tell client via socket (so other tabs update too) 
    emitToUser( 
      currentUser._id, 
      'notification:read', 
      { notificationId: notificationId || 'all' } 
    ).catch(err => console.error('[realtime] notification:read failed:', err)) 
 
    return NextResponse.json({ success: true }) 
 
  } catch (err) { 
    console.error('[Notification Read] Error:', err.message) 
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }) 
  } 
} 
