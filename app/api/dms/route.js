import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateObjectId } from "@/utils/validators";
import { findOrCreateDMConversation } from "@/lib/dms";

/**
 * GET /api/dms - Get current user's DM conversations
 */
export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        await connectDB();

        // 1. Find all active DM conversations where user is a participant
        const conversations = await DMConversation.find({
            "participants.userId": currentUser._id,
            isActive: true,
        })
            .sort({ "lastMessage.sentAt": -1 })
            .populate("participants.userId", "name username avatar isVerified")
            .lean();

        // 2. For each conversation, get the other user and denormalized unread count
        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conv) => {
                // Find the other participant
                const otherParticipant = conv.participants.find(
                    (p) =>
                        p.userId._id.toString() !== currentUser._id.toString(),
                )?.userId;

                // Find current user's participant object
                const currentUserParticipant = conv.participants.find(
                    (p) =>
                        p.userId._id.toString() === currentUser._id.toString(),
                );

                const result = {
                    ...conv,
                    otherParticipant,
                    unreadCount: currentUserParticipant?.unreadCount || 0,
                    isMuted: currentUserParticipant?.isMuted || false,
                };

                return result;
            }),
        );

        return NextResponse.json({ conversations: conversationsWithUnread });
    } catch (err) {
        console.error("[DMs GET]", err.message);
        return NextResponse.json(
            { error: "Failed to fetch DMs" },
            { status: 500 },
        );
    }
}

/**
 * POST /api/dms - Start or get a DM conversation with another user
 */
export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        await connectDB();

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        const { userId } = sanitizeMongoInput(body);

        if (!validateObjectId(userId)) {
            return NextResponse.json(
                { message: "Invalid User ID" },
                { status: 400 },
            );
        }

        if (userId.toString() === currentUser._id.toString()) {
            return NextResponse.json(
                { message: "Cannot DM yourself" },
                { status: 400 },
            );
        }

        // Check if target user has DM enabled
        const targetUser = await User.findById(userId).lean();
        if (!targetUser) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );
        }

        // Check if DM is disabled or user is blocked
        if (!targetUser.dmEnabled) {
            return NextResponse.json(
                { message: "User has DMs disabled" },
                { status: 403 },
            );
        }

        // Check if current user is blocked by target
        if (targetUser.blockedUsers?.includes(currentUser._id)) {
            return NextResponse.json(
                { message: "User has blocked you" },
                { status: 403 },
            );
        }

        // Check if target user is blocked by current user
        if (currentUser.blockedUsers?.includes(targetUser._id)) {
            return NextResponse.json(
                { message: "You have blocked this user" },
                { status: 403 },
            );
        }

        // Find or create the conversation
        const conversation = await findOrCreateDMConversation(
            currentUser._id.toString(),
            userId.toString(),
        );

        return NextResponse.json({ conversation }, { status: 200 });
    } catch (err) {
        console.error("[DMs POST]", err.message);
        return NextResponse.json(
            { error: "Failed to start DM" },
            { status: 500 },
        );
    }
}
