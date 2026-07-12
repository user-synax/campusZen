import { getTransporter } from './mailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://campuszen.in'

function parseUserAgent(userAgent = '') {
  const device = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'Mobile'
    : /Tablet|iPad/i.test(userAgent) ? 'Tablet'
      : 'Desktop'

  let browser = 'Unknown'
  if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) browser = 'Chrome'
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox'
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari'
  else if (/Edge|Edg/i.test(userAgent)) browser = 'Edge'
  else if (/Brave/i.test(userAgent)) browser = 'Brave'

  return { device, browser }
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(date))
}

export async function sendSuspiciousLoginEmail(user, loginData) {
  const { device, browser } = parseUserAgent(loginData.userAgent)
  const time = formatDate(loginData.createdAt)
  const ip = loginData.ipAddress || 'Unknown'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #27272a; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">CampusZen</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #fafafa; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
                New login to your account 🔐
              </h2>
              
              <p style="color: #a1a1aa; margin: 0 0 25px 0; font-size: 15px; line-height: 1.6;">
                We noticed a new login to your CampusZen account from a device you haven't used before.
              </p>
              
              <!-- Login Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #71717a; font-size: 13px;">Device</span>
                    <p style="color: #fafafa; margin: 4px 0 12px 0; font-size: 15px; font-weight: 500;">
                      ${browser} on ${device}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #3f3f46;">
                    <span style="color: #71717a; font-size: 13px;">Time</span>
                    <p style="color: #fafafa; margin: 4px 0 12px 0; font-size: 15px; font-weight: 500;">
                      ${time}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #3f3f46;">
                    <span style="color: #71717a; font-size: 13px;">IP Address</span>
                    <p style="color: #fafafa; margin: 4px 0 0 0; font-size: 15px; font-weight: 500;">
                      ${ip}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #f87171; margin: 0 0 25px 0; font-size: 14px; font-weight: 500;">
                If this wasn't you, we recommend changing your password immediately.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/settings" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 28px; border-radius: 100px; font-size: 15px; font-weight: 600; text-decoration: none;">
                      Change Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #52525b; margin: 25px 0 0 0; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${APP_URL}/settings" style="color: #22c55e;">${APP_URL}/settings</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 20px; text-align: center; border-top: 1px solid #3f3f46;">
              <p style="color: #52525b; margin: 0; font-size: 12px;">
                © 2026 CampusZen · Built for students
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `New login to your CampusZen account

We noticed a new login from:
- Device: ${browser} on ${device}
- Time: ${time}
- IP: ${ip}

If this wasn't you, change your password immediately: ${APP_URL}/settings`

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"CampusZen" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'New login to your CampusZen account 🔐',
      text,
      html
    })
    return true
  } catch (error) {
    console.error('[Email] Failed to send suspicious login alert:', error.message)
    return false
  }
}