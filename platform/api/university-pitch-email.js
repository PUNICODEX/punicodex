/**
 * PuniCodex — University partnership pitch emails.
 *
 * The academic counterpart to pitch-email.js: the same table-based,
 * email-client-safe obsidian-and-gold design language, driven by a
 * university_prospects row plus the institution's own aligned departments.
 *
 * Positioning (fixed): academic collaboration is COMPLIMENTARY — there is
 * no price, no invoice, no renewal. The paid sponsorship tier is a separate,
 * optional conversation the email deliberately does not lead with.
 *
 * Personalization ladder (hybrid, like the founding pitches):
 *   institutionName  — woven through every section (required)
 *   departments      — the prospect's aligned departments; each becomes a
 *                      resonance bullet with a benefit mapped to it
 *   contactName      — salutation when known ("Dear Professor Hale")
 *   customNote       — one personal paragraph placed as the final bullet
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

const DEPARTMENT_BENEFITS = {
  classics: {
    lead: 'For the Department of Classics.',
    why: 'Your students edit the living record. The Scholarly Edition is a university-edited layer across 542 flagship temples — mythology, archaeology, attestation, source criticism — published publicly and credited by name. This is fieldwork in digital public humanities.',
  },
  'ancient history': {
    lead: 'For Ancient History.',
    why: 'Each temple carries an Industry Patterns map and a quarterly, The Unicode Herald, that treats the ancient world as primary-source material. Student contributions are published, bylined, and citable — a public portfolio no essay can match.',
  },
  'religious studies': {
    lead: 'For Religious Studies.',
    why: '980 restorations across 25 living traditions — Greek, Egyptian, Norse, Hindu, Buddhist, Aztec and more — each with original-script evidence and honest provenance labels. Students engage the full breadth of world religion, not a single canon.',
  },
  linguistics: {
    lead: 'For Linguistics.',
    why: 'A rules-based pronunciation engine derives IPA, respelling, syllable structure and stress for all 980 names, per pantheon, from canonical orthographies — Mandarin pinyin to Attic Greek. It is a teaching instrument your phonetics classes can pull apart.',
  },
  'digital humanities': {
    lead: 'For Digital Humanities.',
    why: 'The entire platform is a working corpus: an open API, structured lexicon data, a confusable/homograph defence subsystem, and AI training datasets released under CC BY 4.0 with versioned DOIs. Your students can study it, query it, and cite it.',
  },
  design: {
    lead: 'For Design.',
    why: 'The Creatives Marketplace turns student work into income: art inspired by a temple is listed watermarked, licensed, and — when it clears review — printed on that temple’s merchandise in the Reliquary store, with 50% of every sale paid to the creator.',
  },
  marketing: {
    lead: 'For Marketing.',
    why: 'Sponsorship frames on temples are a live case study in identity alignment — one brand per frame, thirteen per temple, scarcity that is structural rather than manufactured. Your students can watch the placements, the pricing tiers and the copy in the wild.',
  },
  egyptology: {
    lead: 'For Egyptology.',
    why: 'PuniCodex restores names like Ꜣb and ꜥnḫ at their true Unicode domains, with original-script display grounded in the hieroglyphic evidence. Egyptian entries are labelled “conventional reading” where the vowels are lost — honest scholarship, by design.',
  },
  'indigenous studies': {
    lead: 'For Indigenous Studies.',
    why: 'Restoration with provenance is the platform’s core discipline: every original script carries its sources, and every uncertainty is labelled. That is a methodology your students can hold up as a standard.',
  },
};

/** Map a department string to its benefit bullet (fuzzy, case-insensitive). */
function benefitFor(department) {
  const key = String(department || '')
    .trim()
    .toLowerCase();
  if (DEPARTMENT_BENEFITS[key]) return DEPARTMENT_BENEFITS[key];
  for (const [k, v] of Object.entries(DEPARTMENT_BENEFITS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return {
    lead: `For ${String(department).trim()}.`,
    why: 'The Scholarly Edition, the Creatives Marketplace and the open API give your department public, credited, citable work for its students from the first week of collaboration.',
  };
}

/**
 * Build the university partnership email.
 *
 * @param {object} opts
 * @param {object} opts.prospect     — university_prospects row (snake_case)
 * @param {string} [opts.contactName]  — e.g. "Professor Hale" (salutation)
 * @param {string} [opts.customNote]   — one personal paragraph (final bullet)
 * @param {Array<string>} [opts.departments] — override; defaults to prospect.departments
 */
function buildUniversityPitch({ prospect, contactName, customNote, departments }) {
  const institution = String(prospect.institution_name || prospect.name || 'your institution');
  const depts =
    Array.isArray(departments) && departments.length
      ? departments
      : safeParseArray(prospect.departments);
  const biz = escapeHtml(institution);
  const salutation = contactName
    ? `Dear ${escapeHtml(contactName)}`
    : `Dear colleagues in the ${escapeHtml(depts[0] || 'faculty')} at ${biz}`;

  const bullets = depts
    .slice(0, 4)
    .map((d) => benefitFor(d))
    .map(
      (b) => `
          <tr>
            <td valign="top" style="padding:0 0 22px 0;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.8; color:#d8cfb8;">
                <span style="color:#e8c860;">◆&nbsp;&nbsp;${escapeHtml(b.lead)}</span><br/>
                ${escapeHtml(b.why)}
              </div>
            </td>
          </tr>`
    )
    .join('');

  const marketplaceBullet = `
          <tr>
            <td valign="top" style="padding:0 0 22px 0;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.8; color:#d8cfb8;">
                <span style="color:#e8c860;">◆&nbsp;&nbsp;For every student — income, not just credit.</span><br/>
                Work a student submits to the Creatives Marketplace and clears review is printed on that temple's merchandise in the Reliquary store, and 50% of every sale is paid to the creator. Your department gains a public portfolio, a quality gate, and a revenue stream in one.
              </div>
            </td>
          </tr>`;

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

  const deptLine = depts.length
    ? depts
        .map((d) => String(d).trim())
        .filter(Boolean)
        .join(' · ')
    : 'the humanities';

  const subject = `A complimentary partnership for ${institution} — the Scholarly Edition`;
  const preheader = `No cost, no invoice, no renewal — university collaboration on the Unicode Pantheon, prepared for ${institution}.`;

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
${escapeHtml(preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
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
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52; padding-bottom:16px;">ACADEMIC COLLABORATION INVITATION</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:40px; letter-spacing:4px; color:#e8c860; line-height:1.15;">THE SCHOLARLY<br/>EDITION</div>
        <div style="width:60px; border-top:1px solid #6b5a33; margin:24px auto 0 auto;"></div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:14px; color:#cbb98e; padding-top:22px; line-height:1.6;">
          Prepared for<br/>
          <span style="font-size:19px; letter-spacing:2px; color:#e8e0cc;">${biz.toUpperCase()}</span><br/>
          <span style="font-size:12px; letter-spacing:2px; color:#8a7a52;">${escapeHtml(deptLine.toUpperCase())}</span>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:40px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          <p style="margin:0 0 18px 0;">${salutation},</p>
          <p style="margin:0 0 18px 0;">PUNICODEX is the Unicode Pantheon — a scholarly restoration project returning the original, accented names of myth to the digital realm. Nine hundred and eighty names across twenty-five traditions, each kept permanently at its true Unicode domain: <em>apóllōn.com</em>, <em>nótt.com</em>, <em>quauhtli.com</em>.</p>
          <p style="margin:0 0 18px 0;">The scholarship behind those temples is not ours alone. The <strong style="color:#e8c860;">Scholarly Edition</strong> is a university-edited layer across all 542 flagship temples — and we are inviting a small number of institutions to put their students behind it.</p>
          <p style="margin:0;"><strong style="color:#e8e0cc;">Academic collaboration is complimentary. There is no cost, no invoice, and no renewal — for the department or the university.</strong> What we ask in return is one promise: a link from your department's website to punicodex.com within your first year. Everything below is live the moment you are provisioned — no one waits on a web edit. What follows is what your students gain.</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">01 — WHAT YOUR DEPARTMENT RECEIVES</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">The edition, the marketplace, the engine</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${bullets}${marketplaceBullet}${custom}
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">02 — THE TERMS</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">Complimentary, and deliberately so</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background-color:#1d1810; border:1px solid #6b5a33; padding:30px 28px;">
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:26px; letter-spacing:3px; color:#e8c860;">COMPLIMENTARY · FOREVER</div>
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:13px; letter-spacing:2px; color:#c9b584; padding-top:10px;">ACADEMIC COLLABORATION · ${biz.toUpperCase()}</div>
              <div style="width:48px; border-top:1px solid #6b5a33; margin:18px auto;"></div>
              <div style="font-family:Georgia, 'Times New Roman', serif; font-size:14px; line-height:1.9; color:#d8cfb8;">
                Your institution is provisioned with an administrator account; your admin provisions<br/>
                and revokes student and faculty credentials directly.<br/>
                <strong style="color:#e8e0cc;">Student work passes an editorial quality gate before publication — and access can be revoked at any time, with immediate effect.</strong><br/>
                <strong style="color:#e8e0cc;">In return we ask one thing: a link from your department's website to punicodex.com</strong> —<br/>
                a backlink that says your institution keeps these names alive. You have your first year; most<br/>
                departments add it in their next site update. We verify it automatically and follow up gently.<br/>
                No fee, no invoice, no renewal.<br/>
                An optional Founding Partner sponsorship tier exists for institutions that also want<br/>
                site-wide placement; it is a separate conversation, and this invitation does not depend on it.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:11px; letter-spacing:5px; color:#8a7a52;">03 — TO PROCEED</div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#e8c860; padding-top:10px;">A fifteen-minute call</div>
        <div style="width:48px; border-top:1px solid #6b5a33; margin:16px 0 0 0;"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 48px 8px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          Reply to this email with a time that suits, and we will walk your department through the platform, the editorial gate, and the marketplace — or apply directly and a curator will arrange the introductory call:
        </div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:18px 48px 10px 48px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#8a6d2f" style="border:1px solid #c9a227;">
              <a href="https://punicodex.com/scholars/apply/" target="_blank" style="display:inline-block; padding:14px 30px; font-family:Georgia, 'Times New Roman', serif; font-size:13px; letter-spacing:3px; color:#0b0a08; text-decoration:none; font-weight:bold;">BEGIN THE COLLABORATION</a>
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-top:12px;">
              <a href="https://punicodex.com/university-sponsorship/" target="_blank" style="font-family:Georgia, 'Times New Roman', serif; font-size:12px; letter-spacing:2px; color:#c9b584; text-decoration:underline;">READ THE FULL PARTNERSHIP OVERVIEW →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:30px 48px 36px 48px;">
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:15px; line-height:1.9; color:#d8cfb8;">
          <p style="margin:0 0 20px 0;">We would be honoured to count ${biz} among the institutions whose students keep these names alive.</p>
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
          980 restorations · 25 pantheons · the Scholarly Edition<br/>
          <a href="https://punicodex.com/scholars/" style="color:#6b6046; text-decoration:underline;">The Scholars Portal</a> &nbsp;·&nbsp; <a href="https://punicodex.com/creatives/" style="color:#6b6046; text-decoration:underline;">The Creatives Marketplace</a>
        </div>
        <div style="font-family:Georgia, 'Times New Roman', serif; font-size:10px; color:#4d4433; line-height:1.7; padding-top:12px;">
          This is a personal, one-time invitation extended to ${biz}. Academic collaboration is complimentary and carries no obligation. If this has reached the wrong desk, reply with 'not for us' and we will not write again.
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
    salutation.replace(/<\/?[^>]+>/g, ''),
    '',
    `PUNICODEX is the Unicode Pantheon — 980 restored names across 25 traditions, each kept at its true Unicode domain.`,
    `We would like to invite ${institution} to join the Scholarly Edition as a complimentary academic collaborator — no cost, no invoice, no renewal.`,
    '',
    `What ${institution} receives:`,
    ...depts.slice(0, 4).map((d) => {
      const b = benefitFor(d);
      return `— ${b.lead} ${b.why}`;
    }),
    customNote ? `— A note from the founder: ${customNote}` : null,
    '',
    'Terms: academic collaboration is complimentary, forever. Your institution provisions its own student accounts; work passes an editorial quality gate; access revokes immediately. In return we ask one thing: a backlink from your department website to punicodex.com within your first year - features start immediately, we verify automatically and follow up gently. An optional paid Founding Partner tier exists separately.',
    '',
    'To proceed: reply with a time for a fifteen-minute call, or apply at https://punicodex.com/scholars/apply/',
    '',
    'With respect,',
    'Martin Khoury — Founder, PUNICODEX',
    'support@punicodex.com · punicodex.com',
    '',
    "If this has reached the wrong desk, reply with 'not for us' and we will not write again.",
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text, preview: preheader };
}

function safeParseArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = { buildUniversityPitch, benefitFor, DEPARTMENT_BENEFITS };
