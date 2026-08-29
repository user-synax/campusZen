import mongoose from "mongoose";

/**
 * Resolve the equipped chat-bubble theme slug for a user, mirroring the logic
 * that runs today in the Next.js message routes + useChatRoom.handleSend.
 * Only READS the User document — no VP/shop business logic is implemented here.
 */
export function resolveBubbleTheme(user) {
    const equipped = user?.equippedShopItems?.chat_bubble;
    if (!equipped) return null;
    const owned = (user?.ownedShopItems || []).find(
        (o) => o?.itemId?.toString?.() === equipped.toString(),
    );
    return owned?.slug || null;
}
