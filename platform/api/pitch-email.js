/**
 * PuniCodex — Founding-sponsorship pitch emails.
 *
 * Renders the elite, table-based HTML pitch (the same design language as the
 * hand-built flagship pitches in Marketing/Sponsorship Pitches/) from a
 * discount-code row plus the temple's canonical data. Sent through
 * platform/api/email.js#sendEmail.
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dollars(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Short banner line for the offer block, e.g. "12 MONTHS — COMPLIMENTARY". */
function offerHeadline(codeRow) {
  switch (codeRow.kind) {
    case 'percent_off':
      return codeRow.percent >= 100 ? 'COMPLIMENTARY PLACEMENT' : `${codeRow.percent}% OFF`;
    case 'fixed_off':
      return `${dollars(codeRow.fixed_cents)} OFF`;
    case 'free_months':
      return `${codeRow.free_months} MONTH${codeRow.free_months === 1 ? '' : 'S'} — COMPLIMENTARY`;
    case 'trial_extension':
      return `${codeRow.free_months} EXTRA MONTH${codeRow.free_months === 1 ? '' : 'S'} FREE`;
    case 'free_months_then_price':
      return `${codeRow.free_months} MONTH${codeRow.free_months === 1 ? '' : 'S'} FREE — THEN ${dollars(codeRow.then_price_cents)}/MO`;
    default:
      return 'FOUNDING OFFER';
  }
}

/** Sentence-form description of what the code does at redemption. */
function offerSentence(codeRow) {
  switch (codeRow.kind) {
    case 'percent_off':
      return codeRow.percent >= 100
        ? 'your founding code reduces the full term on your chosen frame to nil'
        : `your founding code takes ${codeRow.percent}% off your chosen frame`;
    case 'fixed_off':
      return `your founding code takes ${dollars(codeRow.fixed_cents)} off your chosen frame`;
    case 'free_months':
      return `your founding code provides ${codeRow.free_months} month${
        codeRow.free_months === 1 ? '' : 's'
      } of your chosen frame in full`;
    case 'trial_extension':
      return `your founding code adds ${codeRow.free_months} month${
        codeRow.free_months === 1 ? '' : 's'
      } to your complimentary term`;
    case 'free_months_then_price':
      return `your founding code provides ${codeRow.free_months} month${
        codeRow.free_months === 1 ? '' : 's'
      } in full, then holds your rate at ${dollars(codeRow.then_price_cents)}/month`;
    default:
      return 'your founding code is ready at the temple checkout';
  }
}

function slotLine(codeRow) {
  if (codeRow.applies_to === 'all') return 'EVERY TEMPLE IN THE PANTHEON';
  return `TEMPLE OF ${String(codeRow.applies_to || '').toUpperCase()}`;
}

/**
 * Build the pitch email.
 *
 * @param {object} opts
 * @param {object} opts.codeRow   — a row from discount-service (snake_case fields)
 * @param {object} opts.temple    — { slug, unicode, script, domain, tierLabel }
 * @param {string} opts.businessName
 * @param {string} [opts.recipientSite] — the prospect's domain, shown in the hero
 * @param {string} [opts.customNote]    — one personal paragraph, placed as the final resonance bullet
 * @param {Array}  [opts.patterns]      — industry-pattern seats [{ name, why }] (already templated)
 */
function buildPitchEmail({ codeRow, temple, businessName, recipientSite, customNote, patterns }) {
  const biz = escapeHtml(businessName);
  const site = recipientSite ? escapeHtml(recipientSite) : null;
  const code = escapeHtml(codeRow.code);
  const templeUnicode = escapeHtml(temple.unicode);
  const templeSlug = escapeHtml(temple.slug);
  const script = temple.script ? escapeHtml(temple.script) : null;
  const domain = escapeHtml(temple.domain || '');
  const headline = escapeHtml(offerHeadline(codeRow));
  const sentence = escapeHtml(offerSentence(codeRow));
  const scope = escapeHtml(slotLine(codeRow));
  const tier = escapeHtml(temple.tierLabel || '');
  const templeUrl = `https://punicodex.com/sites/${temple.slug}/`;
  const patternsUrl = `https://punicodex.com/sites/${temple.slug}/patterns/`;

  const bullets = (patterns || [])
    .slice(0, 3)
    .map(
      (p) => `
          <tr>
            <td valign="top" style="padding:0 0 22px 0;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.8; color:#d8cfb8;">
                <span style="color:#e8c860;">◆&nbsp;&nbsp;${escapeHtml(p.lead)}</span><br/>
                ${escapeHtml(p.why)}
              </div>
            </td>
          </tr>`
    )
    .join('');

  const custom = customNote
    ? `
          <tr>
            <td valign="top" style="padding:0 0 6px 0;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.8; color:#d8cfb8;">
                <span style="color:#e8c860;">◆&nbsp;&nbsp;A note from the founder.</span><br/>
                ${escapeHtml(customNote)}
              </div>
            </td>
          </tr>`
    : '';

  const preheader = `${headline.charAt(0) + headline.slice(1).toLowerCase()} inside the Temple of ${temple.unicode}, prepared for ${businessName}.`;

  const subject = `The Temple of ${temple.unicode} — A Founding Sponsorship Invitation for ${businessName}`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
<!--[if mso]>
<style type="text/css">
  table {border-collapse:collapse; border-spacing:0; margin:0;}
  div, td {padding:0;}
  div {margin:0 !important;}
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#0b0a08;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
${escapeHtml(preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b0a08" style="background-color:#0b0a08;">
<tr>
<td align="center" style="padding:32px 12px;">

  <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:620px; max-width:620px; background-color:#14110c; border:1px solid #3a2f1a;">

    <tr>
      <td align="center" style="padding:36px 40px 28px 40px; border-bottom:1px solid #3a2f1a;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:30px; letter-spacing:10px; color:#d4af37; font-weight:bold;">PUNICODEX</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52; padding-top:8px;">THE UNICODE PANTHEON</div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:44px 40px 36px 40px; background-color:#17130d; border-bottom:1px solid #3a2f1a;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52; padding-bottom:16px;">FOUNDING SPONSORSHIP INVITATION</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:44px; letter-spacing:5px; color:#e8c860; line-height:1.15;">${templeUnicode.toUpperCase()}</div>
        ${script ? `<div style="font-family:Georgia, 'Times New Roman', serif; font-size:20px; color:#b09a6a; padding-top:6px;">${script}</div>` : ''}
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:13px; letter-spacing:4px; color:#c9b584; padding-top:14px;">${domain.toUpperCase().replace(/, /g, '&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>
        <div style="width:60px; border-top:1px solid #6b5a33; margin:24px auto 0 auto;"></div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:14px; color:#cbb98e; padding-top:22px; line-height:1.6;">
          Prepared exclusively for<br/>
          <span style="font-size:18px; letter-spacing:3px; color:#e8e0cc;">${biz.toUpperCase()}</span><br/>
          ${site ? `<span style="font-size:12px; color:#8a7a52;">${site}</span>` : ''}
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:40px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          <p style="margin:0 0 18px 0;">Dear ${biz} team,</p>
          <p style="margin:0 0 18px 0;">PUNICODEX is the Unicode Pantheon — a scholarly restoration project returning the original, accented names of myth to the digital realm. Across <strong style="color:#e8c860;">271 digital temples and 25 pantheons</strong>, each deity is served at its own restored Unicode domain, supported by a university-edited Scholarly Edition, an industry-pattern map, and a quarterly publication, <em>The Unicode Herald</em>.</p>
          <p style="margin:0 0 18px 0;">Every temple carries thirteen sponsorship frames. As we open these to market, we are admitting a <strong style="color:#e8c860;">small, hand-selected group of founding sponsors</strong> — brands that do not merely advertise beside an archetype, but genuinely embody it.</p>
          <p style="margin:0;">For the Temple of ${templeUnicode}, ${biz} was our first and most natural approach. We would like to show you why.</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">01 — THE RESONANCE</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">Why ${templeUnicode} is your temple</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${bullets}${custom}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">02 — THE OFFER</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">Extended to you alone</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background-color:#1d1810; border:1px solid #6b5a33; padding:30px 28px;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:26px; letter-spacing:3px; color:#e8c860;">${headline}</div>
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:13px; letter-spacing:2px; color:#c9b584; padding-top:10px;">FOUNDING PATRON PLACEMENT · ${scope}${tier ? ` · ${tier}` : ''}</div>
              <div style="width:48px; border-top:1px solid #6b5a33; margin:18px auto;"></div>
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:14px; line-height:1.9; color:#d8cfb8;">
                As a founding sponsor, ${sentence}.<br/>
                <strong style="color:#e8e0cc;">No credit card. No payment details. No auto-renewal. No obligation beyond the term.</strong><br/>
                This invitation is extended to a handful of businesses, for a limited time,<br/>
                as we build and develop the pantheon with partners who belong in it.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">03 — TO PROCEED</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">Claim your frame</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          Reply to this email naming your chosen frame, and we will prepare your placement. Should you prefer to proceed directly through the temple's sponsorship checkout, ${sentence}:
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:24px 0 8px 0;">
              <div style="display:inline-block; background-color:#0b0a08; border:1px dashed #8a6d2f; padding:16px 34px;">
                <span style="font-family:'Courier New', Courier, monospace; font-size:20px; letter-spacing:4px; color:#e8c860;">${code}</span>
              </div>
            </td>
          </tr>
        </table>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:13px; line-height:1.8; color:#a99b78; padding-top:14px;">
          Visit the temple to see your frames in situ — and the Industry Patterns map that put your name on our desk:
        </div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:18px 48px 10px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#8a6d2f" style="border:1px solid #c9a227;">
              <a href="${templeUrl}" target="_blank" style="display:inline-block; padding:14px 30px; font-family:Georgia, 'Times New Roman', serif; font-size:13px; letter-spacing:3px; color:#0b0a08; text-decoration:none; font-weight:bold;">ENTER THE TEMPLE OF ${templeUnicode.toUpperCase()}</a>
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-top:12px;">
              <a href="${patternsUrl}" target="_blank" style="font-family:Georgia, 'Times New Roman', serif; font-size:12px; letter-spacing:2px; color:#c9b584; text-decoration:underline;">VIEW THE ${templeUnicode.toUpperCase()} INDUSTRY PATTERN →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:30px 48px 36px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          <p style="margin:0 0 20px 0;">We would be honoured to have ${biz} stand as the founding patron of this temple.</p>
          <p style="margin:0;">With respect,</p>
          <p style="margin:14px 0 0 0; color:#e8c860; font-size:17px;">Martin Khoury</p>
          <p style="margin:4px 0 0 0; font-size:13px; color:#8a7a52;">Founder, PUNICODEX<br/><a href="mailto:support@punicodex.com" style="color:#c9b584; text-decoration:none;">support@punicodex.com</a> · <a href="https://punicodex.com" style="color:#c9b584; text-decoration:none;">punicodex.com</a></p>
        </div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:24px 48px 30px 48px; border-top:1px solid #3a2f1a; background-color:#100d09;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:4px; color:#8a7a52;">PUNICODEX — THE UNICODE PANTHEON</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; color:#6b6046; line-height:1.8; padding-top:8px;">
          271 temples · 25 pantheons<br/>
          <a href="https://punicodex.com/terms/advertising/" style="color:#6b6046; text-decoration:underline;">Advertising Terms</a> &nbsp;·&nbsp; <a href="https://punicodex.com/tiers/" style="color:#6b6046; text-decoration:underline;">The Tier System</a>
        </div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:10px; color:#4d4433; line-height:1.7; padding-top:12px;">
          This is a one-time founding invitation extended to ${biz}. Placement is subject to manual content review and the advertising terms above. The founding code is single-use and bound to its temple; no payment details are collected at redemption.
        </div>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>

</body>
</html>`;

  const text = [
    `Dear ${businessName} team,`,
    '',
    `PUNICODEX is the Unicode Pantheon — 271 restored digital temples across 25 pantheons.`,
    `We would like to invite ${businessName} to stand as a founding sponsor of the Temple of ${temple.unicode} (${temple.domain}).`,
    '',
    `The offer: ${offerHeadline(codeRow)} — ${offerSentence(codeRow)}.`,
    `Your founding code: ${codeRow.code}`,
    `Redeem at ${templeUrl}`,
    `The industry pattern behind our approach: ${patternsUrl}`,
    '',
    'With respect,',
    'Martin Khoury — Founder, PUNICODEX',
    'support@punicodex.com · punicodex.com',
  ].join('\n');

  return { subject, html, text };
}

/** Resolve a temple descriptor from the canonical lexicon. */
function loadTemple(slug) {
  const { LEXICON } = require('../../type/js/lexicon.js');
  const entry = (LEXICON || []).find((e) => e.id === slug);
  if (!entry) return null;
  const tierLabel =
    entry.tier === 'dual'
      ? 'DUAL-TIER'
      : entry.tier === '1'
        ? 'TIER 1'
        : entry.tier === '2'
          ? 'TIER 2'
          : '';
  return {
    slug: entry.id,
    unicode: entry.unicode,
    script: entry.greek && entry.greek !== '—' ? entry.greek : null,
    domain: entry.domain || '',
    tierLabel,
  };
}

/** Top industry-pattern seats for a temple, shaped for the resonance bullets. */
function loadPatternBullets(slug, businessName) {
  try {
    const patterns = require('./industry-patterns.json');
    const seats = (patterns.byEntry && patterns.byEntry[slug]) || [];
    return seats.slice(0, 3).map((s, i) => ({
      lead:
        i === 0
          ? `Your industry sits inside the temple's pattern map.`
          : `The temple also answers to ${s.name}.`,
      why: `The temple's Industry Patterns map — the same structured data consumed by researchers and our API — names ${s.name} among its aligned industries: ${s.why} ${businessName} is not adjacent to this archetype; it practises it.`,
    }));
  } catch {
    return [];
  }
}

/* ── Lore-driven resonance (Ares-grade, every flagship) ─────────────────── */

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&emdash;|&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First n sentences of a text, cutting on sentence boundaries. */
function firstSentences(text, n = 2, maxLen = 420) {
  const clean = stripHtml(text);
  if (!clean) return '';
  const parts = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
  let out = '';
  for (const part of parts) {
    if (out && (out + ' ' + part).length > maxLen) break;
    out = out ? `${out} ${part.trim()}` : part.trim();
    if ((out.match(/[.!?]/g) || []).length >= n) break;
  }
  // Drop any leading fragment debris (unmatched quotes/brackets from mid-sentence cuts).
  return out
    .replace(/^[^\p{L}\p{N}(“"']+/u, '')
    .replace(/^['"“]\s+/u, '')
    .trim();
}

function loadLore(slug) {
  try {
    const catalog = require('../../scripts/lore-catalog.json');
    return catalog[slug] || null;
  } catch {
    return null;
  }
}

/**
 * The five-bullet resonance section, generated per flagship from canonical
 * sources (pattern map, lore catalog, pronunciation atlas, script note) so
 * every temple reads with the specificity of the hand-built Ares pitch.
 * `businessName` may be a placeholder token for the copy-paste templates.
 */
function buildResonanceBullets(slug, businessName) {
  const bullets = [];
  const entry = (() => {
    try {
      const { LEXICON } = require('../../type/js/lexicon.js');
      return (LEXICON || []).find((e) => e.id === slug) || null;
    } catch {
      return null;
    }
  })();
  const lore = loadLore(slug);

  // 1 — the pattern map (industry alignment).
  const patternBullets = loadPatternBullets(slug, businessName);
  if (patternBullets.length) bullets.push(patternBullets[0]);

  // 2 — the mythology.
  const myth = firstSentences(lore && lore.mythology && lore.mythology.lead, 2);
  if (myth) bullets.push({ lead: 'The god, in his own story.', why: myth });

  // 3 — archaeology / syncretism: the quotable fact.
  const fact = firstSentences(lore && (lore.archaeology || lore.syncretism), 2);
  if (fact) bullets.push({ lead: 'Attested, not invented.', why: fact });

  // 4 — the name itself (the Ares pitch's "sounds like a blade drawn" bullet).
  const note = firstSentences(
    lore && (lore.originalScriptNote || (lore.pronunciation && lore.pronunciation.note)),
    2
  );
  if (note) bullets.push({ lead: 'A name worth saying correctly.', why: note });

  // 5 — cultural legacy.
  const legacy = firstSentences(lore && lore.culturalLegacy, 1);
  if (legacy) bullets.push({ lead: 'Still current, centuries on.', why: legacy });

  // 6 — second pattern seat, if we have room and one exists.
  if (patternBullets.length > 1 && bullets.length < 5) bullets.push(patternBullets[1]);

  // Fallback when lore is missing: the lexicon meaning.
  if (!bullets.length && entry) {
    bullets.push({
      lead: 'The archetype itself.',
      why: `${entry.unicode} — ${entry.meaning}. Domain: ${entry.domain}. ${businessName} is not adjacent to this archetype; it practises it.`,
    });
  }
  return bullets.slice(0, 5);
}

module.exports = {
  buildPitchEmail,
  loadTemple,
  loadPatternBullets,
  buildResonanceBullets,
  loadLore,
  offerHeadline,
  offerSentence,
};
