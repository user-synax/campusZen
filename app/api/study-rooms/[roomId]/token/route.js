import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import StudyRoom from "@/models/StudyRoom";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";
import { createCallToken } from "@/lib/livekit";

/**
 * GET /api/study-rooms/[roomId]/token - Generate LiveKit token for study room
 * Checks: isActive, requiresVerified gate, maxMembers, and membership/college.
 * If user is not a member but passes gates, auto-joins them.
 */
export async function GET(request, { params }) {
  try {
    const { roomId } = await params;
    if (!validateObjectId(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const room = await StudyRoom.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (!room.isActive) {
      return NextResponse.json({ error: "Room is not active" }, { status: 403 });
    }

    const isMember = room.members.some((id) => String(id) === String(currentUser._id));

    // Verified gate
    if (room.requiresVerified && !currentUser.isVerified && !isMember) {
      return NextResponse.json({ error: "Verified only" }, { status: 403 });
    }

    // If not member, check capacity and auto-join
    if (!isMember) {
      if (room.members.length >= room.maxMembers || room.participantCount >= room.maxMembers) {
        return NextResponse.json({ error: "Room is full" }, { status: 403 });
      }

      // Auto-join on token fetch if not already member and passes checks
      await StudyRoom.findByIdAndUpdate(roomId, {
        $addToSet: { members: currentUser._id },
        $inc: { participantCount: 1 },
        $set: { lastActiveAt: new Date() },
      });

      // Refresh participantCount to ensure consistency
      const fresh = await StudyRoom.findById(roomId).select("members participantCount").lean();
      if (fresh && fresh.participantCount !== fresh.members.length) {
        await StudyRoom.findByIdAndUpdate(roomId, { $set: { participantCount: fresh.members.length } });
      }
    } else {
      // Update lastActiveAt for existing members fetching token
      await StudyRoom.findByIdAndUpdate(roomId, { $set: { lastActiveAt: new Date() } });
    }

    // Ensure livekitRoomName exists
    let roomName = room.livekitRoomName;
    if (!roomName) {
      roomName = `study-${room._id}`;
      await StudyRoom.findByIdAndUpdate(roomId, { $set: { livekitRoomName: roomName } });
    }

    const token = await createCallToken({
      identity: currentUser._id.toString(),
      name: currentUser.name,
      roomName,
      avatar: currentUser.avatar,
    });

    return NextResponse.json(
      {
        token,
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
        roomName,
        livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[StudyRoomToken GET]", err.message);
    // Surface LiveKit env errors as 500
    if (err.message && err.message.includes("LiveKit env")) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to generate call token" }, { status: 500 });
  }
}
