import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GroupChat from "@/models/GroupChat";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";
import { createCallToken, callRoomName } from "@/lib/livekit";

/**
 * POST /api/groups/[groupId]/calls/token - Generate a fresh LiveKit token
 *
 * Used to join an existing call and to reconnect. Membership is required;
 * the call does not need to be active yet (LiveKit auto-creates on first join
 * if the room was cleaned up by emptyTimeout).
 */
export async function POST(request, { params }) {
    try {
        const { groupId } = await params;
        if (!validateObjectId(groupId)) {
            return NextResponse.json({ message: "Invalid Group ID" }, { status: 400 });
        }

        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Membership check only
        const group = await GroupChat.findOne({
            _id: groupId,
            "members.userId": currentUser._id,
            isActive: true,
        }).lean();
        if (!group) {
            return NextResponse.json({ message: "Group not found or not a member" }, { status: 403 });
        }

        const roomName = callRoomName(groupId);
        const token = await createCallToken({
            identity: currentUser._id.toString(),
            name: currentUser.name,
            avatar: currentUser.avatar,
            roomName,
        });

        return NextResponse.json(
            { roomName, token, livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL },
            { status: 200 },
        );
    } catch (err) {
        console.error("[GroupCallToken]", err.message);
        return NextResponse.json({ error: "Failed to generate call token" }, { status: 500 });
    }
}
