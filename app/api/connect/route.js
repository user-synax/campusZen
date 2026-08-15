import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeMongoInput } from "@/lib/sanitize";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateObjectId } from "@/utils/validators";
import { createNotification } from "@/lib/notifications";
import { awardXP } from "@/lib/gamification";
import { awardVP } from "@/lib/coins";
import { findOrCreateDMConversation } from "@/lib/dms";

export async function POST(request) {
    try {
        // Rate limit — 30 connects per hour per IP
        const { blocked, response: rateLimitResponse } = applyRateLimit(
            request,
            "user_connect",
            30,
            60 * 60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        const currentUserInfo = await getCurrentUser(request);
        if (!currentUserInfo) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
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

        const { userId } = sanitizeMongoInput(body);

        if (!validateObjectId(userId)) {
            return NextResponse.json(
                { message: "Invalid User ID" },
                { status: 400 },
            );
        }

        if (userId.toString() === currentUserInfo._id.toString()) {
            return NextResponse.json(
                { message: "Cannot connect with yourself" },
                { status: 400 },
            );
        }

        await connectDB();

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserInfo._id),
            User.findById(userId),
        ]);

        if (!targetUser) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );
        }

        if (targetUser.isBanned || targetUser.isDeleted) {
            return NextResponse.json(
                { message: "User not available" },
                { status: 403 },
            );
        }

        // Block check — either direction
        if (targetUser.blockedUsers?.includes(currentUser._id)) {
            return NextResponse.json(
                { message: "User has blocked you" },
                { status: 403 },
            );
        }
        if (currentUser.blockedUsers?.includes(targetUser._id)) {
            return NextResponse.json(
                { message: "You have blocked this user" },
                { status: 403 },
            );
        }

        // Check if already connected — idempotent return
        const alreadyConnected = currentUser.connections?.some(
            (id) => id.toString() === userId.toString(),
        );

        if (alreadyConnected) {
            // Still return conversationId so client can navigate
            const existingConv = await findOrCreateDMConversation(
                currentUser._id.toString(),
                userId.toString(),
            );
            return NextResponse.json({
                success: true,
                conversationId: existingConv._id,
                alreadyConnected: true,
            });
        }

        // Atomic $addToSet — no race conditions from full-document save
        await Promise.all([
            User.updateOne(
                { _id: currentUser._id },
                { $addToSet: { connections: userId } },
            ),
            User.updateOne(
                { _id: userId },
                { $addToSet: { connections: currentUser._id } },
            ),
        ]);

        // Find or create the DM conversation
        const conversation = await findOrCreateDMConversation(
            currentUser._id.toString(),
            userId.toString(),
        );

        // Notification (fire-and-forget)
        createNotification({
            recipient: targetUser._id,
            sender: currentUser._id,
            type: "connected",
            meta: { conversationId: conversation._id.toString() },
        }).catch((err) =>
            console.error("Connect notification error:", err),
        );

        // Award XP (mirror /api/follow amounts: 100 XP)
        const xpResult = await awardXP(currentUser._id, "follow");

        // Award VP (mirror /api/follow: 200 VP)
        awardVP(currentUser._id, "follow", targetUser._id).catch((err) =>
            console.error("VP award error:", err),
        );

        return NextResponse.json({
            success: true,
            conversationId: conversation._id,
            alreadyConnected: false,
            xpAwarded: xpResult.xpAwarded,
            newXP: xpResult.newXP,
            newLevel: xpResult.newLevel,
            leveledUp: xpResult.leveledUp,
        });
    } catch (error) {
        console.error("Connect toggle error:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
