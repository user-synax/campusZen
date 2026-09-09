import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rate-limit";
// Typing is now handled by the Socket.IO backend (typing:start / typing:stop).
// This HTTP route is kept for backward compatibility but is a no-op for emits.
import { validateObjectId } from "@/utils/validators";
import { sanitizeMongoInput } from "@/lib/sanitize";

/**
 * POST /api/dms/[conversationId]/typing - Broadcast typing indicator
 */
export async function POST(request, { params }) {
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

        // Rate limit: 10 requests per 5 seconds
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            `typing_${currentUser._id}_${conversationId}`,
            10,
            5000,
        );
        if (blocked) return rateLimitResponse;

        await connectDB();

        // Verify user in conversation
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

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const { isTyping } = sanitizeMongoInput(body);

        // Get other participant's ID to send to their private channel
        const otherParticipant = conversation.participants.find(
            (p) => p.userId.toString() !== currentUser._id.toString(),
        );

        // Typing is now socket-native — no Pusher emit needed

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DMTyping POST]", err.message);
        return NextResponse.json(
            { error: "Failed to broadcast typing state" },
            { status: 500 },
        );
    }
}
