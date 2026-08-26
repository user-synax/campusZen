import { getTransporter } from './mailer'
import User from '@/models/User'
import connectDB from './db'

// Suspicious/temp email domains — flag but don't block
const TEMP_MAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'fakeinbox.com', 'sharklasers.com', 'trashmail.com',
  '10minutemail.com', 'disposablemail.com', 'getairmail.com', 'spamgourmet.com'
]

function isSuspiciousEmail(email) {
  if (!email || !email.includes('@')) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return TEMP_MAIL_DOMAINS.includes(domain)
}

// Format date in IST — "14 Jan 2025, 11:42:08 PM IST"
function formatIST(date) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Unknown time'
  
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST'
}

// Sanitize text for safe HTML rendering
function sanitizeForHTML(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ━━━ MAIN FUNCTION ━━━ //
// Call this after user creation — NO await in signup route
export async function notifyAdminNewUser(user) {
  // Guard: skip silently if env not configured
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS || !process.env.ADMIN_NOTIFY_EMAIL) {
    console.warn('[AdminNotify] Skipping — email env vars not set')
    return
  }

  try {
    await connectDB()
    
    // Total users count — shows growth context
    const totalUsers = await User.countDocuments().catch(() => null)
    const isSuspicious = isSuspiciousEmail(user.email)
    const joinedAt = formatIST(user.createdAt || new Date())
    const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile/${user.username}`
    const isMilestone = totalUsers && totalUsers % 50 === 0

    // Sanitize all user fields before putting in HTML
    const safeName = sanitizeForHTML(user.name)
    const safeUsername = sanitizeForHTML(user.username)
    const safeEmail = sanitizeForHTML(user.email)
    const safeCollege = sanitizeForHTML(user.college) || null

    const mailer = getTransporter()
    
    await mailer.sendMail({
      from: `"CampusZen 🎓" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: isMilestone 
        ? `🎯 Milestone! User #${totalUsers}: ${safeName} joined CampusZen` 
        : `🎓 New user #${totalUsers || '?'}: ${safeName} (@${safeUsername})`,
      html: buildEmailHTML({
        safeName, safeUsername, safeEmail, safeCollege,
        joinedAt, totalUsers, isSuspicious, isMilestone, profileUrl
      })
    })

    console.log(`[AdminNotify] ✅ Sent for @${user.username} (Total: ${totalUsers})`)
  } catch (error) {
    // NEVER rethrow — signup must not fail
    console.error('[AdminNotify] ❌ Failed:', error.message)
  }
}

// ━━━ EMAIL TEMPLATE ━━━
function buildEmailHTML({ safeName, safeUsername, safeEmail, safeCollege, joinedAt, totalUsers, isSuspicious, isMilestone, profileUrl }) {
  const suspiciousBanner = isSuspicious ? `
    <div style="background: #450a0a; border: 1px solid #dc2626; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 16px; flex-shrink: 0;">⚠️</span>
      <div>
        <p style="margin: 0; color: #fca5a5; font-size: 13px; font-weight: 700;">Suspicious Email Domain Detected</p>
        <p style="margin: 4px 0 0; color: #f87171; font-size: 12px;">This looks like a temporary or fake email address. Review this account manually if needed.</p>
      </div>
    </div>
  ` : ''

  const milestoneBanner = isMilestone ? `
    <div style="background: #1c1400; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; color: #fcd34d; font-size: 15px; font-weight: 800;">🎯 Milestone Unlocked — ${totalUsers} Users!</p>
      <p style="margin: 4px 0 0; color: #d97706; font-size: 12px;">CampusZen is growing. Keep building! 🚀</p>
    </div>
  ` : ''

  const collegeBadge = safeCollege ? 
    `<span style="background: #0f172a; color: #7dd3fc; border: 1px solid #1e3a5f; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">🎓 ${safeCollege}</span>` : 
    `<span style="background: #111; color: #555; border: 1px solid #222; padding: 4px 12px; border-radius: 999px; font-size: 12px;">No college set</span>`

  // Table row helper
  const row = (label, value, extraStyle = '') => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #1c1c1c; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; width: 35%; vertical-align: top;">${label}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #1c1c1c; color: #d1d5db; font-size: 14px; text-align: right; ${extraStyle}">${value}</td>
    </tr>
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New User — CampusZen</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; padding: 32px 16px;">
        <!-- ══ CARD ══ -->
        <div style="background: #0f0f0f; border: 1px solid #1f1f1f; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #111 0%, #0f0f0f 100%); border-bottom: 1px solid #1a1a1a; padding: 24px 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <span style="font-size: 20px; font-weight: 900; color: #f0f0f0; letter-spacing: -0.5px;">CampusZen</span>
              <span style="background: #1a1000; color: #f59e0b; border: 1px solid #f59e0b30; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">ADMIN</span>
            </div>
            <h1 style="margin: 0 0 6px; color: #f0f0f0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">🎉 New user joined!</h1>
            <p style="margin: 0; color: #555; font-size: 13px;">
              ${totalUsers ? `You now have <strong style="color: #888;">${totalUsers}</strong> users on CampusZen` : 'A new user has registered'}
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 28px;">
            ${suspiciousBanner}
            ${milestoneBanner}

            <!-- User identity -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                <span style="color: #f0f0f0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${safeName}</span>
                <span style="color: #444; font-size: 15px; font-family: 'Courier New', monospace;">@${safeUsername}</span>
              </div>
              ${collegeBadge}
            </div>

            <!-- Details table -->
            <table style="width: 100%; border-collapse: collapse;">
              ${row('Name', `<strong style="color: #f0f0f0;">${safeName}</strong>`)}
              ${row('Username', `<span style="font-family: 'Courier New', monospace;">@${safeUsername}</span>`)}
              ${row('Email', `${safeEmail}${isSuspicious ? ' <span style="color: #ef4444; font-size: 11px;">⚠️</span>' : ''}`)}
              ${row('College', safeCollege || '<span style="color: #444;">—</span>')}
              <tr>
                <td style="padding: 12px 0; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; width: 35%;">Joined At</td>
                <td style="padding: 12px 0; color: #d1d5db; font-size: 13px; text-align: right;">${joinedAt}</td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="padding: 20px 28px 28px; border-top: 1px solid #1a1a1a;">
            <a href="${profileUrl}" style="display: block; text-align: center; background: #f0f0f0; color: #0f0f0f; padding: 13px 24px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.2px;">
              View Profile →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align: center; color: #2a2a2a; font-size: 11px; margin-top: 20px;">Only you receive this · CampusZen Admin Alerts</p>
      </div>
    </body>
    </html>
  `
}
