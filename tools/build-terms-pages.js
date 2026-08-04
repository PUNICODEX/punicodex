#!/usr/bin/env node
/**
 * One-off scaffold: builds the six feature terms pages from the terms/store
 * skeleton (shared head, nav, footer, house CSS) + per-page legal content.
 * The generated pages are then hand-maintained canonical pages, exactly like
 * the existing terms pages. Run: node tools/build-terms-pages.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const skeleton = fs.readFileSync(path.join(ROOT, 'terms', 'store', 'index.html'), 'utf8');

const DATE = 'August 4, 2026';

function build({ slug, title, subtitle, description, breadcrumb, ctaHref, ctaLabel, content }) {
  const containerStart = skeleton.indexOf('<div class="container">');
  const ctaStart = skeleton.indexOf('<div class="footer-cta">');
  if (containerStart === -1 || ctaStart === -1) throw new Error('skeleton markers not found');

  let head = skeleton.slice(0, containerStart);
  head = head
    .replace(/<title>[^<]*<\/title>/, `<title>${title} — PUNICODEX</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${description}">`
    )
    .replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="https://punicodex.com/terms/${slug}/">`
    )
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title} — PUNICODEX">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
    .replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="https://punicodex.com/terms/${slug}/">`
    )
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title} — PUNICODEX">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);

  const tail = skeleton
    .slice(ctaStart)
    .replace(/<a href="\/store\/">Visit the Reliquary<\/a>/, `<a href="${ctaHref}">${ctaLabel}</a>`);

  const body = `    <nav style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">
      <a href="/terms/" style="color:var(--text-muted);">Terms &amp; Conditions</a> <span style="margin:0 0.5rem;">/</span> <span style="color:var(--accent);">${breadcrumb}</span>
    </nav>
    <header class="header">
      <div class="pc-fx-stage pc-fx-tablet-stage" role="img" aria-label="The Tablet — cuneiform wedges pressing into clay, row by row">
        <canvas class="pc-fx-tablet" aria-hidden="true"></canvas>
        <noscript><img class="terms-tablet" src="/assets/brand/13-page-visuals/legal/sealed-tablet.png" alt="The Sealed Tablet — an obsidian tablet with a gold wax seal" width="280" height="280" loading="lazy" decoding="async"></noscript>
      </div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <span class="last-updated">Effective Date: ${DATE}</span>
    </header>

${content}
`;

  const html = `${head}<div class="container">
${body}
  ${tail.startsWith('  ') ? tail.slice(2) : tail}`;
  const out = path.join(ROOT, 'terms', slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`terms/${slug}/index.html written`);
}

const ACL = `<div class="section">
      <h2>Australian Consumer Law</h2>
      <div class="highlight-box">
        <p>Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy you may have under the <strong>Australian Consumer Law</strong> (Schedule 2 of the <em>Competition and Consumer Act 2010</em> (Cth)) or any other applicable law that cannot lawfully be excluded, restricted, or modified. Where a service supplied by us carries a consumer guarantee, those guarantees apply in full.</p>
      </div>
    </div>`;

const LIABILITY = `<div class="section">
      <h2>Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, and subject to your non-excludable rights under the Australian Consumer Law and other applicable consumer protection legislation:</p>
      <ul>
        <li>We are not liable for any indirect, incidental, special, consequential, or punitive loss or damage, including loss of profits, revenue, goodwill, data, or opportunity, arising from or in connection with the service.</li>
        <li>Our aggregate liability for all claims arising from or in connection with the service is limited, at our election, to the re-supply of the service or the cost of re-supply, or — where re-supply is not a meaningful remedy — to AUD $100.</li>
        <li>Nothing in this section limits liability that cannot lawfully be limited, including liability arising under the Australian Consumer Law.</li>
      </ul>
    </div>`;

const CHANGES = `<div class="section">
      <h2>Changes to the Service and these Terms</h2>
      <p>We may improve, suspend, or discontinue any part of the service, and may update these Terms from time to time. The current version is always posted at this address with its effective date. Continued use of the service after an update constitutes acceptance of the updated Terms. Where a change materially disadvantages you, we will take reasonable steps to bring it to your attention before it takes effect.</p>
    </div>`;

const GOVERNING = `<div class="section">
      <h2>Governing Law and Disputes</h2>
      <p>These Terms are governed by the laws of <strong>New South Wales, Australia</strong>, without regard to conflict of law principles. Any dispute shall first be addressed through good-faith negotiation. If unresolved within 30 days, the dispute shall be submitted to binding arbitration in accordance with the rules of the <strong>Australian Centre for International Commercial Arbitration (ACICA)</strong>, seated in Sydney, New South Wales. Nothing in this section prevents a consumer from pursuing a remedy that cannot lawfully be excluded under applicable consumer protection law, including recourse to a court or tribunal of competent jurisdiction.</p>
    </div>`;

const CONTACT = `<div class="section">
      <h2>Contact</h2>
      <p>For questions about these Terms or the service:</p>
      <p><strong>Email:</strong> <a href="mailto:support@punicodex.com">support@punicodex.com</a></p>
      <p><strong>Entity:</strong> PUNICODEX / Hekaverse</p>
    </div>`;

function related(current) {
  const all = [
    ['/terms/', 'Terms &amp; Conditions', 'global provisions applying to all PUNICODEX services'],
    ['/terms/advertising/', 'Advertising Space Lease Agreement', 'temple page advertising leases'],
    ['/terms/store/', 'Reliquary Sale Terms', 'print-on-demand merchandise'],
    ['/terms/creatives/', 'Creative Marketplace Terms', 'student creator licensing and revenue share'],
    ['/terms/ink/', 'Attested Script Verification Terms', 'the Check Before You Ink verifier'],
    ['/terms/appraise/', 'Appraisal &amp; Estimate Terms', 'domain appraisal estimates'],
    ['/terms/game/', 'Mythic Duel &amp; Ink Terms', 'the card game, virtual currency, and packs'],
    ['/terms/api/', 'API &amp; Developer Terms', 'programmatic access to the lexicon and services'],
    ['/terms/authenticity/', 'Authenticity &amp; Brand-Protection Terms', 'verdicts, the checker, and the extension'],
    ['/terms/oracle/', 'Oracle Terms', 'the reflective oracle'],
    ['/privacy/', 'Privacy Policy', 'how we handle personal data'],
    ['/terms/data-use/', 'Data Use Policy', 'dataset licensing under CC BY 4.0'],
  ];
  const items = all
    .filter(([href]) => href !== `/terms/${current}/`)
    .map(([href, label, note]) => `        <li><a href="${href}">${label}</a> — ${note}</li>`)
    .join('\n');
  return `<div class="section">
      <h2>Related Documents</h2>
      <ul>
${items}
      </ul>
    </div>`;
}

/* ──────────────────────────── INK ──────────────────────────── */

build({
  slug: 'ink',
  title: 'Attested Script Verification Terms',
  subtitle: 'PUNICODEX Check Before You Ink',
  breadcrumb: 'Check Before You Ink',
  description:
    'Terms for the Check Before You Ink script-verification service: informational purpose, corpus limits, no warranty of correctness, permanence and personal-responsibility provisions, and consumer rights.',
  ctaHref: '/ink/',
  ctaLabel: 'Open Check Before You Ink',
  content: `    <div class="section">
      <h2>1. Definitions</h2>
      <dl class="definition">
        <dt>"Verifier" / "the service"</dt>
        <dd>The Check Before You Ink tool at <a href="/ink/">punicodex.com/ink/</a>, including its attested-script corpus, structural script analysis, myth corrections, and any related output.</dd>
      </dl>
      <dl class="definition">
        <dt>"Attested form"</dt>
        <dd>An original-script form drawn from inscriptions, manuscripts, or standard scholarly editions and recorded in the PuniCodex corpus with per-sign provenance.</dd>
      </dl>
      <dl class="definition">
        <dt>"Corpus"</dt>
        <dd>The PuniCodex collection of verified original scripts and associated provenance data, as amended from time to time.</dd>
      </dl>
    </div>

    <div class="section">
      <h2>2. Plain-English summary</h2>
      <div class="highlight-box">
        <p>We built this tool so fewer people carry a permanent mistake. But the law requires us to be exact about what it is: <strong>an informational reference, not a guarantee</strong>. A green verdict means a string matches our corpus; it does not certify that the text is right for your purpose, that it means what you intend, or that you should tattoo it. The decision to mark your body is yours alone, and nothing on this page changes that.</p>
      </div>
    </div>

    <div class="section">
      <h2>3. Informational service only</h2>
      <p>The Verifier is provided for general informational and educational purposes. It is not, and does not constitute, professional advice of any kind — including linguistic, philological, legal, cultural, or religious advice — and no client, advisory, or fiduciary relationship is created by your use of it.</p>
      <p>Verification output describes only the relationship between your input and our corpus: whether a string matches an attested form we hold, and the structural composition of the characters you paste. It does not assess meaning, appropriateness, cultural sensitivity, or suitability for body art, and it must not be represented to others as a certification.</p>
    </div>

    <div class="section">
      <h2>4. Corpus limits and evolving scholarship</h2>
      <ul>
        <li>The corpus covers the mythological canon documented in this project. It does not contain every name, word, or writing system ever used. <strong>"Not in corpus" means we cannot vouch for a string; it never means the string is wrong.</strong></li>
        <li>Epigraphy and philology are living disciplines. Attested forms, readings, and period attributions may be revised as scholarship advances, and the corpus may be updated, corrected, or withdrawn without notice.</li>
        <li>Where a reading is a modern scholarly convention (for example, the vocalization of Egyptian names), the service labels it as such. Conventions are not attestations.</li>
      </ul>
    </div>

    <div class="section">
      <h2>5. Permanence and personal responsibility</h2>
      <p>Tattoos, engravings, and comparable marks are permanent or enduring modifications. You acknowledge and agree that:</p>
      <ul>
        <li>the decision to apply any text to your body or property is yours alone, made at your own risk;</li>
        <li>before acting on any output of the Verifier, you should independently confirm it with a qualified scholar of the relevant language or script, particularly where the mark is permanent;</li>
        <li>we do not control and are not responsible for the accuracy of any tattoo artist, engraver, printer, or other third party who reproduces a form, nor for alterations they introduce;</li>
        <li>meanings and connotations of sacred or historical scripts may carry religious or cultural significance for others, for which we accept no responsibility.</li>
      </ul>
    </div>

    <div class="section">
      <h2>6. No warranty of correctness</h2>
      <p>We work to a documented accuracy standard and correct errors when they are identified. Nevertheless, to the maximum extent permitted by law, the Verifier and its output are provided "as is" and "as available", without warranty of any kind, express or implied, including any warranty of accuracy, completeness, merchantability, or fitness for a particular purpose. We do not warrant that any attested form is the only correct form, that a tradition admits a single spelling, or that the corpus is free of error.</p>
    </div>

    <div class="section">
      <h2>7. Intellectual property</h2>
      <p>Ancient scripts and the attested forms themselves are humanity's heritage; we claim no ownership over them. Our compilation, provenance annotations, and corpus structure are licensed under the terms in our <a href="/terms/data-use/">Data Use Policy</a> (CC BY 4.0). Nothing in these Terms grants you any right to represent our output as a professional certification.</p>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('ink')}
`,
});

/* ──────────────────────────── APPRAISE ──────────────────────────── */

build({
  slug: 'appraise',
  title: 'Appraisal & Estimate Terms',
  subtitle: 'PUNICODEX Domain Appraisal Engine',
  breadcrumb: 'Appraise',
  description:
    'Terms for the PUNICODEX appraisal engine: automated estimates are not professional valuations or financial advice, no guarantee of market outcomes, availability-data caveats, affiliate disclosure, and consumer rights.',
  ctaHref: '/appraise/',
  ctaLabel: 'Open the Appraisal Engine',
  content: `    <div class="section">
      <h2>1. Definitions</h2>
      <dl class="definition">
        <dt>"Appraisal engine" / "the service"</dt>
        <dd>The automated estimation tools at <a href="/appraise/">punicodex.com/appraise/</a> and through the API, which produce indicative value estimates for domain names, including Unicode (IDN) names.</dd>
      </dl>
      <dl class="definition">
        <dt>"Estimate"</dt>
        <dd>Any figure, range, verdict, or factor breakdown produced by the appraisal engine.</dd>
      </dl>
    </div>

    <div class="section">
      <h2>2. Plain-English summary</h2>
      <div class="highlight-box">
        <p>An estimate from our engine is <strong>a model's opinion, not a valuation</strong>. It is built from meaning, attestation, and demand signals — never from a promise about what a buyer will pay. Do not spend, lend, invest, or litigate on the strength of it without independent professional advice.</p>
      </div>
    </div>

    <div class="section">
      <h2>3. Estimates are not valuations or advice</h2>
      <p>Estimates are generated automatically by a documented model from the data available to it at the time. They are not professional appraisals, sworn valuations, or price opinions issued by a qualified valuer, and they do not constitute financial, investment, accounting, taxation, or legal advice. You must not rely on an Estimate as the sole basis for any purchase, sale, lease, loan, or dispute, and you should obtain independent professional advice before any transaction of consequence.</p>
    </div>

    <div class="section">
      <h2>4. No guarantee of market outcomes</h2>
      <ul>
        <li>Domain and digital-asset markets are thin, volatile, and idiosyncratic. A name may sell for far more or far less than any Estimate, or not sell at all.</li>
        <li>Availability, registrar pricing, and registry eligibility data are refreshed periodically and may be stale, incomplete, or wrong at the moment you read them. Always confirm availability and price directly with the registrar or registry before acting.</li>
        <li>Historical results and benchmark figures shown in the engine do not guarantee future performance.</li>
      </ul>
    </div>

    <div class="section">
      <h2>5. Affiliate disclosure</h2>
      <p>Links to registrars and related providers may be affiliate links, from which we may earn a commission at no additional cost to you. Affiliate relationships never influence an Estimate: the model's factors and constants are published in our methodology documentation, and no registrar or partner can purchase a higher Estimate.</p>
    </div>

    <div class="section">
      <h2>6. Your inputs</h2>
      <p>Where the service accepts inputs from you (names, claims of ownership, or context), you are responsible for their accuracy and for your right to submit them. You must not submit another person's personal information or use the service to harass, defame, or mislead.</p>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('appraise')}
`,
});

/* ──────────────────────────── GAME ──────────────────────────── */

build({
  slug: 'game',
  title: 'Mythic Duel & Ink Terms',
  subtitle: 'PUNICODEX Card Game, Virtual Currency, and Packs',
  breadcrumb: 'Mythic Duel',
  description:
    'Terms for Mythic Duel: virtual Ink currency (no cash value, non-refundable), randomized pack contents with published odds, no gambling, Australian classification guidance, and consumer rights.',
  ctaHref: '/game/',
  ctaLabel: 'Enter Mythic Duel',
  content: `    <div class="section">
      <h2>1. Definitions</h2>
      <dl class="definition">
        <dt>"Mythic Duel" / "the game"</dt>
        <dd>The PUNICODEX card game at <a href="/game/">punicodex.com/game/</a>, including the card collection, packs, decks, duels, and progression systems.</dd>
      </dl>
      <dl class="definition">
        <dt>"Ink"</dt>
        <dd>The in-game virtual currency used within Mythic Duel, whether earned through play or purchased.</dd>
      </dl>
      <dl class="definition">
        <dt>"Pack"</dt>
        <dd>A randomized selection of in-game cards obtained in exchange for Ink.</dd>
      </dl>
    </div>

    <div class="section">
      <h2>2. Plain-English summary</h2>
      <div class="highlight-box">
        <p>Ink is play money in the strictest sense: <strong>it can never be converted back to money, sold, or transferred, and it buys nothing outside the game</strong>. Packs contain randomized cards — you are buying a surprise, not a specific card, and the odds of every rarity are published on this page. If randomized surprises are not for you, do not buy Ink.</p>
      </div>
    </div>

    <div class="section">
      <h2>3. Virtual currency</h2>
      <ul>
        <li>Ink is a limited, non-exclusive, revocable licence to use a feature of the game. It is not money, currency, stored value, or property of any kind, and it does not accrue interest or value.</li>
        <li>Ink has no cash value and cannot be redeemed, exchanged, sold, transferred, or converted into money, goods, or services outside the game, whether through us or anyone else.</li>
        <li>Except as required by law (including the Australian Consumer Law), all purchases of Ink are final and non-refundable, including on account closure, suspension, or loss of access.</li>
        <li>We may adjust, cap, or rebalance Ink and the in-game economy for the health of the game, and may discontinue Ink or the game entirely; where a discontinuation permanently removes purchased, unused Ink, we will provide a remedy to the extent required by law.</li>
      </ul>
    </div>

    <div class="section">
      <h2>4. Randomized pack contents and odds</h2>
      <p>Packs contain cards selected at random from a published pool. We disclose the relative likelihood of each rarity tier below; odds describe the long-run average and do not guarantee any outcome in any particular pack or session.</p>
      <table class="pricing-table">
        <tr><th>Contents</th><th>Approximate likelihood</th></tr>
        <tr><td>Flagship-edition card (common printing)</td><td>the great majority of cards</td></tr>
        <tr><td>Holo edition</td><td>a clear minority of cards</td></tr>
        <tr><td>Full-art edition</td><td>rare</td></tr>
        <tr><td>Secret original-script edition</td><td>very rare</td></tr>
      </table>
      <p>Precise percentages are published in the in-game pack screen before every purchase and prevail over this summary if they differ. Because every player earns Ink through play, nothing in the game requires a purchase.</p>
    </div>

    <div class="section">
      <h2>5. Not gambling</h2>
      <p>The game involves no wagering, no cash-out, and no prizes of monetary value. Cards and Ink cannot be cashed out, sold to us, or exchanged for anything outside the game. If you feel your play is no longer recreational, Australian support is available 24/7 through <strong>Gambling Help Online (1800 858 858)</strong>.</p>
    </div>

    <div class="section">
      <h2>6. Age and classification guidance</h2>
      <p>Mythic Duel is not classified by the Australian Classification Board. Because it offers paid randomized in-game items, Australian guidance treats such content as suitable only for mature audiences: <strong>you must be 18 or older, or have the consent and supervision of a parent or guardian, to purchase Ink</strong>. Parents and guardians are responsible for purchases made by minors in their care.</p>
    </div>

    <div class="section">
      <h2>7. Fair play and saved games</h2>
      <ul>
        <li>You must not exploit bugs, automate play, or interfere with other players' games. We may suspend or remove accounts (or reset progress) for cheating or abuse, with notice where practicable.</li>
        <li>Game progress is stored partly on your own device; clearing browser data can delete it. We are not liable for loss of local progress, and no real-money loss can result from it — purchased Ink is recorded server-side and restored on sign-in.</li>
      </ul>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('game')}
`,
});

/* ──────────────────────────── API ──────────────────────────── */

build({
  slug: 'api',
  title: 'API & Developer Terms',
  subtitle: 'PUNICODEX Programmatic Access',
  breadcrumb: 'API',
  description:
    'Terms for the PUNICODEX APIs and SDKs: licence scope, keys and rate limits, attribution, prohibited uses, availability and accuracy disclaimers, suspension, and consumer rights.',
  ctaHref: '/api/v1/docs/',
  ctaLabel: 'Read the API Documentation',
  content: `    <div class="section">
      <h2>1. Definitions</h2>
      <dl class="definition">
        <dt>"APIs"</dt>
        <dd>The PUNICODEX application programming interfaces (including /api/v1 and /api/v2), SDKs, and associated documentation.</dd>
      </dl>
      <dl class="definition">
        <dt>"API key"</dt>
        <dd>A credential issued to you for authenticated access, identified in our systems only by its hash.</dd>
      </dl>
      <dl class="definition">
        <dt>"Data"</dt>
        <dd>Content returned by the APIs, including lexicon data, which is licensed under CC BY 4.0 as described in the <a href="/terms/data-use/">Data Use Policy</a>.</dd>
      </dl>
    </div>

    <div class="section">
      <h2>2. Licence and keys</h2>
      <p>We grant you a non-exclusive, non-transferable, revocable licence to access the APIs within your plan's limits for lawful purposes. You must keep your API keys confidential, must not share, sell, or embed them in client-side code where they can be extracted, and are responsible for all use made under them. Tell us promptly at <a href="mailto:support@punicodex.com">support@punicodex.com</a> if a key is compromised.</p>
    </div>

    <div class="section">
      <h2>3. Limits and fair use</h2>
      <ul>
        <li>Each plan carries published rate limits. You must not circumvent limits, rotate keys, or use the APIs to stress, probe, or attack our infrastructure or anyone else's.</li>
        <li>You must not use the APIs to build a competing lexicon dataset presented without attribution, to misrepresent automated verdicts or estimates as professional advice, or for unlawful surveillance, spam, or deception.</li>
        <li>Lexicon data returned by the APIs is licensed CC BY 4.0 — attribution is required as set out in the Data Use Policy.</li>
      </ul>
    </div>

    <div class="section">
      <h2>4. Availability and accuracy</h2>
      <p>The APIs are provided "as is" and "as available". We do not warrant uninterrupted availability, error-free responses, or the accuracy of any estimate, verdict, or availability signal returned, and we may change endpoints, fields, or limits on reasonable notice (versioned endpoints are supported as documented). Features described as beta or preview may change without notice.</p>
    </div>

    <div class="section">
      <h2>5. Suspension and termination</h2>
      <p>We may suspend or revoke access immediately for abuse, security risk, non-payment, or breach of these Terms, and otherwise on reasonable notice. You may stop using the APIs at any time; revocation of your keys ends your access. Provisions that by their nature should survive (including attribution obligations already incurred, disclaimers, and liability provisions) survive termination.</p>
    </div>

    <div class="section">
      <h2>6. Paid plans</h2>
      <p>Paid API plans are billed in advance through our payment processor. Except as required by law (including the Australian Consumer Law), fees are non-refundable for partial periods. If we materially degrade a paid plan mid-term, your remedy is a pro-rata credit or refund for the unused portion.</p>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('api')}
`,
});

/* ──────────────────────────── AUTHENTICITY ──────────────────────────── */

build({
  slug: 'authenticity',
  title: 'Authenticity & Brand-Protection Terms',
  subtitle: 'PUNICODEX Name Authenticity Checker, Threat Feeds, and Browser Extension',
  breadcrumb: 'Authenticity',
  description:
    'Terms for the Authenticity checker, threat intelligence, and browser extension: probabilistic verdicts, false positives and negatives, no guarantee of safety, blocking behaviour, and consumer rights.',
  ctaHref: '/authenticity/',
  ctaLabel: 'Open the Authenticity Checker',
  content: `    <div class="section">
      <h2>1. Definitions</h2>
      <dl class="definition">
        <dt>"Authenticity services"</dt>
        <dd>The name authenticity checker at <a href="/authenticity/">punicodex.com/authenticity/</a>, the threat feed and policy APIs, the browser extension (including its warnings and interstitial blocking pages), and any associated verdicts, scores, or reports.</dd>
      </dl>
      <dl class="definition">
        <dt>"Verdict"</dt>
        <dd>An automated assessment produced by the authenticity services (for example: likely authentic, suspicious, high-risk).</dd>
      </dl>
    </div>

    <div class="section">
      <h2>2. Plain-English summary</h2>
      <div class="highlight-box">
        <p>Our models are good and getting better — and they are still models. <strong>A Verdict is a probability, not a promise.</strong> A "likely authentic" result cannot make a malicious name safe, and a "high-risk" flag is not proof of wrongdoing. Keep your own defences on, and treat our output as one signal among several.</p>
      </div>
    </div>

    <div class="section">
      <h2>3. Probabilistic verdicts; false positives and negatives</h2>
      <p>The authenticity services evaluate confusables, homographs, and threat intelligence using statistical models. You acknowledge that:</p>
      <ul>
        <li>false positives occur — legitimate names may be flagged; false negatives occur — malicious names may pass;</li>
        <li>models are retrained and updated, so the same input may receive different Verdicts over time;</li>
        <li>no Verdict is a guarantee that a name, domain, message, or site is safe, genuine, malicious, or fraudulent, and no Verdict should be the sole basis for a security, employment, contractual, or legal decision.</li>
      </ul>
    </div>

    <div class="section">
      <h2>4. The browser extension and blocking</h2>
      <p>Where the extension is configured to block or warn, it acts on the Verdict available at that moment. We are not responsible for access you lose to a legitimate destination because of a false positive, or for harm that follows a false negative. You can adjust or disable warnings and blocking in the extension settings at any time; doing so is your choice and your risk.</p>
    </div>

    <div class="section">
      <h2>5. Acceptable use</h2>
      <p>You must not misrepresent Verdicts to third parties (including presenting a flag as proof of guilt), use the services to defame or harass, probe or attempt to evade the models in order to make malicious names pass, or use the services in violation of applicable law.</p>
    </div>

    <div class="section">
      <h2>6. Telemetry</h2>
      <p>The authenticity services process the names and strings you submit in order to answer them, and may retain privacy-screened telemetry to measure and reduce false-positive rates, as described in our <a href="/privacy/">Privacy Policy</a>. Do not submit other people's personal information.</p>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('authenticity')}
`,
});

/* ──────────────────────────── ORACLE ──────────────────────────── */

build({
  slug: 'oracle',
  title: 'Oracle Terms',
  subtitle: 'PUNICODEX Reflective Oracle',
  breadcrumb: 'Oracle',
  description:
    'Terms for the PUNICODEX Oracle: reflective and entertainment purposes only, not advice of any kind, automated content may be inaccurate, and consumer rights.',
  ctaHref: '/oracle.html',
  ctaLabel: 'Consult the Oracle',
  content: `    <div class="section">
      <h2>1. The service</h2>
      <p>The Oracle at <a href="/oracle.html">punicodex.com/oracle.html</a> produces reflective, mythologically themed responses to questions you pose. It is an automated system: responses are generated by software drawing on the PuniCodex lexicon and corpus.</p>
    </div>

    <div class="section">
      <h2>2. Plain-English summary</h2>
      <div class="highlight-box">
        <p>The Oracle speaks in the register of myth, and it means nothing more than that. <strong>It is for reflection and enjoyment — it is not guidance for your life, your money, your health, or your legal affairs.</strong> If a response ever feels consequential, treat it as literature, not instruction.</p>
      </div>
    </div>

    <div class="section">
      <h2>3. Not advice</h2>
      <p>Oracle responses do not constitute advice of any kind — including medical, psychological, legal, financial, religious, or spiritual-direction advice — and must not be relied on for any decision. They are generated content and may be inaccurate, inapposite, or strange. No advisory, therapeutic, or pastoral relationship is created by your use.</p>
    </div>

    <div class="section">
      <h2>4. Your questions</h2>
      <p>Do not submit personal information about yourself or others, and do not submit anything unlawful, harmful, or intended to produce abusive output. Questions are processed to produce responses and handled as described in our <a href="/privacy/">Privacy Policy</a>.</p>
    </div>

${ACL}

${LIABILITY}

${CHANGES}

${GOVERNING}

${CONTACT}

${related('oracle')}
`,
});

console.log('done');
