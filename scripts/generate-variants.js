/**
 * PuniCodex — Name Variants generator (see docs/name-variants-design.md)
 *
 * The positive replacement for the retired tier system: instead of labelling a
 * name with one classification, this enumerates its spelling space — every
 * attested transliteration variant (sourced), systematic convention form, and
 * mechanically derived subset of the canonical restoration.
 *
 * Hard rules (design doc):
 *   - No stored counts anywhere on the lexicon entry — attestedCount and the
 *     form list are computed here, at generate time.
 *   - Only sourced forms count toward attestedCount.
 *   - Ownership is an annotation, never a gate.
 *   - Every derived form must NFC round-trip and never equal the canonical form.
 *
 * Outputs:
 *   - data/variants.json
 *   - platform/api/variants.json
 *   - platform/browser/renderer/variants.json
 *
 * Run via: npm run generate
 */

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');
const { LEXICON } = require('../type/js/lexicon.js');
const PUNICODEX_ENGINE = require('../type/js/engine.js');
const { conventionForms } = require('./lib/variant-conventions.js');

const root = path.join(__dirname, '..');

// ── Owned-form resolution (annotation only) ─────────────────────────────────
function loadOwnedLabels() {
  const labels = new Set();
  const add = (domain) => {
    if (!domain || typeof domain !== 'string') return;
    let d = domain.normalize('NFC').toLowerCase();
    if (d.startsWith('www.')) d = d.slice(4);
    d = d.replace(/\.com$/, '');
    if (d) labels.add(d);
  };
  const owned = JSON.parse(
    fs.readFileSync(path.join(root, 'platform', 'db', 'owned-domains.json'), 'utf8'),
  );
  for (const d of owned) add(d);

  const archSrc = fs.readFileSync(path.join(root, 'js', 'archetypes-v2.js'), 'utf8');
  const vm = require('node:vm');
  const ARCHETYPES = vm.runInNewContext(`(function(){\n${archSrc}\nreturn ARCHETYPES;\n})()`);
  for (const a of ARCHETYPES) {
    add(a.domainUnicode);
    add(a.domain);
    add(a.domainAlt);
  }
  return labels;
}

function isOwned(form, ownedLabels) {
  return ownedLabels.has(form.normalize('NFC').toLowerCase());
}

function punycodeFor(form) {
  const ascii = domainToASCII(form.normalize('NFC') + '.com');
  if (!ascii || ascii.toLowerCase() === (form.toLowerCase() + '.com')) return null;
  return ascii;
}

// ── Derived family (NFD feature subsetting — never moves stress) ────────────
const M = {
  GRAVE: String.fromCodePoint(0x300),
  ACUTE: String.fromCodePoint(0x301),
  CIRCUMFLEX: String.fromCodePoint(0x302),
  MACRON: String.fromCodePoint(0x304),
  BREVE: String.fromCodePoint(0x306),
};

function stripMarks(str, re) {
  return str.normalize('NFD').replace(re, '').normalize('NFC');
}

function derivedForms(entry) {
  const u = entry.unicode;
  const nfd = u.normalize('NFD');
  const feats = PUNICODEX_ENGINE.preservedFeatures(u);
  const out = [];

  if (feats.stress) {
    // length-only: drop grave/acute; a circumflex becomes a macron (it carries
    // both features; keeping length is the LSJ fallback convention).
    const f = stripMarks(
      nfd.replace(new RegExp(M.CIRCUMFLEX, 'g'), M.MACRON),
      new RegExp(`[${M.GRAVE}${M.ACUTE}]`, 'g'),
    );
    out.push({ form: f, relation: 'length-only' });
  }
  if (feats.length) {
    // stress-only: drop macron/breve; a circumflex becomes an acute.
    const f = stripMarks(
      nfd.replace(new RegExp(M.CIRCUMFLEX, 'g'), M.ACUTE),
      new RegExp(`[${M.MACRON}${M.BREVE}]`, 'g'),
    );
    out.push({ form: f, relation: 'stress-only' });
  }
  if (feats.stress || feats.length || feats.marks || feats.letters) {
    out.push({ form: stripMarks(nfd, /[̀-ͯ]/g), relation: 'plain' });
  }
  const stacked = PUNICODEX_ENGINE.deriveStackedForm(entry);
  if (stacked && stacked !== u) out.push({ form: stacked, relation: 'stacked' });
  return out;
}

// ── Family assembly ─────────────────────────────────────────────────────────
function buildFamily(entry, ownedLabels) {
  const forms = [];
  const seen = new Set();
  const feats = (form) => PUNICODEX_ENGINE.preservedFeatures(form).features;
  const push = (f) => {
    const key = f.form.normalize('NFC');
    if (seen.has(key)) return false;
    seen.add(key);
    forms.push({ ...f, form: key });
    return true;
  };

  const canonicalOwned = isOwned(entry.unicode, ownedLabels);
  const canonicalSources = [...(entry.sources || [])];
  if (canonicalOwned && !canonicalSources.includes('owned registration')) {
    canonicalSources.push('owned registration');
  }
  push({
    form: entry.unicode,
    class: 'attested',
    relation: 'canonical',
    features: feats(entry.unicode),
    sources: canonicalSources.length ? canonicalSources : null,
    punycode: punycodeFor(entry.unicode),
    owned: canonicalOwned,
  });

  for (const v of entry.variants || []) {
    if (!v || typeof v.unicode !== 'string') continue;
    const owned = isOwned(v.unicode, ownedLabels);
    const sources = v.sources ? [...v.sources] : owned ? ['owned registration'] : null;
    push({
      form: v.unicode,
      class: 'attested',
      relation: v.type || 'variant',
      note: v.note || null,
      features: feats(v.unicode),
      sources,
      punycode: punycodeFor(v.unicode),
      owned,
    });
  }

  for (const { form, convention } of conventionForms(entry)) {
    push({
      form,
      class: 'convention',
      relation: convention,
      features: feats(form),
      sources: null,
      punycode: punycodeFor(form),
      owned: isOwned(form, ownedLabels),
    });
  }

  for (const { form, relation } of derivedForms(entry)) {
    const nfc = form.normalize('NFC');
    // Hard rule: derived forms round-trip and never equal the canonical form.
    if (nfc !== form.normalize('NFC').normalize('NFD').normalize('NFC')) {
      throw new Error(`derived form for ${entry.id} ("${relation}") fails NFC round-trip`);
    }
    if (nfc === entry.unicode.normalize('NFC')) continue;
    push({
      form: nfc,
      class: 'derived',
      relation,
      features: feats(nfc),
      sources: null,
      punycode: punycodeFor(nfc),
      owned: isOwned(nfc, ownedLabels),
    });
  }

  const attestedCount = forms.filter((f) => f.class === 'attested' && f.sources?.length)
    .length;
  return {
    id: entry.id,
    canonical: entry.unicode,
    attestedCount,
    forms,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const ownedLabels = loadOwnedLabels();
  const variants = {};
  for (const entry of LEXICON) {
    variants[entry.id] = buildFamily(entry, ownedLabels);
  }

  const payload = {
    generated: 'name-variants',
    version: 1,
    count: LEXICON.length,
    entries: variants,
  };

  const targets = [
    path.join(root, 'data', 'variants.json'),
    path.join(root, 'platform', 'api', 'variants.json'),
    path.join(root, 'platform', 'browser', 'renderer', 'variants.json'),
  ];
  const json = JSON.stringify(payload);
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, json);
  }

  const withAttested = Object.values(variants).filter((v) => v.attestedCount > 1).length;
  const withConventions = Object.values(variants).filter((v) =>
    v.forms.some((f) => f.class === 'convention'),
  ).length;
  const totalForms = Object.values(variants).reduce((n, v) => n + v.forms.length, 0);
  console.log(
    `✓ variants: ${LEXICON.length} entries, ${totalForms} forms ` +
      `(${withAttested} entries with >1 attested form, ${withConventions} with convention forms)`,
  );
}

main();
