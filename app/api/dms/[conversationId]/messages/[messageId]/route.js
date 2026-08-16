import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMMessage from "@/models/DMMessage";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { triggerPusher } from "@/lib/pusher-server";
import { validateObjectId } from "@/utils/validators";

/**
 * DELETE /api/dms/[conversationId]/messages/[messageId] - Soft delete DM message
 */
export async function DELETE(request, { params }) {
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

        await connectDB();

        // 1. Verify user is part of the conversation
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

        // 2. Find message
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

        // 3. Check sender === currentUser._id
        if (message.sender.toString() !== currentUser._id.toString()) {
            return NextResponse.json(
                {
                    message:
                        "Unauthorized: Only the sender can delete the message",
                },
                { status: 403 },
            );
        }

        // 4. Soft delete
        if (!message.isDeleted) {
            message.isDeleted = true;
            message.content = "";
            message.imageUrl = "";
            message.deletedAt = new Date();
            await message.save();

            // 5. Trigger Pusher to both participants
            for (const participant of conversation.participants) {
                if (participant.isMuted) continue;
                await triggerPusher(
                    `private-dm-${participant.userId}`,
                    "dm-message-deleted",
                    { messageId: message._id, conversationId },
                ).catch((err) =>
                    console.error("Pusher dm-message-deleted failed:", err),
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DMMessage DELETE]", err.message);
        return NextResponse.json(
            { error: "Failed to delete message" },
            { status: 500 },
        );
    }
}
