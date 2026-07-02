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
        const { username, college, course, year, gender } = body;

        if (!username || !gender) {
            return NextResponse.json(
                { error: "Please fill in all required fields" },
                { status: 400 },
            );
        }

        // Validate username format
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return NextResponse.json(
                {
                    error: "Username must be 3-20 characters, alphanumeric and underscores only",
                },
                { status: 400 },
            );
        }

        await connectDB();

        // Check if username is already taken
        const existingUser = await User.findOne({ username });
        if (
            existingUser &&
            existingUser._id.toString() !== currentUser._id.toString()
        ) {
            return NextResponse.json(
                { error: "Username is already taken" },
                { status: 400 },
            );
        }

        const updateData = {
            username,
            gender,
            isOnboarded: true,
        };

        // Add optional fields if provided
        if (college) updateData.college = college;
        if (course) updateData.course = course;
        if (year) updateData.year = parseInt(year, 10);

        const updatedUser = await User.findByIdAndUpdate(
            currentUser._id,
            { $set: updateData },
            { new: true, runValidators: true },
        );

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
