import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GroupChat from "@/models/GroupChat";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";
import { getRoomService, callRoomName } from "@/lib/livekit";

/**
 * GET /api/groups/[groupId]/calls - Check if a voice call is currently active
 */
export async function GET(request, { params }) {
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

        // Membership check
        const group = await GroupChat.findOne({
            _id: groupId,
            "members.userId": currentUser._id,
            isActive: true,
        }).lean();
        if (!group) {
            return NextResponse.json({ message: "Group not found or not a member" }, { status: 403 });
        }

        const roomService = getRoomService();
        const rooms = await roomService.listRooms();
        const room = rooms.find((r) => r.name === callRoomName(groupId));

        return NextResponse.json({
            active: !!room,
            numParticipants: room ? room.numParticipants : 0,
        });
    } catch (err) {
        console.error("[GroupCallStatus]", err.message);
        return NextResponse.json({ error: "Failed to get call status" }, { status: 500 });
    }
}
