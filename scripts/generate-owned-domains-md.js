/**
 * PUNICODEX — Generate OWNED_DOMAINS.md from canonical sources.
 *
 * Sources of truth:
 *   - platform/db/owned-domains.json  (temple-domain inventory)
 *   - js/archetypes-v2.js             (flagship archetypes)
 *   - type/js/lexicon.js              (all entries, pantheons)
 *   - middleware.js                   (DOMAIN_MAP — current routing)
 *
 * Run: node scripts/generate-owned-domains-md.js
 *      npm run generate will also invoke it.
 */

const fs = require('fs');
const path = require('path');
const { preservedFeatures } = require('../type/js/engine.js');
const vm = require('vm');
const { domainToASCII } = require('url');

const ROOT = path.join(__dirname, '..');
const OWNED_DOMAINS_PATH = path.join(ROOT, 'platform', 'db', 'owned-domains.json');
const ARCHETYPES_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const MIDDLEWARE_PATH = path.join(ROOT, 'middleware.js');
const OUTPUT_PATH = path.join(ROOT, 'OWNED_DOMAINS.md');

// Platform / non-temple domains that we own but do not route through
// middleware.js DOMAIN_MAP. Keep this in sync with reality.
const PLATFORM_DOMAINS = new Set(['punicodex.com']);

function puny(d) {
  try {
    return domainToASCII(d).toLowerCase();
  } catch (e) {
    return null;
  }
}

function normalizeDomain(d) {
  return d.toLowerCase().trim().replace(/^www\./, '');
}

function loadJsArray(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInNewContext(`(function(){\n${src}\nreturn ${varName};\n})()`);
}

function loadMiddlewareDomainMap() {
  const src = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
  const mapMatch = src.match(/const DOMAIN_MAP = \{([\s\S]*?)\n\};/);
  if (!mapMatch) throw new Error('Could not find DOMAIN_MAP in middleware.js');

  const map = {};
  const lineRegex = /^\s*'([^']+)':\s*'([^']+)',?/gm;
  let m;
  while ((m = lineRegex.exec(mapMatch[1])) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

function classifyPreservation(entry) {
  return preservedFeatures((entry && entry.unicode) || '').features.length > 0
    ? 'marked'
    : 'plain';
}

function pantheonName(archetype, entry) {
  if (archetype?.pantheon) return archetype.pantheon;
  if (entry?.pantheon) return entry.pantheon;
  return 'unknown';
}

function displayName(archetype, entry, siteId) {
  if (archetype?.name) return archetype.name;
  if (entry?.unicode) return entry.unicode;
  return siteId;
}

function escapeMdCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ─── Load canonical sources ─────────────────────────────────────────────────
const archetypes = loadJsArray(ARCHETYPES_PATH, 'ARCHETYPES');
const lexicon = loadJsArray(LEXICON_PATH, 'LEXICON');
const ownedDomainsRaw = JSON.parse(fs.readFileSync(OWNED_DOMAINS_PATH, 'utf8'));
const domainMap = loadMiddlewareDomainMap();

const archetypeById = new Map(archetypes.map((a) => [a.id, a]));
const entryById = new Map(lexicon.map((e) => [e.id, e]));

// ─── Build site -> domains mapping ──────────────────────────────────────────
// siteId -> { domains: Set<string>, archetype?, entry? }
const sites = new Map();

function ensureSite(id) {
  if (!sites.has(id)) {
    sites.set(id, {
      id,
      archetype: archetypeById.get(id) || null,
      entry: entryById.get(id) || null,
      domains: new Set(),
    });
  }
  return sites.get(id);
}

const unmapped = [];
const platform = []; // non-/sites/ routing
const seenDomains = new Set();

// Always include known platform domains, even if they are not stored in the
// temple-domain inventory.
for (const d of PLATFORM_DOMAINS) {
  platform.push({ domain: d, purpose: 'Canonical platform domain — resolves to itself (punicodex.com)' });
}

for (const raw of ownedDomainsRaw) {
  const d = normalizeDomain(raw);
  if (!d) continue;
  if (seenDomains.has(d)) continue;
  seenDomains.add(d);

  // Platform domains (not routed to a temple).
  if (PLATFORM_DOMAINS.has(d)) {
    platform.push({ domain: raw, purpose: 'Main platform' });
    continue;
  }

  // Prefer direct lookup in DOMAIN_MAP; fallback to punycode form.
  let target = domainMap[d] || domainMap[puny(d)] || domainMap['www.' + d] || domainMap['www.' + puny(d)];

  if (!target) {
    // Some owned domains may route via www. only or punycode only in the map.
    const p = puny(d);
    for (const [mapDomain, mapTarget] of Object.entries(domainMap)) {
      if (normalizeDomain(mapDomain) === d) {
        target = mapTarget;
        break;
      }
      if (p && normalizeDomain(mapDomain) === p) {
        target = mapTarget;
        break;
      }
    }
  }

  if (!target) {
    unmapped.push(raw);
    continue;
  }

  const siteId = target.replace(/^\/sites\//, '');
  const site = ensureSite(siteId);
  site.domains.add(raw); // keep original casing for display
}

// ─── Group by preservation and compute variants ─────────────────────────────
const multiForm = [];
const marked = [];
const plain = [];
const base = []; // owned domains for non-flagship (base) temples

for (const site of sites.values()) {
  const preservation = classifyPreservation(site.entry);
  const isFlagship = Boolean(site.archetype);
  const sortedDomains = Array.from(site.domains).sort((a, b) => a.localeCompare(b, 'en'));

  // Determine the primary owned domain for this site, if any.
  let primaryDomain = null;
  if (site.archetype?.domainUnicode) {
    const primaryNorm = normalizeDomain(site.archetype.domainUnicode);
    if (site.domains.has(primaryNorm)) {
      primaryDomain = primaryNorm;
    }
  }
  // If the archetype's canonical domain is not owned, treat the first
  // alphabetical owned domain as the primary for this report.
  if (!primaryDomain) {
    primaryDomain = normalizeDomain(sortedDomains[0]);
  }

  const variants = sortedDomains.filter((d) => normalizeDomain(d) !== primaryDomain);

  const record = {
    id: site.id,
    name: displayName(site.archetype, site.entry, site.id),
    pantheon: pantheonName(site.archetype, site.entry),
    rentalTier: site.archetype?.rentalTier || null,
    domains: sortedDomains,
    primaryDomain,
    variants,
    isFlagship,
    preservation,
  };

  if (!isFlagship) {
    base.push(record);
  } else if (record.variants.length > 0) {
    multiForm.push(record);
  } else if (preservation === 'marked') {
    marked.push(record);
  } else {
    plain.push(record);
  }
}

const sortRecords = (records) =>
  records.sort((a, b) => {
    const pa = a.pantheon.toLowerCase();
    const pb = b.pantheon.toLowerCase();
    if (pa !== pb) return pa.localeCompare(pb, 'en');
    return a.name.localeCompare(b.name, 'en');
  });

sortRecords(multiForm);
sortRecords(marked);
sortRecords(plain);
sortRecords(base);

// ─── Helpers for markdown tables ────────────────────────────────────────────
function renderMultiDomainTable(records) {
  const lines = [
    '| Archetype | Display Name | Domains (owned redirects) | Pantheon | Rental Tier |',
    '|-----------|--------------|---------------------------|----------|-------------|',
  ];
  for (const r of records) {
    const domainList = r.domains.map((d) => `\`${d}\``).join('<br>');
    lines.push(
      `| ${escapeMdCell(r.id)} | ${escapeMdCell(r.name)} | ${domainList} | ${escapeMdCell(r.pantheon)} | ${escapeMdCell(r.rentalTier || '—')} |`
    );
  }
  return lines.join('\n');
}

function renderSimpleDomainTable(records) {
  const lines = [
    '| Domain | Unicode / Display | Site | Pantheon |',
    '|--------|-------------------|------|----------|',
  ];
  for (const r of records) {
    for (const d of r.domains) {
      lines.push(
        `| \`${escapeMdCell(d)}\` | ${escapeMdCell(r.name)} | /sites/${escapeMdCell(r.id)}/ | ${escapeMdCell(r.pantheon)} |`
      );
    }
  }
  return lines.join('\n');
}

// ─── Compose markdown ───────────────────────────────────────────────────────
const totalUniqueOwned = seenDomains.size + platform.length;
const totalTempleDomains = seenDomains.size;
const totalFlagshipDomains = multiForm.length + marked.length + plain.length;
const totalBaseDomains = base.length;
const allVariantRecords = [...multiForm, ...marked, ...plain, ...base].filter((r) => r.variants.length > 0);
const totalVariantDomains = allVariantRecords.reduce((sum, r) => sum + r.variants.length, 0);

const sections = [];

sections.push(`# PUNICODEX — Owned Domain Inventory`);
sections.push(`> Canonical record of all domains owned by PUNICODEX.`);
sections.push(`> Auto-generated: ${new Date().toISOString().slice(0, 10)}`);
sections.push(`> Source: \`platform/db/owned-domains.json\` + \`js/archetypes-v2.js\` + \`middleware.js\` DOMAIN_MAP`);
sections.push(`> Restorations are described by what they preserve (computed from the form) — see AGENTS.md`);
sections.push('');
sections.push('---');
sections.push('');

sections.push('## Overview');
sections.push('');
sections.push(`- **Total unique owned domains:** ${totalUniqueOwned}`);
sections.push(`  - **Temple domains:** ${totalTempleDomains}`);
sections.push(`    - **Primary (canonical) domains:** ${totalTempleDomains - totalVariantDomains}`);
sections.push(`    - **Variant / alternate domains:** ${totalVariantDomains}`);
sections.push(`  - **Platform domains:** ${platform.length}`);
sections.push(`- **Flagship temples covered:** ${totalFlagshipDomains}`);
sections.push(`  - Multi-form names: ${multiForm.length}`);
sections.push(`  - With preserved marks: ${marked.length}`);
sections.push(`  - ASCII-equivalent forms: ${plain.length}`);
sections.push(`- **Base temples covered:** ${totalBaseDomains}`);
sections.push(`- **Unmapped owned domains:** ${unmapped.length}`);
sections.push('');

if (unmapped.length > 0) {
  sections.push('## ⚠️ Unmapped Owned Domains');
  sections.push('');
  sections.push('These owned domains do not currently resolve to a temple via `middleware.js` DOMAIN_MAP:');
  sections.push('');
  for (const d of unmapped.sort((a, b) => a.localeCompare(b, 'en'))) {
    sections.push(`- \`${d}\``);
  }
  sections.push('');
}

sections.push('## Multi-Form Names');
sections.push('');
sections.push('Multiple historically valid Unicode spellings exist and we own more than one domain variant for the name.');
sections.push('');
if (multiForm.length > 0) {
  sections.push(renderMultiDomainTable(multiForm));
} else {
  sections.push('*No multi-form owned domains currently mapped.*');
}
sections.push('');

sections.push('## Restorations With Preserved Marks');
sections.push('');
sections.push('The displayed form preserves at least one feature ASCII cannot show — a diacritic or a distinctive letter — computed mechanically from the form itself.');
sections.push('');
if (marked.length > 0) {
  sections.push(renderMultiDomainTable(marked));
} else {
  sections.push('*No marked restorations currently mapped.*');
}
sections.push('');

sections.push('## ASCII-Equivalent Restorations');
sections.push('');
sections.push('The scholarly form is identical to ASCII — faithful without added marks.');
sections.push('');
if (plain.length > 0) {
  sections.push(renderMultiDomainTable(plain));
} else {
  sections.push('*No ASCII-equivalent owned domains currently mapped.*');
}
sections.push('');

if (base.length > 0) {
  sections.push('## Base Temple Domains');
  sections.push('');
  sections.push('Owned domains that route to generated base temples (not full flagships).');
  sections.push('');
  sections.push(renderSimpleDomainTable(base));
  sections.push('');
}

if (allVariantRecords.length > 0) {
  sections.push('## Domain Variants');
  sections.push('');
  sections.push('These are the extra owned domains beyond the primary canonical domain for each temple. They usually capture alternate transliterations, macron-only fallbacks, or additional mark densities.');
  sections.push('');
  sections.push('| Archetype | Primary Domain | Variant Domains |');
  sections.push('|-----------|----------------|-----------------|');
  for (const r of allVariantRecords) {
    const variantList = r.variants.map((d) => `\`${d}\``).join('<br>');
    sections.push(
      `| ${escapeMdCell(r.id)} | \`${escapeMdCell(r.primaryDomain)}\` | ${variantList} |`
    );
  }
  sections.push('');
}

sections.push('## Platform Domains');
sections.push('');
if (platform.length > 0) {
  sections.push(`| Domain | Purpose |`);
  sections.push(`|--------|---------|`);
  for (const p of platform) {
    sections.push(`| \`${escapeMdCell(p.domain)}\` | ${escapeMdCell(p.purpose)} |`);
  }
} else {
  sections.push('*No platform-only domains recorded.*');
}
sections.push('');

sections.push('---');
sections.push('');
sections.push('## Notes');
sections.push('');
sections.push('- Domains are shown in their owned Unicode form; punycode equivalents are routed automatically by `middleware.js`.');
sections.push('- `www.` variants are also routed for every owned domain.');
sections.push('- Run `node scripts/generate-owned-domains-md.js` (or `npm run generate`) to refresh this file after acquiring new domains.');
sections.push('');

const markdown = sections.join('\n');

// Byte-stability: the daily date stamp would make every generate run diverge
// from the committed file (failing the CI divergence gate and blocking
// deploys) even when no domain data changed. If the existing file differs
// ONLY in the Auto-generated date, keep the existing bytes.
const DATE_LINE = /^> Auto-generated: \d{4}-\d{2}-\d{2}$/m;
let write = true;
try {
  const existing = fs.readFileSync(OUTPUT_PATH, 'utf8');
  if (existing.replace(DATE_LINE, '') === markdown.replace(DATE_LINE, '')) {
    write = false;
  }
} catch {
  // No existing file — write.
}
if (write) {
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');
  console.log(`✓ Generated ${OUTPUT_PATH}`);
} else {
  console.log(`✓ ${OUTPUT_PATH} unchanged (date stamp only — keeping committed bytes)`);
}
console.log(`  Total owned domains:  ${totalUniqueOwned}`);
console.log(`    Temple domains:     ${totalTempleDomains}`);
console.log(`      Primary:          ${totalTempleDomains - totalVariantDomains}`);
console.log(`      Variants:         ${totalVariantDomains}`);
console.log(`    Platform domains:   ${platform.length}`);
console.log(`  Flagship temples:     ${totalFlagshipDomains}`);
console.log(`    Multi-form:         ${multiForm.length}`);
console.log(`    Marked:             ${marked.length}`);
console.log(`    ASCII-equivalent:   ${plain.length}`);
console.log(`  Base temples:         ${totalBaseDomains}`);
console.log(`  Unmapped:             ${unmapped.length}`);
