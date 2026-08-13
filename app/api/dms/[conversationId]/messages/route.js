import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DMConversation from "@/models/DMConversation";
import DMMessage from "@/models/DMMessage";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText, sanitizeMongoInput } from "@/lib/sanitize";
import { applyRateLimit } from "@/lib/rate-limit";
import { triggerPusher } from "@/lib/pusher-server";
import { createNotification } from "@/lib/notifications";
import { validateObjectId } from "@/utils/validators";

/**
 * GET /api/dms/[conversationId]/messages - Get DM messages
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

        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit")) || 30, 50);

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

        // 2. Build query
        const query = { conversationId };
        if (cursor && validateObjectId(cursor)) {
            query._id = { $lt: cursor };
        }

        // 3. Fetch messages (newest first)
        const messages = await DMMessage.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate("sender", "name username avatar isVerified")
            .populate({
                path: "replyTo",
                populate: { path: "sender", select: "name username" },
            })
            .lean();

        // 4. Pagination logic
        const hasMore = messages.length > limit;
        const paginatedMessages = messages.slice(0, limit);

        // 5. Reverse for display (oldest first)
        const reversedMessages = [...paginatedMessages].reverse();

        // 6. Mark as read (fire and forget)
        DMConversation.findOneAndUpdate(
            { _id: conversationId, "participants.userId": currentUser._id },
            { $set: { "participants.$.lastReadAt": new Date() } },
        ).catch((err) => console.error("Mark read failed:", err));

        return NextResponse.json({
            messages: reversedMessages,
            hasMore,
            nextCursor: hasMore
                ? paginatedMessages[paginatedMessages.length - 1]._id
                : null,
        });
    } catch (err) {
        console.error("[DM Messages GET]", err.message);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 },
        );
    }
}

/**
 * POST /api/dms/[conversationId]/messages - Send DM message
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

        // Rate limit: 30 messages per minute per conversation
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            `dm_${currentUser._id}_${conversationId}`,
            30,
            60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        await connectDB();

        // Verify user is part of the conversation
        const conversation = await DMConversation.findOne({
            _id: conversationId,
            "participants.userId": currentUser._id,
            isActive: true,
        });
        if (!conversation) {
            return NextResponse.json(
                { message: "Conversation not found" },
                { status: 403 },
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

        const { content, type, imageUrl, clientId, replyTo } =
            sanitizeMongoInput(body);

        // Validate content/type
        if (!["text", "image"].includes(type)) {
            return NextResponse.json(
                { message: "Invalid message type" },
                { status: 400 },
            );
        }

        if (type === "text") {
            if (!content || !content.trim()) {
                return NextResponse.json(
                    { message: "Message content required" },
                    { status: 400 },
                );
            }
            if (content.length > 2000) {
                return NextResponse.json(
                    { message: "Message too long" },
                    { status: 400 },
                );
            }
        } else if (type === "image") {
            if (!imageUrl || !imageUrl.startsWith("https://")) {
                return NextResponse.json(
                    { message: "Invalid image URL" },
                    { status: 400 },
                );
            }
        }

        // Create message
        const message = await DMMessage.create({
            conversationId,
            sender: currentUser._id,
            content: type === "text" ? sanitizeText(content) : "",
            type,
            imageUrl: type === "image" ? imageUrl : "",
            replyTo: replyTo && validateObjectId(replyTo) ? replyTo : null,
        });

        // Fetch replyTo if needed
        let populatedReplyTo = null;
        if (message.replyTo) {
            const origMsg = await DMMessage.findById(message.replyTo)
                .populate("sender", "name username")
                .lean();
            if (origMsg) populatedReplyTo = origMsg;
        }

        // Populate message
        const populated = {
            ...message.toObject(),
            sender: {
                _id: currentUser._id,
                name: currentUser.name,
                username: currentUser.username,
                avatar: currentUser.avatar,
                isVerified: currentUser.isVerified || false,
            },
            replyTo: populatedReplyTo,
        };

        // Update conversation's lastMessage
        DMConversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
                content: type === "text" ? content.slice(0, 60) : "📷 Image",
                senderName: currentUser.name,
                sentAt: new Date(),
                type,
            },
            $inc: { messageCount: 1 },
        }).catch((err) => console.error("Update last message failed:", err));

        // Trigger Pusher for both participants
        for (const participant of conversation.participants) {
            await triggerPusher(
                `private-dm-${participant.userId}`,
                "new-dm-message",
                {
                    ...populated,
                    clientId,
                    reactions: [],
                    conversationId,
                },
            ).catch((err) => console.error("Pusher failed:", err));
        }

        // Create in-app notification + push for the recipient (centralized pipeline)
        const recipient = conversation.participants.find(
            (p) => p.userId.toString() !== currentUser._id.toString()
        )
        if (recipient) {
            await createNotification({
                recipient: recipient.userId,
                sender: currentUser._id,
                type: 'dm_message',
                meta: {
                    conversationId: conversationId,
                    messagePreview: content ? content.substring(0, 100) : '📷 Image',
                    senderName: currentUser.name
                },
                dedupe: false
            }).catch(err => console.error('[DMMessage] Notification failed:', err.message))
        }

        return NextResponse.json({ ...populated, clientId }, { status: 201 });
    } catch (err) {
        console.error("[DM Messages POST]", err.message);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 },
        );
    }
}
