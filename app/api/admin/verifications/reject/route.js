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

    const { userId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A rejection reason is required (at least 5 characters)' },
        { status: 400 }
      )
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Reject the verification
    user.isVerified = false
    user.verificationStatus = 'rejected'
    user.verificationRejectedReason = reason.trim()
    await user.save()

    // Send rejection email (fire-and-forget)
    sendRejectionEmail(user.email, user.name, reason.trim()).catch((err) =>
      console.error('[reject-verification] Email failed:', err.message)
    )

    return NextResponse.json({
      success: true,
      message: `${user.name}'s verification has been rejected`,
    })
  } catch (error) {
    console.error('[AdminVerifyReject] Error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function sendRejectionEmail(email, name, reason) {
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
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#f5f5f5;">
              Verification Update, ${name || 'Student'}
            </h1>
            <p style="margin:0 0 16px;font-size:14px;color:#a3a3a3;line-height:1.6;">
              Unfortunately, we couldn't verify your student ID this time.
            </p>
            <div style="background:#1a1a1a;border-radius:12px;padding:16px;border:1px solid #ef444430;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#f87171;">Reason:</p>
              <p style="margin:0;font-size:13px;color:#a3a3a3;line-height:1.5;">${reason}</p>
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:#737373;line-height:1.5;">
              You can try again by uploading a clearer photo of your college ID card.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-student" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;">
              Resubmit Verification
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
    subject: '📋 Verification update — additional information needed',
    html,
  })
}
