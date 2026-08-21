/**
 * PuniCodex — Sacred Texts (/texts/) section tests
 *
 * Guards the Sacred Texts pipeline: the registry and generated corpora are
 * valid and complete, the cross-reference table only contains forms actually
 * attested (capitalized) in the Greek text, the generator is idempotent, and
 * the generated pages carry the canonical chrome plus the scholarly anchors
 * the reading experience depends on.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const { XREF, normGreek, isCapitalGreek } = require('../scripts/generate-text-pages.js');
const { MORE } = require('../scripts/sync-desktop-nav.js');
const { CANONICAL_MENU } = require('../scripts/sync-mobile-menu.js');
const { RESOURCES } = require('../scripts/sync-footer.js');
const { LEXICON } = require(path.join(root, 'type', 'js', 'lexicon.js'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').slice(0, 8).join('\n    ')}`);
  }
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ── Registry & corpus ───────────────────────────────────────────────────────

test('registry is valid and the Theogony carries both editions with existing files', () => {
  const registry = JSON.parse(read(path.join('platform', 'texts', 'registry.json')));
  assert.ok(Array.isArray(registry.texts) && registry.texts.length >= 1, 'registry.texts empty');
  const theogony = registry.texts.find((t) => t.id === 'theogony');
  assert.ok(theogony, 'theogony not registered');
  for (const field of [
    'title',
    'titleNative',
    'author',
    'authorNative',
    'composed',
    'summary',
    'lineCount',
  ]) {
    assert.ok(theogony[field], `theogony missing ${field}`);
  }
  assert.strictEqual(theogony.lineCount, 1022, 'theogony lineCount must be 1022');
  const langs = theogony.editions.map((e) => e.lang).sort();
  assert.deepStrictEqual(langs, ['eng', 'grc'], 'expected grc + eng editions');
  for (const ed of theogony.editions) {
    assert.ok(ed.source && ed.sourceUrl && ed.license && ed.file, `edition ${ed.lang} incomplete`);
    const src = path.join(root, 'platform', 'texts', 'theogony', ed.file);
    assert.ok(fs.existsSync(src), `edition source missing: ${ed.file}`);
  }
});

test('greek corpus: 1,022 lines, numbered exactly 1..1022', () => {
  const grc = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'grc.json')));
  assert.strictEqual(grc.lang, 'grc');
  assert.strictEqual(grc.lines.length, 1022, 'expected 1,022 lines');
  const ns = grc.lines.map((l) => l.n).sort((a, b) => a - b);
  for (let i = 0; i < 1022; i++) {
    assert.strictEqual(ns[i], i + 1, `line numbering broken at index ${i}`);
  }
  assert.ok(
    grc.lines.every((l) => typeof l.text === 'string' && l.text.length > 0),
    'empty line text'
  );
});

test('english corpus: ranges tile 1..1022 exactly (set-based), document order preserved', () => {
  const eng = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'eng.json')));
  assert.strictEqual(eng.lang, 'eng');
  assert.ok(eng.chunks.length > 100, `suspiciously few chunks: ${eng.chunks.length}`);
  for (const c of eng.chunks) {
    assert.ok(Number.isInteger(c.from) && Number.isInteger(c.to), 'non-integer range');
    assert.ok(c.from >= 1 && c.to >= c.from, `bad range ${c.from}-${c.to}`);
    assert.ok(typeof c.text === 'string' && c.text.length > 0, `empty chunk text at ${c.from}`);
  }
  // Ranges are true line intervals: sorted numerically, each chunk ends one
  // line before the next anchor, and the last ends exactly at 1022.
  const sorted = [...eng.chunks].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    const want = i + 1 < sorted.length ? sorted[i + 1].from - 1 : 1022;
    assert.strictEqual(
      sorted[i].to,
      want,
      `chunk ${sorted[i].from} should end at ${want}, got ${sorted[i].to}`
    );
  }
  // Set-based coverage: every Greek line inside exactly one chunk — this
  // holds even where the document order transposes chunks.
  const cover = new Array(1023).fill(0);
  for (const c of eng.chunks) for (let n = c.from; n <= c.to; n++) cover[n]++;
  for (let n = 1; n <= 1022; n++) {
    assert.strictEqual(cover[n], 1, `line ${n} covered ${cover[n]} times`);
  }
  // Document order is TEI reading order, NOT numeric order: at Rzach's
  // transpositions the anchor order must be 425, 427, 426 (Evelyn-White
  // translates in the edition's printed order).
  const docOrder = eng.chunks.map((c) => c.from);
  const i425 = docOrder.indexOf(425);
  assert.deepStrictEqual(
    docOrder.slice(i425, i425 + 4),
    [425, 427, 426, 428],
    'Hekate transposition must keep TEI document order (425, 427, 426, 428)'
  );
  const i434 = docOrder.indexOf(434);
  assert.ok(
    docOrder.indexOf(430) > i434 && docOrder.indexOf(433) > i434,
    'chunk 434 must precede 430–433 in document order'
  );
});

test('anchor swap: line 213 is the Night clause, line 214 is Blame/Woe', () => {
  const eng = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'eng.json')));
  const at = (n) => eng.chunks.find((c) => c.from === n);
  assert.ok(at(213), 'chunk anchored at 213 missing');
  assert.ok(at(214), 'chunk anchored at 214 missing');
  assert.ok(
    at(213).text.includes('murky Night'),
    `213 should be the Night clause: ${at(213).text}`
  );
  assert.ok(at(214).text.includes('bare Blame'), `214 should be Blame/Woe: ${at(214).text}`);
  assert.strictEqual(at(213).to, 213, '213 is a single-line chunk');
  assert.strictEqual(at(214).to, 214, '214 is a single-line chunk');
});

// ── Cross-reference table ───────────────────────────────────────────────────

test('cross-reference table: unique forms, real temples, every form attested capitalized in the text', () => {
  const grc = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'grc.json')));
  const lexIds = new Set(LEXICON.map((e) => e.id));

  // Inventory: normalized form -> set of surfaces seen capitalized.
  const capWords = new Set();
  for (const { text } of grc.lines) {
    for (const raw of text.split(' ')) {
      const surface = raw.replace(/^[,;.·†—]+|[,;.·†—]+$/gu, '');
      if (surface && isCapitalGreek(surface)) capWords.add(normGreek(surface));
    }
  }

  const seenForms = new Map();
  assert.ok(XREF.length >= 80, `expected ~80+ cross-linked entities, got ${XREF.length}`);
  for (const [id, forms] of XREF) {
    assert.ok(lexIds.has(id), `xref id not in lexicon: ${id}`);
    assert.ok(
      fs.existsSync(path.join(root, 'sites', id, 'index.html')),
      `xref temple missing on disk: sites/${id}/`
    );
    assert.ok(forms.length >= 1, `${id}: no forms`);
    for (const form of forms) {
      assert.strictEqual(form, normGreek(form), `${id}: form ${form} is not in normalized shape`);
      assert.ok(
        !seenForms.has(form),
        `form ${form} claimed by both ${seenForms.get(form)} and ${id}`
      );
      seenForms.set(form, id);
      assert.ok(
        capWords.has(form),
        `${id}: form "${form}" not attested as a capitalized word in grc.json`
      );
    }
  }
});

// ── Generator idempotency ───────────────────────────────────────────────────

test('generator is idempotent (two runs, byte-identical output)', () => {
  const relA = path.join('texts', 'index.html');
  const relB = path.join('texts', 'theogony', 'index.html');
  execSync('node scripts/generate-text-pages.js', { cwd: root, stdio: 'pipe' });
  const a1 = read(relA);
  const b1 = read(relB);
  execSync('node scripts/generate-text-pages.js', { cwd: root, stdio: 'pipe' });
  assert.strictEqual(read(relA), a1, 'texts/index.html changed between runs');
  assert.strictEqual(read(relB), b1, 'texts/theogony/index.html changed between runs');
});

// ── Canonical chrome ────────────────────────────────────────────────────────

test('generated pages carry the canonical chrome (nav, mobile menu, footer, beacons)', () => {
  for (const rel of [
    path.join('texts', 'index.html'),
    path.join('texts', 'theogony', 'index.html'),
  ]) {
    const html = read(rel);
    assert.ok(html.includes('class="main-nav"'), `${rel}: main nav missing`);
    assert.ok(html.includes('punicodex-wordmark-ivory'), `${rel}: wordmark missing`);
    assert.ok(html.includes('class="mobile-menu"'), `${rel}: mobile menu missing`);
    assert.ok(html.includes('class="site-footer"'), `${rel}: footer missing`);
    assert.ok(html.includes('/assets/fonts/fonts.css'), `${rel}: fonts.css not linked`);
    assert.ok(html.includes('rel="canonical"'), `${rel}: canonical link missing`);
    for (const marker of [
      'PUNICODEX-ANALYTICS',
      'PUNICODEX-HERALD-BEACON',
      'PUNICODEX-COOKIE-CONSENT',
    ]) {
      const starts = html.split(`<!-- ${marker}-START -->`).length - 1;
      const ends = html.split(`<!-- ${marker}-END -->`).length - 1;
      assert.strictEqual(starts, 1, `${rel}: ${marker} START ×${starts}`);
      assert.strictEqual(ends, 1, `${rel}: ${marker} END ×${ends}`);
    }
  }
});

// ── Scholarly anchors on the reading page ───────────────────────────────────

test('theogony page carries the scholarly anchors (incipit, closing, deep links, cross-links)', () => {
  const html = read(path.join('texts', 'theogony', 'index.html'));
  assert.ok(html.includes('Μουσάων Ἑλικωνιάδων'), 'line 1 incipit missing');
  assert.ok(html.includes('id="L1022"'), 'line anchor #L1022 missing');
  assert.ok(
    html.includes('Μοῦσαι Ὀλυμπιάδες, κοῦραι') && html.includes('αἰγιόχοιο.'),
    'line 1022 closing missing'
  );
  assert.ok(html.includes('id="L213"'), 'line anchor #L213 missing');
  assert.ok(html.includes('data-anchor="L213"'), 'permalink for #L213 missing');
  assert.ok(html.includes('href="/zeus/"'), 'Zeus cross-link missing');
  assert.ok(html.includes('href="/gaia/"'), 'Gaia cross-link missing');
  assert.ok(html.includes('href="/hekate/"'), 'Hekate cross-link missing');
  assert.ok(html.includes('Mentioned in this text'), 'temple index heading missing');
  assert.ok(
    html.includes('data-mode="grc"') && html.includes('data-mode="par"'),
    'language pills missing'
  );
  assert.ok(html.includes('Θεογονία'), 'native title missing');
  assert.ok(html.includes('Evelyn-White'), 'Evelyn-White attribution missing');
  assert.ok(html.includes('Perseus'), 'Perseus attribution missing');
});

test('english reading order: Night clause before Blame/Woe; Hekate transpositions preserved', () => {
  const html = read(path.join('texts', 'theogony', 'index.html'));
  const engView = html.split('id="tx-view-eng"')[1].split('id="tx-view-grc"')[0];
  const order = [...engView.matchAll(/<article class="tx-chunk" id="L(\d+)-(\d+)"/g)].map((m) =>
    Number(m[1])
  );
  const i210 = order.indexOf(210);
  assert.deepStrictEqual(
    order.slice(i210, i210 + 4),
    [210, 213, 214, 215],
    'Night clause (213) must display before Blame/Woe (214)'
  );
  const i425 = order.indexOf(425);
  assert.deepStrictEqual(
    order.slice(i425, i425 + 8),
    [425, 427, 426, 428, 434, 430, 433, 435],
    'Hekate passage must keep Evelyn-White reading order (427 before 426, 434 before 430)'
  );
  // The sentence must read continuously: "...holds ... privilege ... Also,
  // because she is an only child ... but much more still, for Zeus honors her."
  const i425t = engView.indexOf('but she holds, as the division was at the first');
  const i427t = engView.indexOf('privilege both in earth, and in heaven, and in sea.');
  const i426t = engView.indexOf('because she is an only child');
  const i428t = engView.indexOf('but much more still, for Zeus honors her.');
  assert.ok(
    i425t !== -1 && i427t > i425t && i426t > i427t && i428t > i426t,
    'Hekate sentence fragments out of order'
  );
});

test('parallel view pairs chunks to Greek lines by range, correctly at transpositions', () => {
  const grc = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'grc.json')));
  const byN = new Map(grc.lines.map((l) => [l.n, l.text]));
  const html = read(path.join('texts', 'theogony', 'index.html'));
  const parView = html.split('id="tx-view-par"')[1].split('tx-mentioned')[0];
  // Every chunk pairs exactly the lines [from..to], in numeric order.
  const re = /<article class="tx-pair" data-from="(\d+)" data-to="(\d+)"/g;
  let m;
  let count = 0;
  while ((m = re.exec(parView))) {
    count++;
    const from = Number(m[1]);
    const to = Number(m[2]);
    const block = parView.slice(m.index, parView.indexOf('</article>', m.index));
    const ns = [...block.matchAll(/<div class="tx-line" data-l="(\d+)">/g)].map((x) =>
      Number(x[1])
    );
    const want = [];
    for (let n = from; n <= to; n++) want.push(n);
    assert.deepStrictEqual(ns, want, `chunk ${from}-${to} mispaired`);
  }
  assert.strictEqual(count, 211, 'expected 211 parallel pairs');
  // Transposition spot check: chunk 427 renders the Greek of line 427
  // (καὶ γέρας …) beneath "privilege both in earth…".
  const i427 = parView.indexOf('data-from="427"');
  const block427 = parView.slice(i427, parView.indexOf('</article>', i427));
  assert.ok(block427.includes('data-l="427"'), 'chunk 427 does not pair Greek line 427');
  assert.ok(
    block427.includes('καὶ γέρας ἐν γαίῃ'),
    `chunk 427 should render Greek 427: ${byN.get(427)}`
  );
});

test('nemean lion chip renders with the space (lexicon unicode fixed canonically)', () => {
  const lexEntry = LEXICON.find((e) => e.id === 'nemeanlion');
  assert.strictEqual(lexEntry.unicode, 'Nemean Léon', 'canonical lexicon unicode must be spaced');
  const html = read(path.join('texts', 'theogony', 'index.html'));
  assert.ok(html.includes('Nemean Léon'), 'spaced chip missing from the page');
  assert.ok(!html.includes('NemeanLéon'), 'unspaced form still present on the page');
});

test('movement display ranges snap to chunk edges at the seams', () => {
  const html = read(path.join('texts', 'theogony', 'index.html'));
  const engView = html.split('id="tx-view-eng"')[1].split('id="tx-view-grc"')[0];
  const ranges = [
    ...engView.matchAll(/<span class="tx-movement-range">lines (\d+)–(\d+)<\/span>/g),
  ].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepStrictEqual(
    ranges,
    [
      [1, 114],
      [115, 229],
      [230, 334],
      [335, 614],
      [615, 884],
      [885, 959],
      [960, 1022],
    ],
    'snapped movement ranges must follow the chunk anchors'
  );
  // No post-seam content is stranded: the chunk containing line 116 renders
  // under The First Gods, not the Proem.
  const proemSection = engView.split('id="proem"')[1].split('id="first-gods"')[0];
  assert.ok(!proemSection.includes('id="L115-119"'), 'chunk [115-119] must not sit in the Proem');
  const firstGodsSection = engView.split('id="first-gods"')[1].split('id="sea-deities"')[0];
  assert.ok(firstGodsSection.includes('id="L115-119"'), 'chunk [115-119] must open The First Gods');
  assert.ok(
    html.includes('Section ranges follow the poem') &&
      html.includes('display blocks snap to the nearest line block at the seams'),
    'seam footnote missing from the colophon'
  );
});

test('licensing line distinguishes Perseus CC BY-SA from site CC BY and public domain', () => {
  const html = read(path.join('texts', 'theogony', 'index.html'));
  assert.ok(html.includes('CC BY-SA'), 'CC BY-SA missing');
  assert.ok(html.includes('share-alike'), 'share-alike gloss missing');
  assert.ok(html.includes('CC BY 4.0'), 'site license distinction missing');
  assert.ok(html.includes('public domain'), 'public-domain note missing');
});

test('greek text renders byte-faithfully (tag-stripped output equals the corpus)', () => {
  const grc = JSON.parse(read(path.join('platform', 'texts', 'theogony', 'grc.json')));
  const byN = new Map(grc.lines.map((l) => [l.n, l.text]));
  const html = read(path.join('texts', 'theogony', 'index.html'));
  const grcView = html.split('id="tx-view-grc"')[1].split('id="tx-view-par"')[0];
  const re =
    /<div class="tx-line" id="L(\d+)"[^>]*>[\s\S]*?<span class="tx-grc"[^>]*>([\s\S]*?)<\/span>/g;
  const unescapeEntities = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  let count = 0;
  let m;
  while ((m = re.exec(grcView))) {
    const n = Number.parseInt(m[1], 10);
    const text = unescapeEntities(m[2].replace(/<[^>]+>/g, ''));
    assert.strictEqual(text, byN.get(n), `line ${n} text altered`);
    count++;
  }
  assert.strictEqual(count, 1022, `expected 1,022 rendered lines, found ${count}`);
});

test('every temple link on the reading page resolves to an existing temple', () => {
  const html = read(path.join('texts', 'theogony', 'index.html'));
  // Clean /{id}/ is the canonical form; /sites/{id}/ matches only until the
  // pages are regenerated. Single-segment hrefs that are not lexicon ids are
  // hub links (nav/footer), not temple links.
  const lexiconIds = new Set(LEXICON.map((e) => e.id));
  const ids = new Set(
    [...html.matchAll(/href="\/(?:sites\/)?([a-z0-9-]+)\/"/g)]
      .map((m) => m[1])
      .filter((id) => lexiconIds.has(id))
  );
  assert.ok(ids.size >= 80, `expected 80+ linked temples, found ${ids.size}`);
  for (const id of ids) {
    assert.ok(
      fs.existsSync(path.join(root, 'sites', id, 'index.html')),
      `linked temple missing on disk: sites/${id}/`
    );
  }
});

// ── Library index ───────────────────────────────────────────────────────────

test('library index presents the Theogony card and links the reading page', () => {
  const html = read(path.join('texts', 'index.html'));
  assert.ok(html.includes('The Library'), 'hero title missing');
  assert.ok(html.includes('Θεογονία'), 'native title missing');
  assert.ok(html.includes('Theogony'), 'english title missing');
  assert.ok(html.includes('Hesiod'), 'author missing');
  assert.ok(html.includes('1,022'), 'line count missing');
  assert.ok(html.includes('href="/texts/theogony/"'), 'reading page link missing');
  assert.ok(html.includes('CC BY-SA'), 'license note missing');
});

// ── Pipeline & integration ──────────────────────────────────────────────────

test('generator is registered in the pipeline after generate-blog-index.js', () => {
  const gen = read(path.join('scripts', 'generate.js'));
  const blogIdx = gen.indexOf("'scripts/generate-blog-index.js'");
  const textsIdx = gen.indexOf("'scripts/generate-text-pages.js'");
  assert.ok(blogIdx !== -1 && textsIdx !== -1, 'text generator missing from generate.js');
  assert.ok(textsIdx > blogIdx, 'text generator must run after generate-blog-index.js');
  const cookieIdx = gen.indexOf("'scripts/inject-cookie-consent.js'");
  assert.ok(cookieIdx > textsIdx, 'inject-cookie-consent must run after the text generator');
});

test('texts are wired into sitemap, nav, mobile menu, footer, and analytics', () => {
  const sitemap = read('sitemap.xml');
  assert.ok(sitemap.includes('<loc>https://punicodex.com/texts/</loc>'), 'sitemap missing /texts/');
  assert.ok(
    sitemap.includes('<loc>https://punicodex.com/texts/theogony/</loc>'),
    'sitemap missing /texts/theogony/'
  );
  const appIdx = MORE.findIndex(([href]) => href === '/app/');
  assert.deepStrictEqual(
    MORE[appIdx + 1],
    ['/texts/', 'Texts'],
    'Texts must follow App in the More dropdown'
  );
  assert.ok(CANONICAL_MENU.includes('<a href="/texts/">Texts</a>'), 'mobile menu missing Texts');
  assert.ok(
    RESOURCES.some(([href, label]) => href === '/texts/' && label === 'Texts'),
    'footer RESOURCES missing Texts'
  );
  const analytics = read(path.join('scripts', 'inject-analytics.js'));
  assert.ok(
    analytics.includes("path.join('texts', 'index.html')"),
    'analytics injector missing texts index'
  );
  assert.ok(
    analytics.includes("path.join('texts', 'theogony', 'index.html')"),
    'analytics injector missing theogony page'
  );
});

console.log(`\nTexts Section: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
