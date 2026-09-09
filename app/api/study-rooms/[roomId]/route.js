import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import StudyRoom from "@/models/StudyRoom";
import { getCurrentUser } from "@/lib/auth";
import { validateObjectId } from "@/utils/validators";

/**
 * GET /api/study-rooms/[roomId] - fetch room detail
 * If requiresVerified && !currentUser.isVerified && not member => return with locked:true
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

    const room = await StudyRoom.findById(roomId)
      .populate("createdBy", "name username avatar isVerified college")
      .populate("members", "name username avatar isVerified college")
      .lean();

    if (!room || !room.isActive) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isMember = Array.isArray(room.members)
      ? room.members.some((m) => String(m._id || m) === String(currentUser._id))
      : false;

    const locked = !!(room.requiresVerified && !currentUser.isVerified && !isMember);

    return NextResponse.json({ ...room, isMember, locked });
  } catch (err) {
    console.error("[StudyRoom GET]", err.message);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}

/**
 * POST /api/study-rooms/[roomId] - join/leave
 * body: { action: "join" | "leave" }
 */
export async function POST(request, { params }) {
  try {
    const { roomId } = await params;
    if (!validateObjectId(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 });
    }

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action } = body || {};
    if (!action || !["join", "leave"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'join' or 'leave'" }, { status: 400 });
    }

    await connectDB();

    const room = await StudyRoom.findById(roomId);
    if (!room || !room.isActive) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isMember = room.members.some((id) => String(id) === String(currentUser._id));

    if (action === "join") {
      if (isMember) {
        return NextResponse.json({ message: "Already a member", room }, { status: 200 });
      }

      if (!room.isActive) {
        return NextResponse.json({ error: "Room is not active" }, { status: 400 });
      }

      if (room.requiresVerified && !currentUser.isVerified) {
        return NextResponse.json({ error: "Verified only" }, { status: 403 });
      }

      if (room.members.length >= room.maxMembers) {
        return NextResponse.json({ error: "Room is full" }, { status: 403 });
      }

      if (room.participantCount >= room.maxMembers) {
        return NextResponse.json({ error: "Room is full" }, { status: 403 });
      }

      const updated = await StudyRoom.findByIdAndUpdate(
        roomId,
        {
          $addToSet: { members: currentUser._id },
          $inc: { participantCount: 1 },
          $set: { lastActiveAt: new Date() },
        },
        { new: true }
      )
        .populate("createdBy", "name username avatar isVerified college")
        .lean();

      // Clamp participantCount to members length if inconsistent
      if (updated.participantCount !== updated.members.length) {
        await StudyRoom.findByIdAndUpdate(roomId, { $set: { participantCount: updated.members.length } });
        updated.participantCount = updated.members.length;
      }

      return NextResponse.json({ message: "Joined", room: updated }, { status: 200 });
    }

    // leave
    if (!isMember) {
      return NextResponse.json({ message: "Not a member", room }, { status: 200 });
    }

    const updated = await StudyRoom.findByIdAndUpdate(
      roomId,
      {
        $pull: { members: currentUser._id },
        $inc: { participantCount: -1 },
        $set: { lastActiveAt: new Date() },
      },
      { new: true }
    )
      .populate("createdBy", "name username avatar isVerified college")
      .lean();

    // Ensure participantCount never negative and sync with members length
    const syncedCount = Math.max(0, updated.members.length);
    if (updated.participantCount !== syncedCount) {
      await StudyRoom.findByIdAndUpdate(roomId, { $set: { participantCount: syncedCount } });
      updated.participantCount = syncedCount;
    }

    return NextResponse.json({ message: "Left", room: updated }, { status: 200 });
  } catch (err) {
    console.error("[StudyRoom POST]", err.message);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
