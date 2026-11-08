#!/usr/bin/env node
/* PuniCodex — The Archē experience page generator.
 *
 * Builds /genesis/index.html: an immersive, scroll-driven cosmogony.
 * Act I (The Ascent) walks the first principles from Chaos to the Wheel,
 * each summoning every pantheon's bearers. The Turn inverts the world.
 * Act II (The Descent) fans each principle into the modern industries it
 * powers, with tendrils linking into the Pattern Atlas panels.
 *
 * Canonical data: scripts/arche-chapters.js (validated against the lexicon
 * and the industry-pattern graph by test/arche.test.js).
 * The page is fully readable without JS (SEO + noscript); js/arche.js
 * upgrades it into the cinematic experience.
 *
 * Usage: node scripts/generate-arche-page.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { PROLOGUE, ASCENT, TURN, DESCENT, FINALE } = require('./arche-chapters.js');
const { chapterRoster, finaleRoster } = require('./arche-assignments.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'genesis', 'index.html');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { INDUSTRY_GROUPS } = require(path.join(ROOT, 'type', 'js', 'industry-patterns.js'));
const byId = new Map(LEXICON.map((e) => [e.id, e]));

/* Industry id → display name + tagline (the pattern atlas made visible after
 * the Turn). Act II shows INDUSTRIES, mapped to their /patterns/ panels —
 * no gods here; the gods were the ascent's business. */
const industryMeta = new Map(INDUSTRY_GROUPS.map((g) => [g.industry, g]));

const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const deityCard = (d, i) => {
  const e = byId.get(d.id);
  if (!e) throw new Error(`arche: unknown lexicon id "${d.id}"`);
  const depth = (i % 3) + 1;
  return `                <a class="arche-card" href="/${e.id}/" data-depth="${depth}" style="--d:${i}">
                    <span class="arche-card-name">${esc(e.unicode)}</span>
                    <span class="arche-card-pantheon">${esc(e.pantheon)}</span>
                    <span class="arche-card-line">${esc(d.line)}</span>
                    <span class="arche-card-domain">${esc(e.domain)}</span>
                </a>`;
};

const tendrilCard = (t, i) => {
  const meta = industryMeta.get(t.industry);
  return `                <a class="arche-tendril" href="/patterns/#pa-panel-${esc(t.industry)}" data-industry="${esc(t.industry)}" style="--d:${i}">
                    <span class="arche-tendril-dot" aria-hidden="true"></span>
                    <span class="arche-tendril-body">
                        <span class="arche-tendril-name">${esc(meta ? meta.name : t.industry)}</span>
                        <span class="arche-tendril-tagline">${esc(meta ? meta.tagline : '')}</span>
                        <span class="arche-tendril-line">${esc(t.line)}</span>
                    </span>
                </a>`;
};

const verseHtml = (verse) =>
  verse.map((l, i) => `                <p class="arche-verse-line" style="--d:${i}">${esc(l)}</p>`).join('\n');

const choirChips = (chId) => {
  const choir = chapterRoster(chId).filter((r) => !r.voiced);
  if (!choir.length) return '';
  const chips = choir
    .map(
      (r) =>
        `                    <a class="arche-chip" href="/${r.id}/" title="${esc(r.pantheon)} — ${esc(r.domain)}">${esc(r.unicode)}</a>`
    )
    .join('\n');
  return `                <div class="arche-choir" aria-label="The choir of ${esc(chId)}">
                    <p class="arche-choir-label">And the choir answers <span>(${choir.length} more)</span></p>
${chips}
                </div>`;
};

const ascentScene = (ch, i) => `        <section class="arche-scene arche-scene--ascent" id="scene-${ch.id}" data-scene="${ch.id}" data-fx="${ch.id}" data-act="1" aria-label="${esc(ch.title)}">
            <div class="arche-scene-inner">
                <header class="arche-scene-head">
                    <span class="arche-kicker">${ROMAN[i]} · ${esc(ch.epigraph)}</span>
                    <h2 class="arche-title"><a class="arche-title-link" href="/genesis/${ch.id}/">${esc(ch.title)}</a></h2>
                </header>
                <div class="arche-verse">
${verseHtml(ch.verse)}
                </div>
                <div class="arche-cards">
${ch.deities.map(deityCard).join('\n')}
                </div>
${choirChips(ch.id)}
                <p class="arche-outro">${esc(ch.outro)}</p>
            </div>
        </section>`;

const descentScene = (ch, i) => {
  const up = ASCENT.find((a) => a.id === ch.echoes);
  return `        <section class="arche-scene arche-scene--descent" id="scene-${ch.id}" data-scene="${ch.id}" data-fx="${ch.id}" data-act="2" data-echoes="${esc(ch.echoes)}" aria-label="${esc(ch.title)}">
            <div class="arche-scene-inner">
                <header class="arche-scene-head">
                    <span class="arche-kicker">${ROMAN[i]} · echoes ${esc(up ? up.title : ch.echoes)}</span>
                    <h2 class="arche-title">${esc(ch.title)}</h2>
                    <p class="arche-thesis">${esc(ch.thesis)}</p>
                </header>
                <div class="arche-tendrils" data-tendrils>
                    <svg class="arche-tendril-svg" aria-hidden="true"></svg>
                    <p class="arche-choir-label">The pattern atlas, live — each industry beside its ancient seats</p>
${ch.tendrils.map(tendrilCard).join('\n')}
                </div>
            </div>
        </section>`;
};

const railDots = [
  `<button class="arche-rail-dot" data-goto="prologue" aria-label="Prologue"><span>ΑΡΧΗ</span></button>`,
  ...ASCENT.map(
    (ch, i) =>
      `<button class="arche-rail-dot" data-goto="scene-${ch.id}" aria-label="${esc(ch.title)}"><span>${ROMAN[i]}</span></button>`
  ),
  `<button class="arche-rail-dot arche-rail-dot--turn" data-goto="turn" aria-label="The Turn"><span>ΣΤΡΟΦΗ</span></button>`,
  ...DESCENT.map(
    (ch, i) =>
      `<button class="arche-rail-dot arche-rail-dot--descent" data-goto="scene-${ch.id}" aria-label="${esc(ch.title)}"><span>${ROMAN[i]}</span></button>`
  ),
  `<button class="arche-rail-dot" data-goto="finale" aria-label="The Restoration"><span>ΤΕΛΟΣ</span></button>`,
].join('\n                ');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'The Archē — From the First Chaos to the Modern World',
  url: 'https://punicodex.com/genesis/',
  description:
    'An interactive cosmogony: the first principles from Chaos to the Wheel, every pantheon answering the same first questions — then the turn, where each principle descends into the modern industries it powers.',
  isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: 'https://punicodex.com/' },
  about: ASCENT.map((ch) => ({ '@type': 'Thing', name: ch.title, alternateName: ch.epigraph })),
};

// Per-chapter share/index pages: /genesis/{id}/ — the ascent scene with its
// Act II twin, crawlable and shareable, deep-linking into the experience.
const chapterPage = (ch, i) => {
  const twin = DESCENT.find((d) => d.echoes === ch.id);
  const prev = ASCENT[i - 1];
  const next = ASCENT[i + 1];
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#050505">
    <title>${ROMAN[i]}. ${esc(ch.title)} — The Archē | PuniCodex</title>
    <meta name="description" content="${esc(ch.epigraph)} — ${esc(ch.verse[0])}">
    <link rel="canonical" href="https://punicodex.com/genesis/${ch.id}/">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${ROMAN[i]}. ${esc(ch.title)} — The Archē">
    <meta property="og:description" content="${esc(ch.verse.join(' '))}">
    <meta property="og:url" content="https://punicodex.com/genesis/${ch.id}/">
    <meta property="og:image" content="https://punicodex.com/assets/images/og-default.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/arche.css">
</head>
<body class="arche-body arche-chapter">
    <a class="arche-exit" href="/genesis/" aria-label="The full Archē experience">
        <img src="/assets/brand/01-logos/punicodex-wordmark-ivory-360.png" alt="PuniCodex" width="173" height="18">
    </a>
    <main class="arche-stage">
        <section class="arche-scene is-active">
            <div class="arche-scene-inner">
                <header class="arche-scene-head">
                    <span class="arche-kicker">${ROMAN[i]} · ${esc(ch.epigraph)} · <a href="/genesis/#scene-${ch.id}">enter the experience ↓</a></span>
                    <h1 class="arche-title">${esc(ch.title)}</h1>
                </header>
                <div class="arche-verse">
${verseHtml(ch.verse)}
                </div>
                <div class="arche-cards">
${ch.deities.map(deityCard).join('\n')}
                </div>
${choirChips(ch.id)}
                <p class="arche-outro">${esc(ch.outro)}</p>
${
  twin
    ? `                <div class="arche-tendrils" data-tendrils>
                    <p class="arche-choir-label">${esc(twin.title)}</p>
                    <p class="arche-thesis">${esc(twin.thesis)}</p>
${twin.tendrils.map(tendrilCard).join('\n')}
                </div>`
    : ''
}
                <nav class="arche-chapter-nav" aria-label="Chapters">
                    ${prev ? `<a class="arche-begin" href="/genesis/${prev.id}/">← ${esc(prev.title)}</a>` : '<a class="arche-begin" href="/genesis/">ΑΡΧΗ</a>'}
                    ${next ? `<a class="arche-begin" href="/genesis/${next.id}/">${esc(next.title)} →</a>` : '<a class="arche-begin" href="/genesis/the-end/">ΤΕΛΟΣ →</a>'}
                </nav>
            </div>
        </section>
    </main>
</body>
</html>
`;
};

const page = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#050505">
    <title>The Archē — From the First Chaos to the Modern World | PuniCodex</title>
    <meta name="description" content="An interactive cosmogony: Chaos, the One, Earth and Sky, Light, the Deep, Thunder, Order, Wisdom, Love, War, Death, Trickery, the Wheel — every pantheon's answer to the first questions, then the turn, where each principle descends into the modern industries it powers.">
    <link rel="canonical" href="https://punicodex.com/genesis/">
    <meta property="og:type" content="website">
    <meta property="og:title" content="The Archē — From the First Chaos to the Modern World">
    <meta property="og:description" content="Every pantheon's answer to the first questions — then the turn, where each principle descends into the modern industries it powers.">
    <meta property="og:url" content="https://punicodex.com/genesis/">
    <meta property="og:image" content="https://punicodex.com/assets/images/og-default.png">
    <meta property="og:site_name" content="PuniCodex">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
    <link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/02-favicons/favicon-32x32.png">
    <link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/arche.css">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <link rel="stylesheet" href="/css/arche-identity.css?v=2">
</head>
<body class="arche-body">
    <aside class="arche-identity-gate" id="arche-identity-gate" hidden aria-labelledby="arche-identity-title">
        <div class="arche-identity-gate-card">
            <p class="arche-identity-kicker">The First Principles</p>
            <h2 id="arche-identity-title">Begin at the beginning.</h2>
            <p>Before the gods had names, the world had principles. Travel from the unshaped to order, craft, memory, and renewal—then watch those same principles unfold into the industries of the modern world.</p>
            <p>Your free PuniCodex Account keeps your place. Leave at any scene and return to the same one; the Archē never forces a replay.</p>
            <div class="arche-identity-actions">
                <a href="/account/login/?next=/genesis/">Enter with your account</a>
                <a href="/account/login/?view=register&amp;next=/genesis/">Create a free account</a>
            </div>
            <p class="arche-identity-note">No purchase is required. Your progress belongs to you.</p>
        </div>
    </aside>
    <canvas id="arche-fx" aria-hidden="true"></canvas>

    <a class="arche-exit" href="/" aria-label="PuniCodex home">
        <img src="/assets/brand/01-logos/punicodex-wordmark-ivory-360.png" alt="PuniCodex" width="173" height="18">
    </a>

    <nav class="arche-rail" aria-label="Chapters">
                ${railDots}
    </nav>

    <div class="arche-controls">
        <button class="arche-autoplay" data-autoplay aria-pressed="false">
            <span class="arche-autoplay-icon" aria-hidden="true">▶</span>
            <span class="arche-autoplay-label">Cinematic</span>
        </button>
        <button class="arche-sound" data-sound aria-pressed="false" hidden>
            <span aria-hidden="true">♪</span>
            <span class="arche-sound-label">Sound</span>
        </button>
    </div>

    <main class="arche-stage" id="arche-stage">

        <section class="arche-scene arche-scene--prologue is-active" id="prologue" data-scene="prologue" data-fx="prologue" data-act="0" aria-label="The Archē">
            <div class="arche-scene-inner arche-scene-inner--center">
                <p class="arche-kicker arche-kicker--big">${esc(PROLOGUE.kicker)}</p>
                <h1 class="arche-title arche-title--huge">${esc(PROLOGUE.title)}</h1>
                <div class="arche-verse">
${verseHtml(PROLOGUE.verse)}
                </div>
                <a class="arche-begin" href="#scene-chaos" data-begin>${esc(PROLOGUE.prompt)}<span aria-hidden="true"> ↓</span></a>
            </div>
        </section>

${ASCENT.map(ascentScene).join('\n\n')}

        <section class="arche-scene arche-scene--turn" id="turn" data-scene="turn" data-fx="turn" data-act="turn" aria-label="The Turn">
            <div class="arche-scene-inner arche-scene-inner--center">
                <p class="arche-kicker arche-kicker--big">${esc(TURN.kicker)}</p>
                <h2 class="arche-title arche-title--huge">${esc(TURN.title)}</h2>
                <div class="arche-verse">
${verseHtml(TURN.verse)}
                </div>
                <p class="arche-begin arche-begin--turn">${esc(TURN.prompt)}<span aria-hidden="true"> ↓</span></p>
            </div>
        </section>

${DESCENT.map(descentScene).join('\n\n')}

        <section class="arche-scene arche-scene--finale" id="finale" data-scene="finale" data-fx="finale" data-act="3" aria-label="The Restoration">
            <div class="arche-scene-inner arche-scene-inner--center">
                <p class="arche-kicker arche-kicker--big">${esc(FINALE.kicker)}</p>
                <h2 class="arche-title arche-title--huge">${esc(FINALE.title)}</h2>
                <div class="arche-verse">
${verseHtml(FINALE.verse)}
                </div>
                <div class="arche-chorus" aria-label="The names between the principles">
                    <p class="arche-choir-label">The names the principles forgot — restored here with the rest <span>(${finaleRoster().length})</span></p>
${finaleRoster()
  .map(
    (r) =>
      `                    <a class="arche-chip arche-chip--finale" href="/${r.id}/" title="${esc(r.pantheon)} — ${esc(r.domain)}">${esc(r.unicode)}</a>`
  )
  .join('\n')}
                </div>
                <div class="arche-claim" data-claim>
                    <p class="arche-choir-label">Which principle claims you?</p>
                    <form class="arche-claim-form" data-claim-form>
                        <input class="arche-claim-input" type="text" name="who" maxlength="40" placeholder="Speak your name" autocomplete="off" aria-label="Your name">
                        <button class="arche-claim-btn" type="submit">Consult the Ἀρχή</button>
                    </form>
                    <div class="arche-claim-result" data-claim-result hidden></div>
                </div>
                <div class="arche-oracle">
                    <p class="arche-choir-label">One question remains?</p>
                    <form class="arche-claim-form" data-oracle-form>
                        <input class="arche-claim-input" type="text" name="q" maxlength="120" placeholder="Ask the Oracle…" aria-label="Question for the Oracle">
                        <button class="arche-claim-btn" type="submit">Ask</button>
                    </form>
                </div>
                <div class="arche-ctas">
${FINALE.links.map((l) => `                    <a class="arche-cta" href="${esc(l.href)}">${esc(l.label)}</a>`).join('\n')}
                </div>
                <button class="arche-loop" data-loop>Τέλος is Ἀρχή — the wheel turns<span aria-hidden="true"> ↑</span></button>
            </div>
        </section>

    </main>

    <script src="/js/arche.js" defer></script>
    <script src="/js/arche-identity.js?v=1" defer></script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === page) {
  console.log('Archē page: already canonical.');
} else {
  writeFileWithRetry(OUT, page, 'utf8');
  console.log(`Archē page: ${path.relative(ROOT, OUT)} written.`);
}

let chaptersWritten = 0;
for (let i = 0; i < ASCENT.length; i++) {
  const ch = ASCENT[i];
  const out = path.join(ROOT, 'genesis', ch.id, 'index.html');
  const html = chapterPage(ch, i);
  if (fs.existsSync(out) && fs.readFileSync(out, 'utf8') === html) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeFileWithRetry(out, html, 'utf8');
  chaptersWritten++;
}
console.log(`Archē chapters: ${chaptersWritten}/${ASCENT.length} written.`);
