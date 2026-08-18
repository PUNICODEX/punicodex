const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@punicodex.com';
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'support@punicodex.com';
const PLATFORM_URL = process.env.PLATFORM_URL || 'https://punicodex.com';

// Provisions the sponsor's sandbox account (find-or-create by email, link
// their bookings) and returns the best panel URL: a one-time set-password
// link for a new account, the plain login page for an established one.
// Never throws — the email must send even if provisioning hiccups.
async function sandboxPanelUrl(email) {
  try {
    const { provisionTenantAccount } = require('./tenant-portal');
    const { token } = await provisionTenantAccount(email);
    if (token) return `${PLATFORM_URL}/account/login/?token=${encodeURIComponent(token)}`;
  } catch (err) {
    console.error('[EMAIL] sandbox provisioning failed:', err.message);
  }
  return `${PLATFORM_URL}/account/login/`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, html, text, fromName, headers }) {
  if (!RESEND_API_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY configured. Would send:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    return { success: true, mocked: true };
  }

  // Display names are quoted per RFC 5322 and stripped of characters that
  // could break out of the quoted string (header-injection guard).
  const displayName = String(fromName || 'PuniCodex')
    .replace(/["\\\r\n]/g, '')
    .slice(0, 80);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `"${displayName}" <${FROM_EMAIL}>`,
        to: [to],
        reply_to: REPLY_TO_EMAIL,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        ...(headers && typeof headers === 'object' ? { headers } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[EMAIL] Resend error:', err);
      return { success: false, error: err };
    }

    const data = await res.json();
    console.log('[EMAIL] Sent to', to, '-', subject);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[EMAIL] Failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Normalize a caller-supplied site slug. Returns null when no slug is
 * knowable so callers can fall back loudly instead of silently linking a
 * customer to the wrong temple.
 */
function resolveSiteSlug(siteSlug) {
  return typeof siteSlug === 'string' && siteSlug.trim() ? siteSlug.trim() : null;
}

// Lazily-loaded map of lexicon id → Unicode restoration (the temple display
// name). Loaded on first use so the mail module stays cheap on cold start.
let siteNameCache = null;
function getSiteDisplayName(siteSlug) {
  const slug = resolveSiteSlug(siteSlug);
  if (!slug) return 'PuniCodex';
  try {
    if (!siteNameCache) {
      const { LEXICON } = require('../../type/js/lexicon.js');
      siteNameCache = new Map(LEXICON.map((entry) => [entry.id, entry.unicode]));
    }
    const name = siteNameCache.get(slug);
    if (name) return name;
  } catch {
    /* lexicon unavailable — fall through to the raw slug */
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function getDashboardUrl(token, siteSlug) {
  const slug = resolveSiteSlug(siteSlug);
  if (!slug) {
    // Last-resort fallback: the account index, never a wrong temple (a wrong
    // temple in a customer email is worse than a generic page).
    console.warn('[EMAIL] dashboard link built without a site slug — falling back to /account/');
    return `${PLATFORM_URL}/account/?token=${token}`;
  }
  return `${PLATFORM_URL}/sites/${slug}/dashboard/?token=${token}`;
}

async function notifyPaymentPending({ email, slotName, companyName, stripeUrl, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Complete your reservation for ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Reservation Pending</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your reservation for <strong>${escapeHtml(slotName)}</strong> is waiting for payment.</p>
        <p><a href="${escapeHtml(stripeUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Complete Payment</a></p>
        <p style="color:#666;font-size:13px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function notifyUploadReady({
  email,
  slotName,
  companyName,
  bookingToken,
  leaseMonths = 1,
  siteSlug,
}) {
  const duration = leaseMonths === 12 ? '12 months' : '1 month';
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Upload your creative for ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Payment Received</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Thank you for your payment for <strong>${escapeHtml(slotName)}</strong> (${escapeHtml(duration)}).</p>
        <p>Now it's time to upload your creative:</p>
        <p><a href="${escapeHtml(getDashboardUrl(bookingToken, siteSlug))}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Upload Creative</a></p>
      </div>
    `,
  });
}

async function notifyAdminPending({ slotName, companyName, bookingId, siteSlug }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: true, skipped: true };
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: adminEmail,
    subject: `New creative pending approval — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} Admin — Approval Needed</h2>
        <p><strong>${escapeHtml(companyName || 'A new advertiser')}</strong> submitted a creative for <strong>${escapeHtml(slotName)}</strong>.</p>
        <p>Booking ID: <code>${escapeHtml(bookingId)}</code></p>
        <p><a href="${escapeHtml(`${PLATFORM_URL}/admin-bookings.html`)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Review in Admin Panel</a></p>
      </div>
    `,
  });
}

async function notifyAdminApplication({
  slotName,
  companyName,
  bookingId,
  applicationNote,
  siteSlug,
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: true, skipped: true };
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: adminEmail,
    subject: `New application — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} Admin — Application Pending</h2>
        <p><strong>${escapeHtml(companyName || 'A new advertiser')}</strong> applied for <strong>${escapeHtml(slotName)}</strong>.</p>
        ${applicationNote ? `<p><strong>Note:</strong> ${escapeHtml(applicationNote)}</p>` : ''}
        <p>Booking ID: <code>${escapeHtml(bookingId)}</code></p>
        <p><a href="${escapeHtml(`${PLATFORM_URL}/admin-bookings.html`)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Review Application</a></p>
      </div>
    `,
  });
}

async function notifyApplicationApproved({ email, slotName, companyName, stripeUrl, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Your application for ${slotName} is approved`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Application Approved</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your application for <strong>${escapeHtml(slotName)}</strong> has been approved.</p>
        <p>Complete payment to secure the placement:</p>
        <p><a href="${escapeHtml(stripeUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Pay Now</a></p>
      </div>
    `,
  });
}

async function notifyApproved({ email, slotName, companyName, bookingToken, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  // Approval no longer publishes — the sponsor flips the switch from their
  // panel (POST /api/account/bookings/:id/publish/), so say so explicitly.
  const panelUrl = `${PLATFORM_URL}/account/`;
  return sendEmail({
    to: email,
    subject: `Your ad for ${slotName} is approved`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Creative Approved</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your creative for <strong>${escapeHtml(slotName)}</strong> has been approved.</p>
        <p>Nothing appears on the temple until you publish — sign in to <a href="${escapeHtml(panelUrl)}" style="color:#d4af37;font-weight:600;text-decoration:none;">your advertiser panel</a> and press <strong>Publish</strong> when you're ready.</p>
        <p><a href="${escapeHtml(getDashboardUrl(bookingToken, siteSlug))}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
      </div>
    `,
    text: `Your creative for ${slotName} has been approved. Nothing appears on the temple until you publish — sign in to your advertiser panel and press Publish when you're ready: ${panelUrl}`,
  });
}

async function notifyRejected({ email, slotName, companyName, note, bookingToken, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Your creative needs changes — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Creative Needs Changes</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your creative for <strong>${escapeHtml(slotName)}</strong> was not approved.</p>
        <p><strong>Reason:</strong> ${escapeHtml(note || 'Does not meet our guidelines.')}</p>
        <p>You can upload a revised version here:</p>
        <p><a href="${escapeHtml(getDashboardUrl(bookingToken, siteSlug))}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Re-upload Creative</a></p>
      </div>
    `,
  });
}

/**
 * Panel-ready confirmation: fired when a sponsor sets their password from the
 * one-time provisioned link, so they always hold the permanent panel URL.
 */
async function notifyPanelReady({ email, companyName }) {
  return sendEmail({
    to: email,
    subject: 'Your PuniCodex advertiser panel is ready',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Your Advertiser Panel Is Ready</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your password is set and your advertiser panel is ready whenever you need it — creatives, placements, analytics, and support, all in one place.</p>
        <p><a href="${PLATFORM_URL}/account/login/" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Sign in to your panel</a></p>
        <p style="color:#666;font-size:0.8rem;">Bookmark this link — it's your permanent way back in. PuniCodex · support@punicodex.com</p>
      </div>
    `,
    text: `Your advertiser panel is ready. Sign in anytime: ${PLATFORM_URL}/account/login/ — PuniCodex`,
  });
}

/**
 * Revocation notice: a lease was ended by the operator (revoked, lapsed, or
 * canceled for cause). The placement stops displaying immediately; the
 * stored creative is purged after a 30-day grace period.
 */
async function notifyRevoked({ email, slotName, companyName, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Your placement has ended — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Placement Ended</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your placement on <strong>${escapeHtml(slotName)}</strong> has ended. It stops displaying immediately, and the slot returns to the temple's open inventory.</p>
        <p>Your stored creative is kept for 30 days in case you re-lease the space, then permanently removed. Any active billing has been canceled — nothing further will be charged.</p>
        <p>Questions, or think this is a mistake? Reply to this email and a human will look into it.</p>
        <p style="color:#666;font-size:0.8rem;">PuniCodex · support@punicodex.com</p>
      </div>
    `,
  });
}

async function notifyLive({
  email,
  slotName,
  companyName,
  bookingToken,
  leaseMonths = 1,
  siteSlug,
}) {
  const duration = leaseMonths === 12 ? '12 months' : '1 month';
  const siteName = getSiteDisplayName(siteSlug);
  return sendEmail({
    to: email,
    subject: `Your ad is now live on ${siteName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — You're Live!</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your ad on <strong>${escapeHtml(slotName)}</strong> is now live on ${escapeHtml(siteName)} for <strong>${escapeHtml(duration)}</strong>.</p>
        <p>Track performance in your dashboard:</p>
        <p><a href="${escapeHtml(getDashboardUrl(bookingToken, siteSlug))}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Open Analytics Dashboard</a></p>
      </div>
    `,
  });
}

async function sendDashboardLinks({ email, bookings }) {
  // Brand the email after the temple when every booking belongs to the same
  // one; mixed-temple inboxes get the neutral PuniCodex branding.
  const slugs = [...new Set(bookings.map((b) => resolveSiteSlug(b.site_slug)).filter(Boolean))];
  const brand = slugs.length === 1 ? getSiteDisplayName(slugs[0]) : 'PuniCodex';
  const rows = bookings
    .map(
      (b) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;font-weight:600;">${escapeHtml(b.slot_name)}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-transform:uppercase;font-size:0.8rem;">${escapeHtml(b.status.replace(/_/g, ' '))}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;">
        <a href="${escapeHtml(getDashboardUrl(b.analytics_token, b.site_slug))}" style="color:#d4af37;font-weight:600;text-decoration:none;">Dashboard &rarr;</a>
      </td>
    </tr>
  `
    )
    .join('');

  return sendEmail({
    to: email,
    subject: `Your ${brand} dashboard links`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(brand)} — Your Bookings</h2>
        <p>Here are all your reservations:</p>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Slot</th>
              <th style="padding:12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
              <th style="padding:12px;text-align:left;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">Link</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#666;font-size:0.8rem;">Keep these links safe. Anyone with the link can manage your creative.</p>
      </div>
    `,
  });
}

async function sendVerificationCode({ email, code }) {
  return sendEmail({
    to: email,
    subject: `Your PuniCodex verification code`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex — Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background:#f8f8f8;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <span style="font-family:monospace;font-size:2rem;font-weight:700;letter-spacing:0.2em;color:#111;">${escapeHtml(code)}</span>
        </div>
        <p style="color:#666;font-size:0.85rem;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendBookingConfirmation({
  email,
  slotName,
  companyName,
  amountCents,
  token,
  customHeading,
  customSubtitle,
  leaseMonths = 1,
  trialMonths = 0,
  siteSlug,
  complimentary = false,
  panelUrlOverride = null,
}) {
  const siteName = getSiteDisplayName(siteSlug);
  const dashboardUrl = getDashboardUrl(token, siteSlug);
  const panelUrl = panelUrlOverride || `${PLATFORM_URL}/account/login/`;
  const durationLabel =
    leaseMonths === 12 ? '12 months' : `${leaseMonths} month${leaseMonths === 1 ? '' : 's'}`;
  const trialLabel = trialMonths > 0 ? `${trialMonths}-month free trial, then ` : '';
  const priceLabel =
    leaseMonths === 12
      ? `$${(amountCents / 100).toFixed(2)}`
      : `$${(amountCents / 100).toFixed(2)}/mo`;
  const trialBadge =
    trialMonths > 0
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0;"><strong>Free trial:</strong> Your first ${escapeHtml(trialMonths)} month${trialMonths > 1 ? 's' : ''} are free. Billing begins after the trial ends.</div>`
      : '';
  const complimentaryBadge = complimentary
    ? `<div style="background:#fdf8e7;border:1px solid #d4af37;border-radius:8px;padding:1rem;margin:1rem 0;"><strong>Complimentary placement:</strong> No card was taken, no billing will ever occur, and nothing renews. The placement runs for ${escapeHtml(durationLabel)} and then ends.</div>`
    : '';
  return sendEmail({
    to: email,
    subject: complimentary
      ? `Your complimentary ${siteName} placement is confirmed`
      : `Your reservation for ${slotName} — Complete your setup`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — ${complimentary ? 'Placement Confirmed' : 'Reservation Confirmed'}</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        ${
          complimentary
            ? `<p>Your placement on <strong>${escapeHtml(slotName)}</strong> is confirmed for <strong>${escapeHtml(durationLabel)}</strong> — complimentary.</p>`
            : `<p>You've reserved <strong>${escapeHtml(slotName)}</strong> for <strong>${escapeHtml(durationLabel)}</strong> at <strong>${escapeHtml(trialLabel)}${escapeHtml(priceLabel)}</strong>.</p>`
        }
        ${complimentaryBadge}
        ${trialBadge}
        ${customHeading ? `<p><strong>Heading:</strong> ${escapeHtml(customHeading)}</p>` : ''}
        ${customSubtitle ? `<p><strong>Subtitle:</strong> ${escapeHtml(customSubtitle)}</p>` : ''}
        <p>Two ways to look after your placement:</p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin:1.5rem 0;">
          <a href="${escapeHtml(panelUrl)}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Open the Advertiser Panel</a>
          <p style="margin:-0.4rem 0 0.4rem;font-size:0.78rem;color:#666;text-align:center;">Change creatives, headings, and destination URLs · detailed analytics · support</p>
          <a href="${escapeHtml(dashboardUrl)}" style="display:block;background:transparent;color:#d4af37;border:2px solid #d4af37;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">View the Analytics Snapshot</a>
          <p style="margin:-0.4rem 0 0;font-size:0.78rem;color:#666;text-align:center;">No sign-in needed — live traffic for this placement, view-only</p>
        </div>
        <p style="color:#666;font-size:0.8rem;">The snapshot link is unique to this placement and view-only — share it freely with your team. Your panel is yours alone.</p>
      </div>
    `,
  });
}

async function notifyTrialStarted({
  email,
  slotName,
  companyName,
  trialMonths,
  trialEndsAt,
  bookingToken,
  siteSlug,
}) {
  const siteName = getSiteDisplayName(siteSlug);
  const dashboardUrl = getDashboardUrl(bookingToken, siteSlug);
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'the end of your trial';
  return sendEmail({
    to: email,
    subject: `Your ${trialMonths}-month free trial for ${slotName} has started`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Trial Started</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your ad on <strong>${escapeHtml(slotName)}</strong> is now live on its <strong>${escapeHtml(trialMonths)}-month free trial</strong>.</p>
        <p>Billing will begin on <strong>${escapeHtml(endDate)}</strong>. We'll send reminders 7 days and 1 day before billing starts.</p>
        <p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
      </div>
    `,
  });
}

async function notifyTrialEnding({
  email,
  slotName,
  companyName,
  daysLeft,
  trialEndsAt,
  bookingToken,
  siteSlug,
}) {
  const siteName = getSiteDisplayName(siteSlug);
  const dashboardUrl = getDashboardUrl(bookingToken, siteSlug);
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'soon';
  return sendEmail({
    to: email,
    subject: `Your ${slotName} free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Trial Ending Soon</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Your free trial for <strong>${escapeHtml(slotName)}</strong> ends on <strong>${escapeHtml(endDate)}</strong> (${escapeHtml(daysLeft)} day${daysLeft === 1 ? '' : 's'} left).</p>
        <p>Billing will start automatically after the trial ends. If you want to cancel before then, contact us.</p>
        <p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
      </div>
    `,
  });
}

async function notifyCreativePurchaseReady({ email, assetId, purchaseId }) {
  const downloadUrl = `${PLATFORM_URL}/api/v1/creatives/${assetId}/download?purchaseId=${purchaseId}&email=${encodeURIComponent(email)}`;
  return sendEmail({
    to: email,
    subject: `Your PuniCodex creative asset is ready for download`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex Marketplace — Purchase Confirmed</h2>
        <p>Hi there,</p>
        <p>Thank you for licensing a student creative asset. Your purchase is confirmed and the unwatermarked original is ready for download.</p>
        <p><a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Download Asset</a></p>
        <p style="color:#666;font-size:13px;">This link is tied to your email address. Do not share it publicly.</p>
      </div>
    `,
  });
}

async function sendAnalyticsReport({ email, booking, metrics }) {
  const siteSlug = resolveSiteSlug(booking.site_slug);
  const siteName = getSiteDisplayName(siteSlug);
  const dashboardUrl = getDashboardUrl(booking.analytics_token, siteSlug);
  const days = metrics.daily
    .slice(-7)
    .map(
      (d) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(d.day)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(d.count)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(d.event_type === 'impression' ? 'Views' : 'Clicks')}</td>
    </tr>
  `
    )
    .join('');

  return sendEmail({
    to: email,
    subject: `${siteName} Analytics — ${booking.slot_name} Performance`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} Analytics Report</h2>
        <p><strong>${escapeHtml(booking.slot_name)}</strong> — ${escapeHtml(booking.company_name || 'Your Ad')}</p>
        <div style="display:flex;gap:1rem;margin:1.5rem 0;">
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#d4af37;">${escapeHtml(metrics.totalImpressions.toLocaleString())}</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">Impressions</div>
          </div>
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#4ade80;">${escapeHtml(metrics.totalClicks.toLocaleString())}</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">Clicks</div>
          </div>
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#111;">${escapeHtml(metrics.ctr)}%</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">CTR</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:1rem 0;">
          <thead><tr style="background:#f8f8f8;"><th style="padding:8px;text-align:left;">Date</th><th style="padding:8px;text-align:right;">Count</th><th style="padding:8px;text-align:right;">Type</th></tr></thead>
          <tbody>${days}</tbody>
        </table>
        <a href="${escapeHtml(dashboardUrl)}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;margin-top:1rem;">View Full Dashboard</a>
      </div>
    `,
  });
}

async function notifyStoreOrderConfirmation({
  email,
  orderRef,
  productName,
  variantLabel,
  quantity,
  status,
}) {
  const orderUrl = `${PLATFORM_URL}/store/?order=${encodeURIComponent(orderRef)}`;
  const statusLine =
    status === 'sent_to_fulfillment'
      ? 'Your order is confirmed and already on its way to the print house.'
      : status === 'fulfillment_queued'
        ? 'Your order is confirmed — our studio prepares this handcrafted piece for printing.'
        : 'Your order is confirmed. You will hear from us as it moves.';
  return sendEmail({
    to: email,
    subject: `PuniCodex order ${orderRef} confirmed`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex — Order Confirmed</h2>
        <p>Hi there,</p>
        <p>${escapeHtml(statusLine)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin:1rem 0;">
          <tr><td style="padding:6px;color:#666;">Order</td><td style="padding:6px;text-align:right;font-weight:600;">${escapeHtml(orderRef)}</td></tr>
          <tr><td style="padding:6px;color:#666;">Item</td><td style="padding:6px;text-align:right;">${escapeHtml(productName)}</td></tr>
          <tr><td style="padding:6px;color:#666;">Variant</td><td style="padding:6px;text-align:right;">${escapeHtml(variantLabel || 'One size')}</td></tr>
          <tr><td style="padding:6px;color:#666;">Quantity</td><td style="padding:6px;text-align:right;">${escapeHtml(String(quantity))}</td></tr>
        </table>
        <p><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Track Order</a></p>
        <p style="color:#666;font-size:13px;">We email you the moment your order ships, with tracking.</p>
      </div>
    `,
  });
}

async function notifyStoreOrderShipped({ email, orderRef, productName, trackingUrl, carrier }) {
  return sendEmail({
    to: email,
    subject: `Your PuniCodex order ${orderRef} has shipped`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex — Order Shipped</h2>
        <p>Hi there,</p>
        <p><strong>${escapeHtml(productName)}</strong> from order <strong>${escapeHtml(orderRef)}</strong> is on its way${carrier ? ` via ${escapeHtml(carrier)}` : ''}.</p>
        ${trackingUrl ? `<p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Track Shipment</a></p>` : ''}
        <p style="color:#666;font-size:13px;">May it carry the temple's presence into your home.</p>
      </div>
    `,
  });
}

async function notifyPatronWelcome({ email, displayName, templeId }) {
  const templeUrl = `${PLATFORM_URL}/sites/${templeId}/`;
  return sendEmail({
    to: email,
    subject: `Welcome to the ${displayName} patron circle`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PUNICODEX — Patron Confirmed</h2>
        <p>Hi ${escapeHtml(displayName || 'there')},</p>
        <p>Thank you for becoming a patron. Your name will appear on the temple page, and your support helps keep these Unicode restorations alive.</p>
        <p><a href="${escapeHtml(templeUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Temple</a></p>
      </div>
    `,
  });
}

async function notifyScholarsAccountProvisioned({
  email,
  displayName,
  institutionName,
  tempPassword,
}) {
  const loginUrl = `${PLATFORM_URL}/scholars/login/`;
  return sendEmail({
    to: email,
    subject: `Your PuniCodex Scholarly Edition account${institutionName ? ` — ${institutionName}` : ''}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PUNICODEX Scholarly Edition</h2>
        <p>Hi ${escapeHtml(displayName || 'there')},</p>
        <p>An account has been provisioned for you${institutionName ? ` under <strong>${escapeHtml(institutionName)}</strong>` : ''}. Sign in with this one-time temporary password:</p>
        <div style="background:#f8f8f8;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <span style="font-family:monospace;font-size:1.25rem;font-weight:700;letter-spacing:0.05em;color:#111;">${escapeHtml(tempPassword)}</span>
        </div>
        <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Sign In</a></p>
        <p style="color:#666;font-size:0.85rem;">You will be asked to set a permanent password after signing in. If you did not expect this account, you can ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Tenant portal provisioning: a sponsor booking or patron subscription was
 * activated for this email. When setPasswordUrl is present the account has
 * no password yet and the email carries the one-time setup link; otherwise
 * it simply points at the portal sign-in.
 */
async function notifyTenantAccountProvisioned({ email, kind, setPasswordUrl }) {
  const portalUrl = `${PLATFORM_URL}/account/`;
  const kindLabel = kind === 'patron' ? 'patron spot' : 'ad space';
  const cta = setPasswordUrl
    ? `<p>Set your password to open your portal:</p>
        <p><a href="${escapeHtml(setPasswordUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Set Password &amp; Open Portal</a></p>
        <p style="color:#666;font-size:0.85rem;">This setup link expires in 24 hours. If you did not expect this account, you can ignore this email.</p>`
    : `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Sign In to Your Portal</a></p>`;
  return sendEmail({
    to: email,
    subject: 'Your PuniCodex account portal',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PUNICODEX — Your Account Portal</h2>
        <p>Hi,</p>
        <p>Your ${escapeHtml(kindLabel)} is active, and a self-service portal is ready for you. From the portal you can review your analytics and request changes to your ${escapeHtml(kindLabel)}.</p>
        ${cta}
      </div>
    `,
  });
}

async function notifyTenantPasswordReset({ email, token }) {
  const resetUrl = `${PLATFORM_URL}/account/?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: email,
    subject: 'Reset your PuniCodex portal password',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PUNICODEX — Password Reset</h2>
        <p>Hi,</p>
        <p>We received a request to reset the password for your account portal. Set a new password here:</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Set New Password</a></p>
        <p style="color:#666;font-size:0.85rem;">This link expires in 24 hours and works once. If you did not request a reset, you can ignore this email.</p>
      </div>
    `,
  });
}

async function notifyAdminPasswordReset({ email, tempPassword }) {
  const loginUrl = `${PLATFORM_URL}/admin-portal/login/`;
  return sendEmail({
    to: email,
    subject: 'Your PuniCodex admin portal password was reset',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PUNICODEX Admin Portal</h2>
        <p>Hi,</p>
        <p>An administrator has reset the password for this admin portal account. Sign in with this one-time temporary password:</p>
        <div style="background:#f8f8f8;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <span style="font-family:monospace;font-size:1.25rem;font-weight:700;letter-spacing:0.05em;color:#111;">${escapeHtml(tempPassword)}</span>
        </div>
        <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Sign In</a></p>
        <p style="color:#666;font-size:0.85rem;">You will be asked to set a permanent password after signing in. All existing sessions were revoked. If you did not expect this reset, contact your portal administrator immediately.</p>
      </div>
    `,
  });
}

/**
 * Careers portal: a candidate applied through /careers/. Delivered to the
 * founder's inbox (CAREERS_EMAIL). Routes through module.exports.sendEmail so
 * endpoint tests can capture at the sendEmail boundary.
 */
async function notifyCareersApplication({ role, name, email, links, message }) {
  const to = process.env.CAREERS_EMAIL || 'punicodex@gmail.com';
  const safeRole = escapeHtml(role).slice(0, 80);
  const safeName = escapeHtml(name).slice(0, 120);
  const safeEmail = escapeHtml(email).slice(0, 200);
  const safeLinks = escapeHtml(links || '').slice(0, 500);
  const safeMessage = escapeHtml(message).slice(0, 5000);
  return module.exports.sendEmail({
    to,
    subject: `[PuniCodex Careers] ${safeRole} — ${safeName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex Careers — New Application</h2>
        <p><strong>Role:</strong> ${safeRole}</p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${safeLinks ? `<p><strong>Portfolio / Links:</strong> ${safeLinks}</p>` : ''}
        <hr style="border:none;border-top:1px solid #d4af37;margin:1rem 0;">
        <p>${safeMessage.replace(/\n/g, '<br>')}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:1rem 0;">
        <p style="color:#666;font-size:13px;">Sent from the careers form at punicodex.com/careers/ — every application is read.</p>
      </div>
    `,
    text: `Role: ${role}\nName: ${name}\nEmail: ${email}\n${links ? `Links: ${links}\n` : ''}\n${message}`,
  });
}

// ─────────────────────────────────────────────────────────────
// Membership automation (weekly digests, expiry reminders, cancellation).
// Every helper routes through module.exports.sendEmail so endpoint tests can
// capture at the sendEmail boundary (same pattern as
// notifyCareersApplication).
// ─────────────────────────────────────────────────────────────

function digestStatBox(value, label, color) {
  return `<div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:${color};">${escapeHtml(value)}</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">${escapeHtml(label)}</div>
          </div>`;
}

function digestTempleSection(temple) {
  if (!temple) return '';
  const countries = (temple.countries || [])
    .map(
      (c) =>
        `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(c.country)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(Number(c.views).toLocaleString())} views</td></tr>`
    )
    .join('');
  return `
        <h3 style="color:#d4af37;margin:1.5rem 0 0.75rem;">Temple traffic this week</h3>
        <div style="display:flex;gap:1rem;margin:1rem 0;">
          ${digestStatBox(Number(temple.views).toLocaleString(), 'Views', '#d4af37')}
          ${digestStatBox(Number(temple.uniqueSessions).toLocaleString(), 'Visitors', '#4ade80')}
          ${digestStatBox(temple.avgVisibleLabel, 'Avg. attention', '#111')}
        </div>
        ${
          countries
            ? `<p style="margin:0.5rem 0;"><strong>Top countries</strong></p>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:0.5rem 0;">${countries}</table>`
            : ''
        }`;
}

function digestPulseSection(pulse) {
  if (!pulse?.length) return '';
  const rows = pulse
    .map(
      (t, i) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;color:#666;">${i + 1}.</td>
          <td style="padding:8px;border-bottom:1px solid #eee;"><a href="${escapeHtml(`${PLATFORM_URL}/sites/${t.templeId}/`)}" style="color:#111;text-decoration:none;font-weight:600;">${escapeHtml(t.name)}</a></td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(Number(t.views).toLocaleString())} views</td>
        </tr>`
    )
    .join('');
  return `
        <h3 style="color:#d4af37;margin:1.5rem 0 0.75rem;">Site pulse — trending temples</h3>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">${rows}</table>`;
}

async function notifyWeeklyDigestSponsor({
  email,
  companyName,
  siteSlug,
  slotName,
  bookingToken,
  weekLabel,
  slot,
  temple,
  pulse,
}) {
  const siteName = getSiteDisplayName(siteSlug);
  const ctaUrl = bookingToken
    ? getDashboardUrl(bookingToken, siteSlug)
    : `${PLATFORM_URL}/sites/${escapeHtml(siteSlug || '')}/`;
  return module.exports.sendEmail({
    to: email,
    subject: `Your week on PuniCodex — ${siteName} · ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Your Week on PuniCodex</h2>
        <p>Hi ${escapeHtml(companyName || 'there')},</p>
        <p>Here is how <strong>${escapeHtml(slotName)}</strong> and the ${escapeHtml(siteName)} temple performed this week (${escapeHtml(weekLabel)}).</p>
        <h3 style="color:#d4af37;margin:1.5rem 0 0.75rem;">Your slot — ${escapeHtml(slotName)}</h3>
        <div style="display:flex;gap:1rem;margin:1rem 0;">
          ${digestStatBox(Number(slot.impressions).toLocaleString(), 'Impressions', '#d4af37')}
          ${digestStatBox(Number(slot.clicks).toLocaleString(), 'Clicks', '#4ade80')}
          ${digestStatBox(`${slot.ctr}%`, 'CTR', '#111')}
          ${digestStatBox(`${slot.viewabilityPct}%`, 'Viewability', '#111')}
        </div>
        ${digestTempleSection(temple)}
        ${digestPulseSection(pulse)}
        <a href="${escapeHtml(ctaUrl)}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;margin-top:1.5rem;">Open Your Dashboard</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">You receive this weekly digest because you have a live sponsorship on ${escapeHtml(siteName)}.</p>
      </div>
    `,
  });
}

async function notifyWeeklyDigestPatron({
  email,
  displayName,
  siteSlug,
  weekLabel,
  temple,
  pulse,
}) {
  const siteName = getSiteDisplayName(siteSlug);
  const templeUrl = `${PLATFORM_URL}/sites/${siteSlug}/`;
  const portalUrl = `${PLATFORM_URL}/account/`;
  return module.exports.sendEmail({
    to: email,
    subject: `Your week on PuniCodex — ${siteName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Your Week on PuniCodex</h2>
        <p>Hi ${escapeHtml(displayName || 'there')},</p>
        <p>Thank you for standing with the ${escapeHtml(siteName)} temple. Here is what your patronage supported this week (${escapeHtml(weekLabel)}).</p>
        ${digestTempleSection(temple)}
        ${digestPulseSection(pulse)}
        <a href="${escapeHtml(templeUrl)}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;margin-top:1.5rem;">View Temple</a>
        <p style="color:#666;font-size:0.8rem;margin-top:1.5rem;">You receive this weekly digest because you are an active patron of ${escapeHtml(siteName)}. You can cancel your membership anytime from your <a href="${escapeHtml(portalUrl)}" style="color:#d4af37;">account portal</a>.</p>
      </div>
    `,
  });
}

async function notifyPatronExpiryReminder({ email, displayName, siteSlug, endsAt, daysLeft }) {
  const siteName = getSiteDisplayName(siteSlug);
  const templeUrl = `${PLATFORM_URL}/sites/${siteSlug}/`;
  const portalUrl = `${PLATFORM_URL}/account/`;
  const endDate = endsAt
    ? new Date(endsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'soon';
  return module.exports.sendEmail({
    to: email,
    subject: `Your ${siteName} patron membership ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Membership Ending Soon</h2>
        <p>Hi ${escapeHtml(displayName || 'there')},</p>
        <p>Your patron membership for the ${escapeHtml(siteName)} temple ends on <strong>${escapeHtml(endDate)}</strong> (${escapeHtml(daysLeft)} day${daysLeft === 1 ? '' : 's'} left). After that your name comes off the patron wall.</p>
        <p>To keep your spot, renew from the temple page:</p>
        <p><a href="${escapeHtml(templeUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Renew Membership</a></p>
        <p style="color:#666;font-size:0.85rem;">You can cancel anytime from your <a href="${escapeHtml(portalUrl)}" style="color:#d4af37;">account portal</a> — no questions asked.</p>
      </div>
    `,
  });
}

async function notifyPatronCancelled({ email, displayName, siteSlug }) {
  const siteName = getSiteDisplayName(siteSlug);
  const templeUrl = `${PLATFORM_URL}/sites/${siteSlug}/`;
  return module.exports.sendEmail({
    to: email,
    subject: `Your ${siteName} patron membership is cancelled`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">${escapeHtml(siteName)} — Membership Cancelled</h2>
        <p>Hi ${escapeHtml(displayName || 'there')},</p>
        <p>Your patron membership for the ${escapeHtml(siteName)} temple has been cancelled. Your name has been removed from the patron wall and no further charges will be made.</p>
        <p>You can rejoin anytime from the temple page:</p>
        <p><a href="${escapeHtml(templeUrl)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Temple</a></p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  notifyPaymentPending,
  notifyUploadReady,
  notifyAdminPending,
  notifyAdminApplication,
  notifyApproved,
  notifyRejected,
  notifyRevoked,
  notifyPanelReady,
  notifyLive,
  notifyTrialStarted,
  notifyTrialEnding,
  notifyApplicationApproved,
  sendDashboardLinks,
  sendVerificationCode,
  sendBookingConfirmation,
  sendAnalyticsReport,
  notifyCreativePurchaseReady,
  notifyPatronWelcome,
  notifyStoreOrderConfirmation,
  notifyStoreOrderShipped,
  notifyScholarsAccountProvisioned,
  notifyAdminPasswordReset,
  notifyTenantAccountProvisioned,
  notifyTenantPasswordReset,
  notifyCareersApplication,
  notifyWeeklyDigestSponsor,
  notifyWeeklyDigestPatron,
  notifyPatronExpiryReminder,
  notifyPatronCancelled,
  getDashboardUrl,
  getSiteDisplayName,
  resolveSiteSlug,
  escapeHtml,
  sandboxPanelUrl,
};
