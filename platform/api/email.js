const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@punycodex.com';
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3456';

async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY configured. Would send:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    return { success: true, mocked: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Níkē Ads <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
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

function getDashboardUrl(token, siteSlug = 'nike') {
  return `${PLATFORM_URL}/sites/${siteSlug}/dashboard/?token=${token}`;
}

async function notifyPaymentPending({ email, slotName, companyName, stripeUrl }) {
  return sendEmail({
    to: email,
    subject: `Complete your reservation for ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Reservation Pending</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your reservation for <strong>${slotName}</strong> is waiting for payment.</p>
        <p><a href="${stripeUrl}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Complete Payment</a></p>
        <p style="color:#666;font-size:13px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function notifyUploadReady({ email, slotName, companyName, bookingToken, leaseMonths = 1 }) {
  const duration = leaseMonths === 12 ? '12 months' : '1 month';
  return sendEmail({
    to: email,
    subject: `Upload your creative for ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Payment Received</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Thank you for your payment for <strong>${slotName}</strong> (${duration}).</p>
        <p>Now it's time to upload your creative:</p>
        <p><a href="${getDashboardUrl(bookingToken)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Upload Creative</a></p>
      </div>
    `,
  });
}

async function notifyAdminPending({ slotName, companyName, bookingId }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: true, skipped: true };
  return sendEmail({
    to: adminEmail,
    subject: `New creative pending approval — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē Admin — Approval Needed</h2>
        <p><strong>${companyName || 'A new advertiser'}</strong> submitted a creative for <strong>${slotName}</strong>.</p>
        <p>Booking ID: <code>${bookingId}</code></p>
        <p><a href="${PLATFORM_URL}/admin-bookings.html" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Review in Admin Panel</a></p>
      </div>
    `,
  });
}

async function notifyAdminApplication({ slotName, companyName, bookingId, applicationNote }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { success: true, skipped: true };
  return sendEmail({
    to: adminEmail,
    subject: `New application — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē Admin — Application Pending</h2>
        <p><strong>${companyName || 'A new advertiser'}</strong> applied for <strong>${slotName}</strong>.</p>
        ${applicationNote ? `<p><strong>Note:</strong> ${applicationNote}</p>` : ''}
        <p>Booking ID: <code>${bookingId}</code></p>
        <p><a href="${PLATFORM_URL}/admin-bookings.html" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Review Application</a></p>
      </div>
    `,
  });
}

async function notifyApplicationApproved({ email, slotName, companyName, stripeUrl }) {
  return sendEmail({
    to: email,
    subject: `Your application for ${slotName} is approved`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Application Approved</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your application for <strong>${slotName}</strong> has been approved.</p>
        <p>Complete payment to secure the placement:</p>
        <p><a href="${stripeUrl}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Pay Now</a></p>
      </div>
    `,
  });
}

async function notifyApproved({ email, slotName, companyName, bookingToken }) {
  return sendEmail({
    to: email,
    subject: `Your ad for ${slotName} is approved`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Creative Approved</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your creative for <strong>${slotName}</strong> has been approved and is going live shortly.</p>
        <p><a href="${getDashboardUrl(bookingToken)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
      </div>
    `,
  });
}

async function notifyRejected({ email, slotName, companyName, note, bookingToken }) {
  return sendEmail({
    to: email,
    subject: `Your creative needs changes — ${slotName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Creative Needs Changes</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your creative for <strong>${slotName}</strong> was not approved.</p>
        <p><strong>Reason:</strong> ${note || 'Does not meet our guidelines.'}</p>
        <p>You can upload a revised version here:</p>
        <p><a href="${getDashboardUrl(bookingToken)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Re-upload Creative</a></p>
      </div>
    `,
  });
}

async function notifyLive({ email, slotName, companyName, bookingToken, leaseMonths = 1 }) {
  const duration = leaseMonths === 12 ? '12 months' : '1 month';
  return sendEmail({
    to: email,
    subject: `Your ad is now live on Níkē.com`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — You're Live!</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your ad on <strong>${slotName}</strong> is now live on Níkē.com for <strong>${duration}</strong>.</p>
        <p>Track performance in your dashboard:</p>
        <p><a href="${getDashboardUrl(bookingToken)}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Open Analytics Dashboard</a></p>
      </div>
    `,
  });
}

async function sendDashboardLinks({ email, bookings }) {
  const rows = bookings
    .map(
      (b) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;font-weight:600;">${b.slot_name}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-transform:uppercase;font-size:0.8rem;">${b.status.replace(/_/g, ' ')}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;">
        <a href="${getDashboardUrl(b.analytics_token)}" style="color:#d4af37;font-weight:600;text-decoration:none;">Dashboard &rarr;</a>
      </td>
    </tr>
  `
    )
    .join('');

  return sendEmail({
    to: email,
    subject: `Your Níkē.com dashboard links`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Your Bookings</h2>
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
    subject: `Your Níkē verification code`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background:#f8f8f8;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
          <span style="font-family:monospace;font-size:2rem;font-weight:700;letter-spacing:0.2em;color:#111;">${code}</span>
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
}) {
  const dashboardUrl = getDashboardUrl(token);
  const panelUrl = `${PLATFORM_URL}/advertiser-panel.html?token=${token}`;
  const durationLabel = leaseMonths === 12 ? '12 months' : '1 month';
  const trialLabel = trialMonths > 0 ? `${trialMonths}-month free trial, then ` : '';
  const priceLabel =
    leaseMonths === 12
      ? `$${(amountCents / 100).toFixed(2)}`
      : `$${(amountCents / 100).toFixed(2)}/mo`;
  const trialBadge =
    trialMonths > 0
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0;"><strong>Free trial:</strong> Your first ${trialMonths} month${trialMonths > 1 ? 's' : ''} are free. Billing begins after the trial ends.</div>`
      : '';
  return sendEmail({
    to: email,
    subject: `Your reservation for ${slotName} — Complete your setup`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē.com — Reservation Confirmed</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>You've reserved <strong>${slotName}</strong> for <strong>${durationLabel}</strong> at <strong>${trialLabel}${priceLabel}</strong>.</p>
        ${trialBadge}
        ${customHeading ? `<p><strong>Heading:</strong> ${customHeading}</p>` : ''}
        ${customSubtitle ? `<p><strong>Subtitle:</strong> ${customSubtitle}</p>` : ''}
        <p>Manage everything from your advertiser panel:</p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;margin:1.5rem 0;">
          <a href="${panelUrl}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Open Advertiser Panel</a>
          <a href="${dashboardUrl}" style="display:block;background:transparent;color:#d4af37;border:2px solid #d4af37;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;">Analytics Dashboard</a>
        </div>
        <p style="color:#666;font-size:0.8rem;">Your panel link is unique to you. Keep it safe.</p>
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
}) {
  const dashboardUrl = getDashboardUrl(bookingToken);
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
        <h2 style="color:#d4af37;">Níkē.com — Trial Started</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your ad on <strong>${slotName}</strong> is now live on its <strong>${trialMonths}-month free trial</strong>.</p>
        <p>Billing will begin on <strong>${endDate}</strong>. We'll send reminders 7 days and 1 day before billing starts.</p>
        <p><a href="${dashboardUrl}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
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
}) {
  const dashboardUrl = getDashboardUrl(bookingToken);
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
        <h2 style="color:#d4af37;">Níkē.com — Trial Ending Soon</h2>
        <p>Hi ${companyName || 'there'},</p>
        <p>Your free trial for <strong>${slotName}</strong> ends on <strong>${endDate}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).</p>
        <p>Billing will start automatically after the trial ends. If you want to cancel before then, contact us.</p>
        <p><a href="${dashboardUrl}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">View Dashboard</a></p>
      </div>
    `,
  });
}

async function sendAnalyticsReport({ email, booking, metrics }) {
  const dashboardUrl = getDashboardUrl(booking.analytics_token);
  const days = metrics.daily
    .slice(-7)
    .map(
      (d) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${d.day}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${d.count}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${d.event_type === 'impression' ? 'Views' : 'Clicks'}</td>
    </tr>
  `
    )
    .join('');

  return sendEmail({
    to: email,
    subject: `Níkē Analytics — ${booking.slot_name} Performance`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">Níkē Analytics Report</h2>
        <p><strong>${booking.slot_name}</strong> — ${booking.company_name || 'Your Ad'}</p>
        <div style="display:flex;gap:1rem;margin:1.5rem 0;">
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#d4af37;">${metrics.totalImpressions.toLocaleString()}</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">Impressions</div>
          </div>
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#4ade80;">${metrics.totalClicks.toLocaleString()}</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">Clicks</div>
          </div>
          <div style="flex:1;background:#f8f8f8;border-radius:8px;padding:1rem;text-align:center;">
            <div style="font-size:1.8rem;font-weight:700;color:#111;">${metrics.ctr}%</div>
            <div style="font-size:0.75rem;color:#666;text-transform:uppercase;">CTR</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:1rem 0;">
          <thead><tr style="background:#f8f8f8;"><th style="padding:8px;text-align:left;">Date</th><th style="padding:8px;text-align:right;">Count</th><th style="padding:8px;text-align:right;">Type</th></tr></thead>
          <tbody>${days}</tbody>
        </table>
        <a href="${dashboardUrl}" style="display:block;background:#d4af37;color:#000;padding:14px;text-align:center;text-decoration:none;border-radius:8px;font-weight:600;margin-top:1rem;">View Full Dashboard</a>
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
  notifyLive,
  notifyTrialStarted,
  notifyTrialEnding,
  notifyApplicationApproved,
  sendDashboardLinks,
  sendVerificationCode,
  sendBookingConfirmation,
  sendAnalyticsReport,
  getDashboardUrl,
};
