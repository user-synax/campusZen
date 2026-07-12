import { getTransporter } from './mailer'

/**
 * Generate a cryptographically-random 6-digit OTP
 */
export function generateOTP() {
  // crypto.getRandomValues available in Node 19+ / Edge runtimes
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1000000).padStart(6, '0')
}

/**
 * Build a branded HTML email for the OTP
 */
function buildOtpEmail(otp, purpose) {
  const isDanger = purpose === 'account_delete'
  const isEmailChange = purpose === 'email_change'

  const heading =
    purpose === 'signup'
      ? 'Verify your email to join CampusZen'
      : purpose === 'forgot_password'
        ? 'Reset your password'
        : purpose === 'account_delete'
          ? 'CRITICAL: Delete Account'
          : isEmailChange
            ? 'Change Email Address'
            : 'Verify your college identity'

  const subtext =
    purpose === 'signup'
      ? 'Thanks for signing up! Enter this code to complete your registration.'
      : purpose === 'forgot_password'
        ? 'Enter this code to reset your CampusZen account password.'
        : purpose === 'account_delete'
          ? 'Someone (hopefully you) is trying to permanently delete this CampusZen account. This action cannot be undone.'
          : isEmailChange
            ? 'Enter this code to verify your new email address on CampusZen.'
            : 'Enter this code to verify your college email address on CampusZen.'

  const primaryColor = isDanger ? '#ef4444' : '#22c55e'
  const headerGradient = isDanger
    ? 'linear-gradient(135deg,#991b1b 0%,#ef4444 50%,#b91c1c 100%)'
    : 'linear-gradient(135deg,#0d9f4f 0%,#16a34a 50%,#15803d 100%)'

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;border:1px solid #1e1e1e;overflow:hidden;">

        <!-- Header bar -->
        <tr>
          <td style="background:${headerGradient};padding:28px 32px;text-align:center;">
            <span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Campus<span style="color:${isDanger ? '#fecaca' : '#bbf7d0'};">Zen</span></span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 12px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${isDanger ? '#f87171' : '#f5f5f5'};">${heading}</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#a3a3a3;line-height:1.6;">${subtext}</p>

            <!-- OTP box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <div style="background:#1a1a1a;border:1.5px dashed ${primaryColor};border-radius:12px;padding:20px 0;text-align:center;width:260px;margin:0 auto;">
                  <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:${primaryColor};font-family:'Courier New',monospace;">${otp}</span>
                </div>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#737373;line-height:1.5;text-align:center;">
              This code expires in <strong style="color:#a3a3a3;">10 minutes</strong>.<br/>
              If you didn't request this, <strong>${isDanger ? 'secure your account immediately' : 'you can safely ignore this email'}</strong>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #1e1e1e;text-align:center;">
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
}

/**
 * Send the OTP email using the existing Nodemailer transporter
 */
export async function sendOtpEmail(email, otp, purpose = 'verification') {
  const transporter = getTransporter()

  const subject =
    purpose === 'signup'
      ? `${otp} is your CampusZen signup code`
      : purpose === 'forgot_password'
        ? `${otp} — Reset your CampusZen password`
        : purpose === 'account_delete'
          ? `CRITICAL: ${otp} is your account deletion code`
          : purpose === 'email_change'
            ? `${otp} — Verify your new email address`
            : `${otp} — Verify your college email on CampusZen`

  await transporter.sendMail({
    from: `"CampusZen Security" <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html: buildOtpEmail(otp, purpose),
  })
}

/**
 * Send confirmation email after successful password reset
 */
export async function sendPasswordResetSuccessEmail(email) {
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
          <td style="background:linear-gradient(135deg,#0d9f4f 0%,#16a34a 50%,#15803d 100%);padding:24px;text-align:center;">
            <span style="font-size:24px;font-weight:800;color:#fff;">CampusZen</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;text-align:center;">
            <div style="background:#22c55e/10;width:64px;height:64px;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-center;border:2px solid #22c55e;">
               <span style="font-size:32px;line-height:64px;">✅</span>
            </div>
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f5f5f5;">Password Changed</h1>
            <p style="margin:0;font-size:14px;color:#a3a3a3;line-height:1.6;">
              Your account password has been changed successfully. If you did not make this change, please contact support immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #1e1e1e;text-align:center;">
            <p style="margin:0;font-size:12px;color:#525252;">&copy; ${new Date().getFullYear()} CampusZen</p>
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
    subject: 'Your password was changed successfully',
    html,
  })
}
