/**
 * Fix domain consistency across all temple pages.
 *
 * Uses the canonical owned domain list from the user to:
 * 1. Update footer domain values on home, lore, and gallery pages
 * 2. Fix meta descriptions that reference domains
 * 3. Fix hero/domain badge references
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));

// ─── Canonical owned domain list (from user) ────────────────────────────

const USER_DOMAIN_LIST = `
ꜣḫ.com
aígyptos.com
aphrodītē.com
aphrodítē.com
apóllōn.com
apollōn.com
asía.com
athénā.com
athēnā.com
athēnai.com
ꜣb.com
bꜣ.com
cháos.com
delphoí.com
diónysos.com
dēmētēr.com
eurṓpē.com
eurōpē.com
gaîa.com
gaṇeśa.com
hádēs.com
hekatē.com
hekátē.com
hermês.com
hermēs.com
hestía.com
hēlios.com
hēphaistos.com
hēra.com
óðinn.com
śiva.com
jötunheimr.com
kꜣ.com
kōbe.com
kālī.com
kēr.com
kyōto.com
álfheimr.com
libyē.com
ólympos.com
mꜥ.com
mꜣ.com
médousa.com
miðgarðr.com
nikē.com
níkê.com
níkē.com
persephonē.com
póntos.com
poseidōn.com
poseidôn.com
promētheus.com
rꜥ.com
ragnarǫk.com
þórr.com
árēs.com
ártemis.com
sꜥ.com
ōsaka.com
selēnē.com
spártē.com
átlas.com
tártaros.com
viṣṇu.com
šw.com
zeús.com
muspellheimr.com
helheimr.com
punycodex.com
punicodex.com
`;

// Parse into array - handle lines with '+' or 'and' separators
const allOwnedDomains = [];
for (const line of USER_DOMAIN_LIST.split(/\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  // Split by ' + ' or ' and ' to get individual domains
  const parts = trimmed.split(/\s*\+\s*|\s+and\s+/);
  for (const part of parts) {
    const domain = part.trim();
    if (domain.endsWith('.com')) {
      allOwnedDomains.push(domain);
    }
  }
}

// Map domain base -> full domain
const domainBaseToFull = new Map();
for (const d of allOwnedDomains) {
  domainBaseToFull.set(d.replace(/\.com$/, ''), d);
}

// ─── Map domains to site IDs ────────────────────────────────────────────

function normalizeForCompare(str) {
  // Remove diacritics for loose comparison, but also compare exact lowercase
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findSiteIdForDomain(domainBase) {
  const domainLower = domainBase.toLowerCase();
  const domainNormalized = normalizeForCompare(domainBase);

  // Special mappings for domains that don't match lexicon entries directly
  // These take precedence over all other matching to resolve ambiguities
  const specialMappings = {
    'punycodex': 'main',
    'punicodex': 'main',
    'mꜣ': 'maat',
    'bꜣ': null, // no site yet
    'kꜣ': null, // no site yet
  };
  if (specialMappings.hasOwnProperty(domainLower)) {
    return specialMappings[domainLower];
  }

  // Try exact match on lowercase unicode or ascii
  const entry = LEXICON.find(e => {
    const exactUnicode = e.unicode.toLowerCase() === domainLower;
    const exactAscii = e.ascii.toLowerCase() === domainLower;
    return exactUnicode || exactAscii;
  });
  if (entry) return entry.id;

  // Try variant match
  const variantEntry = LEXICON.find(e => {
    return (e.variants || []).some(v => {
      return v.unicode.toLowerCase() === domainLower ||
             (v.ascii && v.ascii.toLowerCase() === domainLower);
    });
  });
  if (variantEntry) return variantEntry.id;

  // Try normalized (diacritic-stripped) match
  const normalizedEntry = LEXICON.find(e => {
    return normalizeForCompare(e.unicode) === domainNormalized ||
           normalizeForCompare(e.ascii) === domainNormalized;
  });
  if (normalizedEntry) return normalizedEntry.id;

  return null;
}

// Build siteId -> owned domain bases map
const siteOwnedDomains = {}; // siteId -> [domainBase1, domainBase2, ...]
for (const domain of allOwnedDomains) {
  const base = domain.replace(/\.com$/, '');
  const siteId = findSiteIdForDomain(base);
  if (siteId) {
    if (!siteOwnedDomains[siteId]) siteOwnedDomains[siteId] = [];
    siteOwnedDomains[siteId].push(base);
  }
}

// Sort domains within each site: primary (exact unicode match) first, then variants
for (const [siteId, domains] of Object.entries(siteOwnedDomains)) {
  const entry = LEXICON.find(e => e.id === siteId);
  if (entry) {
    const entryUnicodeLower = entry.unicode.toLowerCase();
    domains.sort((a, b) => {
      const aIsPrimary = a.toLowerCase() === entryUnicodeLower;
      const bIsPrimary = b.toLowerCase() === entryUnicodeLower;
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      return a.localeCompare(b);
    });
  }
}

// ─── Build footer domain string ─────────────────────────────────────────

function buildFooterDomains(siteId) {
  const domains = siteOwnedDomains[siteId];
  if (!domains || domains.length === 0) return null;
  return domains.map(d => d + '.com').join(' \u00b7 ');
}

// ─── Fix a single file ──────────────────────────────────────────────────

function fixFile(siteId, filePath, domainStr) {
  if (!domainStr) return false;
  const html = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  let fixed = html;
  let changes = 0;

  // Fix footer domain values
  const footerRe = /(<span class="footer-value">)([^<]+)(<\/span>)/g;
  fixed = fixed.replace(footerRe, (match, open, content, close) => {
    if (content.includes('.com') || content.includes('\.com') || content.includes('&middot;')) {
      changes++;
      return open + domainStr + close;
    }
    return match;
  });

  // Fix meta description if it references the old domain
  const entry = LEXICON.find(e => e.id === siteId);
  if (entry) {
    const asciiDomain = entry.ascii + '.com';
    const primaryDomain = entry.unicode + '.com';

    // Replace ASCII domain references in meta description with primary domain
    const metaDescRe = /(<meta name="description" content="[^"]*)\b([a-zA-Z]+)\.com([^"]*")/;
    fixed = fixed.replace(metaDescRe, (match, before, domainName, after) => {
      // Only replace if domainName is the ASCII form
      if (domainName.toLowerCase() === entry.ascii.toLowerCase()) {
        changes++;
        return before + entry.unicode + '.com' + after;
      }
      return match;
    });

    // Replace in og:description too
    const ogDescRe = /(<meta property="og:description" content="[^"]*)\b([a-zA-Z]+)\.com([^"]*")/;
    fixed = fixed.replace(ogDescRe, (match, before, domainName, after) => {
      if (domainName.toLowerCase() === entry.ascii.toLowerCase()) {
        changes++;
        return before + entry.unicode + '.com' + after;
      }
      return match;
    });
  }

  if (changes > 0 && fixed !== html) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`  ${relPath}: ${changes} changes`);
    return true;
  }
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────────

console.log('Fixing domain consistency across all temple pages...\n');

let totalFixed = 0;
let totalFiles = 0;

for (const siteId of Object.keys(siteOwnedDomains).sort()) {
  const domainStr = buildFooterDomains(siteId);
  if (!domainStr) continue;

  const sitePath = path.join(SITES_DIR, siteId);
  if (!fs.existsSync(sitePath)) {
    console.log(`${siteId}: site directory not found, skipping`);
    continue;
  }

  let siteFixed = 0;

  const files = [
    path.join(sitePath, 'index.html'),
    path.join(sitePath, 'lore', 'index.html'),
    path.join(sitePath, 'gallery', 'index.html'),
  ];

  for (const filePath of files) {
    if (fs.existsSync(filePath)) {
      totalFiles++;
      if (fixFile(siteId, filePath, domainStr)) {
        siteFixed++;
        totalFixed++;
      }
    }
  }

  if (siteFixed > 0) {
    console.log(`${siteId}: ${domainStr} (${siteFixed} files fixed)`);
  }
}

console.log(`\nDone: ${totalFixed} files fixed across ${Object.keys(siteOwnedDomains).length} sites.`);
