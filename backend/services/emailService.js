/**
 * tDIL Email Notification Service
 * Uses Resend SDK (primary) or nodemailer SMTP (fallback).
 */

const TDIL_BRAND_COLOR = '#016a91';
const APP_URL = process.env.APP_URL || 'https://tdilapp.com';
const FROM_NAME = 'tDIL Community';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@tdilapp.com';

// ── HTML email wrapper ────────────────────────────────────────────────────────
function wrapEmail(title, bodyHtml, ctaText, ctaUrl) {
  const cta = ctaText && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:${TDIL_BRAND_COLOR};color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${ctaText}</a>`
    : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:${TDIL_BRAND_COLOR};padding:24px 32px;text-align:center">
          <span style="color:white;font-size:26px;font-weight:800;letter-spacing:-0.5px">tDIL</span>
          <span style="color:rgba(255,255,255,.7);font-size:13px;display:block;margin-top:2px">Today's Diverse Inclusive Leader</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;color:#1f2937">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827">${title}</h1>
          ${bodyHtml}
          ${cta}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">
            You're receiving this because you're a member of <a href="${APP_URL}" style="color:${TDIL_BRAND_COLOR}">tDIL</a>.
            <br/>© ${new Date().getFullYear()} tDIL — <a href="${APP_URL}/settings" style="color:${TDIL_BRAND_COLOR}">Manage notifications</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Core send function — Resend SDK → nodemailer SMTP fallback ────────────────
async function sendEmail({ to, subject, html }) {

  // 1. Resend SDK (primary — uses HTTP API, no port issues)
  if (process.env.RESEND_API_KEY || process.env.SMTP_PASS) {
    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    try {
      const { Resend } = require('resend');
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        html
      });
      if (error) {
        console.error('[EMAIL] Resend error:', error.message || JSON.stringify(error));
        return false;
      }
      console.log(`[EMAIL] Sent via Resend to ${to}: "${subject}"`);
      return true;
    } catch (err) {
      console.error('[EMAIL] Resend SDK error:', err.message);
      return false;
    }
  }

  // 2. Nodemailer SMTP fallback (Gmail, etc.)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await t.sendMail({ from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`, to, subject, html });
      return true;
    } catch (err) {
      console.error('[EMAIL] SMTP error:', err.message);
      return false;
    }
  }

  console.log(`[EMAIL] Would send to ${to}: "${subject}" (no credentials configured)`);
  return false;
}

// ── Specific notification functions ──────────────────────────────────────────

/** Welcome email on new registration */
async function sendWelcomeEmail({ toEmail, firstName }) {
  const html = `
    <p style="font-size:16px;color:#374151">Hi <strong>${firstName}</strong>! 👋</p>
    <p>Welcome to <strong>tDIL</strong> — Today's Diverse Inclusive Leader community. We're thrilled to have you here.</p>
    <p>Here's what you can do to get started:</p>
    <ul style="padding-left:20px;color:#374151;line-height:1.8">
      <li>Complete your <strong>profile</strong> to help others connect with you</li>
      <li>Join your <strong>cohort chat</strong> and discover groups</li>
      <li>Check out the <strong>job board</strong> and upcoming <strong>events</strong></li>
      <li><strong>Check in</strong> at partner locations to earn points</li>
    </ul>
    <p>Every action earns you points toward your level. Let's grow together!</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: `Welcome to tDIL, ${firstName}! 🎉`,
    html: wrapEmail(`Welcome, ${firstName}!`, html, 'Go to Dashboard', `${APP_URL}/dashboard`)
  });
}

/** New connection notification */
async function sendConnectionEmail({ toEmail, toName, fromName, fromId }) {
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p><strong>${fromName}</strong> just connected with you on tDIL! You've both earned connection points.</p>
    <p>View their profile to learn more about them and start a direct message.</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: `${fromName} connected with you on tDIL!`,
    html: wrapEmail('New Connection! 🤝', html, 'View Profile', `${APP_URL}/profile/${fromId}`)
  });
}

/** New direct message notification */
async function sendDirectMessageEmail({ toEmail, toName, fromName, preview }) {
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p><strong>${fromName}</strong> sent you a message on tDIL:</p>
    <blockquote style="border-left:4px solid ${TDIL_BRAND_COLOR};margin:12px 0;padding:10px 16px;background:#f0f9ff;border-radius:0 8px 8px 0;color:#374151;font-style:italic">
      "${preview?.slice(0, 120)}${preview?.length > 120 ? '…' : ''}"
    </blockquote>
    <p>Reply directly in the tDIL app.</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: `New message from ${fromName}`,
    html: wrapEmail('You have a new message 💬', html, 'View Message', `${APP_URL}/chats`)
  });
}

/** Check-in confirmation */
async function sendCheckinEmail({ toEmail, toName, venue, pointsAwarded, totalPoints }) {
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>✅ You just checked in at <strong>${venue}</strong>!</p>
    <table style="width:100%;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin:16px 0">
      <tr style="background:#f9fafb">
        <td style="padding:12px 16px;color:#6b7280;font-size:14px">Points earned</td>
        <td style="padding:12px 16px;font-weight:700;color:${TDIL_BRAND_COLOR};font-size:16px">+${pointsAwarded} pts</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#6b7280;font-size:14px">Total points</td>
        <td style="padding:12px 16px;font-weight:700;color:#374151;font-size:16px">${totalPoints?.toLocaleString()} pts</td>
      </tr>
    </table>
    <p>Keep checking in to level up and climb the leaderboard!</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: `Check-in confirmed at ${venue} (+${pointsAwarded} pts)`,
    html: wrapEmail('Check-In Confirmed! 📍', html, 'View Your Progress', `${APP_URL}/dashboard`)
  });
}

/** Event registration confirmation */
async function sendEventRegistrationEmail({ toEmail, toName, eventTitle, eventDate, eventLocation, pointsAwarded }) {
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>You're registered for <strong>${eventTitle}</strong>! We'll see you there.</p>
    <table style="width:100%;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin:16px 0">
      <tr style="background:#f9fafb">
        <td style="padding:12px 16px;color:#6b7280;font-size:14px">📅 Date</td>
        <td style="padding:12px 16px;font-weight:600;color:#374151">${dateStr}</td>
      </tr>
      ${eventLocation ? `<tr><td style="padding:12px 16px;color:#6b7280;font-size:14px">📍 Location</td><td style="padding:12px 16px;font-weight:600;color:#374151">${eventLocation}</td></tr>` : ''}
      ${pointsAwarded ? `<tr style="background:#f9fafb"><td style="padding:12px 16px;color:#6b7280;font-size:14px">⭐ Points</td><td style="padding:12px 16px;font-weight:700;color:${TDIL_BRAND_COLOR}">+${pointsAwarded} pts on attendance</td></tr>` : ''}
    </table>
  `;
  return sendEmail({
    to: toEmail,
    subject: `You're registered: ${eventTitle}`,
    html: wrapEmail('Event Registration Confirmed 🎟️', html, 'View All Events', `${APP_URL}/events`)
  });
}

/** Points milestone notification */
async function sendPointsMilestoneEmail({ toEmail, toName, points, level }) {
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>🎉 Congratulations! You just reached <strong>Level ${level}</strong> on tDIL!</p>
    <div style="text-align:center;padding:24px;background:linear-gradient(135deg,${TDIL_BRAND_COLOR},#1e40af);border-radius:12px;margin:16px 0;color:white">
      <div style="font-size:48px">⭐</div>
      <div style="font-size:32px;font-weight:800;margin-top:8px">Level ${level}</div>
      <div style="font-size:16px;opacity:0.9;margin-top:4px">${points?.toLocaleString()} total points</div>
    </div>
    <p>Keep connecting, checking in, and attending events to earn more points!</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: `🎉 You reached Level ${level} on tDIL!`,
    html: wrapEmail(`Level ${level} Achieved!`, html, 'View Leaderboard', `${APP_URL}/leaderboard`)
  });
}

/** Password reset email */
async function sendPasswordResetEmail({ toEmail, toName, resetToken }) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>We received a request to reset your tDIL password. Click the button below to set a new password. This link expires in 1 hour.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;
  return sendEmail({
    to: toEmail,
    subject: 'Reset your tDIL password',
    html: wrapEmail('Password Reset Request 🔐', html, 'Reset Password', resetUrl)
  });
}

/** Announcement notification (sent to all members) */
async function sendAnnouncementEmail({ toEmail, toName, title, content, category }) {
  const icon = category === 'event' ? '📅' : category === 'job' ? '💼' : category === 'important' ? '⚠️' : '📢';
  const html = `
    <p>Hi <strong>${toName}</strong>,</p>
    <p>${icon} A new announcement has been posted to the tDIL community:</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:16px 0">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${title}</h2>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${content?.slice(0, 300)}${content?.length > 300 ? '…' : ''}</p>
    </div>
  `;
  return sendEmail({
    to: toEmail,
    subject: `${icon} tDIL Announcement: ${title}`,
    html: wrapEmail('Community Announcement', html, 'Read More', `${APP_URL}/announcements`)
  });
}

module.exports = {
  sendWelcomeEmail,
  sendConnectionEmail,
  sendDirectMessageEmail,
  sendCheckinEmail,
  sendEventRegistrationEmail,
  sendPointsMilestoneEmail,
  sendPasswordResetEmail,
  sendAnnouncementEmail
};
