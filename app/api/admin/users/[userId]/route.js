import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import UserBan from "@/models/UserBan";
import Post from "@/models/Post";
import LoginAttempt from "@/models/LoginAttempt";
import { getCurrentUser, blacklistAllUserTokens } from "@/lib/auth";
import { isAdmin, isFounder } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-log";
import { awardVP, adminGrantVP } from "@/lib/coins";
import { CURRENCY } from "@/lib/currency";
import mongoose from "mongoose";

// GET - Detailed user profile for admin
export async function GET(request, { params }) {
    try {
        const { userId } = await params;
        await connectDB();
        const currentUser = await getCurrentUser(request);

        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 },
            );
        }

        const [user, banHistory, postCount, loginAttempts] = await Promise.all([
            User.findById(userId).select("-password").lean(),
            UserBan.find({ userId }).sort({ createdAt: -1 }).lean(),
            Post.countDocuments({ author: userId, isDeleted: { $ne: true } }),
            LoginAttempt.find({ email: userId })
                .sort({ lastAttempt: -1 })
                .limit(10)
                .lean(),
        ]);

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            user,
            banHistory,
            postCount,
            loginAttempts,
        });
    } catch (error) {
        console.error("[AdminUserGET] Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}

// POST - Perform admin action on user
export async function POST(request, { params }) {
    try {
        const { userId } = await params;
        await connectDB();
        const currentUser = await getCurrentUser(request);

        if (!currentUser || !isAdmin(currentUser)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 },
            );
        }

        const body = await request.json();
        const { action, reason, duration, amount } = body;

        const targetUser = await User.findById(userId).lean();
        if (!targetUser) {
            return NextResponse.json(
                { error: "Target user not found" },
                { status: 404 },
            );
        }

        switch (action) {
            case "ban": {
                if (!reason)
                    return NextResponse.json(
                        { error: "Reason required" },
                        { status: 400 },
                    );
                if (targetUser._id.equals(currentUser._id)) {
                    return NextResponse.json(
                        { error: "Cannot ban yourself" },
                        { status: 400 },
                    );
                }
                if (targetUser.isAdmin && !isFounder(currentUser)) {
                    return NextResponse.json(
                        { error: "Only founder can ban admins" },
                        { status: 403 },
                    );
                }

                const expiresAt = duration
                    ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
                    : null;

                const banRecord = await UserBan.create({
                    userId,
                    bannedBy: currentUser._id,
                    reason,
                    expiresAt,
                    type: duration ? "temporary" : "permanent",
                    isActive: true,
                });

                await User.findByIdAndUpdate(userId, { isBanned: true });
                await blacklistAllUserTokens(userId);

                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: {
                        message: `Your account has been suspended: ${reason}`,
                    },
                });

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_ban",
                    targetType: "user",
                    targetId: userId,
                    summary: `Banned user ${targetUser.username} (${duration ? duration + " days" : "permanent"})`,
                    reason,
                    meta: { duration, banId: banRecord._id },
                });

                return NextResponse.json({ success: true, ban: banRecord });
            }

            case "unban": {
                const activeBan = await UserBan.findOneAndUpdate(
                    { userId, isActive: true },
                    {
                        isActive: false,
                        liftedAt: new Date(),
                        liftedBy: currentUser._id,
                    },
                    { new: true },
                );

                await User.findByIdAndUpdate(userId, { isBanned: false });

                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: {
                        message: "Your account suspension has been lifted",
                    },
                });

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_unban",
                    targetType: "user",
                    targetId: userId,
                    summary: `Unbanned user ${targetUser.username}`,
                    reason: reason || "Ban lifted by admin",
                });

                return NextResponse.json({ success: true });
            }

            case "verify": {
                await User.findByIdAndUpdate(userId, {
                    isVerified: true,
                    verifiedAt: new Date(),
                });

                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: { message: "You've been verified on CampusZen ✅" },
                });

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_verify",
                    targetType: "user",
                    targetId: userId,
                    summary: `Verified user ${targetUser.username}`,
                });

                return NextResponse.json({ success: true });
            }

            case "unverify": {
                await User.findByIdAndUpdate(userId, {
                    isVerified: false,
                    verifiedAt: null,
                });

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_unverify",
                    targetType: "user",
                    targetId: userId,
                    summary: `Unverified user ${targetUser.username}`,
                });

                return NextResponse.json({ success: true });
            }

            case "make_admin": {
                if (!isFounder(currentUser)) {
                    return NextResponse.json(
                        { error: "Only founder can promote admins" },
                        { status: 403 },
                    );
                }

                await User.findByIdAndUpdate(userId, { isAdmin: true });

                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: {
                        message: "You've been given admin access on CampusZen",
                    },
                });

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_make_admin",
                    targetType: "user",
                    targetId: userId,
                    summary: `Promoted ${targetUser.username} to admin`,
                });

                return NextResponse.json({ success: true });
            }

            case "remove_admin": {
                if (!isFounder(currentUser)) {
                    return NextResponse.json(
                        { error: "Only founder can demote admins" },
                        { status: 403 },
                    );
                }
                if (
                    targetUser.username ===
                    process.env.NEXT_PUBLIC_FOUNDER_USERNAME
                ) {
                    return NextResponse.json(
                        { error: "Cannot demote founder" },
                        { status: 400 },
                    );
                }

                await User.findByIdAndUpdate(userId, { isAdmin: false });
                await blacklistAllUserTokens(userId);

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_remove_admin",
                    targetType: "user",
                    targetId: userId,
                    summary: `Demoted ${targetUser.username} from admin`,
                });

                return NextResponse.json({ success: true });
            }

            case "award_coins": {
                const coins = parseInt(amount);
                if (!coins || coins <= 0) {
                    return NextResponse.json(
                        { error: "Valid amount required" },
                        { status: 400 },
                    );
                }

                // Server-authoritative admin gift (bypasses caps + config).
                // Pass the admin's userId as sourceId — adminGrantVP composes
                // it into a traceable, unique source and creates the notification.
                const result = await adminGrantVP(userId, coins, {
                    sourceId: String(currentUser._id),
                });

                if (!result.granted) {
                    return NextResponse.json(
                        { error: "Failed to award VP" },
                        { status: 500 },
                    );
                }

                // NOTE: recipient notification created inside adminGrantVP with
                // proper CURRENCY.shortName and reason "admin_gift" ledger entry.

                const shortName = CURRENCY?.shortName || "VP";
                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_award_coins",
                    targetType: "user",
                    targetId: userId,
                    summary: `Gifted ${coins} ${shortName} to ${targetUser.username}`,
                    reason: reason || "Admin gift",
                    meta: { amount: coins },
                });

                return NextResponse.json({ success: true, awarded: coins });
            }

            case "force_logout": {
                await blacklistAllUserTokens(userId);

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_force_logout",
                    targetType: "user",
                    targetId: userId,
                    summary: `Forced logout for user ${targetUser.username}`,
                });

                return NextResponse.json({ success: true });
            }

            case "delete_user": {
                if (!isFounder(currentUser)) {
                    return NextResponse.json(
                        { error: "Only founder can delete users" },
                        { status: 403 },
                    );
                }
                if (
                    targetUser.username ===
                    process.env.NEXT_PUBLIC_FOUNDER_USERNAME
                ) {
                    return NextResponse.json(
                        { error: "Cannot delete founder account" },
                        { status: 400 },
                    );
                }

                await User.findByIdAndUpdate(userId, {
                    isDeleted: true,
                    deletedAt: new Date(),
                    isBanned: true, // prevent login
                    email: `deleted_${userId}@deleted.campusZen`,
                    name: "Deleted User",
                    avatar: "",
                    bio: "",
                    college: "",
                });

                await blacklistAllUserTokens(userId);

                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_delete",
                    targetType: "user",
                    targetId: userId,
                    summary: `Soft deleted user ${targetUser.username}`,
                    reason,
                });

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error("[AdminUserPOST] Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}
