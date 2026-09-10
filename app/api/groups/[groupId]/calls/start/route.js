import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GroupChat from "@/models/GroupChat";
import { getCurrentUser } from "@/lib/auth";
import { applyRateLimit } from "@/lib/redis-rate-limit";
import { emitToGroup, emitToUsers } from "@/lib/realtime";
import { validateObjectId } from "@/utils/validators";
import { getRoomService, createCallToken, callRoomName } from "@/lib/livekit";

/**
 * POST /api/groups/[groupId]/calls/start - Start a voice call (any member)
 *
 * If a call is already active for this group, returns 409 with a token so the
 * client can join instead of creating a duplicate room. The LiveKit room uses
 * emptyTimeout so it auto-closes when everyone leaves (no explicit end route).
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

        // Rate limit: 5 starts per user per 10 minutes
        const { blocked, response: rateLimitResponse } = await applyRateLimit(
            request,
            `callstart_${currentUser._id}`,
            5,
            10 * 60 * 1000,
        );
        if (blocked) return rateLimitResponse;

        await connectDB();

        // Any member (not admin-only) can start a call
        const group = await GroupChat.findOne({
            _id: groupId,
            "members.userId": currentUser._id,
            isActive: true,
        }).lean();
        if (!group) {
            return NextResponse.json({ message: "Group not found or not a member" }, { status: 403 });
        }

        const roomName = callRoomName(groupId);
        const roomService = getRoomService();

        // If a room is already active, return 409 so client joins the existing call
        const activeRooms = await roomService.listRooms();
        const existing = activeRooms.find((r) => r.name === roomName);
        if (existing) {
            const token = await createCallToken({
                identity: currentUser._id.toString(),
                name: currentUser.name,
                avatar: currentUser.avatar,
                roomName,
            });
            return NextResponse.json(
                {
                    message: "Call already active",
                    roomName,
                    token,
                    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
                },
                { status: 409 },
            );
        }

        // Create room with emptyTimeout so it auto-closes when everyone leaves
        await roomService.createRoom({
            name: roomName,
            emptyTimeout: 60,
            maxParticipants: group.members.length || 200,
        });

        const token = await createCallToken({
            identity: currentUser._id.toString(),
            name: currentUser.name,
            avatar: currentUser.avatar,
            roomName,
        });

        const payload = {
            groupId,
            startedBy: {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar,
            },
            roomName,
        };

        // Emit vc:started to the group room (for those on the chat page)
        await emitToGroup(groupId, "vc:started", payload);

        // Emit vc:started to each non-sender member's personal room (for sidebar)
        const otherMemberIds = group.members
            .filter((m) => m.userId.toString() !== currentUser._id.toString())
            .map((m) => String(m.userId));
        if (otherMemberIds.length > 0) {
            await emitToUsers(otherMemberIds, "vc:started", payload);
        }

        return NextResponse.json(
            { roomName, token, livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL },
            { status: 201 },
        );
    } catch (err) {
        console.error("[GroupCallStart]", err.message);
        return NextResponse.json({ error: "Failed to start voice chat" }, { status: 500 });
    }
}
