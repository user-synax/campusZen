import connectDB from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import {
    getAppwriteAdminStorage,
    getFileViewUrlString,
    getUserMediaBucketId,
} from "@/lib/appwrite";
import { ID, Permission, Role } from "appwrite";
import { getTransporter } from "@/lib/mailer";
import {
    successResponse,
    errorResponse,
    BadRequestError,
    UnauthorizedError,
    ConflictError,
} from "@/lib/api-response";

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request) {
    try {
        // ── Auth ──
        const user = await getCurrentUser(request);
        if (!user) {
            return errorResponse(
                new UnauthorizedError("Please log in to verify"),
            );
        }

        // ── Guard: already verified or pending ──
        if (user.isVerified && user.verificationStatus === "verified") {
            return errorResponse(
                new ConflictError("You are already a verified student"),
            );
        }
        if (user.verificationStatus === "pending") {
            return errorResponse(
                new ConflictError(
                    "Your verification is already under review. Please wait for a response.",
                ),
            );
        }

        // ── Parse multipart form data ──
        const formData = await request.formData();
        const file = formData.get("idCard");

        if (!file || typeof file === "string") {
            return errorResponse(
                new BadRequestError("College ID card file is required"),
            );
        }

        // ── Validate file type ──
        if (!ALLOWED_TYPES.includes(file.type)) {
            return errorResponse(
                new BadRequestError(
                    "Invalid file type. Accepted: JPG, PNG, WebP, PDF",
                ),
            );
        }

        // ── Validate file size ──
        if (file.size > MAX_FILE_SIZE) {
            return errorResponse(
                new BadRequestError("File too large. Maximum size is 5 MB"),
            );
        }

        // ── Upload to Appwrite ──
        const bucketId = getUserMediaBucketId();
        const storage = getAppwriteAdminStorage();
        const fileId = ID.unique();
        const permissions = [
            Permission.read(Role.user(user._id)),
            Permission.read(Role.admin()), // Admins should see this
            Permission.delete(Role.user(user._id)),
        ];
        const uploadedFile = await storage.createFile(
            bucketId,
            fileId,
            file,
            permissions,
        );
        const collegeIdUrl = getFileViewUrlString(uploadedFile.$id, bucketId);

        // ── Update user document ──
        await connectDB();
        await User.findByIdAndUpdate(user._id, {
            $set: {
                collegeIdUrl,
                verificationType: "id_card",
                verificationStatus: "pending",
                verificationRequestedAt: new Date(),
                // Clear any previous rejection
                verificationRejectedReason: null,
            },
        });

        // ── Send confirmation email (fire-and-forget) ──
        sendConfirmationEmail(user.email, user.name).catch((err) =>
            console.error("[submit-verification] Email failed:", err.message),
        );

        return successResponse({
            message:
                "Verification submitted successfully. We will review your ID within 24 hours.",
            collegeIdUrl,
            verificationStatus: "pending",
        });
    } catch (error) {
        console.error("[submit-verification] Error:", error);
        return errorResponse(error);
    }
}

/**
 * Sends a confirmation email after ID card submission
 */
async function sendConfirmationEmail(email, name) {
    const transporter = getTransporter();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;border:1px solid #1e1e1e;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#0d9f4f 0%,#16a34a 50%,#15803d 100%);padding:24px 32px;text-align:center;">
            <span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Campus<span style="color:#bbf7d0;">X</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#f5f5f5;">
              We've received your college ID, ${name || "Student"}! 🎉
            </h1>
            <p style="margin:0 0 20px;font-size:14px;color:#a3a3a3;line-height:1.6;">
              Your verification request is now <strong style="color:#facc15;">under review</strong>.
              Our team will verify your ID within <strong style="color:#a3a3a3;">24 hours</strong>.
            </p>
            <div style="background:#1a1a1a;border-radius:12px;padding:16px;border:1px solid #262626;">
              <p style="margin:0;font-size:13px;color:#737373;">What happens next?</p>
              <ul style="margin:12px 0 0;padding-left:18px;font-size:13px;color:#a3a3a3;line-height:1.8;">
                <li>We'll verify your college ID card</li>
                <li>You'll receive an email with the result</li>
                <li>If approved, you'll get the <span style="color:#22c55e;font-weight:600;">✓ Verified Student</span> badge</li>
              </ul>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #1e1e1e;text-align:center;">
            <p style="margin:0;font-size:12px;color:#525252;">
              &copy; ${new Date().getFullYear()} CampusZen &middot; Built for students, by students.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"CampusZen" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "📋 Verification received — we're reviewing your ID",
        html,
    });
}
