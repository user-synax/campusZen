import connectDB from "./db";
import DMConversation from "@/models/DMConversation";

/**
 * Find or create a 1-on-1 DM conversation between two users.
 * Shared by /api/dms and /api/connect to avoid duplicating logic.
 *
 * @param {string} userId1 - First user's ObjectId (string)
 * @param {string} userId2 - Second user's ObjectId (string)
 * @returns {Object} The found or newly created DMConversation document (populated)
 */
export async function findOrCreateDMConversation(userId1, userId2) {
    await connectDB();

    let conversation = await DMConversation.findOne({
        $and: [
            { "participants.userId": userId1 },
            { "participants.userId": userId2 },
        ],
    }).populate("participants.userId", "name username avatar isVerified");

    if (!conversation) {
        conversation = await DMConversation.create({
            participants: [{ userId: userId1 }, { userId: userId2 }],
            lastMessage: {
                content: "Started a conversation",
                senderName: "System",
                sentAt: new Date(),
                type: "system",
            },
        });

        conversation = await DMConversation.findById(
            conversation._id,
        ).populate("participants.userId", "name username avatar isVerified");
    }

    return conversation;
}
