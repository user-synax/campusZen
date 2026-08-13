import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import Badge from "@/models/Badge";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { sanitizeUser, sanitizeText } from "@/lib/sanitize";

export async function GET(request, { params }) {
    try {
        const { username } = await params;
        if (!username)
            return NextResponse.json(
                { message: "Username is required" },
                { status: 400 },
            );

        await connectDB();
        const currentUser = await getCurrentUser(request);

        const userResult = await User.findOne({
            username: username.toLowerCase(),
        })
            .populate({
                path: "pinnedPost",
                populate: { path: "author", select: "name username avatar" },
            })
            .lean();

        if (!userResult)
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );

        const postCount = await Post.countDocuments({
            author: userResult._id,
            isDeleted: false,
        });

        const isFollowingUser = currentUser
            ? (userResult.followers || []).some(
                  (id) => id.toString() === currentUser._id.toString(),
              )
            : false;
        const isMe = currentUser
            ? currentUser._id.toString() === userResult._id.toString()
            : false;

        // Resolve equipped shop cosmetics into a single flat, render-ready map.
        // Data comes from the self-contained ownedShopItems snapshot, so this
        // is a single in-memory pass — no extra queries (no N+1).
        const equippedMap = userResult.equippedShopItems || {};
        const ownedById = new Map(
            (userResult.ownedShopItems || []).map((o) => [
                o.itemId?.toString(),
                o,
            ]),
        );
        const equippedItems = {};
        for (const [category, itemId] of Object.entries(equippedMap)) {
            const owned = ownedById.get(itemId?.toString());
            if (owned) {
                equippedItems[category] = {
                    category,
                    itemId: itemId,
                    slug: owned.slug,
                    name: owned.name,
                    rarity: owned.rarity,
                    visual: owned.visual || {},
                };
            }
        }

        const responseData = {
            ...sanitizeUser(userResult),
            role: userResult.role,
            email: userResult.email,
            postCount,
            followersCount: userResult.followers?.length || 0,
            followingCount: userResult.following?.length || 0,
            isFollowing: isFollowingUser,
            isMe,
            isFounder: isFounder(userResult.username),
            pinnedPost: userResult.pinnedPost,
            founderData: userResult.founderData,
            equippedShopItems: equippedMap,
            equippedItems,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("[GET /api/users/username]", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}

export async function PATCH(request, { params }) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser)
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
            );

        const { username } = await params;
        if (currentUser.username.toLowerCase() !== username.toLowerCase()) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { message: "Invalid request body" },
                { status: 400 },
            );
        }

        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json(
                { message: "No fields to update" },
                { status: 400 },
            );
        }

        const {
            name,
            bio,
            college,
            course,
            year,
            banner,
            socialLinks,
            interests,
            role,
            email,
            dmEnabled,
        } = body;
        const updateData = {};

        if (name !== undefined)
            updateData.name = sanitizeText(name).slice(0, 50);
        if (bio !== undefined) updateData.bio = sanitizeText(bio).slice(0, 160);
        if (college !== undefined)
            updateData.college = sanitizeText(college).slice(0, 100);
        if (course !== undefined)
            updateData.course = sanitizeText(course).slice(0, 100);
        if (year !== undefined)
            updateData.year = Math.min(6, Math.max(1, parseInt(year) || 1));
        if (banner !== undefined)
            updateData.banner = sanitizeText(banner).slice(0, 500);
        if (dmEnabled !== undefined) updateData.dmEnabled = Boolean(dmEnabled);
        if (socialLinks !== undefined) {
            updateData.socialLinks = {
                twitter: sanitizeText(socialLinks.twitter || "").slice(0, 100),
                instagram: sanitizeText(socialLinks.instagram || "").slice(
                    0,
                    100,
                ),
                linkedin: sanitizeText(socialLinks.linkedin || "").slice(
                    0,
                    100,
                ),
                github: sanitizeText(socialLinks.github || "").slice(0, 100),
                website: sanitizeText(socialLinks.website || "").slice(0, 100),
            };
        }
        if (interests !== undefined && Array.isArray(interests)) {
            // Validate interests are in allowed options and within limits
            const allowedInterests = [
                "Programming",
                "Web Development",
                "AI",
                "Hackathons",
                "Placements",
                "Startups",
                "Design",
                "Photography",
                "Gaming",
                "Cricket",
                "Music",
                "Memes",
                "Finance",
                "Entrepreneurship",
                "College Life",
                "Events",
            ];
            const validInterests = interests
                .filter((interest) => allowedInterests.includes(interest))
                .slice(0, 10);
            updateData.interests = validInterests;
        }

        await connectDB();

        const updatedUser = await User.findByIdAndUpdate(
            currentUser._id,
            { $set: updateData },
            { new: true, runValidators: true },
        ).lean();

        if (!updatedUser)
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 },
            );

        return NextResponse.json({
            success: true,
            user: sanitizeUser(updatedUser),
        });
    } catch (error) {
        console.error("[PATCH /api/users/username]", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
