import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import { notifyAdminNewUser } from "@/lib/admin-notify";
import { applyRateLimit } from "@/lib/redis-rate-limit";
import { signupSchema, validateRequest } from "@/utils/schemas";
import {
    successResponse,
    errorResponse,
    BadRequestError,
} from "@/lib/api-response";
import { sanitizeText } from "@/lib/sanitize";
import { isCollegeEmail, getCollegeName } from "@/lib/collegeEmails.js";

export async function POST(request) {
    try {
        const { blocked, response: rateLimitResponse } = await applyRateLimit(request, "auth_signup", 3, 60 * 60 * 1000);
        if (blocked) return rateLimitResponse;

        let body;
        try { body = await request.json(); } catch (e) { return errorResponse(new BadRequestError("Invalid request body")); }

        const validation = signupSchema.safeParse(body);
        if (!validation.success) {
            return errorResponse(new BadRequestError("Validation failed", validation.error.errors.map((e) => ({ field: e.path.join("."), message: e.message }))));
        }

        const { name, username, email, password, confirmPassword, phone, college, course, year, gender, otp } = validation.data;

        await connectDB();
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedOtp = otp.trim();

        if (password !== confirmPassword) return errorResponse(new BadRequestError("Passwords do not match"));

        const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose: "signup" });
        if (!otpRecord) return errorResponse(new BadRequestError("OTP expired or not found. Please request a new one."));
        if (otpRecord.attempts >= 5) { await Otp.deleteOne({ _id: otpRecord._id }); return errorResponse(new BadRequestError("Too many incorrect attempts. This OTP has been invalidated. Please request a new one.")); }
        if (otpRecord.otp !== normalizedOtp) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            const remaining = 5 - otpRecord.attempts;
            return errorResponse(new BadRequestError(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`));
        }
        await Otp.deleteOne({ _id: otpRecord._id });

        const existingEmail = await User.findOne({ email: normalizedEmail }).lean();
        if (existingEmail) return errorResponse(new BadRequestError("Email already registered"));
        const existingUsername = await User.findOne({ username }).lean();
        if (existingUsername) return errorResponse(new BadRequestError("Username already taken"));

        let avatar = "";
        const seed = Math.random().toString(36).substring(7);
        avatar = `https://api.dicebear.com/10.x/pixelbot/svg?seed=${seed}`;

        const collegeDetected = isCollegeEmail(normalizedEmail);
        const detectedCollegeName = getCollegeName(normalizedEmail);
        const verificationFields = collegeDetected ? { isVerified: true, verificationStatus: "verified", verificationType: "college_email", collegeEmail: normalizedEmail, verificationApprovedAt: new Date() } : { isVerified: false, verificationStatus: "none" };

        const user = await User.create({
            name: sanitizeText(name),
            username,
            email: normalizedEmail,
            password: await bcrypt.hash(password, 12),
            phone: phone || "",
            college: sanitizeText(college || "") || detectedCollegeName || "",
            course: sanitizeText(course || ""),
            year: parseInt(year) || 1,
            gender: gender || "unspecified",
            avatar,
            ...verificationFields,
        });

        try {
            const { FOUNDER_USERNAME } = await import("@/lib/founder");
            if (FOUNDER_USERNAME) {
                const founderUser = await User.findOne({ username: FOUNDER_USERNAME }).lean();
                if (founderUser && founderUser._id.toString() !== user._id.toString()) {
                    await User.findByIdAndUpdate(user._id, { $addToSet: { following: founderUser._id } });
                    await User.findByIdAndUpdate(founderUser._id, { $addToSet: { followers: user._id } });
                }
            }
        } catch (err) { console.error("Auto-follow founder failed:", err.message); }

        const response = successResponse({ user: { _id: user._id, name: user.name, username: user.username, avatar: user.avatar, isVerified: user.isVerified, verificationStatus: user.verificationStatus }, collegeAutoVerified: collegeDetected, collegeName: detectedCollegeName }, { status: 201 });

        const token = await signToken({ userId: user._id.toString(), username: user.username });
        await setAuthCookie(response, token);

        notifyAdminNewUser(user).catch((err) => console.error("Operation failed:", err));
        import("@/lib/globalGroup.js").then(({ autoJoinGlobalGroup }) => { autoJoinGlobalGroup(user._id).catch((err) => console.error("Operation failed:", err)); }).catch((err) => console.error("Operation failed:", err));

        return response;
    } catch (error) {
        console.error("Signup error:", error);
        return errorResponse(error);
    }
}
