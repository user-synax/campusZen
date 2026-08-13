import connectDB from './db'
import Notification from '@/models/Notification'
import { triggerPusher } from './pusher-server'
import { sendPushToUser } from './web-push'

// ━━━ Notification message generator ━━━
// What text to show for each notification type
export function getNotificationText(type, senderName, meta) {
  const name = senderName || 'Someone'
  const m = meta || {}

  const messages = {
    like:             `${name} liked your post`,
    comment:          `${name} commented on your post`,
    follow:           `${name} started following you`,
    mention:          `${name} mentioned you in a post`,
    repost:           `${name} reposted your post`,
    reaction:         `${name} reacted ${m.emoji || '❤️'} to your post`,
    poll_vote:        `${name} voted on your poll`,
    comment_like:     `${name} liked your comment`,
    group_invite:     `${name} added you to ${m.groupName || 'a group'}`,
    group_message:    `${name} sent a message in ${m.groupName || 'a group'}`,
    dm_message:       `${name} sent you a message`,
    event_reminder:   `Reminder: ${m.eventName || 'An event'} is happening soon`,
    resource_approved:`Your resource "${m.resourceTitle || ''}" was approved ✅`,
    resource_rejected:`Your resource "${m.resourceTitle || ''}" was rejected`,
    badge_earned:     `🏆 Achievement unlocked: ${m.badgeName || m.message || ''}`,
    level_up:         `⭐ Level Up! You reached level ${m.newLevel || ''}!`,
    vp_earned:        `🪙 You earned ${m.total || 0} VP from recent activity`,
    shop_purchase:    `🛍️ You bought ${m.itemName || 'an item'} from the shop`,
    system:           m.message || 'You have a new notification'
  }

  return messages[type] || 'You have a new notification'
}

// ━━━ Notification icon/emoji ━━━
export function getNotificationIcon(type) {
  const icons = {
    like: '❤️',
    comment: '💬',
    follow: '👤',
    mention: '@',
    repost: '🔁',
    reaction: '😊',
    poll_vote: '📊',
    comment_like: '❤️',
    group_invite: '👥',
    event_reminder: '📅',
    resource_approved: '✅',
    resource_rejected: '❌',
    badge_earned: '🏆',
    level_up: '⭐',
    vp_earned: '💲',
    shop_purchase: '🛍️',
    system: '📢'
  }
  return icons[type] || '🔔'
}

// ━━━ Notification URL generator ━━━
export function getNotificationURL(notification) {
  const { type, postId, sender, groupId, eventId, resourceId, meta } = notification
  const conversationId = meta?.conversationId

  switch(type) {
    case 'like':
    case 'comment':
    case 'mention':
    case 'repost':
    case 'reaction':
    case 'poll_vote':
    case 'comment_like':
      return postId ? `/post/${postId}` : '/feed'
    case 'follow':
      return sender?.username ? `/profile/${sender.username}` : '/feed'
    case 'group_invite':
    case 'group_message':
      return groupId ? `/chats/${groupId}` : '/chats'
    case 'dm_message':
      return sender?.username ? `/chats/dm/${conversationId}` : '/chats'
    case 'event_reminder':
      return eventId ? `/events/${eventId}` : '/events'
    case 'resource_approved':
    case 'resource_rejected':
      return '/resources/my-uploads'
    case 'badge_earned':
    case 'level_up':
    case 'vp_earned':
    case 'shop_purchase':
      return '/wallet'
    default:
      return '/notifications'
  }
}

// ━━━ MAIN CREATE FUNCTION ━━━
export async function createNotification({
  recipient,        // ObjectId or string — who gets it
  sender,           // ObjectId or string — who triggered it (null for system)
  type,             // notification type string
  postId,           // optional
  commentId,        // optional
  groupId,          // optional
  eventId,          // optional
  resourceId,       // optional
  meta,             // optional extra data
  dedupe = true     // whether to deduplicate
}) {

  // RULE 1: Never notify yourself (unless it's a system notification like level_up)
  const isSystemType = ['level_up', 'badge_earned', 'system'].includes(type)
  if (!isSystemType && recipient && sender &&
      recipient.toString() === sender.toString()) {
    return null
  }

  // RULE 2: Validate recipient exists
  if (!recipient) return null

  try {
    await connectDB()

    // RULE 3: Deduplication
    // Prevent: user likes → unlikes → likes → 3 notifications
    // Solution: delete old + create new (so it refreshes to top)
    if (dedupe) {
      // Build dedupe key from relevant identifiers
      const keyParts = [type, recipient.toString()]
      if (sender) keyParts.push(sender.toString())
      if (postId) keyParts.push(postId.toString())
      if (commentId) keyParts.push(commentId.toString())

      const dedupeKey = keyParts.join('_')

      // Delete existing duplicate notification (if any)
      await Notification.deleteOne({ dedupeKey, recipient })

      // Create new notification with dedupe key
      const notification = await Notification.create({
        recipient,
        sender: sender || null,
        type,
        postId: postId || null,
        commentId: commentId || null,
        groupId: groupId || null,
        eventId: eventId || null,
        resourceId: resourceId || null,
        meta: meta || null,
        dedupeKey,
        read: false
      })

      // Populate sender for Pusher payload
      const populated = await Notification.findById(notification._id)
        .populate('sender', 'name username avatar')
        .populate('postId', 'images linkPreview content') // Get post images for push preview
        .lean()

      // Push real-time via Pusher
      await pushNotification(recipient, populated)

      // Determine notification image (post image or link preview)
      let pushImage = null
      if (populated.postId?.images?.length > 0) {
        pushImage = populated.postId.images[0]
      } else if (populated.postId?.linkPreview?.image) {
        pushImage = populated.postId.linkPreview.image
      }

      // Send system push notification
      sendPushToUser(recipient, {
        title: populated.sender?.name || 'CampusX',
        body: getNotificationText(type, populated.sender?.name, meta),
        icon: populated.sender?.avatar || '/icons/notification-icon.png',  // 192x192px app icon
        badge: '/icons/badge-icon.png',        // 72x72px monochrome badge
        image: pushImage,                     // Post image preview
        tag: dedupeKey || type,               // groups same notifications
        data: {
          url: getNotificationURL(populated),  // where to navigate on click
          notificationId: populated._id
        }
      }).catch(err => console.error('Operation failed:', err))

      return populated
    }

    // No deduplication (for system/event notifications)
    const notification = await Notification.create({
      recipient,
      sender: sender || null,
      type,
      postId: postId || null,
      commentId: commentId || null,
      groupId: groupId || null,
      eventId: eventId || null,
      resourceId: resourceId || null,
      meta: meta || null,
      read: false
    })

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name username avatar')
      .populate('postId', 'images linkPreview content')
      .lean()

    await pushNotification(recipient, populated)

    // Determine notification image
    let pushImage = null
    if (populated.postId?.images?.length > 0) {
      pushImage = populated.postId.images[0]
    } else if (populated.postId?.linkPreview?.image) {
      pushImage = populated.postId.linkPreview.image
    }

    // Send system push notification
    sendPushToUser(recipient, {
      title: populated.sender?.name || 'CampusX',
      body: getNotificationText(type, populated.sender?.name, meta),
      icon: populated.sender?.avatar || '/icons/notification-icon.png',  // 192x192px app icon
      badge: '/icons/badge-icon.png',        // 72x72px monochrome badge
      image: pushImage,                     // Post image preview
      tag: type,                            // groups same notifications
      data: {
        url: getNotificationURL(populated),  // where to navigate on click
        notificationId: populated._id
      }
    }).catch(err => console.error('Operation failed:', err))

    return populated

  } catch (err) {
    // NEVER throw — notification failure must not break main action
    console.error('[Notification] Create failed:', err.message)
    return null
  }
}

// ━━━ Pusher push helper ━━━
async function pushNotification(recipientId, notification) {
  try {
    const channel = `private-notifications-${recipientId}`
    await triggerPusher(channel, 'new-notification', {
      notification,
      text: getNotificationText(
        notification.type,
        notification.sender?.name,
        notification.meta
      )
    })
  } catch (err) {
    // Pusher failure = silent — notification is in DB, user will see on next load
    console.error('[Notification] Pusher push failed:', err.message)
  }
}

// ━━━ DELETE notification (on unlike, unfollow etc.) ━━━
export async function deleteNotification({
  sender,
  recipient,
  type,
  postId,
  commentId
}) {
  try {
    await connectDB()

    const keyParts = [type, recipient.toString()]
    if (sender) keyParts.push(sender.toString())
    if (postId) keyParts.push(postId.toString())
    if (commentId) keyParts.push(commentId.toString())

    const dedupeKey = keyParts.join('_')

    await Notification.deleteOne({ dedupeKey, recipient })

    // Tell client to remove this notification (if visible)
    await triggerPusher(
      `private-notifications-${recipient}`,
      'remove-notification',
      { dedupeKey }
    ).catch(err => console.error('Operation failed:', err))

  } catch (err) {
    console.error('[Notification] Delete failed:', err.message)
  }
}

// ━━━ DELETE all notifications for a post (when post deleted) ━━━
export async function deletePostNotifications(postId) {
  try {
    await connectDB()
    await Notification.deleteMany({ postId })
  } catch (err) {
    console.error('[Notification] Post delete cleanup failed:', err.message)
  }
}
