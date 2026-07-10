import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, setAuthCookie, generateUniqueUsername } from "@/lib/auth";
import { notifyAdminNewUser } from "@/lib/admin-notify";

export async function POST(request) {
    try {
        const { appwriteUser } = await request.json();

        console.log(
            "[Google Callback API] Received appwriteUser:",
            appwriteUser,
        );

        if (!appwriteUser || !appwriteUser.$id) {
            console.error(
                "[Google Callback API] Invalid appwriteUser provided",
            );
            return NextResponse.json(
                { error: "Invalid appwriteUser" },
                { status: 401 },
            );
        }

        await connectDB();

        // Find existing user by Appwrite ID or email
        let user = await User.findOne({
            $or: [
                { appwriteUserId: appwriteUser.$id },
                { email: appwriteUser.email.toLowerCase() },
            ],
        });

        if (user) {
            // If user exists but doesn't have appwriteUserId, link it
            if (!user.appwriteUserId) {
                user.appwriteUserId = appwriteUser.$id;
                user.authMigrated = true;
                user.emailVerified = appwriteUser.emailVerification;
                await user.save();
            } else if (user.emailVerified !== appwriteUser.emailVerification) {
                // Sync email verification status
                user.emailVerified = appwriteUser.emailVerification;
                await user.save();
            }
        } else {
            // Create new user
            // Generate unique username
            const username = await generateUniqueUsername(
                appwriteUser.name || appwriteUser.email.split("@")[0],
            );

            // Create MongoDB user
            user = await User.create({
                name: appwriteUser.name || "User",
                username,
                email: appwriteUser.email.toLowerCase(),
                // Generate random password (won't be used for OAuth)
                password: await (
                    await import("bcryptjs")
                ).default.hash(Math.random().toString(36), 12),
                avatar: "",
                appwriteUserId: appwriteUser.$id,
                authMigrated: true,
                authProvider: "google",
                emailVerified: appwriteUser.emailVerification,
                isVerified: false,
                verificationStatus: "none",
                gender: "unspecified",
                isOnboarded: false,
            });

            // Auto-follow founder
            try {
                const { FOUNDER_USERNAME } = await import("@/lib/founder");
                if (FOUNDER_USERNAME) {
                    const founderUser = await User.findOne({
                        username: FOUNDER_USERNAME,
                    }).lean();
                    if (
                        founderUser &&
                        founderUser._id.toString() !== user._id.toString()
                    ) {
                        await User.findByIdAndUpdate(user._id, {
                            $addToSet: { following: founderUser._id },
                        });
                        await User.findByIdAndUpdate(founderUser._id, {
                            $addToSet: { followers: user._id },
                        });
                    }
                }
            } catch (err) {
                console.error(
                    "[Google Callback API] Auto-follow founder failed:",
                    err.message,
                );
            }

            // Send admin notification
            notifyAdminNewUser(user).catch((err) =>
                console.error(
                    "[Google Callback API] Admin notify failed:",
                    err,
                ),
            );

            import("@/lib/globalGroup")
                .then(({ autoJoinGlobalGroup }) => {
                    autoJoinGlobalGroup(user._id).catch((err) =>
                        console.error(
                            "[Google Callback API] Global group join failed:",
                            err,
                        ),
                    );
                })
                .catch((err) =>
                    console.error(
                        "[Google Callback API] Global group import failed:",
                        err,
                    ),
                );
        }

        // Set legacy JWT cookie for compatibility
        const token = await signToken({
            userId: user._id.toString(),
            username: user.username,
        });

        // Determine redirect URL
        const redirectTo = user.isOnboarded ? "/feed" : "/onboarding";

        const response = NextResponse.json({ redirectTo });
        await setAuthCookie(response, token);

        return response;
    } catch (error) {
        console.error("[Google Callback API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
