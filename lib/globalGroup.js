import connectDB from './db.js'
import GroupChat from '../models/GroupChat.js'
import GroupMessage from '../models/GroupMessage.js'
import User from '../models/User.js'

export const GLOBAL_GROUP_NAME = 'CampusZen'

/**
 * Returns the global CampusZen group, creating it if it doesn't exist yet.
 * The founder is set as admin. Safe to call multiple times (idempotent).
 */
export async function getOrCreateGlobalGroup() {
  await connectDB()

  // Check if it already exists
  let group = await GroupChat.findOne({ isGlobal: true }).lean()
  if (group) return group

  // Find the founder to set as admin/creator
  const { FOUNDER_USERNAME } = await import('./founder.js')
  const founder = FOUNDER_USERNAME
    ? await User.findOne({ username: FOUNDER_USERNAME }).lean()
    : null

  if (!founder) {
    console.warn('[GlobalGroup] Founder not found — cannot create global group yet')
    return null
  }

  group = await GroupChat.create({
    name: GLOBAL_GROUP_NAME,
    description: 'The official CampusZen community — everyone is here 🎓',
    avatar: '',
    college: '',
    isGlobal: true,
    isActive: true,
    createdBy: founder._id,
    members: [
      { userId: founder._id, role: 'admin', joinedAt: new Date() },
    ],
    lastMessage: {
      content: 'Welcome to CampusZen! 🎉',
      senderName: 'System',
      sentAt: new Date(),
      type: 'system',
    },
  })

  // Post the welcome system message
  await GroupMessage.create({
    groupId: group._id,
    sender: founder._id,
    content: 'Welcome to CampusZen! 🎉 This is the official community group — say hi!',
    type: 'system',
  })

  console.log('[GlobalGroup] Created global CampusZen group:', group._id.toString())
  return group
}

/**
 * Auto-joins a new user to the global CampusZen group.
 * Fire-and-forget safe — never throws.
 * @param {string|ObjectId} userId
 */
export async function autoJoinGlobalGroup(userId) {
  try {
    await connectDB()

    const group = await GroupChat.findOne({ isGlobal: true })
    if (!group) {
      // Group doesn't exist yet — try to create it first
      const created = await getOrCreateGlobalGroup()
      if (!created) return
    }

    // Re-fetch as a Mongoose document so we can use $addToSet
    await GroupChat.updateOne(
      {
        isGlobal: true,
        // Only add if not already a member
        'members.userId': { $ne: userId },
      },
      {
        $push: {
          members: {
            userId,
            role: 'member',
            joinedAt: new Date(),
          },
        },
      }
    )
  } catch (err) {
    // Never block signup
    console.error('[GlobalGroup] autoJoinGlobalGroup failed:', err.message)
  }
}
