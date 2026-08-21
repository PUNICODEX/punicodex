/**
 * Everyday Words + Check Before You Ink — tests.
 *
 * Everyday: the canonical registry resolves against the lexicon; the baked
 * page is fully static (cards in HTML, ItemList JSON-LD, temple links,
 * respellings); the generator is idempotent.
 *
 * Ink: the generated index carries attested forms with their passports; the
 * verifier engine matches names, verifies exact scripts, catches mixed
 * alphabets and runic-era mixing, and keeps its "not in corpus" verdict
 * honest; the page carries its mount points; the generator is idempotent.
 */

'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { EVERYDAY_WORDS } = require(path.join(ROOT, 'type', 'js', 'everyday-words.js'));
const ink = require(path.join(ROOT, 'js', 'ink.js'));

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const hash = (rel) => crypto.createHash('sha256').update(read(rel)).digest('hex');
const runScript = (script) =>
  execSync(`node "${path.join(ROOT, script)}"`, { cwd: ROOT, stdio: 'pipe' });

// ── Everyday: canonical registry ─────────────────────────────────────

test('everyday registry: every word maps to a real lexicon entry, words are unique', () => {
  const ids = new Set(LEXICON.map((e) => e.id));
  const words = new Set();
  for (const card of EVERYDAY_WORDS) {
    assert.ok(ids.has(card.entry), `${card.word}: unknown lexicon entry "${card.entry}"`);
    const key = card.word.toLowerCase();
    assert.ok(!words.has(key), `duplicate word "${card.word}"`);
    words.add(key);
    assert.ok(card.gloss && card.story, `${card.word}: gloss and story required`);
    assert.ok(
      !card.kind || card.kind === 'false-friend',
      `${card.word}: unknown kind ${card.kind}`
    );
    assert.ok(card.story.length <= 400, `${card.word}: story over 400 chars`);
  }
});

// ── Everyday: baked page ─────────────────────────────────────────────

test('everyday page: static cards for all words, ItemList JSON-LD, temple links', () => {
  const html = read('everyday/index.html');
  for (const card of EVERYDAY_WORDS) {
    assert.ok(html.includes(`>${card.word}<`), `page missing word "${card.word}"`);
  }
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'ItemList JSON-LD missing');
  const ld = JSON.parse(m[1]);
  assert.strictEqual(ld['@type'], 'ItemList');
  assert.strictEqual(ld.numberOfItems, EVERYDAY_WORDS.length);
  // Temple doors resolve to real temples, with respellings shown.
  for (const card of EVERYDAY_WORDS.slice(0, 12)) {
    assert.ok(html.includes(`/${card.entry}/`), `missing temple link for ${card.entry}`);
  }
  assert.ok(html.includes('Say it:'), 'respellings rendered');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no raw placeholders');
  // Static: cards must exist in HTML (SEO), not only after JS.
  assert.ok(html.includes('class="ed-card'), 'cards baked into HTML');
  assert.ok(html.includes('FAMOUS — BUT FALSE'), 'false-friend treatment present');
});

test('everyday generator is idempotent', () => {
  // The generator bakes the bare page; the nav/menu/footer/injector layers
  // are added downstream in the pipeline. Snapshot and restore the live file
  // so the test never leaves the tree in the transient bare state.
  const rel = 'everyday/index.html';
  const original = read(rel);
  try {
    runScript('scripts/generate-everyday-page.js');
    const first = hash(rel);
    runScript('scripts/generate-everyday-page.js');
    assert.strictEqual(hash(rel), first);
  } finally {
    fs.writeFileSync(path.join(ROOT, rel), original);
  }
});

// ── Ink: index contract ──────────────────────────────────────────────

test('ink index: attested entries carry script, passport, signs; ids resolve', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  const ids = new Set(LEXICON.map((e) => e.id));
  assert.ok(index.entries.length >= 600, `expected a deep corpus, got ${index.entries.length}`);
  for (const e of index.entries) {
    assert.ok(ids.has(e.id), `unknown lexicon id ${e.id}`);
    assert.ok(e.script && e.script !== '—', `${e.id}: script required`);
    assert.ok(e.u && e.p, `${e.id}: unicode + pantheon required`);
    if (e.signs.length) {
      for (const s of e.signs) assert.ok(s.sign, `${e.id}: sign glyph required`);
    }
  }
  const thor = index.entries.find((e) => e.id === 'thor');
  assert.strictEqual(thor.script, 'ᚦᚢᚱ');
  assert.match(thor.name, /Younger Futhark/);
  assert.ok(thor.signs.length >= 3, 'thor carries per-sign provenance');
  assert.strictEqual(index.myths.length >= 5, true);
  for (const m of index.myths) {
    assert.ok(m.title && m.claim && m.verdict && m.correct, `myth ${m.id}: fields required`);
  }
});

// ── Ink: engine behavior ─────────────────────────────────────────────

test('ink engine: name search finds entries by id, ascii, unicode, transliteration', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  for (const q of ['thor', 'Þórr', 'athena', 'Ἀθηνᾶ', 'vishnu']) {
    const hits = ink.findEntries(index, q);
    assert.ok(hits.length >= 1, `no hit for "${q}"`);
  }
  assert.strictEqual(ink.findEntries(index, 'thor')[0].id, 'thor');
  assert.strictEqual(ink.findEntries(index, 'ᚦᚢᚱ')[0].id, 'thor');
});

test('ink engine: exact script verifies; near miss surfaces closest; far miss stays honest', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  const exact = ink.analyzeScript(index, 'ᚦᚢᚱ');
  assert.strictEqual(exact.exact.id, 'thor', 'attested string verifies');

  const near = ink.analyzeScript(index, 'ᚦᚢᚱᚱ');
  assert.strictEqual(near.exact, null);
  assert.ok(near.closest, 'one extra sign still surfaces the closest attested form');
  assert.strictEqual(near.closest.id, 'thor');

  const far = ink.analyzeScript(index, 'ᚠᚱᛖᚤᚨᚲᚷᚹᚺ');
  assert.strictEqual(far.exact, null);
  assert.strictEqual(far.closest, null, 'a far string must not borrow false confidence');
});

test('ink engine: runic-era and alphabet-mixing diagnostics', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  // ᛟ (Elder-only) + ᚴ (Younger-only): two eras in one string.
  const mixed = ink.analyzeScript(index, 'ᚦᛟᚱᚴ');
  assert.ok(mixed.elder > 0 && mixed.younger > 0, 'era mixing detected');
  // Pure Elder row: anachronism note path.
  const elderOnly = ink.analyzeScript(index, 'ᚦᛟᚱᚱ');
  assert.ok(elderOnly.elder > 0 && elderOnly.younger === 0, 'pure Elder flagged');
  // Latin + runes in one string: fake-script tell.
  const fake = ink.analyzeScript(index, 'ᚦor');
  assert.strictEqual(fake.mixedAlphabets, true, 'Latin-in-runes flagged');
});

test('ink engine: editDistance is exact on identity and counts sign edits', () => {
  assert.strictEqual(ink.editDistance('ᚦᚢᚱ', 'ᚦᚢᚱ'), 0);
  assert.strictEqual(ink.editDistance('ᚦᚢᚱ', 'ᚦᚢᚱᚱ'), 1);
  assert.strictEqual(ink.editDistance('Ἀθηνᾶ', 'Αθηνα'), 2);
});

// ── Ink: page contract ───────────────────────────────────────────────

test('ink page: mount points, engine script, corpus fetch, myths section', () => {
  const html = read('ink/index.html');
  for (const id of [
    'ik-name-input',
    'ik-script-input',
    'ik-name-results',
    'ik-script-results',
    'ik-myths',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing mount #${id}`);
  }
  assert.ok(html.includes('/js/ink.js?v='), 'engine script wired with version');
  const js = read('js/ink.js');
  assert.ok(js.includes('/data/ink-index.json'), 'engine fetches the corpus');
  assert.ok(html.includes('What We Can and Cannot Verify'), 'honesty doctrine section present');
});

// ── Ink: idempotency ─────────────────────────────────────────────────

test('ink index generator is idempotent', () => {
  const rel = 'data/ink-index.json';
  const original = read(rel);
  try {
    runScript('scripts/generate-ink-index.js');
    const first = hash(rel);
    runScript('scripts/generate-ink-index.js');
    assert.strictEqual(hash(rel), first);
  } finally {
    fs.writeFileSync(path.join(ROOT, rel), original);
  }
});

// ── Ink: gallery, signs, downloads ───────────────────────────────────

test('ink index: signs section carries attested sign names and using-entries', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  assert.ok(Array.isArray(index.signs) && index.signs.length >= 300, 'sign index present');
  const thurs = index.signs.find((s) => s.sign === 'ᚦ');
  assert.ok(thurs, 'thorn sign present');
  assert.match(thurs.name, /^(þurs|thurs)$/, 'attested thorn name');
  assert.ok(thurs.entries.includes('thor'), 'sign links to thor');
  assert.match(thurs.script, /Futhark/);
  for (const s of index.signs) {
    assert.ok(s.sign && s.script, 'every sign carries glyph + script');
    assert.ok(
      s.note && s.note.length > 8,
      `sign ${s.sign} (${s.script}) carries a scholarly note — the Signs grid never shows a bare dash`
    );
    assert.ok(s.name, `sign ${s.sign} (${s.script}) carries its attested/conventional name`);
  }
  const fehuNote = index.entries.find((e) => e.id === 'thor');
  assert.ok(fehuNote.m, 'entries carry the short meaning for the gallery');
});

test('ink downloads: PNG + SVG cards exist for attested entries and are real renders', () => {
  const index = JSON.parse(read('data/ink-index.json'));
  for (const id of ['thor', 'ra', 'tiamat', 'nike', 'vishnu']) {
    const png = path.join(ROOT, 'assets', 'ink', `${id}.png`);
    const svg = path.join(ROOT, 'assets', 'ink', `${id}.svg`);
    assert.ok(fs.existsSync(png), `${id}.png baked`);
    assert.ok(fs.existsSync(svg), `${id}.svg baked`);
    const head = fs.readFileSync(png).subarray(0, 8);
    assert.deepStrictEqual([...head], [137, 80, 78, 71, 13, 10, 26, 10], `${id}.png is a PNG`);
    assert.ok(fs.statSync(png).size > 10000, `${id}.png is a real render, not a stub`);
    assert.ok(read(`assets/ink/${id}.svg`).includes('<svg'), `${id}.svg is an SVG`);
  }
  // Every index entry has a card pair (the gallery links to them).
  const missing = index.entries.filter(
    (e) =>
      !fs.existsSync(path.join(ROOT, 'assets', 'ink', `${e.id}.png`)) ||
      !fs.existsSync(path.join(ROOT, 'assets', 'ink', `${e.id}.svg`))
  );
  assert.deepStrictEqual(missing.map((e) => e.id).slice(0, 5), [], 'every entry has both cards');
});

test('ink downloads generator skips existing bakes (committed artifacts win)', () => {
  const rel = 'assets/ink/thor.png';
  const before = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, rel)))
    .digest('hex');
  runScript('scripts/generate-ink-downloads.js');
  const after = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, rel)))
    .digest('hex');
  assert.strictEqual(after, before, 'existing bake must not be re-rendered');
});

test('ink page: gallery and signs mounts, downloads linked from result cards', () => {
  const html = read('ink/index.html');
  for (const id of ['ik-gallery', 'ik-filters', 'ik-signs', 'ik-more-btn']) {
    assert.ok(html.includes(`id="${id}"`), `missing mount #${id}`);
  }
  const js = read('js/ink.js');
  assert.ok(js.includes('/assets/ink/'), 'engine links the download cards');
  assert.ok(js.includes('bootGallery') && js.includes('bootSigns'), 'gallery + signs booted');
  assert.ok(html.includes('/js/ink.js?v='), 'engine version-pinned');
});

async function runSuite() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nEveryday + Ink: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
