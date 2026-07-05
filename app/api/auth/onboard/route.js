import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();
        const {
            fullName,
            bio,
            avatar,
            college,
            course,
            branch,
            year,
            interests,
            following,
        } = body;

        if (!fullName) {
            return NextResponse.json(
                { error: "Full name is required" },
                { status: 400 },
            );
        }

        await connectDB();

        const updateData = {
            name: fullName,
            bio: bio || "",
            avatar: avatar || "",
            college: college || "",
            course: course || "",
            branch: branch || "",
            interests: interests || [],
            isOnboarded: true,
        };

        if (year) updateData.year = parseInt(year, 10);

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            currentUser._id,
            { $set: updateData },
            { new: true, runValidators: true },
        );

        // Handle follow requests
        if (following && following.length > 0) {
            // Add following to current user
            await User.findByIdAndUpdate(currentUser._id, {
                $addToSet: { following: { $each: following } },
            });

            // Add current user to followers of each followed user
            for (const userId of following) {
                await User.findByIdAndUpdate(userId, {
                    $addToSet: { followers: currentUser._id },
                });
            }
        }

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("[Onboard POST Error]", error);
        // Handle duplicate username error from MongoDB
        if (error.code === 11000 && error.keyPattern?.username) {
            return NextResponse.json(
                { error: "Username is already taken" },
                { status: 400 },
            );
        }
        return NextResponse.json(
            { error: "Failed to complete onboarding" },
            { status: 500 },
        );
    }
}
