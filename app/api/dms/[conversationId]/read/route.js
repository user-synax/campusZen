import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import DMConversation from "@/models/DMConversation";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";

/**
 * POST /api/dms/[conversationId]/read - Mark DM as read
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

        await connectDB();

        await DMConversation.findOneAndUpdate(
            { _id: conversationId, "participants.userId": new mongoose.Types.ObjectId(currentUser._id) },
            {
                $set: {
                    "participants.$.lastReadAt": new Date(),
                    "participants.$.unreadCount": 0,
                },
            },
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DM Read POST]", err.message);
        return NextResponse.json(
            { error: "Failed to mark as read" },
            { status: 500 },
        );
    }
}
