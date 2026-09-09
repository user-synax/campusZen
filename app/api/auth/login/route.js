import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";
import { signToken, setAuthCookie } from "@/lib/auth";
import { applyRateLimit, rateLimit } from "@/lib/rate-limit";
import { sanitizeUser } from "@/lib/sanitize";
import { sendSuspiciousLoginEmail } from "@/lib/email-templates";
import { loginSchema, validateRequest } from "@/utils/schemas";
import { errorResponse, APIError } from "@/lib/api-response";

function parseUserAgent(userAgent = "") {
    const device = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? "Mobile" : /Tablet|iPad/i.test(userAgent) ? "Tablet" : "Desktop";
    let browser = "Unknown";
    if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) browser = "Chrome";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = "Safari";
    else if (/Edge|Edg/i.test(userAgent)) browser = "Edge";
    return { device, browser };
}

function getClientIp(request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
    try {
        const { blocked, response: rateLimitResponse } = applyRateLimit(request, "auth_login_ip", 10, 15 * 60 * 1000);
        if (blocked) return rateLimitResponse;

        const validation = await validateRequest(loginSchema)(request);
        if (!validation.valid) {
            return NextResponse.json({ message: "Validation failed", errors: validation.errors }, { status: 400 });
        }

        const { email, password } = validation.data;
        const emailKey = `login_email_${email?.toString().toLowerCase()}`;
        const emailResult = rateLimit(emailKey, 5, 15 * 60 * 1000);
        if (!emailResult.allowed) {
            return NextResponse.json({ message: `Too many login attempts for this account. Try again in ${emailResult.retryAfter} seconds.` }, { status: 429, headers: { "Retry-After": String(emailResult.retryAfter) } });
        }

        await connectDB();
        const mongoUser = await User.findOne({ email }).select("+password");
        if (!mongoUser) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        const isMatch = await mongoUser.comparePassword(password);
        if (!isMatch) {
            return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
        }

        const finalMongoUser = await User.findById(mongoUser._id).select("-password").lean();

        const response = NextResponse.json({ success: true, user: sanitizeUser(finalMongoUser) });

        const token = await signToken({ userId: finalMongoUser._id.toString(), username: finalMongoUser.username });
        await setAuthCookie(response, token);

        const userAgent = request.headers.get("user-agent") || "";
        const { device, browser } = parseUserAgent(userAgent);
        const ipAddress = getClientIp(request);

        const recentLogins = await LoginHistory.find({ userId: finalMongoUser._id }).sort({ createdAt: -1 }).limit(5).lean();
        const isKnownDevice = recentLogins.some((login) => login.device === device && login.browser === browser);
        const isSuspicious = !isKnownDevice && recentLogins.length > 0;

        await LoginHistory.create({ userId: finalMongoUser._id, ipAddress, userAgent, device, browser, isSuspicious });

        if (isSuspicious) {
            sendSuspiciousLoginEmail(finalMongoUser, { userAgent, ipAddress, createdAt: new Date() }).catch((err) => console.error("Operation failed:", err));
        }

        return response;
    } catch (error) {
        console.error(error);
        return errorResponse(new APIError("Login failed due to a server error.", 500, "INTERNAL_ERROR"));
    }
}
