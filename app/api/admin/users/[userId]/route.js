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
        const { action, reason, duration } = body;

        const targetUser = await User.findById(userId).lean();
        if (!targetUser) {
            return NextResponse.json(
                { error: "Target user not found" },
                { status: 404 },
            );
        }

        const allowedActions = ["ban", "unban", "verify", "unverify", "grantPro", "revokePro", "grantProLifetime", "revokeProLifetime"];
        if (!allowedActions.includes(action)) {
            return NextResponse.json(
                { error: `Invalid action. Allowed: ${allowedActions.join(", ")}` },
                { status: 400 },
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
                if (targetUser.isVerified && targetUser.verificationStatus === "verified") {
                    return NextResponse.json({ error: "User already verified" }, { status: 400 });
                }
                await User.findByIdAndUpdate(userId, {
                    isVerified: true,
                    verificationStatus: "verified",
                    verificationType: "id_card",
                    verificationApprovedAt: new Date(),
                    verificationRejectedReason: null,
                });
                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: { message: "🎓 You have been verified by admin — Verified Student badge granted!" },
                });
                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_verify",
                    targetType: "user",
                    targetId: userId,
                    summary: `Verified user ${targetUser.username} (admin grant)`,
                    reason: reason || "Admin verification grant",
                });
                return NextResponse.json({ success: true, message: "User verified" });
            }

            case "unverify": {
                if (!targetUser.isVerified) {
                    return NextResponse.json({ error: "User is not verified" }, { status: 400 });
                }
                await User.findByIdAndUpdate(userId, {
                    isVerified: false,
                    verificationStatus: "none",
                    verificationType: null,
                    verificationApprovedAt: null,
                    verificationRejectedReason: null,
                    collegeIdUrl: null,
                });
                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: { message: "Your verification has been revoked by admin" },
                });
                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_unverify",
                    targetType: "user",
                    targetId: userId,
                    summary: `Unverified user ${targetUser.username}`,
                    reason: reason || "Admin verification revoke",
                });
                return NextResponse.json({ success: true, message: "Verification revoked" });
            }

            case "grantPro":
            case "grantProLifetime": {
                if (targetUser.isPro) {
                    return NextResponse.json({ error: "User already has Pro" }, { status: 400 });
                }
                await User.findByIdAndUpdate(userId, { isPro: true });
                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: { message: "⭐ You have been granted Pro for lifetime by admin — enjoy premium features!" },
                });
                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_grant_pro",
                    targetType: "user",
                    targetId: userId,
                    summary: `Granted Pro (lifetime) to ${targetUser.username}`,
                    reason: reason || "Admin Pro grant lifetime",
                    meta: { lifetime: true },
                });
                return NextResponse.json({ success: true, message: "Pro granted for lifetime" });
            }

            case "revokePro":
            case "revokeProLifetime": {
                if (!targetUser.isPro) {
                    return NextResponse.json({ error: "User does not have Pro" }, { status: 400 });
                }
                await User.findByIdAndUpdate(userId, { isPro: false });
                await createNotification({
                    recipient: userId,
                    type: "system",
                    meta: { message: "Your Pro access has been revoked by admin" },
                });
                await logAdminAction({
                    adminId: currentUser._id,
                    action: "user_revoke_pro",
                    targetType: "user",
                    targetId: userId,
                    summary: `Revoked Pro from ${targetUser.username}`,
                    reason: reason || "Admin Pro revoke",
                });
                return NextResponse.json({ success: true, message: "Pro revoked" });
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
