#!/usr/bin/env node
/**
 * Comprehensive audit of converted ad sites for scholarly accuracy.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON = require('../type/js/lexicon.js').LEXICON;
const lexiconMap = new Map(LEXICON.map(e => [e.id, e]));

function hasBookingSystem(siteId) {
  const jsPath = path.join(SITES_DIR, siteId, 'script.js');
  if (!fs.existsSync(jsPath)) return false;
  return fs.readFileSync(jsPath, 'utf8').includes('BOOKING SYSTEM');
}

const issues = [];
function addIssue(siteId, severity, category, message) {
  issues.push({ siteId, severity, category, message });
}

const adSites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory())
  .filter(hasBookingSystem)
  .sort();

console.log(`Comprehensive audit of ${adSites.length} ad sites...\n`);

for (const siteId of adSites) {
  const entry = lexiconMap.get(siteId);
  if (!entry) {
    addIssue(siteId, 'high', 'missing_lexicon', 'No lexicon entry');
    continue;
  }

  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  const mainPath = path.join(SITES_DIR, siteId, 'index.html');
  if (!fs.existsSync(lorePath)) continue;

  const loreHtml = fs.readFileSync(lorePath, 'utf8');
  const $ = cheerio.load(loreHtml);

  // --- HERO SUBTITLE CHECK ---
  const heroSubtitle = $('.hero-subtitle').text().trim();
  if (heroSubtitle) {
    // Check for generic templated subtitles
    const genericSubs = [
      'King of the Gods',
      'Lord of the Sky',
      'Wielder of the Thunderbolt',
      'Queen of the Gods',
      'Goddess of Wisdom',
      'God of the Sea',
      'Messenger of the Gods',
    ];
    // Not flagging these as errors since some are correct
  }

  // --- BREAKDOWN ACCURACY CHECK ---
  const breakdownRows = $('.breakdown-row').not('.breakdown-header');
  if (breakdownRows.length > 0 && entry.breakdown) {
    const rowTexts = [];
    breakdownRows.each((_, el) => {
      const cells = $(el).find('span');
      if (cells.length >= 3) {
        rowTexts.push({
          ascii: $(cells[0]).text().trim(),
          unicode: $(cells[2]).text().trim()
        });
      }
    });

    for (let i = 0; i < Math.min(rowTexts.length, entry.breakdown.length); i++) {
      const row = rowTexts[i];
      const lex = entry.breakdown[i];
      if (row.ascii.toLowerCase() !== lex.char.toLowerCase()) {
        addIssue(siteId, 'medium', 'breakdown_mismatch',
          `Breakdown row ${i+1}: ASCII cell shows "${row.ascii}" but lexicon says "${lex.char}"`);
      }
      if (row.unicode !== lex.to) {
        // Allow case differences for uppercase initial
        if (row.unicode.toLowerCase() !== lex.to.toLowerCase()) {
          addIssue(siteId, 'medium', 'breakdown_mismatch',
            `Breakdown row ${i+1}: Unicode cell shows "${row.unicode}" but lexicon says "${lex.to}"`);
        }
      }
    }
  }

  // --- NAME VARIATIONS CHECK ---
  const variationRows = $('.variation-row');
  if (variationRows.length > 0) {
    const hasOwned = loreHtml.includes(entry.unicode) || loreHtml.includes(entry.unicode.normalize('NFC'));
    if (!hasOwned) {
      addIssue(siteId, 'medium', 'variations_missing_owned',
        `Name Variations section does not list the owned form "${entry.unicode}"`);
    }
  }

  // --- PUNYCODE CHECK ---
  const punyMatch = loreHtml.match(/<code class="explainer-code">\s*([^<]+)\s*<\/code>/);
  if (punyMatch) {
    const punyLine = punyMatch[1].trim();
    if (!punyLine.includes('xn--') && punyLine.includes('→')) {
      // It might show the wrong format
      const parts = punyLine.split('→').map(s => s.trim());
      if (parts.length === 2) {
        const rightSide = parts[1];
        if (!rightSide.startsWith('xn--')) {
          addIssue(siteId, 'high', 'punycode_wrong',
            `Punycode line shows "${punyLine}" but right side is not xn-- format`);
        }
      }
    }
  }

  // --- RELATED REALMS CHECK ---
  // Check if any related card links to the site itself
  $('.related-card').each((_, el) => {
    const href = $(el).attr('href') || '';
    const greek = $(el).find('.related-greek').text().trim();
    if (href.includes('/sites/' + siteId + '/') && greek !== entry.greek) {
      addIssue(siteId, 'high', 'related_self_wrong',
        `Related realm links to self with wrong Greek "${greek}" (expected "${entry.greek}")`);
    }
  });

  // --- PANTHEON CHECK ---
  // Check for duplicate transliterations (e.g., Isis and Osiris both showing Ꜣst)
  const pantheonGreeks = [];
  $('.olympian-greek').each((_, el) => {
    pantheonGreeks.push($(el).text().trim());
  });
  const seen = new Set();
  for (const g of pantheonGreeks) {
    if (seen.has(g)) {
      addIssue(siteId, 'high', 'pantheon_duplicate',
        `Pantheon section has duplicate transliteration "${g}" for different deities`);
    }
    seen.add(g);
  }

  // --- THIN CONTENT CHECK ---
  const mythCards = $('.myth-card');
  const mythText = $('.myth-text').text().trim();
  const figureSection = $('#the-figure, #the-name');
  const hasFigureContent = figureSection.length > 0 && figureSection.text().length > 500;

  if (mythCards.length === 0 && !hasFigureContent) {
    addIssue(siteId, 'medium', 'very_thin',
      'No myth cards and no substantial figure/character section');
  }

  // --- PRONUNCIATION CHECK ---
  const ipaText = $('.ipa-text').text().trim();
  if (ipaText) {
    // Check for obvious template errors
    if (ipaText.includes('??') || ipaText.includes('undefined')) {
      addIssue(siteId, 'high', 'pronunciation_broken',
        `IPA display is broken: "${ipaText}"`);
    }
  }

  // --- META CHECK ---
  const titleMatch = loreHtml.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1];
    if (!title.includes(entry.unicode) && !title.includes(entry.ascii)) {
      addIssue(siteId, 'low', 'meta_title',
        `Title "${title}" does not contain the Unicode or ASCII name`);
    }
  }
}

// Print results
const critical = issues.filter(i => i.severity === 'high');
const medium = issues.filter(i => i.severity === 'medium');
const low = issues.filter(i => i.severity === 'low');

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

printGroup('HIGH', critical);
printGroup('MEDIUM', medium);
printGroup('LOW', low);

if (issues.length === 0) {
  console.log('\nNo issues found.');
} else {
  console.log(`\n\nTotal: ${issues.length} issues across ${new Set(issues.map(i => i.siteId)).size} sites.`);
}
