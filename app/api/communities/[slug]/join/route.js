import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Community from "@/models/Community";
import { getCurrentUser } from "@/lib/auth";
import { deleteCachePattern } from "@/lib/cache";

export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug: rawSlug } = await params;
    if (!rawSlug) {
      return NextResponse.json({ error: "Community slug is required" }, { status: 400 });
    }

    const slug = rawSlug.toLowerCase().trim();

    await connectDB();

    const community = await Community.findOne({
      $or: [
        { slug },
        { slug: slug.replace(/\s+/g, "-") },
        { name: { $regex: new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      ],
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
    console.error("[communities/[slug]/join] Error:", error);
    return NextResponse.json({ error: "Failed to join community" }, { status: 500 });
  }
}
