/**
 * PuniCodex — The Archē experience tests.
 *
 * Guards the interactive cosmogony at /genesis/:
 *   1. Canonical data integrity — every deity id resolves in the lexicon,
 *      every tendril industry resolves in the pattern graph, deities appear
 *      exactly once across the ascent, every descent chapter echoes a real
 *      ascent principle.
 *   2. Page structure — scenes for every chapter, valid deity links, real
 *      Pattern Atlas anchors, canonical/OG/JSON-LD, readable without JS.
 *   3. Engine contracts — quality governor, reduced-motion path, canvas 2D
 *      (no WebGL dependency), autoplay stop conditions, tendril builder.
 *   4. Generator idempotency — byte-identical output across runs.
 *
 * Run standalone: node test/arche.test.js
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const { PROLOGUE, ASCENT, TURN, DESCENT, FINALE } = require(
  path.join(root, 'scripts', 'arche-chapters.js')
);
const { LEXICON } = require(path.join(root, 'type', 'js', 'lexicon.js'));
const { INDUSTRY_GROUPS } = require(path.join(root, 'type', 'js', 'industry-patterns.js'));

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const GENERATOR = path.join(root, 'scripts', 'generate-arche-page.js');
const PAGE = path.join(root, 'genesis', 'index.html');

// ---------------------------------------------------------------------------
// 1. Canonical data integrity
// ---------------------------------------------------------------------------

test('every ascent deity resolves in the lexicon and appears exactly once', () => {
  const ids = new Set(LEXICON.map((e) => e.id));
  const seen = new Map();
  for (const ch of ASCENT) {
    assert.ok(ch.deities.length >= 3, `${ch.id}: too few deities (${ch.deities.length})`);
    for (const d of ch.deities) {
      assert.ok(ids.has(d.id), `${ch.id}: unknown lexicon id "${d.id}"`);
      assert.ok(!seen.has(d.id), `${d.id} appears in both "${seen.get(d.id)}" and "${ch.id}"`);
      seen.set(d.id, ch.id);
      assert.ok(d.line && d.line.length > 20, `${d.id}: missing poetic line`);
    }
    assert.ok(ch.verse.length >= 3, `${ch.id}: too few verse lines`);
    assert.ok(ch.outro && ch.outro.length > 10, `${ch.id}: missing outro hand-off`);
  }
  assert.ok(ASCENT.length >= 12, `ascent under-built: ${ASCENT.length} chapters`);
  assert.ok(seen.size >= 100, `ascent should summon 100+ deities, has ${seen.size}`);
});

test('every descent tendril resolves in the industry pattern graph', () => {
  const inds = new Set(INDUSTRY_GROUPS.map((g) => g.industry));
  const used = new Set();
  for (const ch of DESCENT) {
    assert.ok(
      ASCENT.some((a) => a.id === ch.echoes),
      `${ch.id}: echoes unknown principle "${ch.echoes}"`
    );
    const local = new Set();
    for (const t of ch.tendrils) {
      assert.ok(inds.has(t.industry), `${ch.id}: unknown industry "${t.industry}"`);
      assert.ok(!local.has(t.industry), `${ch.id}: duplicate industry "${t.industry}"`);
      local.add(t.industry);
      used.add(t.industry);
      assert.ok(t.line && t.line.length > 20, `${t.industry}: missing thesis line`);
    }
  }
  assert.strictEqual(DESCENT.length, ASCENT.length, 'descent must mirror the ascent');
  // Comprehensive: ALL industries are claimed by some principle — scanned
  // from the rendered page so the finale's own industries count too.
  const html = read('genesis/index.html');
  const usedOnPage = new Set([...html.matchAll(/#pa-panel-([a-z-]+)"/g)].map((m) => m[1]));
  const unclaimed = [...inds].filter((i) => !usedOnPage.has(i));
  assert.deepStrictEqual(unclaimed, [], `industries with no principle: ${unclaimed.join(', ')}`);
});

test('ascent is cross-pantheon: every chapter spans at least 3 pantheons', () => {
  const byId = new Map(LEXICON.map((e) => [e.id, e]));
  for (const ch of ASCENT) {
    const pantheons = new Set(ch.deities.map((d) => byId.get(d.id).pantheon));
    assert.ok(
      pantheons.size >= 3,
      `${ch.id}: only ${pantheons.size} pantheons (${[...pantheons].join(', ')})`
    );
  }
});

test('prologue, turn, and finale carry the narrative frame', () => {
  assert.ok(PROLOGUE.verse.length >= 3, 'prologue verse missing');
  assert.ok(
    TURN.verse.some((l) => /work/i.test(l)),
    'the turn must land the "went to work" thesis'
  );
  assert.ok(FINALE.links.length >= 3, 'finale must offer onward paths');
});

// ---------------------------------------------------------------------------
// 1b. Full-coverage assignments — every name appears exactly once
// ---------------------------------------------------------------------------

test('EVERY lexicon entry appears exactly once: voiced, choir, or finale', () => {
  const { ASSIGNMENT } = require(path.join(root, 'scripts', 'arche-assignments.js'));
  const ids = new Set(LEXICON.map((e) => e.id));
  assert.strictEqual(ASSIGNMENT.size, ids.size, 'assignment does not cover the whole lexicon');
  for (const e of LEXICON) {
    assert.ok(ASSIGNMENT.has(e.id), `${e.id} unassigned`);
  }
  // Map values are valid targets.
  const targets = new Set([...ASCENT.map((c) => c.id), 'finale']);
  for (const [id, target] of ASSIGNMENT) {
    assert.ok(targets.has(target), `${id} assigned to unknown chapter "${target}"`);
  }
  // The page renders every one: voiced cards + choir chips + finale chorus.
  const html = read('genesis/index.html');
  const cards = new Set(
    [...html.matchAll(/class="arche-card" href="\/([a-z0-9-]+)\//g)].map((m) => m[1])
  );
  const chips = new Set(
    [...html.matchAll(/class="arche-chip[^"]*" href="\/([a-z0-9-]+)\//g)].map((m) => m[1])
  );
  const rendered = new Set([...cards, ...chips]);
  const missing = [...ids].filter((id) => !rendered.has(id));
  assert.deepStrictEqual(missing, [], `${missing.length} entries missing from the page`);
  assert.ok(cards.size >= 100, `voices collapsed: only ${cards.size} cards`);
  assert.ok(chips.size >= 400, `choir too thin: only ${chips.size} chips`);
});

test('every chapter holds a real congregation (no token chapters)', () => {
  const { chapterRoster } = require(path.join(root, 'scripts', 'arche-assignments.js'));
  for (const ch of ASCENT) {
    const roster = chapterRoster(ch.id);
    const floor = ch.minRoster || 10;
    assert.ok(roster.length >= floor, `${ch.id}: only ${roster.length} names (floor ${floor})`);
    const pantheons = new Set(roster.map((r) => r.pantheon));
    assert.ok(pantheons.size >= 4, `${ch.id}: only ${pantheons.size} pantheons`);
  }
  assert.ok(finaleCount() >= 50, 'finale chorus must hold the between-principle names');
  function finaleCount() {
    const { finaleRoster } = require(path.join(root, 'scripts', 'arche-assignments.js'));
    return finaleRoster().length;
  }
});

// ---------------------------------------------------------------------------
// 2. Page structure
// ---------------------------------------------------------------------------

test('Act II shows the pattern-atlas industries — names lead, no gods after the Turn', () => {
  const html = read('genesis/index.html');
  const { INDUSTRY_GROUPS } = require(path.join(root, 'type', 'js', 'industry-patterns.js'));
  const names = new Map(INDUSTRY_GROUPS.map((g) => [g.industry, g.name]));
  let shown = 0;
  for (const ch of DESCENT) {
    for (const t of ch.tendrils) {
      const name = names.get(t.industry);
      assert.ok(name, `unknown industry ${t.industry}`);
      assert.ok(
        html.includes(`class="arche-tendril-name">${esc(name)}`),
        `${t.industry}: industry name "${name}" must headline its card`
      );
      shown++;
    }
  }
  const unique = new Set(DESCENT.flatMap((c) => c.tendrils.map((t) => t.industry)));
  assert.strictEqual(
    unique.size,
    INDUSTRY_GROUPS.length,
    `Act II must claim all ${INDUSTRY_GROUPS.length} industries; has ${unique.size}`
  );
  // No deity content after the Turn: the ascent owns the gods.
  const turnIdx = html.indexOf('id="turn"');
  const act2 = html.slice(turnIdx);
  assert.ok(!act2.includes('arche-seat'), 'Act II must not carry temple seats');
  assert.ok(!/class="arche-card" href="\/[a-z]/.test(act2), 'Act II must not carry deity cards');
  // Every thesis states the concrete mapping — no vague metaphor may regress.
  for (const ch of DESCENT) {
    assert.ok(
      /became|is now|are the/i.test(ch.thesis),
      `${ch.id}: thesis must state the concrete ancient→modern mapping`
    );
  }
});

test('page exists with a scene per chapter plus prologue, turn, finale', () => {
  const html = read('genesis/index.html');
  const want = [
    'prologue',
    'turn',
    'finale',
    ...ASCENT.map((c) => `scene-${c.id}`),
    ...DESCENT.map((c) => `scene-${c.id}`),
  ];
  for (const id of want) {
    assert.ok(html.includes(`id="${id}"`), `missing scene ${id}`);
  }
  assert.ok(html.includes('class="arche-scene arche-scene--turn"'), 'the turn scene missing');
});

test('every deity card links a live temple; every tendril anchors a real atlas panel', () => {
  const html = read('genesis/index.html');
  const ids = new Set(LEXICON.map((e) => e.id));
  for (const m of html.matchAll(/class="arche-card" href="\/([a-z0-9-]+)\//g)) {
    assert.ok(ids.has(m[1]), `card links unknown temple "/${m[1]}/"`);
  }
  const inds = new Set(INDUSTRY_GROUPS.map((g) => g.industry));
  for (const m of html.matchAll(/href="\/patterns\/#pa-panel-([a-z-]+)"/g)) {
    assert.ok(inds.has(m[1]), `tendril anchors unknown panel "${m[1]}"`);
  }
});

test('page carries canonical chrome, SEO meta, and JSON-LD without JS dependency', () => {
  const html = read('genesis/index.html');
  for (const marker of [
    '<link rel="canonical" href="https://punicodex.com/genesis/">',
    'property="og:title"',
    'application/ld+json',
    '<h1 class="arche-title arche-title--huge">The First Principles</h1>',
    '<canvas id="arche-fx"',
    'class="arche-exit"',
    'data-autoplay',
    '/css/arche.css',
    '/js/arche.js',
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  // Verse content must be server-rendered (readable without JS).
  assert.ok(html.includes('In the beginning there was no beginning'));
});

// ---------------------------------------------------------------------------
// 3. Engine contracts
// ---------------------------------------------------------------------------

test('engine is Canvas 2D with quality governor and reduced-motion path (no WebGL)', () => {
  const js = read('js/arche.js');
  for (const marker of [
    "getContext('2d'",
    'prefers-reduced-motion: reduce',
    'BUDGET',
    'fps < 38',
    'devicePixelRatio',
    'IntersectionObserver',
    'makePulsePath',
    'arche-turned',
    'setPlaying(false)',
    'stroke-dashoffset',
  ]) {
    assert.ok(js.includes(marker), `engine missing ${marker}`);
  }
  assert.ok(!js.includes("getContext('webgl'"), 'engine must not depend on WebGL');
});

test('engine exposes a system for every scene fx id used by the page', () => {
  const js = read('js/arche.js');
  const html = read('genesis/index.html');
  const used = new Set([...html.matchAll(/data-fx="([a-z-]+)"/g)].map((m) => m[1]));
  for (const id of used) {
    if (id.indexOf('d-') === 0) continue; // descent scenes share the circuit system
    assert.ok(
      js.includes(`SYSTEMS.${id}`) ||
        js.includes(`${id}:`) ||
        js.includes(`'${id}':`) ||
        js.includes(`"${id}":`),
      `no particle system for fx "${id}"`
    );
  }
});

// ---------------------------------------------------------------------------
// 4. Generator idempotency
// ---------------------------------------------------------------------------

test('generator is idempotent (byte-identical output across runs)', () => {
  const STAMPER = path.join(root, 'scripts', 'stamp-asset-versions.js');
  const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  // The committed pages carry post-pipeline injection blocks; the raw
  // generator+stamper does not. Capture and restore every emitted page so
  // this suite leaves the tree exactly as it found it (battery hygiene).
  const emitted = [PAGE, ...ASCENT.map((c) => path.join(root, 'genesis', c.id, 'index.html'))];
  const snapshot = new Map(emitted.map((p) => [p, fs.readFileSync(p)]));
  const run = () => {
    execFileSync(process.execPath, [GENERATOR], { cwd: root, stdio: 'pipe' });
    // The committed page is generator + asset stamper output (the stamper pins
    // /assets/fonts/fonts.css and friends); reproduce both every run.
    execFileSync(process.execPath, [STAMPER], { cwd: root, stdio: 'pipe' });
  };
  try {
    // Idempotency means run-to-run byte stability: three consecutive
    // generator+stamper passes must agree. (Whether the committed bytes match
    // this output is the divergence gate's job — this suite runs inside the
    // battery, where other suites may legitimately touch pages first.)
    run();
    const first = hash(PAGE);
    run();
    assert.strictEqual(hash(PAGE), first, 'second regeneration changed the page');
    run();
    assert.strictEqual(hash(PAGE), first, 'third regeneration changed the page');
  } finally {
    for (const [p, bytes] of snapshot) {
      if (fs.existsSync(p)) fs.writeFileSync(p, bytes);
    }
  }
});

// ---------------------------------------------------------------------------
// 5. Per-chapter pages, widgets, sound, loop, grading, tracking
// ---------------------------------------------------------------------------

test('every chapter has a crawlable share page at /genesis/{id}/', () => {
  for (let i = 0; i < ASCENT.length; i++) {
    const ch = ASCENT[i];
    const file = path.join(root, 'genesis', ch.id, 'index.html');
    assert.ok(fs.existsSync(file), `missing chapter page for ${ch.id}`);
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(
      html.includes(`<link rel="canonical" href="https://punicodex.com/genesis/${ch.id}/">`),
      `${ch.id}: canonical`
    );
    assert.ok(html.includes(esc(ch.verse[0])), `${ch.id}: verse`);
    assert.ok(html.includes('arche-chapter-nav'), `${ch.id}: prev/next nav`);
    const ids = new Set(LEXICON.map((e) => e.id));
    for (const m of html.matchAll(/class="arche-card" href="\/([a-z0-9-]+)\//g)) {
      assert.ok(ids.has(m[1]), `${ch.id}: card links unknown temple ${m[1]}`);
    }
  }
  // First and last chapters link back into the experience.
  const first = fs.readFileSync(path.join(root, 'genesis', ASCENT[0].id, 'index.html'), 'utf8');
  assert.ok(first.includes('href="/genesis/"'), 'first chapter must link the full experience');
});

test('main page carries the claim widget, oracle hand-off, loop, and sound control', () => {
  const html = read('genesis/index.html');
  for (const marker of [
    'data-claim-form',
    'data-oracle-form',
    'data-loop',
    'data-sound',
    'arche-title-link',
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
});

test('engine: transitions, sound design, widgets, and journey tracking', () => {
  const js = read('js/arche.js');
  for (const marker of [
    'drawTransition',
    'TRANSITIONS',
    'AudioContext',
    'DRONE_FREQ',
    'setSound',
    'hashName',
    "'/oracle/?q='",
    'arche_scene',
    'arche_claim',
    'data-fx',
    'navigator.clipboard',
  ]) {
    assert.ok(js.includes(marker), `engine missing ${marker}`);
  }
});

test('colour grading rules exist for the graded principles', () => {
  const css = read('css/arche.css');
  const graded = [
    'water',
    'love',
    'death',
    'the-song',
    'the-wild',
    'the-child',
    'trickery',
    'wisdom',
  ];
  for (const id of graded) {
    assert.ok(css.includes(`body[data-fx='${id}']`), `no grading rule for ${id}`);
  }
});

// ---------------------------------------------------------------------------

async function runAll() {
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
          .slice(0, 5)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nArchē: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
