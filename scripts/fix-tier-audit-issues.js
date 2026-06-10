#!/usr/bin/env node
/**
 * Batch-fix tier mismatches, ASCII errors, and punycode issues
 * identified by audit-ad-sites.js across converted ad sites.
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

const lexiconModule = require(LEXICON_PATH);
const lexicon = lexiconModule.LEXICON || lexiconModule;
const lexiconMap = new Map();
for (const entry of lexicon) {
  lexiconMap.set(entry.id, entry);
}

function hasBookingSystem(siteId) {
  const jsPath = path.join(SITES_DIR, siteId, 'script.js');
  if (!fs.existsSync(jsPath)) return false;
  const js = fs.readFileSync(jsPath, 'utf8');
  return js.includes('BOOKING SYSTEM');
}

function getTierExplanation(entry) {
  const tier = entry.tier;
  const unicode = entry.unicode;
  const ascii = entry.ascii;
  const greek = entry.greek || '';

  if (tier === 'dual') {
    return `<strong>${unicode}</strong> is a Dual-Tier name. The Greek original <em>${greek}</em> contains both stress and length, and there are multiple historically valid Unicode spellings. The PUNYCODEX owns the principal variants, each corresponding to a real, attested restoration.<br><br>
    Dual-Tier is the highest classification in the PUNYCODEX system. It is reserved for names where the philological record supports more than one authoritative spelling, where the ASCII fallback is itself historically legitimate, and where the collection can display the full spectrum of scholarly opinion. This is not indecision. It is <strong>scholarly breadth.</strong>`;
  }

  if (tier === '1') {
    // Check if Greek
    if (entry.pantheon && (entry.pantheon.startsWith('greek') || entry.pantheon === 'greek-location')) {
      return `<strong>${unicode}</strong> is Tier 1 because the Greek original <em>${greek}</em> contains both stress and length, and there is only one historically valid Unicode restoration.<br><br>
      The Greek name carries the full prosodic signature: pitch accent and quantitative length together. There is no alternate accent position attested, no alternate vowel quantity supported by the manuscripts. The ASCII fallback <em>${ascii}</em> is a modern transliteration, not an ancient canonical form. Under the PUNYCODEX system, a name with both stress and length, and only one valid restoration, is <strong>unambiguously Tier 1</strong>.`;
    }
    // Non-Greek Tier 1
    return `<strong>${unicode}</strong> is Tier 1 because it represents the highest authentic orthography of its tradition. The original script and Unicode restoration preserve the scholarly standard — to strip these characters would be to Latinize, to flatten, to erase what makes the name itself.<br><br>
    Unlike Greek names, where Tier 1 requires both stress and length marks, non-Greek canonical forms are Tier 1 when they preserve the authentic characters of their source tradition. The ASCII fallback <em>${ascii}</em> is a modern convenience, not the original. Tier 1 here is a declaration of <strong>fidélity to source.</strong>`;
  }

  // Tier 2
  if (entry.pantheon && (entry.pantheon.startsWith('greek') || entry.pantheon === 'greek-location')) {
    return `<strong>${unicode}</strong> is Tier 2 because the Greek original preserves only one mark type — either stress or length, but not both in a way that produces a dual-mark restoration.<br><br>
    This is not a deficiency. In Liddell-Scott-Jones, Cambridge, and Oxford editions, single-mark conventions are the scholarly standard. The feature that <em>is</em> preserved — whether stress or length — remains a radical act of philological fidelity in a world of flat ASCII. Tier 2 is not a demotion. It is a <strong>convention honestly stated.</strong>`;
  }
  return `<strong>${unicode}</strong> is Tier 2 under the PUNYCODEX system. The restoration preserves one principal feature of the original orthography without claiming the full dual-mark status of Tier 1.<br><br>
    This is not a deficiency. Tier 2 names are still authoritative restorations — they simply reflect the limits of what the domain system, the keyboard, or the manuscript record can practically encode. The name remains <strong>true to source</strong> within those limits.`;
}

const adSites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory())
  .filter(hasBookingSystem)
  .sort();

let fixedSites = 0;
let totalFixes = 0;

for (const siteId of adSites) {
  const entry = lexiconMap.get(siteId);
  if (!entry) continue;

  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  const mainPath = path.join(SITES_DIR, siteId, 'index.html');
  if (!fs.existsSync(lorePath)) continue;

  let loreHtml = fs.readFileSync(lorePath, 'utf8');
  let mainHtml = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : null;
  let modified = false;

  const correctTierLabel = entry.tierLabel;
  const correctTierNum = entry.tier === 'dual' ? 'Dual-Tier' : (entry.tier === '1' ? 'Tier 1' : 'Tier 2');

  // Fix lore hero badge
  const heroBadgeRegex = /<span class="meta-badge">\s*(?:Tier\s*\d|Dual-Tier)\s*<\/span>/gi;
  if (heroBadgeRegex.test(loreHtml)) {
    loreHtml = loreHtml.replace(heroBadgeRegex, `<span class="meta-badge">${correctTierNum}</span>`);
    modified = true;
    totalFixes++;
  }

  // Fix lore tier classification section label
  const tierLabelRegex = /<div class="tier-label">\s*(?:Tier\s*\d|Dual-Tier)\s*<\/div>/gi;
  if (tierLabelRegex.test(loreHtml)) {
    loreHtml = loreHtml.replace(tierLabelRegex, `<div class="tier-label">${correctTierNum}</div>`);
    modified = true;
    totalFixes++;
  }

  // Fix lore footer tier
  const loreFooterRegex = /(<span class="footer-label">[^<]*(?:Classification|Platform)[^<]*<\/span>\s*<span class="footer-value">)\s*(?:Tier\s*\d|Dual-Tier)\s*(<\/span>)/gi;
  if (loreFooterRegex.test(loreHtml)) {
    loreHtml = loreHtml.replace(loreFooterRegex, `$1${correctTierNum}$2`);
    modified = true;
    totalFixes++;
  }

  // Fix main page footer tier
  if (mainHtml) {
    const mainFooterRegex = /(<span class="footer-label">[^<]*(?:Classification|Platform)[^<]*<\/span>\s*<span class="footer-value">)\s*(?:Tier\s*\d|Dual-Tier)\s*(<\/span>)/gi;
    if (mainFooterRegex.test(mainHtml)) {
      mainHtml = mainHtml.replace(mainFooterRegex, `$1${correctTierNum}$2`);
      fs.writeFileSync(mainPath, mainHtml, 'utf8');
      totalFixes++;
    }
  }

  // Fix tier explanation paragraph (only for single-tier cards, leave dual-tier explanations alone)
  // Pattern: <p class="tier-body">...<\/p> inside tier-card
  // We'll replace the first tier-body if the section is single-tier
  if (!entry.tier.includes('dual')) {
    const tierBodyRegex = /(<div class="tier-card reveal-up">\s*<div class="tier-label">[^<]+<\/div>\s*<div class="tier-domain">[^<]+<\/div>\s*)<p class="tier-body">[\s\S]*?<\/p>/i;
    const newExplanation = getTierExplanation(entry);
    if (tierBodyRegex.test(loreHtml)) {
      loreHtml = loreHtml.replace(tierBodyRegex, `$1<p class="tier-body">${newExplanation}</p>`);
      modified = true;
      totalFixes++;
    }
  }

  // Fix ASCII form in name cards
  // Pattern: <p class="card-ascii">XXX</p>
  const asciiRegex = /(<p class="card-ascii">)\s*([^<]+)\s*(<\/p>)/i;
  const asciiMatch = loreHtml.match(asciiRegex);
  if (asciiMatch) {
    const currentAscii = asciiMatch[2].trim();
    // If current doesn't match lexicon ascii (case-insensitive), fix it
    if (currentAscii.toLowerCase() !== entry.ascii.toLowerCase()) {
      loreHtml = loreHtml.replace(asciiRegex, `$1${entry.ascii}$3`);
      modified = true;
      totalFixes++;
    }
  }

  // Fix punycode encoding line
  if (entry.unicode) {
    try {
      const expectedPuny = new URL('http://' + entry.unicode + '.com').hostname;
      const punyRegex = /(<code class="explainer-code">)\s*[^→]+→\s*([\w.-]+)\s*(<\/code>)/i;
      const punyMatch = loreHtml.match(punyRegex);
      if (punyMatch) {
        const currentPuny = punyMatch[2].trim();
        if (currentPuny !== expectedPuny && !currentPuny.includes('xn--')) {
          // Replace the entire punycode line content
          loreHtml = loreHtml.replace(punyRegex, `$1${entry.unicode}.com → ${expectedPuny}$3`);
          modified = true;
          totalFixes++;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (modified) {
    fs.writeFileSync(lorePath, loreHtml, 'utf8');
    fixedSites++;
  }
}

console.log(`Fixed ${totalFixes} issues across ${fixedSites} sites.`);
