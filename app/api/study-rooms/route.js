import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import StudyRoom from "@/models/StudyRoom";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { getDomainForCollege } from "@/lib/collegeEmails";
import mongoose from "mongoose";

/**
 * GET /api/study-rooms?college=&q=&page=1&limit=20&showLocked=true
 * - college: filter by college name, "all" = no filter
 * - q: search name/topic >=2 chars
 * - showLocked: if true, include requiresVerified rooms even for unverified users
 */
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const collegeParam = searchParams.get("college");
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const skip = (page - 1) * limit;
    const showLocked = searchParams.get("showLocked") === "true";

    const query = { isActive: true };

    // College filter: allow ?college=all to show all, ?college=NAME to filter, no param = no filter (discover all)
    if (collegeParam && collegeParam !== "all") {
      query.college = collegeParam;
    }

    // Search by name/topic
    if (q && q.length >= 2) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { topic: { $regex: escaped, $options: "i" } },
      ];
    }

    // Verified gating: exclude locked rooms by default for unverified users
    if (!currentUser.isVerified && !showLocked) {
      query.requiresVerified = { $ne: true };
    }

    const [rooms, total] = await Promise.all([
      StudyRoom.find(query)
        .sort({ lastActiveAt: -1, participantCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name username avatar isVerified college")
        .select(
          "name topic college collegeDomain createdBy members requiresVerified maxMembers isActive livekitRoomName participantCount lastActiveAt createdAt"
        )
        .lean(),
      StudyRoom.countDocuments(query),
    ]);

    const enriched = rooms.map((r) => {
      const isMember = Array.isArray(r.members)
        ? r.members.some((id) => String(id) === String(currentUser._id))
        : false;
      const locked = !!(r.requiresVerified && !currentUser.isVerified && !isMember);
      return {
        ...r,
        isMember,
        locked,
        membersCount: r.members?.length ?? r.participantCount ?? 0,
      };
    });

    return NextResponse.json({
      rooms: enriched,
      total,
      hasMore: skip + rooms.length < total,
      page,
    });
  } catch (err) {
    console.error("[StudyRooms GET]", err.message);
    return NextResponse.json({ error: "Failed to fetch study rooms" }, { status: 500 });
  }
}

/**
 * POST /api/study-rooms
 * body: { name, topic, college, requiresVerified, maxMembers }
 */
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { name, topic, college, requiresVerified, maxMembers } = body || {};

    // requiresVerified defaults to true
    const finalRequiresVerified =
      typeof requiresVerified === "boolean" ? requiresVerified : true;

    // Verified gate: cannot create verified-only room if not verified
    if (finalRequiresVerified && !currentUser.isVerified) {
      return NextResponse.json({ error: "Verified only" }, { status: 403 });
    }

    // Validate name 2-60 chars
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 60) {
      return NextResponse.json(
        { error: "Name must be between 2 and 60 characters" },
        { status: 400 }
      );
    }

    // College required, default to currentUser.college
    const finalCollege = (typeof college === "string" && college.trim() ? college.trim() : currentUser.college?.trim() || "");
    if (!finalCollege) {
      return NextResponse.json({ error: "College is required" }, { status: 400 });
    }

    // Topic optional 0-100
    const finalTopic = typeof topic === "string" ? sanitizeText(topic).slice(0, 100) : "";
    if (finalTopic.length > 100) {
      return NextResponse.json({ error: "Topic must be at most 100 characters" }, { status: 400 });
    }

    // maxMembers 2-50 default 50
    let finalMaxMembers = 50;
    if (maxMembers !== undefined && maxMembers !== null && maxMembers !== "") {
      finalMaxMembers = parseInt(maxMembers, 10);
      if (Number.isNaN(finalMaxMembers)) {
        return NextResponse.json({ error: "maxMembers must be a number between 2 and 50" }, { status: 400 });
      }
    }
    if (finalMaxMembers < 2 || finalMaxMembers > 50) {
      return NextResponse.json({ error: "maxMembers must be between 2 and 50" }, { status: 400 });
    }

    // Daily limit: 3 rooms per user per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await StudyRoom.countDocuments({
      createdBy: currentUser._id,
      createdAt: { $gte: today },
    });
    if (todayCount >= 3) {
      return NextResponse.json({ error: "Max 3 study rooms per day allowed" }, { status: 429 });
    }

    const collegeDomain = getDomainForCollege(finalCollege) || "";

    const livekitRoomName = `study-${new mongoose.Types.ObjectId()}`;

    const room = await StudyRoom.create({
      name: sanitizeText(trimmedName).slice(0, 60),
      topic: finalTopic,
      college: finalCollege,
      collegeDomain,
      createdBy: currentUser._id,
      members: [currentUser._id],
      requiresVerified: finalRequiresVerified,
      maxMembers: finalMaxMembers,
      isActive: true,
      livekitRoomName,
      participantCount: 1,
      lastActiveAt: new Date(),
    });

    await room.populate("createdBy", "name username avatar isVerified college");

    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("[StudyRooms POST]", err.message);
    return NextResponse.json({ error: "Failed to create study room" }, { status: 500 });
  }
}
