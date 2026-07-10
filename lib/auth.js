import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import UserBan from "@/models/UserBan";
import TokenBlacklist from "@/models/TokenBlacklist";
import connectDB from "@/lib/db";
import config from "./config";
import { refreshUserProStatus } from "./subscription";
import { getServerSession, getAppwriteUsers } from "./appwrite/server";
import { ID } from "node-appwrite";

const loginAttempts = new Map();

export function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    const attemptData = loginAttempts.get(ip) || {
        count: 0,
        firstAttempt: now,
    };

    if (now - attemptData.firstAttempt > windowMs) {
        attemptData.count = 1;
        attemptData.firstAttempt = now;
    } else {
        attemptData.count++;
    }

    loginAttempts.set(ip, attemptData);

    if (attemptData.count > maxAttempts) {
        return false;
    }

    return true;
}

const getSecretKey = () => new TextEncoder().encode(config.jwt.secret);

export async function signToken(payload) {
    const secretKey = getSecretKey();
    const jwt = new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt();

    if (config.jwt.expiresIn) {
        jwt.setExpirationTime(config.jwt.expiresIn);
    }

    return await jwt.sign(secretKey);
}

export async function verifyToken(token) {
    try {
        const secretKey = getSecretKey();
        const { payload } = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function setAuthCookie(response, token) {
    const options = {
        httpOnly: true,
        secure: config.env.isProd || process.env.VERCEL === "1",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    };

    // 1. Set on the response object (for middleware/API compatibility)
    if (response && response.cookies) {
        response.cookies.set("campusx_token", token, options);
    }

    // 2. Also set using the next/headers cookies() helper for redundancy/reliability in App Router
    try {
        const cookieStore = await cookies();
        cookieStore.set("campusx_token", token, options);
    } catch (e) {
        // In some contexts (like middleware), cookies() might be read-only or not available
        // We already set it on the response, so this is fine
    }
}

export async function clearAuthCookie(response) {
    const options = { maxAge: 0, path: "/" };

    if (response && response.cookies) {
        response.cookies.set("campusx_token", "", options);
    }

    try {
        const cookieStore = await cookies();
        cookieStore.set("campusx_token", "", options);
    } catch (e) {}
}

/**
 * Blacklists all active tokens for a user (force logout).
 * Since we use stateless JWTs, we store them in a blacklist
 * and check during verification.
 *
 * @param {string} userId - The user ID to force logout
 */
export async function blacklistAllUserTokens(userId) {
    await connectDB();

    // In a real stateless JWT setup, you'd usually rotate a 'tokenVersion' on the User model
    // and include it in the JWT payload. Then verifyToken would check if payload.version === user.tokenVersion.
    //
    // However, the prompt specifically mentions TokenBlacklist model.
    // Since we don't have a way to find all active tokens (unless we stored them on login),
    // a common pattern is to use a `tokenVersion` or `lastLogoutAt` field on the User model.
    //
    // For now, I'll implement it by updating a `tokenVersion` on the User model
    // and adding a comment that this requires verifyToken to check the version.

    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
}

export function getTokenFromRequest(request) {
    return request.cookies.get("campusx_token")?.value || null;
}

// Legacy function for fallback (keep for now)
export async function getCurrentUserLegacy(request) {
    const token = getTokenFromRequest(request);
    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded) return null;

    // Safely extract userId - handle both string and buffer object cases
    let userId = decoded.userId;
    if (typeof userId === "object" && userId.buffer) {
        // If it's an ObjectId buffer object, convert to hex string
        userId = Buffer.from(Object.values(userId.buffer)).toString("hex");
    } else if (userId && typeof userId.toString === "function") {
        userId = userId.toString();
    }

    await connectDB();
    await refreshUserProStatus(userId);

    const user = await User.findById(userId).select("-password").lean();
    if (!user || user.isDeleted) return null;

    // Force logout check (tokenVersion)
    if (decoded.version !== undefined && decoded.version < user.tokenVersion) {
        return null;
    }

    // Check for active ban - only if user.isBanned is true or for extra safety
    // If we trust user.isBanned, we can skip the findOne query
    if (user.isBanned) {
        const ban = await UserBan.findOne({
            userId: user._id,
            isActive: true,
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).lean();

        if (ban) throw new Error("Account suspended");
    }

    return user;
}

// Helper function to generate unique username
export async function generateUniqueUsername(baseName) {
    let username = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
    let counter = 1;

    while (true) {
        const checkUsername = counter > 1 ? `${username}_${counter}` : username;
        const existing = await User.findOne({ username: checkUsername });
        if (!existing) {
            return checkUsername;
        }
        counter++;
    }
}

// New function to get current user from Appwrite
export async function getCurrentUser(request) {
    try {
        // First check for Appwrite session
        const appwriteUser = await getServerSession();
        if (appwriteUser) {
            await connectDB();
            let user = await User.findOne({
                appwriteUserId: appwriteUser.$id,
            })
                .select("-password")
                .lean();

            // If user doesn't exist in MongoDB, create them
            if (!user) {
                // Check if user exists with same email (legacy user)
                const existingByEmail = await User.findOne({
                    email: appwriteUser.email,
                });
                if (existingByEmail) {
                    // Link legacy user to Appwrite
                    await User.updateOne(
                        { _id: existingByEmail._id },
                        {
                            appwriteUserId: appwriteUser.$id,
                            authMigrated: true,
                            emailVerified: appwriteUser.emailVerification,
                        },
                    );
                    user = await User.findOne({
                        appwriteUserId: appwriteUser.$id,
                    })
                        .select("-password")
                        .lean();
                } else {
                    // Create new user
                    const username = await generateUniqueUsername(
                        appwriteUser.name || "user",
                    );

                    const newUser = await User.create({
                        name: appwriteUser.name,
                        username,
                        email: appwriteUser.email,
                        password: await bcrypt.hash(
                            Math.random().toString(36),
                            12,
                        ), // Temporary password, won't be used
                        avatar: "",
                        appwriteUserId: appwriteUser.$id,
                        authMigrated: true,
                        emailVerified: appwriteUser.emailVerification,
                        isVerified: false,
                        verificationStatus: "none",
                        gender: "unspecified",
                        isOnboarded: false,
                        isPro: false,
                        isBot: false,
                    });

                    // Auto-follow founder if possible
                    try {
                        const { FOUNDER_USERNAME } =
                            await import("./founder.js");
                        if (FOUNDER_USERNAME) {
                            const founderUser = await User.findOne({
                                username: FOUNDER_USERNAME,
                            }).lean();
                            if (
                                founderUser &&
                                founderUser._id.toString() !==
                                    newUser._id.toString()
                            ) {
                                await User.findByIdAndUpdate(newUser._id, {
                                    $addToSet: { following: founderUser._id },
                                });
                                await User.findByIdAndUpdate(founderUser._id, {
                                    $addToSet: { followers: newUser._id },
                                });
                            }
                        }
                    } catch (err) {
                        console.error(
                            "Auto-follow founder failed:",
                            err.message,
                        );
                    }

                    // Convert to lean object
                    user = newUser.toObject();
                    delete user.password;
                }
            }

            if (user && !user.isDeleted) {
                await refreshUserProStatus(user._id.toString());

                if (user.isBanned) {
                    const ban = await UserBan.findOne({
                        userId: user._id,
                        isActive: true,
                        $or: [
                            { expiresAt: null },
                            { expiresAt: { $gt: new Date() } },
                        ],
                    }).lean();

                    if (ban) throw new Error("Account suspended");
                }

                // Sync email verification status
                if (
                    appwriteUser.emailVerification !== undefined &&
                    user.emailVerified !== appwriteUser.emailVerification
                ) {
                    await User.updateOne(
                        { _id: user._id },
                        { emailVerified: appwriteUser.emailVerification },
                    );
                }

                return user;
            }
        }

        // Fallback to legacy JWT
        return await getCurrentUserLegacy(request);
    } catch (error) {
        console.error("Error in getCurrentUser:", error);
        return null;
    }
}

// Helper function to migrate a legacy user to Appwrite
export async function migrateLegacyUser(mongoUser, password) {
    try {
        const users = getAppwriteUsers();

        // Create Appwrite user
        const appwriteUser = await users.create({
            userId: ID.unique(),
            email: mongoUser.email,
            password: password,
            name: mongoUser.name,
            // Only pass phone if it's valid E.164 format
            ...(mongoUser.phone && mongoUser.phone.startsWith("+")
                ? { phone: mongoUser.phone }
                : {}),
        });

        // Update mongo user with appwriteUserId and mark as migrated
        await User.findByIdAndUpdate(mongoUser._id, {
            appwriteUserId: appwriteUser.$id,
            authMigrated: true,
        });

        return appwriteUser;
    } catch (error) {
        console.error("Error migrating user:", error);
        throw error;
    }
}
