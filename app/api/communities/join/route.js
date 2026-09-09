import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Community from "@/models/Community";
import { getCurrentUser } from "@/lib/auth";
import { deleteCachePattern } from "@/lib/cache";
import { sanitizeMongoInput } from "@/lib/sanitize";

export async function POST(request) {
  try {
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

    const rawSlug = body.slug || body.name || "";
    if (!rawSlug || typeof rawSlug !== "string" || rawSlug.trim().length < 2) {
      return NextResponse.json({ error: "Community slug is required" }, { status: 400 });
    }

    const sanitized = sanitizeMongoInput(rawSlug.trim());
    const slug = sanitized.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    await connectDB();

    const community = await Community.findOne({
      $or: [{ slug }, { name: { $regex: new RegExp(`^${rawSlug.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }],
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const alreadyMember = community.members.some((m) => m.toString() === currentUser._id.toString());
    if (alreadyMember) {
      return NextResponse.json({
        success: true,
        message: "Already a member",
        memberCount: community.members.length,
        verifiedMemberCount: community.verifiedMemberCount ?? 0,
        isMember: true,
      });
    }

    community.members.push(currentUser._id);
    if (currentUser.isVerified) {
      community.verifiedMemberCount = (community.verifiedMemberCount || 0) + 1;
    }
    await community.save();

    deleteCachePattern("communities_");

    return NextResponse.json({
      success: true,
      memberCount: community.members.length,
      verifiedMemberCount: community.verifiedMemberCount ?? 0,
      isMember: true,
    });
  } catch (error) {
    console.error("[communities/join] Error:", error);
    return NextResponse.json({ error: "Failed to join community" }, { status: 500 });
  }
}
