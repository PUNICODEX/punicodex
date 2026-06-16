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
const BASE_URL = 'https://punycodex.com';

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
  loreCatalog: path.join(ROOT, 'scripts', 'lore-catalog.json'),
  rendererLoreCatalog: path.join(ROOT, 'platform', 'browser', 'renderer', 'lore-catalog.json'),
  extLoreCatalog: path.join(ROOT, 'extension', 'shared', 'lore-catalog.json'),
  mobileLoreCatalog: path.join(ROOT, 'mobile', 'shared', 'lore-catalog.json'),
  typeLoreCatalog: path.join(ROOT, 'type', 'js', 'lore-catalog.json'),
  dbInit: path.join(ROOT, 'platform', 'db', 'init.js'),
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

function parseDbInitFlagshipIds() {
  const src = fs.readFileSync(PATHS.dbInit, 'utf8');
  const match = src.match(/const flagshipIds = new Set\(\[([\s\S]*?)\]\);/);
  if (!match) throw new Error('Could not parse flagshipIds in platform/db/init.js');
  const ids = [];
  const lineRe = /^\s*'([^']+)',?\s*$/gm;
  let m;
  while ((m = lineRe.exec(match[1])) !== null) {
    ids.push(m[1]);
  }
  return new Set(ids);
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
const flagshipIds = new Set(archetypes.filter(a => a.built).map(a => a.id));

// Map of normalized display text → set of valid entry ids for internal-link validation.
const linkTextToIds = new Map();
for (const entry of lexicon) {
  const names = [entry.id, entry.ascii, entry.unicode, entry.greek].filter(Boolean);
  for (const v of entry.variants || []) names.push(v.unicode);
  for (const name of names) {
    const clean = name.normalize('NFC').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!linkTextToIds.has(clean)) linkTextToIds.set(clean, new Set());
    linkTextToIds.get(clean).add(entry.id);
  }
}

// ── 1. Archetype ↔ Lexicon integrity ───────────────────────────────────────
console.log('\n▸ Archetype ↔ Lexicon');
let nameMismatches = 0;
let greekMismatches = 0;
let tierMismatches = 0;
let tierDetailMismatches = 0;
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

  // Canonical tier lives in the lexicon; archetypes must derive from it.
  const expectedTier = entry.tier === 'dual' ? 'dual-tier' : entry.tier === '1' ? 'tier-1' : 'tier-2';
  const expectedTierDetail = entry.tier === 'dual' ? 'dual-tier' : 'single-tier';
  if (a.tier !== expectedTier) {
    fail(`Archetype ${a.id} tier "${a.tier}" does not match lexicon tier "${entry.tier}" (expected "${expectedTier}")`);
    tierMismatches++;
  }
  if (a.tierDetail !== expectedTierDetail) {
    fail(`Archetype ${a.id} tierDetail "${a.tierDetail}" does not match expected "${expectedTierDetail}"`);
    tierDetailMismatches++;
  }
}

if (missingFromLexicon === 0) pass('All archetype IDs exist in the lexicon');
if (nameMismatches === 0) pass('Archetype names align with lexicon Unicode restorations');
if (greekMismatches === 0) pass('Archetype Greek originals align with the lexicon');
if (tierMismatches === 0 && tierDetailMismatches === 0) pass('Archetype tiers align with the canonical lexicon');

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

// ── 2b. Database flagship IDs ───────────────────────────────────────────────
console.log('\n▸ Database Flagship IDs');
const dbFlagshipIds = parseDbInitFlagshipIds();
const dbFlagshipSorted = [...dbFlagshipIds].sort();
if (jsonEqual(dbFlagshipSorted, expectedIds)) {
  pass('platform/db/init.js flagshipIds match archetype source exactly');
} else {
  const missing = expectedIds.filter(id => !dbFlagshipIds.has(id));
  const extra = dbFlagshipSorted.filter(id => !archetypeIds.has(id));
  if (missing.length) fail(`flagshipIds missing: ${missing.join(', ')}`);
  if (extra.length) fail(`flagshipIds has unexpected ids: ${extra.join(', ')}`);
}

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

// ── 4b. Generated lore catalog copies ──────────────────────────────────────
console.log('\n▸ Generated Lore Catalog Copies');

function loadLoreCatalog() {
  if (!fs.existsSync(PATHS.loreCatalog)) return null;
  return JSON.parse(fs.readFileSync(PATHS.loreCatalog, 'utf8'));
}

function stripHtml(html) {
  if (typeof html !== 'string') return html;
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLoreValue(value, key) {
  if (typeof value === 'string') {
    const stripKeys = ['lead', 'text', 'desc', 'syncretism', 'culturalLegacy', 'archaeology', 'note', 'meaning'];
    if (stripKeys.includes(key)) return stripHtml(value);
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => cleanLoreValue(item, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = cleanLoreValue(v, k);
    }
    return out;
  }
  return value;
}

function cleanLoreForComparison(lore) {
  if (!lore || typeof lore !== 'object') return lore;
  const out = {};
  for (const [id, entry] of Object.entries(lore)) {
    if (id.startsWith('_')) continue;
    out[id] = cleanLoreValue(entry, id);
  }
  return out;
}

const canonicalLore = loadLoreCatalog();
if (canonicalLore === null) {
  warn('Canonical lore catalog not found at scripts/lore-catalog.json');
} else {
  const expectedClean = cleanLoreForComparison(canonicalLore);
  const loreConsumers = [
    { name: 'Renderer', path: PATHS.rendererLoreCatalog },
    { name: 'Extension', path: PATHS.extLoreCatalog },
    { name: 'Mobile', path: PATHS.mobileLoreCatalog },
    { name: 'Type Tool', path: PATHS.typeLoreCatalog },
  ];
  for (const { name, path: p } of loreConsumers) {
    if (!fs.existsSync(p)) {
      fail(`${name} lore catalog missing at ${p}`);
      continue;
    }
    const consumer = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (jsonEqual(cleanLoreForComparison(consumer), expectedClean)) {
      pass(`${name} lore catalog derives from canonical`);
    } else {
      fail(`${name} lore catalog diverges from canonical`);
    }
  }
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

// ── 7. Flagship HTML content consistency (warnings) ──────────────────────────
console.log('\n▸ Flagship HTML Content');
let flagshipWarnings = 0;

function normalizeText(str) {
  return str
    .normalize('NFC')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .toLowerCase();
}

function textContent(html) {
  return normalizeText(html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' '));
}

function hasHtmlText(html, text) {
  return textContent(html).includes(normalizeText(text));
}

function assetExistsFromHtml(html, assetName) {
  const re = new RegExp(`assets/${assetName}\\.(png|webp)`, 'i');
  return re.test(html);
}

for (const a of archetypes) {
  if (!a.built) continue;
  const entry = lexiconById.get(a.id);
  if (!entry) continue;

  const htmlPath = path.join(ROOT, 'sites', a.id, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    warn(`Flagship ${a.id} is missing sites/${a.id}/index.html`);
    flagshipWarnings++;
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const text = textContent(html);

  const placeholders = ['todo', 'fixme', 'lorem ipsum', 'placeholder'];
  for (const ph of placeholders) {
    if (text.includes(ph)) {
      warn(`Flagship ${a.id} contains placeholder text: "${ph}"`);
      flagshipWarnings++;
    }
  }

  if (!html.match(/<title>[^<]*<\/title>/i)) {
    warn(`Flagship ${a.id} is missing <title>`);
    flagshipWarnings++;
  }
  if (!html.match(/<meta[^>]+name=["']description["']/i)) {
    warn(`Flagship ${a.id} is missing meta description`);
    flagshipWarnings++;
  }
  if (!html.match(/<meta[^>]+property=["']og:title["']/i)) {
    warn(`Flagship ${a.id} is missing og:title`);
    flagshipWarnings++;
  }
  if (!html.match(/<meta[^>]+property=["']og:image["']/i)) {
    warn(`Flagship ${a.id} is missing og:image`);
    flagshipWarnings++;
  }
  if (!html.match(/<link[^>]+rel=["']canonical["']/i)) {
    warn(`Flagship ${a.id} is missing canonical link`);
    flagshipWarnings++;
  }

  if (!hasHtmlText(html, entry.unicode)) {
    const variantMatch = (entry.variants || []).some(v => hasHtmlText(html, v.unicode));
    if (!variantMatch) {
      warn(`Flagship ${a.id} page does not display lexicon Unicode "${entry.unicode}" or a variant`);
      flagshipWarnings++;
    }
  }

  const isGreekEntry = entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
  const realGreek = isGreekEntry && entry.greek && entry.greek !== '—';
  if (realGreek && !hasHtmlText(html, entry.greek)) {
    warn(`Flagship ${a.id} page does not display Greek original "${entry.greek}"`);
    flagshipWarnings++;
  }

  const domainText = a.domainUnicode || a.domainPunycode;
  if (domainText) {
    const base = domainText.replace(/\.com$/, '');
    if (!hasHtmlText(html, base) && !hasHtmlText(html, domainText)) {
      warn(`Flagship ${a.id} page does not display primary domain "${domainText}"`);
      flagshipWarnings++;
    }
  }

  const tierLabel = entry.tierLabel || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier-${entry.tier}`);
  if (!hasHtmlText(html, tierLabel)) {
    warn(`Flagship ${a.id} page does not display tier badge "${tierLabel}"`);
    flagshipWarnings++;
  }

  if (!assetExistsFromHtml(html, `${a.id}_mascot`)) {
    warn(`Flagship ${a.id} page does not reference mascot asset`);
    flagshipWarnings++;
  }
  if (!assetExistsFromHtml(html, `${a.id}_logomark`)) {
    warn(`Flagship ${a.id} page does not reference logomark asset`);
    flagshipWarnings++;
  }

  // Malformed empty-name attributes produced by some cheerio/regex pipelines.
  const emptyAttrMatches = html.match(/"=""/g);
  if (emptyAttrMatches) {
    fail(`Flagship ${a.id} page contains ${emptyAttrMatches.length} malformed empty-name attribute(s) (e.g., <a href=\"...\" \"=\">)`);
  }
}

if (flagshipWarnings === 0) {
  pass('All flagship pages pass content consistency checks');
} else {
  pass(`Flagship content checks completed with ${flagshipWarnings} warning(s)`);
}

// ── 8. Internal link integrity ───────────────────────────────────────────────
console.log('\n▸ Internal Link Integrity');
let linkMismatches = 0;
const internalLinkRe = /<a\s+href="\.\.\/\.\.\/([^/]+)\/"[^>]*>([^<]+)<\/a>/g;
for (const a of archetypes) {
  if (!a.built) continue;
  const lorePath = path.join(ROOT, 'sites', a.id, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) continue;
  const html = fs.readFileSync(lorePath, 'utf8');
  let m;
  while ((m = internalLinkRe.exec(html)) !== null) {
    const target = m[1];
    const text = m[2].trim();
    const cleanText = text.normalize('NFC').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const possibleTargets = linkTextToIds.get(cleanText);
    if (possibleTargets && !possibleTargets.has(target)) {
      fail(`Flagship ${a.id} lore links "${text}" to ${target}, but it should target one of: ${[...possibleTargets].join(', ')}`);
      linkMismatches++;
    }
  }
}
if (linkMismatches === 0) pass('All flagship lore internal links point to correct entries');

// ── 9. Public copy markers ──────────────────────────────────────────────────
console.log('\n▸ Public Copy Markers');
const publicPages = [
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'about', 'index.html'),
  path.join(ROOT, 'pantheon', 'index.html'),
  path.join(ROOT, 'lexicon', 'index.html'),
  path.join(ROOT, 'realms', 'index.html'),
  path.join(ROOT, 'tiers', 'index.html'),
];
let staleMarkers = 0;
for (const pagePath of publicPages) {
  if (!fs.existsSync(pagePath)) continue;
  const html = fs.readFileSync(pagePath, 'utf8');
  const markers = html.match(/__SYNC:[a-z0-9-]+__/g);
  if (markers) {
    fail(`${path.relative(ROOT, pagePath)} contains unreplaced sync markers: ${[...new Set(markers)].join(', ')}`);
    staleMarkers++;
  }
}
if (staleMarkers === 0) pass('All public copy sync markers are replaced');

// ── 10. Sitemap completeness ─────────────────────────────────────────────────
console.log('\n▸ Sitemap Completeness');
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemapMissing = 0;
if (!fs.existsSync(sitemapPath)) {
  fail('sitemap.xml is missing');
  sitemapMissing++;
} else {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = new Set((sitemap.match(/<loc>([^<]+)<\/loc>/g) || []).map(s => s.slice(5, -6)));
  const expectedUrls = new Set();
  const addUrl = (loc) => expectedUrls.add(`${BASE_URL}${loc}`);
  addUrl('/');
  addUrl('/pantheon/');
  addUrl('/lexicon/');
  addUrl('/type/');
  addUrl('/tiers/');
  addUrl('/realms/');
  addUrl('/codex/');
  addUrl('/search.html');
  addUrl('/about/');
  addUrl('/contact/');
  addUrl('/store/');
  addUrl('/api/v1/docs/');
  addUrl('/terms/');
  addUrl('/terms/advertising/');
  addUrl('/privacy/');
  addUrl('/404.html');
  for (const entry of lexicon) {
    addUrl(`/sites/${entry.id}/`);
    if (flagshipIds.has(entry.id)) {
      addUrl(`/sites/${entry.id}/lore/`);
      addUrl(`/sites/${entry.id}/lore/extended/`);
      addUrl(`/sites/${entry.id}/gallery/`);
    }
  }

  const missingUrls = [];
  for (const url of expectedUrls) {
    if (!sitemapUrls.has(url)) missingUrls.push(url);
  }
  if (missingUrls.length) {
    for (const url of missingUrls.slice(0, 10)) {
      fail(`sitemap.xml missing: ${url}`);
    }
    if (missingUrls.length > 10) {
      fail(`... and ${missingUrls.length - 10} more missing URLs`);
    }
    sitemapMissing += missingUrls.length;
  } else {
    pass(`sitemap.xml contains all ${expectedUrls.size} expected URLs`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n────────────────────────────────────────────────────────');
if (failures === 0) {
  console.log(`✓ Flywheel integrity passed (${warnings} warnings).`);
  process.exit(0);
} else {
  console.log(`✗ Flywheel integrity failed: ${failures} failure(s), ${warnings} warning(s).`);
  process.exit(1);
}
