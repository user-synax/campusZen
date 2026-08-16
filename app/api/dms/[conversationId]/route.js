import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";

/**
 * GET /api/dms/[conversationId] - Get a single DM conversation with otherParticipant
 */
export async function GET(request, { params }) {
    try {
        const { conversationId } = await params;
        if (!validateObjectId(conversationId)) {
            return NextResponse.json(
                { message: "Invalid Conversation ID" },
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

        const conversation = await DMConversation.findOne({
            _id: conversationId,
            "participants.userId": currentUser._id,
            isActive: true,
        })
            .populate("participants.userId", "name username avatar isVerified")
            .lean();

        if (!conversation) {
            return NextResponse.json(
                { message: "Conversation not found" },
                { status: 404 },
            );
        }

        // Extract the other participant
        const otherParticipant = conversation.participants.find(
            (p) => p.userId._id.toString() !== currentUser._id.toString(),
        )?.userId;

        // Extract current user's participant data
        const currentUserParticipant = conversation.participants.find(
            (p) => p.userId._id.toString() === currentUser._id.toString(),
        );

        return NextResponse.json({
            conversation: {
                ...conversation,
                otherParticipant,
                unreadCount: currentUserParticipant?.unreadCount || 0,
                isMuted: currentUserParticipant?.isMuted || false,
            },
        });
    } catch (err) {
        console.error("[DM Conversation GET]", err.message);
        return NextResponse.json(
            { error: "Failed to fetch conversation" },
            { status: 500 },
        );
    }
}
