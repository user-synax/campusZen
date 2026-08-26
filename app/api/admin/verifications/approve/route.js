import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { getTransporter } from '@/lib/mailer'

export async function POST(request) {
  try {
    await connectDB()
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.verificationStatus === 'verified') {
      return NextResponse.json({ error: 'User is already verified' }, { status: 400 })
    }

    // Approve the user
    user.isVerified = true
    user.verificationStatus = 'verified'
    user.verificationType = user.verificationType || 'id_card'
    user.verificationApprovedAt = new Date()
    user.verificationRejectedReason = null
    await user.save()

    // Send approval email (fire-and-forget)
    sendApprovalEmail(user.email, user.name).catch((err) =>
      console.error('[approve-verification] Email failed:', err.message)
    )

    return NextResponse.json({
      success: true,
      message: `${user.name} has been verified`,
    })
  } catch (error) {
    console.error('[AdminVerifyApprove] Error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function sendApprovalEmail(email, name) {
  const transporter = getTransporter()
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
            <span style="font-size:24px;font-weight:800;color:#fff;">Campus<span style="color:#bbf7d0;">X</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;text-align:center;">
            <div style="width:64px;height:64px;border-radius:50%;background:#22c55e20;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">✅</span>
            </div>
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f5f5f5;">
              You're verified, ${name || 'Student'}! 🎉
            </h1>
            <p style="margin:0 0 20px;font-size:14px;color:#a3a3a3;line-height:1.6;">
              Your student status has been confirmed. You now have the
              <span style="color:#22c55e;font-weight:600;">✓ Verified Student</span> badge
              on your profile.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/feed" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
              Open CampusZen
            </a>
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
</html>`

  await transporter.sendMail({
    from: `"CampusZen" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '✅ You\'re now a Verified Student on CampusZen!',
    html,
  })
}
