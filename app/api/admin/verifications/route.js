import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(20, parseInt(searchParams.get("limit")) || 10);
    const skip = (page - 1) * limit;

    const query = {
      verificationStatus: "pending",
      collegeIdUrl: { $exists: true, $ne: null },
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          "name username email college collegeIdUrl verificationType verificationRequestedAt avatar"
        )
        .sort({ verificationRequestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[AdminVerificationsGET] Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
