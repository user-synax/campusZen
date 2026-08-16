import User from "@/models/User";

/**
 * Attach sender.bubbleTheme to each message in the array.
 * SERVER-ONLY — imports Mongoose, must not be bundled for the client.
 *
 * Queries User model in batch to resolve each sender's equipped chat_bubble.
 *
 * @param {Array} messages - lean message objects with sender._id populated
 * @returns {Promise<Array>} same messages array, mutated with sender.bubbleTheme
 */
export async function attachBubbleThemes(messages) {
    if (!messages || messages.length === 0) return messages;

    // Collect unique sender IDs
    const senderIds = [
        ...new Set(
            messages
                .map((m) => m.sender?._id?.toString())
                .filter(Boolean),
        ),
    ];
    if (senderIds.length === 0) return messages;

    // Batch-fetch sender docs (only fields needed for theme resolution)
    const senders = await User.find({ _id: { $in: senderIds } })
        .select("equippedShopItems ownedShopItems")
        .lean();

    // Build senderId -> themeId lookup
    const senderThemeMap = new Map();
    for (const sender of senders) {
        const equipped = sender.equippedShopItems || {};
        const bubbleItemId = equipped.chat_bubble;
        if (!bubbleItemId) continue;

        // Find the owned snapshot for the equipped item to get its slug
        const owned = (sender.ownedShopItems || []).find(
            (o) => o.itemId?.toString() === bubbleItemId.toString(),
        );
        if (owned?.slug) {
            senderThemeMap.set(sender._id.toString(), owned.slug);
        }
    }

    // Attach theme to each message's sender
    for (const msg of messages) {
        const senderId = msg.sender?._id?.toString();
        if (!senderId) continue;
        const themeId = senderThemeMap.get(senderId);
        if (themeId) {
            msg.sender.bubbleTheme = themeId;
        }
    }

    return messages;
}