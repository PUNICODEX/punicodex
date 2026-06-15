/**
 * PÚNYCODEX — Flywheel Integrity Validator (Phase 2)
 *
 * Proves that the canonical sources and every generated consumer are
 * internally consistent. Run via `npm test` or standalone.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { domainToASCII } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

// ── Canonical sources ──────────────────────────────────────────────────────
const PATHS = {
  lexicon: path.join(ROOT, 'type', 'js', 'lexicon.js'),
  archetypes: path.join(ROOT, 'js', 'archetypes-v2.js'),
  ownedDomains: path.join(ROOT, 'platform', 'db', 'owned-domains.json'),
  middleware: path.join(ROOT, 'middleware.js'),
  extLexicon: path.join(ROOT, 'extension', 'shared', 'lexicon.js'),
  mobileLexicon: path.join(ROOT, 'mobile', 'shared', 'lexicon.js'),
  androidLexicon: path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'shared', 'lexicon.json'),
  rendererLexicon: path.join(ROOT, 'platform', 'browser', 'renderer', 'lexicon.json'),
};

let failures = 0;
let warnings = 0;

function fail(message) {
  console.log(`  ✗ ${message}`);
  failures++;
}

function warn(message) {
  console.log(`  ⚠ ${message}`);
  warnings++;
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

function normalize(str) {
  return (str ?? '').normalize('NFC').trim().toLowerCase();
}

function normalizeDomain(raw) {
  let d = normalize(raw);
  if (d.startsWith('www.')) d = d.slice(4);
  return d;
}

function punycode(domain) {
  try {
    const encoded = domainToASCII(domain);
    return encoded === domain ? null : encoded;
  } catch {
    return null;
  }
}

function expectedMiddlewareKeys(domain) {
  const norm = normalizeDomain(domain);
  const keys = [norm, `www.${norm}`];
  const puny = punycode(norm);
  if (puny && puny !== norm) {
    keys.push(puny, `www.${puny}`);
  }
  return keys;
}

function loadLexicon() {
  return require(PATHS.lexicon).LEXICON;
}

function loadArchetypes() {
  const src = fs.readFileSync(PATHS.archetypes, 'utf8');
  return vm.runInNewContext(`(function(){\n${src}\nreturn ARCHETYPES;\n})()`);
}


function loadOwnedDomains() {
  return require(PATHS.ownedDomains);
}

function parseMiddleware() {
  const src = fs.readFileSync(PATHS.middleware, 'utf8');

  const domainMap = new Map();
  const mapMatch = src.match(/const DOMAIN_MAP = \{([\s\S]*?)\n\};/);
  if (!mapMatch) throw new Error('Could not parse DOMAIN_MAP in middleware.js');
  const body = mapMatch[1];
  const lineRe = /^\s*'([^']+)'\s*:\s*'([^']+)',?\s*$/gm;
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    domainMap.set(m[1], m[2]);
  }

  // ARCHETYPE_IDS is derived from DOMAIN_MAP values, not a literal array.
  const archetypeIds = new Set([...domainMap.values()].map(v => v.replace('/sites/', '')));

  return { domainMap, archetypeIds };
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getRendererEntry(entry, isFlagship) {
  const out = {
    id: entry.id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    greek: entry.greek,
    pantheon: entry.pantheon,
    tier: entry.tier,
    tierLabel: entry.tierLabel,
    meaning: entry.meaning,
    sources: entry.sources,
    domain: entry.domain,
    hasFlagship: isFlagship ? 1 : 0,
    punycode: punycode(`${entry.unicode.toLowerCase()}.com`),
  };
  if (entry.variants) out.variants = entry.variants;
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  PÚNYCODEX — Flywheel Integrity Validator              ║');
console.log('╚════════════════════════════════════════════════════════╝');

const lexicon = loadLexicon();
const archetypes = loadArchetypes();
const ownedDomains = loadOwnedDomains();
const middleware = parseMiddleware();
const lexiconById = new Map(lexicon.map(e => [e.id, e]));
const archetypeById = new Map(archetypes.map(a => [a.id, a]));
const archetypeIds = new Set(archetypes.map(a => a.id));

// ── 1. Archetype ↔ Lexicon integrity ───────────────────────────────────────
console.log('\n▸ Archetype ↔ Lexicon');
let nameMismatches = 0;
let greekMismatches = 0;
let missingFromLexicon = 0;

for (const a of archetypes) {
  const entry = lexiconById.get(a.id);
  if (!entry) {
    fail(`Archetype ${a.id} has no matching lexicon entry`);
    missingFromLexicon++;
    continue;
  }

  const nameA = normalize(a.name);
  const nameE = normalize(entry.unicode);
  if (nameA !== nameE) {
    // Allow if the archetype name matches an attested variant
    const variantMatch = (entry.variants || []).some(v => normalize(v.unicode) === nameA);
    if (!variantMatch) {
      fail(`Archetype ${a.id} name "${a.name}" does not match lexicon unicode "${entry.unicode}"`);
      nameMismatches++;
    }
  }

  const greekA = normalize(a.greek);
  const greekE = normalize(entry.greek);
  // Only enforce Greek when the lexicon provides a real original script
  const hasRealGreek = greekE && greekE !== '—';
  if (hasRealGreek && greekA !== greekE) {
    fail(`Archetype ${a.id} Greek "${a.greek}" does not match lexicon "${entry.greek}"`);
    greekMismatches++;
  }
}

if (missingFromLexicon === 0) pass('All archetype IDs exist in the lexicon');
if (nameMismatches === 0) pass('Archetype names align with lexicon Unicode restorations');
if (greekMismatches === 0) pass('Archetype Greek originals align with the lexicon');

// ── 2. Middleware DOMAIN_MAP coverage ──────────────────────────────────────
console.log('\n▸ Middleware DOMAIN_MAP');
let missingDomainKeys = 0;
let unexpectedTargets = 0;
let archetypeIdMismatch = 0;

// Every archetype domain should be routed
for (const a of archetypes) {
  const target = `/sites/${a.id}`;
  const domains = [a.domainUnicode, a.domainPunycode, ...(a.domainAlt || [])].filter(Boolean);
  for (const d of domains) {
    for (const key of expectedMiddlewareKeys(d)) {
      if (middleware.domainMap.get(key) !== target) {
        fail(`Missing/incorrect route for ${key} → ${target}`);
        missingDomainKeys++;
      }
    }
  }
}

// Every DOMAIN_MAP entry should point to a real archetype
for (const [domain, target] of middleware.domainMap) {
  const m = target.match(/^\/sites\/(.+)$/);
  if (!m) {
    fail(`DOMAIN_MAP target ${target} is not a /sites/{id} path`);
    unexpectedTargets++;
    continue;
  }
  const id = m[1];
  if (!archetypeIds.has(id)) {
    fail(`DOMAIN_MAP routes ${domain} to unknown archetype id "${id}"`);
    archetypeIdMismatch++;
  }
}

// ARCHETYPE_IDS set should match archetype list exactly
const middlewareIds = [...middleware.archetypeIds].sort();
const expectedIds = [...archetypeIds].sort();
if (jsonEqual(middlewareIds, expectedIds)) {
  pass('ARCHETYPE_IDS matches the archetype source exactly');
} else {
  const missing = expectedIds.filter(id => !middleware.archetypeIds.has(id));
  const extra = middlewareIds.filter(id => !archetypeIds.has(id));
  if (missing.length) fail(`ARCHETYPE_IDS missing: ${missing.join(', ')}`);
  if (extra.length) fail(`ARCHETYPE_IDS has unexpected ids: ${extra.join(', ')}`);
}

if (missingDomainKeys === 0) pass('All archetype domains are present in DOMAIN_MAP');
if (unexpectedTargets === 0) pass('All DOMAIN_MAP targets are /sites/{id} paths');
if (archetypeIdMismatch === 0) pass('All DOMAIN_MAP ids are valid archetypes');

// ── 3. Owned domains ↔ Archetypes / Middleware ─────────────────────────────
console.log('\n▸ Owned Domains');
let ownedUnmatched = 0;
let ownedMissingRoute = 0;

// Map every expected domain key to its archetype target
const domainKeyToTarget = new Map();
for (const a of archetypes) {
  const target = `/sites/${a.id}`;
  const domains = [a.domainUnicode, a.domainPunycode, ...(a.domainAlt || [])].filter(Boolean);
  for (const d of domains) {
    for (const key of expectedMiddlewareKeys(d)) {
      domainKeyToTarget.set(key, target);
    }
  }
}

for (const d of ownedDomains) {
  const keys = expectedMiddlewareKeys(d);
  const target = keys.map(k => domainKeyToTarget.get(k)).find(Boolean);
  if (!target) {
    fail(`Owned domain "${d}" is not covered by any archetype domain set`);
    ownedUnmatched++;
    continue;
  }

  for (const key of keys) {
    if (middleware.domainMap.get(key) !== target) {
      fail(`Owned domain "${d}" (${key}) is not routed to ${target}`);
      ownedMissingRoute++;
    }
  }
}

if (ownedUnmatched === 0) pass('Every owned domain is covered by an archetype domain set');
if (ownedMissingRoute === 0) pass('All owned domains are routed in middleware');

// ── 4. Generated lexicon copies ────────────────────────────────────────────
console.log('\n▸ Generated Lexicon Copies');

const ext = require(PATHS.extLexicon).LEXICON;
if (jsonEqual(ext, lexicon)) {
  pass('extension/shared/lexicon.js is byte-identical to canonical lexicon');
} else {
  fail('extension/shared/lexicon.js diverges from type/js/lexicon.js');
}

const mobile = require(PATHS.mobileLexicon).LEXICON;
if (jsonEqual(mobile, lexicon)) {
  pass('mobile/shared/lexicon.js is byte-identical to canonical lexicon');
} else {
  fail('mobile/shared/lexicon.js diverges from type/js/lexicon.js');
}

const androidRaw = JSON.parse(fs.readFileSync(PATHS.androidLexicon, 'utf8'));
const expectedAndroid = lexicon.map(e => ({
  ascii: e.ascii,
  unicode: e.unicode,
  greek: e.greek || '',
  pantheon: e.pantheon,
  tier: e.tier,
  id: e.id || e.ascii,
  variants: (e.variants || []).map(v => ({
    unicode: v.unicode,
    type: v.type || 'variant',
    note: v.note || '',
  })),
}));
if (jsonEqual(androidRaw, expectedAndroid)) {
  pass('Android lexicon.json derives correctly from canonical lexicon');
} else {
  fail('Android lexicon.json diverges from canonical lexicon');
}

// ── 5. Renderer lexicon JSON ───────────────────────────────────────────────
console.log('\n▸ Renderer Lexicon JSON');
const renderer = JSON.parse(fs.readFileSync(PATHS.rendererLexicon, 'utf8'));
let rendererEntryMismatch = 0;

for (const entry of lexicon) {
  const rendered = renderer.entries.find(e => e.id === entry.id);
  if (!rendered) {
    fail(`Renderer missing entry for ${entry.id}`);
    rendererEntryMismatch++;
    continue;
  }
  const expected = getRendererEntry(entry, archetypeIds.has(entry.id));
  if (!jsonEqual(rendered, expected)) {
    fail(`Renderer entry ${entry.id} does not match canonical`);
    rendererEntryMismatch++;
  }
}
if (rendererEntryMismatch === 0) pass('Renderer entries derive correctly from canonical lexicon');

// Breakdowns
const expectedBreakdowns = [];
for (const e of lexicon) {
  if (e.breakdown) {
    for (const b of e.breakdown) {
      expectedBreakdowns.push({ entryId: e.id, char: b.char, to: b.to, type: b.type, note: b.note });
    }
  }
}
if (jsonEqual(renderer.breakdowns, expectedBreakdowns)) {
  pass('Renderer breakdowns match canonical lexicon');
} else {
  fail('Renderer breakdowns diverge from canonical lexicon');
}

const expectedPantheons = [...new Set(lexicon.map(e => e.pantheon))].sort();
if (jsonEqual(renderer.pantheons, expectedPantheons)) {
  pass('Renderer pantheon list is canonical');
} else {
  fail('Renderer pantheon list diverges');
}

if (renderer.totalEntries === lexicon.length) {
  pass(`Renderer entry count = ${lexicon.length}`);
} else {
  fail(`Renderer totalEntries ${renderer.totalEntries} !== ${lexicon.length}`);
}

if (renderer.totalBreakdowns === expectedBreakdowns.length) {
  pass(`Renderer breakdown count = ${expectedBreakdowns.length}`);
} else {
  fail(`Renderer totalBreakdowns ${renderer.totalBreakdowns} !== ${expectedBreakdowns.length}`);
}

// ── 6. Temple pages exist ──────────────────────────────────────────────────
console.log('\n▸ Temple Pages');
let missingTemples = 0;
for (const entry of lexicon) {
  const templePath = path.join(ROOT, 'sites', entry.id, 'index.html');
  if (!fs.existsSync(templePath)) {
    fail(`Missing temple page: sites/${entry.id}/index.html`);
    missingTemples++;
  }
}
if (missingTemples === 0) pass(`All ${lexicon.length} lexicon entries have temple pages`);

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n────────────────────────────────────────────────────────');
if (failures === 0) {
  console.log(`✓ Flywheel integrity passed (${warnings} warnings).`);
  process.exit(0);
} else {
  console.log(`✗ Flywheel integrity failed: ${failures} failure(s), ${warnings} warning(s).`);
  process.exit(1);
}
