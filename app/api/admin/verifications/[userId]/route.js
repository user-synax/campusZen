import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Community from "@/models/Community";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-log";
import { deleteCachePattern } from "@/lib/cache";

export async function POST(request, { params }) {
  try {
    const { userId } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, reason } = body;

    const admin = await getCurrentUser(request);

    if (!admin || !isAdmin(admin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const target = await User.findById(userId);

    if (!target || target.verificationStatus !== "pending") {
      return NextResponse.json({ error: "Not pending" }, { status: 400 });
    }

    if (action === "approve") {
      target.isVerified = true;
      target.verificationStatus = "verified";
      target.verificationType = "id_card";
      target.verificationApprovedAt = new Date();
      target.verificationRejectedReason = null;
      await target.save();

      await createNotification({
        recipient: userId,
        type: "system",
        meta: {
          message: "🎓 Your college ID was approved — you are now Verified!",
        },
      });

      await logAdminAction({
        adminId: admin._id,
        action: "verify_approve",
        targetType: "user",
        targetId: userId,
        summary: `Approved verification for ${target.username}`,
      });

      // Recalc verifiedMemberCount for college community (verified-first graph)
      if (target.college) {
        try {
          const verifiedCount = await User.countDocuments({ college: target.college, isVerified: true });
          const escaped = target.college.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const comm = await Community.findOne({ name: { $regex: new RegExp(`^${escaped}$`, "i") } });
          if (comm) {
            await Community.updateOne({ _id: comm._id }, { $set: { verifiedMemberCount: verifiedCount } });
            deleteCachePattern("communities_");
          }
        } catch (e) {
          console.error("[verification] recalc verifiedMemberCount failed:", e.message);
        }
      }

      return NextResponse.json({ success: true });
    } else if (action === "reject") {
      if (!reason) {
        return NextResponse.json(
          { error: "Reason required" },
          { status: 400 }
        );
      }

      target.verificationStatus = "rejected";
      target.verificationRejectedReason = reason;
      target.collegeIdUrl = null;
      await target.save();

      await createNotification({
        recipient: userId,
        type: "system",
        meta: { message: `Verification rejected: ${reason}` },
      });

      await logAdminAction({
        adminId: admin._id,
        action: "verify_reject",
        targetType: "user",
        targetId: userId,
        summary: `Rejected verification for ${target.username}`,
        reason,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[AdminVerificationsPOST] Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
