import { getCurrentUser } from "@/lib/auth";
import { notifyAdminFeedback } from "@/lib/admin-notify";
import { rateLimit } from "@/lib/redis-rate-limit";
import {
  successResponse,
  errorResponse,
  BadRequestError,
  TooManyRequestsError,
} from "@/lib/api-response";

const MAX_LENGTH = 2000;

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const rl = await rateLimit(ip, "feedback", 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new TooManyRequestsError("Too many requests. Please try again later."),
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(new BadRequestError("Invalid request body"));
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const path =
      typeof body.path === "string" ? body.path.slice(0, 500) : null;

    if (!message) {
      return errorResponse(new BadRequestError("Feedback message is required"));
    }
    if (message.length > MAX_LENGTH) {
      return errorResponse(
        new BadRequestError(`Feedback must be under ${MAX_LENGTH} characters`),
      );
    }

    const user = (await getCurrentUser(request).catch(() => null)) || null;

    await notifyAdminFeedback({ message, user, path });

    return successResponse({ success: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return errorResponse(err);
  }
}
