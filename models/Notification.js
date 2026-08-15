import mongoose from 'mongoose' 
 
const notificationSchema = new mongoose.Schema({ 
 
   // Who receives this notification 
   recipient: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'User', 
     required: true 
   }, 
 
   // Who triggered this notification 
   sender: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'User', 
     required: false  // null for system notifications 
   }, 
 
   // Notification type 
   type: { 
     type: String, 
     required: true, 
      enum: [
        'like',             // Someone liked your post
        'comment',          // Someone commented on your post
        'follow',           // Someone followed you
        'mention',          // Someone mentioned you in a post/comment
        'repost',           // Someone reposted your post
        'reaction',         // Someone reacted to your post
        'poll_vote',        // Someone voted on your poll
        'comment_like',     // Someone liked your comment
        'group_invite',     // Added to a group
        'group_message',    // New message in a group (for muted users)
        'dm_message',       // New direct message
        'event_reminder',   // Event happening soon
        'event_cancelled',  // Event was cancelled by organizer
        'resource_approved',// Your uploaded resource was approved
        'resource_rejected',// Your uploaded resource was rejected
        'achievement',      // You unlocked an achievement
        'badge_earned',     // You earned a badge (gamification)
        'level_up',         // You reached a new level
        'vp_earned',        // You earned Viper Coins (VP economy)
         'shop_purchase',    // You bought a shop item
         'connected',        // Someone connected with you
         'system'            // Platform announcement
      ]
   }, 
 
   // Related content — only set what's relevant 
   postId: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Post', 
     default: null 
   }, 
   commentId: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Comment', 
     default: null 
   }, 
   groupId: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'GroupChat', 
     default: null 
   }, 
   eventId: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Event', 
     default: null 
   }, 
   resourceId: { 
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Resource', 
     default: null 
   }, 
 
   // Optional metadata (e.g. achievement name, system message) 
   meta: { 
     type: mongoose.Schema.Types.Mixed, 
     default: null 
   }, 
 
   // Read status 
   read: { 
     type: Boolean, 
     default: false, 
     index: true 
   }, 
 
   // For deduplication — prevent spam notifications 
   // e.g. user likes + unlikes + likes → only 1 notification 
   dedupeKey: { 
     type: String, 
     default: null, 
     index: true, 
     sparse: true  // allow multiple null values 
   } 
 
 }, { 
   timestamps: true 
 }) 
 
 // ━━━ INDEXES ━━━ 
 
 // Main query — recipient's notifications, newest first 
 notificationSchema.index({ recipient: 1, createdAt: -1 }) 
 
 // Unread count query 
 notificationSchema.index({ recipient: 1, read: 1 }) 
 
 // Deduplication lookup 
 notificationSchema.index({ dedupeKey: 1, recipient: 1 }) 
 
 // TTL — auto delete after 30 days 
 notificationSchema.index( 
   { createdAt: 1 }, 
   { expireAfterSeconds: 30 * 24 * 60 * 60 } 
 ) 
 
 export default mongoose.models.Notification || 
   mongoose.model('Notification', notificationSchema) 
