#!/usr/bin/env node
/**
 * Audit converted ad sites for tier mismatches, wrong transliterations,
 * ASCII errors, and thin templated content.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

// Load lexicon
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

function loadLoreHtml(siteId) {
  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) return null;
  return fs.readFileSync(lorePath, 'utf8');
}

function loadMainHtml(siteId) {
  const mainPath = path.join(SITES_DIR, siteId, 'index.html');
  if (!fs.existsSync(mainPath)) return null;
  return fs.readFileSync(mainPath, 'utf8');
}

function extractText(html, selector) {
  if (!html) return null;
  const $ = cheerio.load(html);
  const el = $(selector).first();
  return el.length ? el.text().trim() : null;
}

function extractAllText(html, selector) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $(selector).each((_, el) => {
    results.push($(el).text().trim());
  });
  return results;
}

const issues = [];

function addIssue(siteId, severity, category, message) {
  issues.push({ siteId, severity, category, message });
}

const adSites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory())
  .filter(hasBookingSystem)
  .sort();

console.log(`Auditing ${adSites.length} converted ad sites...\n`);

for (const siteId of adSites) {
  const entry = lexiconMap.get(siteId);
  if (!entry) {
    addIssue(siteId, 'high', 'missing_lexicon', `No lexicon entry found for ${siteId}`);
    continue;
  }

  const loreHtml = loadLoreHtml(siteId);
  const mainHtml = loadMainHtml(siteId);

  if (!loreHtml) {
    addIssue(siteId, 'high', 'missing_lore', 'No lore page found');
  }

  // --- TIER CHECKS ---
  const lexTier = entry.tier;
  const lexTierLabel = entry.tierLabel;

  // Check lore page hero badge
  if (loreHtml) {
    const heroBadgeMatch = loreHtml.match(/<span class="meta-badge">\s*(Tier\s*\d)\s*<\/span>/i);
    if (heroBadgeMatch) {
      const heroTier = heroBadgeMatch[1].replace(/\s+/g, ' ').trim();
      if (heroTier !== lexTierLabel) {
        addIssue(siteId, 'critical', 'tier_mismatch', `Lore hero badge says "${heroTier}" but lexicon says "${lexTierLabel}"`);
      }
    } else {
      addIssue(siteId, 'medium', 'tier_missing', 'No tier badge found in lore hero');
    }

    // Check tier classification section
    const tierLabelMatch = loreHtml.match(/<div class="tier-label">\s*(Tier\s*\d)\s*<\/div>/i);
    if (tierLabelMatch) {
      const classTier = tierLabelMatch[1].replace(/\s+/g, ' ').trim();
      if (classTier !== lexTierLabel) {
        addIssue(siteId, 'critical', 'tier_mismatch', `Tier classification section says "${classTier}" but lexicon says "${lexTierLabel}"`);
      }
    }

    // Check lore footer
    const loreFooterMatch = loreHtml.match(/<span class="footer-label">[^<]*(?:Classification|Platform)[^<]*<\/span>\s*<span class="footer-value">\s*(Tier\s*\d)\s*<\/span>/i);
    if (loreFooterMatch) {
      const footerTier = loreFooterMatch[1].replace(/\s+/g, ' ').trim();
      if (footerTier !== lexTierLabel) {
        addIssue(siteId, 'critical', 'tier_mismatch', `Lore footer says "${footerTier}" but lexicon says "${lexTierLabel}"`);
      }
    }
  }

  // Check main page footer
  if (mainHtml) {
    const mainFooterMatch = mainHtml.match(/<span class="footer-label">[^<]*(?:Classification|Platform)[^<]*<\/span>\s*<span class="footer-value">\s*(Tier\s*\d)\s*<\/span>/i);
    if (mainFooterMatch) {
      const footerTier = mainFooterMatch[1].replace(/\s+/g, ' ').trim();
      if (footerTier !== lexTierLabel) {
        addIssue(siteId, 'critical', 'tier_mismatch', `Main page footer says "${footerTier}" but lexicon says "${lexTierLabel}"`);
      }
    }
  }

  // --- ASCII CHECK ---
  if (loreHtml) {
    // Look for ASCII form card - usually has class card-ascii
    const asciiMatch = loreHtml.match(/<p class="card-ascii">\s*([^<]+)\s*<\/p>/);
    if (asciiMatch) {
      const loreAscii = asciiMatch[1].trim();
      if (loreAscii !== entry.ascii) {
        // Special case: if lexicon ascii is lowercase and lore shows Title Case, might be acceptable
        // But Latin forms like "Aegyptus" when ascii is "aigyptos" are wrong
        if (loreAscii.toLowerCase() !== entry.ascii.toLowerCase()) {
          addIssue(siteId, 'high', 'ascii_wrong', `ASCII form says "${loreAscii}" but lexicon says "${entry.ascii}"`);
        }
      }
    }
  }

  // --- PUNYCODE CHECK ---
  if (loreHtml && entry.unicode) {
    try {
      const URL = require('url').URL;
      const expectedPuny = new URL('http://' + entry.unicode + '.com').hostname;
      const punyMatch = loreHtml.match(/<code class="explainer-code">\s*[^→]+→\s*([\w.-]+)/);
      if (punyMatch) {
        const lorePuny = punyMatch[1].trim();
        if (lorePuny !== expectedPuny) {
          addIssue(siteId, 'medium', 'punycode_wrong', `Punycode says "${lorePuny}" but expected "${expectedPuny}"`);
        }
      }
    } catch (e) {
      // ignore punycode check errors
    }
  }

  // --- RELATED REALMS / PANTHEON CHECKS ---
  // Check if any related card or pantheon card Greek names match the site itself
  // or contain obvious wrong characters
  if (loreHtml) {
    // Extract all olympian-greek and related-greek values
    const greekNames = [];
    const $ = cheerio.load(loreHtml);
    $('.olympian-greek, .related-greek').each((_, el) => {
      greekNames.push($(el).text().trim());
    });

    // Flag if any related realm shows the site's own Greek name
    if (entry.greek && entry.greek !== '—') {
      for (const g of greekNames) {
        if (g === entry.greek && !loreHtml.includes('Name Variations')) {
          // This could be legitimate in name variations, but not in pantheon/related
          addIssue(siteId, 'high', 'wrong_greek', `Pantheon/Related section shows site's own Greek name "${g}"`);
        }
      }
    }
  }

  // --- THIN CONTENT CHECK ---
  if (loreHtml) {
    const $ = cheerio.load(loreHtml);
    const mythCards = $('.myth-card').length;
    const mythTextLength = $('.myth-text').text().length;
    const hasFigureSection = loreHtml.includes('The Figure') || loreHtml.includes('Who') || loreHtml.includes('who');
    const hasEtymologySection = loreHtml.includes('Etymology') || loreHtml.includes('The Name Through History') || loreHtml.includes('etymology');

    // Flags for very thin content
    if (mythCards < 3 && mythTextLength < 300) {
      addIssue(siteId, 'medium', 'thin_myths', `Only ${mythCards} myth cards with ${mythTextLength} chars of myth text`);
    }

    // Check for generic templated phrases
    const genericPhrases = [
      'Your brand, endorsed by',
      'Premium advertising placements',
      'Twelve sacred frames',
      'Claim your place',
      'This is not a directory',
      'This is a resurrection'
    ];
    for (const phrase of genericPhrases) {
      if (loreHtml.includes(phrase)) {
        addIssue(siteId, 'medium', 'generic_content', `Contains generic templated phrase: "${phrase}"`);
      }
    }
  }
}

// Print results grouped by severity
const critical = issues.filter(i => i.severity === 'critical');
const high = issues.filter(i => i.severity === 'high');
const medium = issues.filter(i => i.severity === 'medium');

function printGroup(label, items) {
  if (items.length === 0) return;
  console.log(`\n=== ${label} (${items.length}) ===`);
  const bySite = {};
  for (const item of items) {
    if (!bySite[item.siteId]) bySite[item.siteId] = [];
    bySite[item.siteId].push(item);
  }
  for (const siteId of Object.keys(bySite).sort()) {
    console.log(`\n${siteId}:`);
    for (const item of bySite[siteId]) {
      console.log(`  [${item.category}] ${item.message}`);
    }
  }
}

printGroup('CRITICAL', critical);
printGroup('HIGH', high);
printGroup('MEDIUM', medium);

if (issues.length === 0) {
  console.log('\nNo issues found.');
} else {
  console.log(`\n\nTotal issues: ${issues.length} across ${new Set(issues.map(i => i.siteId)).size} sites.`);
}
