/**
 * Sacred Texts — chaptered corpora tests
 *
 * Contract for the 20 chapter-structure texts (Eddas, Book of the Dead,
 * Enuma Elish, Gilgamesh, Avesta, Metamorphoses, Rig Veda, Ramayana,
 * Lotus Sutra, Sukhavativyuha, Kojiki, Nihon Shoki, Kumulipo, Grey,
 * Tao Te Ching, Dennett, KJV) and their generated reading pages:
 * corpus + xref validity (via scripts/lib/chapter-corpus.js), registry
 * consistency, page chrome, working table of contents, resolving temple
 * chips, and generator idempotency.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const registry = require('../platform/texts/registry.json');
const {
  validateChapterCorpus,
  validateXref,
  loadChapterCorpus,
} = require('../scripts/lib/chapter-corpus.js');

const ARCHETYPES = require('../js/archetypes-v2.js');
const BUILT = new Set(
  (ARCHETYPES.ARCHETYPES || ARCHETYPES).filter((a) => a.built).map((a) => a.id)
);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const chapterTexts = registry.texts.filter((t) => t.structure === 'chapters');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

test('registry: 21 texts total — the Theogony plus 20 chaptered texts', () => {
  assert.strictEqual(registry.texts.length, 21);
  assert.strictEqual(chapterTexts.length, 20);
  assert.strictEqual(registry.texts[0].id, 'theogony');
  for (const t of chapterTexts) {
    for (const field of [
      'id',
      'title',
      'titleNative',
      'author',
      'composed',
      'language',
      'summary',
      'sectionCount',
    ]) {
      assert.ok(t[field] !== undefined && t[field] !== '', `${t.id}: missing ${field}`);
    }
    assert.ok(Array.isArray(t.editions) && t.editions.length === 1, `${t.id}: exactly one edition`);
    const ed = t.editions[0];
    assert.strictEqual(ed.lang, 'eng', `${t.id}: edition must be English`);
    assert.ok(
      ed.label && ed.source && ed.sourceUrl && ed.license && ed.file,
      `${t.id}: edition fields`
    );
  }
});

test('every chaptered corpus validates against the contract and matches its registry sectionCount', () => {
  for (const t of chapterTexts) {
    const loaded = loadChapterCorpus(t.id);
    assert.ok(loaded, `${t.id}: eng.json missing`);
    validateChapterCorpus(loaded.corpus, { id: t.id });
    assert.strictEqual(
      loaded.corpus.sections.length,
      t.sectionCount,
      `${t.id}: registry says ${t.sectionCount} sections, corpus has ${loaded.corpus.sections.length}`
    );
  }
});

test('every xref validates: forms attested capitalized in the corpus, temples built flagships', () => {
  for (const t of chapterTexts) {
    const { corpus, xref } = loadChapterCorpus(t.id);
    validateXref(xref, corpus, { id: t.id });
    for (const link of xref.links) {
      assert.ok(BUILT.has(link.temple), `${t.id}: ${link.temple} is not a built flagship`);
      assert.ok(
        exists(`sites/${link.temple}/index.html`),
        `${t.id}: no temple page for ${link.temple}`
      );
    }
  }
});

test('coverage floor: every chaptered text cross-links at least 2 temples', () => {
  for (const t of chapterTexts) {
    const { xref } = loadChapterCorpus(t.id);
    assert.ok(xref.links.length >= 2, `${t.id}: only ${xref.links.length} temples linked`);
  }
});

test('reading pages exist with hero, TOC matching sections, and chrome', () => {
  for (const t of chapterTexts) {
    assert.ok(exists(`texts/${t.id}/index.html`), `texts/${t.id}/index.html missing`);
    const html = read(`texts/${t.id}/index.html`);
    const { corpus } = loadChapterCorpus(t.id);
    assert.ok(html.includes(`<h1`), `${t.id}: no h1`);
    assert.ok(html.includes('<nav class="main-nav"'), `${t.id}: no canonical nav`);
    assert.ok(html.includes('class="site-footer"'), `${t.id}: no footer`);
    for (const s of corpus.sections) {
      assert.ok(html.includes(`id="${s.id}"`), `${t.id}: section #${s.id} missing`);
      assert.ok(html.includes(`href="#${s.id}"`), `${t.id}: TOC link for #${s.id} missing`);
    }
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(m, `${t.id}: no JSON-LD`);
    assert.strictEqual(JSON.parse(m[1])['@type'], 'Book', `${t.id}: JSON-LD not a Book`);
  }
});

test('every temple chip on every reading page resolves to an existing temple', () => {
  for (const t of chapterTexts) {
    const html = read(`texts/${t.id}/index.html`);
    const hrefs = [...html.matchAll(/class="tx-chip" href="\/sites\/([a-z0-9-]+)\/"/g)].map(
      (m) => m[1]
    );
    assert.ok(hrefs.length > 0, `${t.id}: no chips rendered`);
    for (const id of new Set(hrefs)) {
      assert.ok(exists(`sites/${id}/index.html`), `${t.id}: chip to missing temple ${id}`);
    }
    // The mentioned index carries the same contract.
    const mentioned = [...html.matchAll(/class="tx-m-card" href="\/sites\/([a-z0-9-]+)\/"/g)].map(
      (m) => m[1]
    );
    assert.ok(mentioned.length > 0, `${t.id}: no mentioned index`);
    for (const id of new Set(mentioned)) {
      assert.ok(
        exists(`sites/${id}/index.html`),
        `${t.id}: mentioned card to missing temple ${id}`
      );
    }
  }
});

test('library index lists all 21 texts with working links and per-text stats', () => {
  const html = read('texts/index.html');
  for (const t of registry.texts) {
    assert.ok(html.includes(`href="/texts/${t.id}/"`), `index missing link to ${t.id}`);
  }
  assert.ok(html.includes('21'), 'index hero should carry the text count');
  assert.ok(!/undefined/.test(html), 'index renders an undefined value');
});

test('generator is idempotent for the whole library (regeneration is byte-identical)', () => {
  const snapshot = () => {
    const out = new Map();
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name === 'index.html') out.set(full, fs.readFileSync(full, 'utf8'));
      }
    };
    walk(path.join(ROOT, 'texts'));
    return out;
  };
  const before = snapshot();
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-text-pages.js')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const after = snapshot();
  assert.deepStrictEqual(after, before, 'regeneration changed page bytes');
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 8)
          .join('\n    ')}`
      );
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} texts-chapters tests passed`);
})();
