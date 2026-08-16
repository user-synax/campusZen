import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMMessage from "@/models/DMMessage";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { triggerPusher } from "@/lib/pusher-server";
import { validateObjectId } from "@/utils/validators";
import { sanitizeMongoInput } from "@/lib/sanitize";

/**
 * POST /api/dms/[conversationId]/messages/[messageId]/react - Add/remove reaction
 */
export async function POST(request, { params }) {
    try {
        const { conversationId, messageId } = await params;
        if (
            !validateObjectId(conversationId) ||
            !validateObjectId(messageId)
        ) {
            return NextResponse.json(
                { message: "Invalid Conversation or Message ID" },
                { status: 400 },
            );
        }

        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Body validation
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const { emoji } = sanitizeMongoInput(body);

        // 1. Validate emoji
        if (!emoji || !/\p{Emoji}/u.test(emoji)) {
            return NextResponse.json(
                { message: "Invalid reaction emoji" },
                { status: 400 },
            );
        }

        await connectDB();

        // 2. Verify user is part of the conversation
        const conversation = await DMConversation.findOne({
            _id: conversationId,
            "participants.userId": currentUser._id,
            isActive: true,
        }).lean();

        if (!conversation) {
            return NextResponse.json(
                { message: "Conversation not found" },
                { status: 403 },
            );
        }

        // 3. Find message
        const message = await DMMessage.findOne({
            _id: messageId,
            conversationId,
        });
        if (!message) {
            return NextResponse.json(
                { message: "Message not found" },
                { status: 404 },
            );
        }

        // 4. Check if reacting to deleted message
        if (message.isDeleted) {
            return NextResponse.json(
                { message: "Cannot react to a deleted message" },
                { status: 400 },
            );
        }

        const currentUserIdStr = currentUser._id.toString();
        const existingReaction = message.reactions.find(
            (r) =>
                r.userId.toString() === currentUserIdStr && r.emoji === emoji,
        );

        let updatedMessage;
        if (existingReaction) {
            // 5. If exists: remove it ($pull)
            updatedMessage = await DMMessage.findOneAndUpdate(
                { _id: messageId, conversationId },
                {
                    $pull: {
                        reactions: {
                            userId: currentUser._id,
                            emoji: emoji,
                        },
                    },
                },
                { new: true },
            );
        } else {
            // 6. If not exists: add it — remove any OTHER reaction from this user first
            updatedMessage = await DMMessage.findOneAndUpdate(
                { _id: messageId, conversationId },
                { $pull: { reactions: { userId: currentUser._id } } },
                { new: true },
            );

            updatedMessage = await DMMessage.findOneAndUpdate(
                { _id: messageId, conversationId },
                {
                    $push: {
                        reactions: {
                            userId: currentUser._id,
                            emoji: emoji,
                        },
                    },
                },
                { new: true },
            );
        }

        // 7. Trigger Pusher to both participants
        for (const participant of conversation.participants) {
            if (participant.isMuted) continue;
            await triggerPusher(
                `private-dm-${participant.userId}`,
                "dm-message-reaction",
                {
                    messageId: messageId,
                    conversationId,
                    reactions: updatedMessage.reactions,
                },
            ).catch((err) =>
                console.error("Pusher dm-message-reaction failed:", err),
            );
        }

        return NextResponse.json({ reactions: updatedMessage.reactions });
    } catch (err) {
        console.error("[DMMessage React POST]", err.message);
        return NextResponse.json(
            { error: "Failed to react to message" },
            { status: 500 },
        );
    }
}
