/**
 * PuniCodex — Creative lifecycle notification emails.
 *
 * The three moments a creator must never miss: their creative is approved,
 * their first sale lands, and their art goes live as selectable artwork on
 * a temple's store products. Same obsidian/gold table DNA as the pitch
 * family, notification-grade compactness.
 *
 * All sends are fire-and-forget: a notification failure never breaks the
 * business flow that triggered it. RESEND_API_KEY absence → mocked, no-op.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dollars(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function shell({ subject, eyebrow, headline, bodyHtml, ctaLabel, ctaUrl, preheader }) {
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
<!--[if mso]><style type="text/css">table {border-collapse:collapse;} div,td {padding:0; margin:0 !important;}</style><![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0b0a08;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b0a08"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background-color:#14110c; border:1px solid #3a2f1a;">
  <tr><td align="center" style="padding:26px 36px 20px 36px; border-bottom:1px solid #3a2f1a;">
    <div style="font-family:Georgia, serif; font-size:24px; letter-spacing:8px; color:#d4af37; font-weight:bold;">PUNICODEX</div>
    <div style="font-family:Georgia, serif; font-size:10px; letter-spacing:4px; color:#8a7a52; padding-top:6px;">THE CREATIVES MARKETPLACE</div>
  </td></tr>
  <tr><td align="center" style="padding:32px 40px 24px 40px; background-color:#17130d; border-bottom:1px solid #3a2f1a;">
    <div style="font-family:Georgia, serif; font-size:10px; letter-spacing:4px; color:#8a7a52; padding-bottom:10px;">${escapeHtml(eyebrow)}</div>
    <div style="font-family:Georgia, serif; font-size:26px; letter-spacing:2px; color:#e8c860; line-height:1.25;">${headline}</div>
  </td></tr>
  <tr><td style="padding:28px 40px 8px 40px;">
    <div style="font-family:Georgia, serif; font-size:14px; line-height:1.85; color:#d8cfb8;">${bodyHtml}</div>
  </td></tr>
  <tr><td align="center" style="padding:16px 40px 26px 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="#8a6d2f" style="border:1px solid #c9a227;">
        <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display:inline-block; padding:12px 26px; font-family:Georgia, serif; font-size:12px; letter-spacing:3px; color:#0b0a08; text-decoration:none; font-weight:bold;">${escapeHtml(ctaLabel)}</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding:18px 40px 24px 40px; border-top:1px solid #3a2f1a; background-color:#100d09;">
    <div style="font-family:Georgia, serif; font-size:10px; color:#6b6046; line-height:1.8;">
      <a href="https://punicodex.com/scholars/creatives/" style="color:#6b6046; text-decoration:underline;">Your Creative Studio</a> &nbsp;·&nbsp; <a href="https://punicodex.com/creatives/" style="color:#6b6046; text-decoration:underline;">The Marketplace</a><br/>
      You receive this because you publish work in the PuniCodex Creatives Marketplace.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, html };
}

function p(text) {
  return `<p style="margin:0 0 14px 0;">${text}</p>`;
}

function buildCreativeApprovedEmail({ creatorName, assetTitle }) {
  const name = escapeHtml(creatorName || 'Creator');
  const title = escapeHtml(assetTitle || 'Your creative');
  return shell({
    subject: `Approved — “${assetTitle}” is live in the Creatives Marketplace`,
    eyebrow: 'THE REVIEW GATE',
    headline: 'Your work has<br/>passed the gate',
    bodyHtml:
      p(`${name},`) +
      p(
        `<strong style="color:#e8e0cc;">“${title}”</strong> has been approved and is now listed in the Creatives Marketplace — watermarked, credited, and available for license.`
      ) +
      p(
        `If you opted in to merchandise, it is also eligible to be printed on temple products in the Reliquary store, with <strong style="color:#e8c860;">50% of every sale paid to you</strong>.`
      ),
    ctaLabel: 'OPEN YOUR CREATIVE STUDIO',
    ctaUrl: 'https://punicodex.com/scholars/creatives/',
    preheader: `“${assetTitle}” passed review and is live in the Creatives Marketplace.`,
  });
}

function buildFirstSaleEmail({ creatorName, assetTitle, grossCents, shareCents, orderRef }) {
  const name = escapeHtml(creatorName || 'Creator');
  const title = escapeHtml(assetTitle || 'Your creative');
  return shell({
    subject: `First sale — you earned ${dollars(shareCents)} from “${assetTitle}”`,
    eyebrow: 'THE ROYALTY LEDGER',
    headline: 'Your work<br/>has sold',
    bodyHtml:
      p(`${name},`) +
      p(
        `<strong style="color:#e8e0cc;">“${title}”</strong> just sold for <strong style="color:#e8c860;">${dollars(grossCents)}</strong>. Your share — half of the net margin — is <strong style="color:#e8c860;">${dollars(shareCents)}</strong>, recorded in the royalty ledger under <span style="font-family:'Courier New',monospace; color:#c9b584;">${escapeHtml(orderRef)}</span>.`
      ) +
      p(`Every sale lands here. The ledger is yours to audit, any time.`),
    ctaLabel: 'VIEW YOUR EARNINGS',
    ctaUrl: 'https://punicodex.com/scholars/creatives/',
    preheader: `First sale: ${dollars(shareCents)} earned from “${assetTitle}”.`,
  });
}

function buildStoreArtworkLiveEmail({ creatorName, assetTitle, templeUnicode, templeUrl }) {
  const name = escapeHtml(creatorName || 'Creator');
  const title = escapeHtml(assetTitle || 'Your art');
  return shell({
    subject: `On the temple — “${assetTitle}” is now selectable artwork at the Temple of ${templeUnicode}`,
    eyebrow: 'THE RELIQUARY STORE',
    headline: 'Your art is on<br/>the temple',
    bodyHtml:
      p(`${name},`) +
      p(
        `<strong style="color:#e8e0cc;">“${title}”</strong> is now one of the selectable artworks on the <strong style="color:#e8c860;">Temple of ${escapeHtml(templeUnicode)}</strong> — any visitor choosing art on that temple's products can choose yours. When they do, you earn half of the net margin.`
      ) +
      p(`One position among a temple's arts, held by a handful of creators. Yours is there.`),
    ctaLabel: `VISIT THE TEMPLE OF ${String(templeUnicode).toUpperCase()}`,
    ctaUrl: templeUrl,
    preheader: `“${assetTitle}” is now selectable artwork on the Temple of ${templeUnicode}.`,
  });
}

/**
 * Resolve the creator's email for an asset and send. Fire-and-forget: all
 * failures are swallowed with a console note — notifications never break
 * the triggering flow.
 */
async function notifyCreativeEvent(type, { assetId, extra }) {
  try {
    const db = require('./creative-marketplace-db.js');
    const asset = db.getCreativeAssetById(Number(assetId));
    if (!asset) return;
    // scholars_users lives in the shared SQLite DB (the scholars layer writes
    // it there) — read that store, not the operational backend.
    const { getUserById } = require('../db/scholars');
    const creator = getUserById(asset.creator_id);
    if (!creator?.email) return;

    const base = {
      creatorName: creator.display_name || creator.email.split('@')[0],
      assetTitle: asset.title,
    };
    let built;
    if (type === 'approved') {
      built = buildCreativeApprovedEmail(base);
    } else if (type === 'first_sale') {
      built = buildFirstSaleEmail({ ...base, ...extra });
    } else if (type === 'store_live') {
      built = buildStoreArtworkLiveEmail({ ...base, ...extra });
    } else {
      return;
    }

    const { sendEmail } = require('./email.js');
    await sendEmail({
      to: creator.email,
      subject: built.subject,
      html: built.html,
      fromName: 'PuniCodex Creatives',
    });
  } catch (err) {
    console.warn(`creative notification (${type}) skipped: ${err.message}`);
  }
}

module.exports = {
  buildCreativeApprovedEmail,
  buildFirstSaleEmail,
  buildStoreArtworkLiveEmail,
  notifyCreativeEvent,
};
