import webpush from 'web-push'
import connectDB from './db'
import PushSubscription from '@/models/PushSubscription'
import config from './config'

// Configure web-push with VAPID keys (once) 
webpush.setVapidDetails(
  config.webpush.subject,
  config.webpush.publicKey,
  config.webpush.privateKey
)

// ━━━ MAIN SEND FUNCTION ━━━ 
// Call this from createNotification() — fire and forget 
export async function sendPushToUser(userId, payload) {
  if (!config.webpush.privateKey) {
    // VAPID not configured — skip silently 
    return
  }

  try {
    await connectDB()

    // Get all active subscriptions for this user 
    const subscriptions = await PushSubscription.find({
      userId,
      isActive: true
    }).lean()

    if (subscriptions.length === 0) return

    // Send to all devices in parallel 
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        sendToSubscription(sub, payload)
      )
    )

    // Log results in development 
    if (config.env.isDev) {
      const sent = results.filter(r => r.status === 'fulfilled').length
      if (sent > 0) console.log(`[WebPush] ✅ Sent to ${sent} device(s) for user ${userId}`)
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const host = (() => { try { return new URL(subscriptions[i].endpoint).host } catch { return 'unknown' } })()
          const err = r.reason
          // WebPushError has .statusCode (HTTP error from FCM)
          // Network errors have .code (ECONNREFUSED, ENOTFOUND, etc.) but no .statusCode
          const code = err?.statusCode || err?.status
          const netCode = err?.code  // e.g. ECONNREFUSED, ENOTFOUND, ETIMEOUT, UNABLE_TO_VERIFY_LEAF_SIGNATURE
          const detail = code
            ? `status: ${code}`
            : netCode
              ? `network: ${netCode}`
              : `error: ${err?.name || 'Unknown'}: ${err?.message || 'no message'}`
          console.log(`[WebPush] ❌ Failed — host: ${host}, ${detail}, user: ${userId}`)
        }
      })
    }

  } catch (err) {
    // NEVER throw — push failure must not break anything 
    console.error('[WebPush] Send failed:', err.message)
  }
}

async function sendToSubscription(sub, payload) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys?.p256dh || sub.p256dh,
      auth: sub.keys?.auth || sub.auth
    }
  }

  // Guard: if either key is missing/empty, this subscription is permanently invalid
  if (!pushSubscription.keys.p256dh || !pushSubscription.keys.auth) {
    if (config.env.isDev) {
      const host = (() => { try { return new URL(sub.endpoint).host } catch { return 'unknown' } })()
      console.log(`[WebPush] ❌ Failed — host: ${host}, reason: malformed-keys, user: ${sub.userId}`)
    }
    // Reversible — mark inactive until confirmed safe to delete
    PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      { isActive: false, malformedKeysDetectedAt: new Date() }
    ).catch(err => console.error('Operation failed:', err))
    return
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 24 * 60 * 60,  // 24 hours — deliver within 24hrs if offline 
        urgency: 'normal'    // 'very-low' | 'low' | 'normal' | 'high' 
      }
    )

    // Update lastUsedAt 
    PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      { lastUsedAt: new Date() }
    ).catch(err => console.error('Operation failed:', err))

  } catch (err) {
    // Handle specific errors 
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/invalid — mark inactive and record deactivation time for TTL cleanup
      PushSubscription.findOneAndUpdate(
        { endpoint: sub.endpoint },
        { isActive: false, deactivatedAt: new Date() }
      ).catch(err => console.error('Operation failed:', err))
    } else {
      throw err  // rethrow other errors 
    }
  }
} 
