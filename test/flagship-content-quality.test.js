/**
 * PÚNYCODEX — Flagship Temple Content Quality Audit
 *
 * Audits every built flagship temple for richness and canonical soundness:
 *   - lore-catalog coverage and schema integrity
 *   - generated lore/extended/gallery pages exist and contain required sections
 *   - no visible stubs or broken domain cards
 *   - pronunciation, symbols, and mythology meet minimum richness thresholds
 *   - galleries are populated (no placeholder)
 *   - tier/canonical markers are present where expected
 *
 * Run standalone: node test/flagship-content-quality.test.js
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const CATALOG = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const BUILT = ARCHETYPES.filter((a) => a.built);
const BUILT_IDS = BUILT.map((a) => a.id);
const CATALOG_IDS = Object.keys(CATALOG).filter((k) => !k.startsWith('_'));

const GENERIC_SYMBOL_NAMES = new Set([
  'Sacred emblem',
  'Cult site',
  'Ritual object',
  'Runic inscription',
  'Divine weapon or tool',
]);

const GENERIC_MYTH_TITLES = new Set(['Sacred Story', 'Ancient Tale', 'Mythic Episode']);

const ISSUES = {
  missingCatalog: [],
  brokenDomainCards: [],
  stubPronunciation: [],
  stubSymbols: [],
  stubMythology: [],
  missingSections: [],
  emptyGallery: [],
  tierExplanationMissing: [],
};

function loadHtml(id, subPath) {
  const filePath = path.join(ROOT, 'sites', id, subPath);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function auditCatalogCoverage() {
  for (const id of BUILT_IDS) {
    if (!CATALOG[id]) {
      ISSUES.missingCatalog.push(id);
    }
  }
}

function auditCatalogSchema() {
  for (const id of CATALOG_IDS) {
    const entry = CATALOG[id];
    if (!entry.domains?.cards) continue;
    for (let i = 0; i < entry.domains.cards.length; i++) {
      const card = entry.domains.cards[i];
      const problems = [];
      if (!card.name || card.name === 'undefined') problems.push('missing name');
      if (!card.desc || card.desc === 'undefined') problems.push('missing desc');
      if (!card.iconPath || card.iconPath === 'undefined') problems.push('missing iconPath');
      if (problems.length) {
        ISSUES.brokenDomainCards.push(`${id}[${i}]: ${problems.join(', ')}`);
      }
    }
  }
}

function auditGeneratedPages() {
  for (const archetype of BUILT) {
    const id = archetype.id;
    const entry = LEXICON.find((e) => e.id === id);
    const hasCatalog = CATALOG_IDS.includes(id);

    // --- Lore page ---
    const loreHtml = loadHtml(id, 'lore/index.html');
    if (!loreHtml) {
      ISSUES.missingSections.push(`${id}: lore/index.html missing`);
      continue;
    }
    const $lore = cheerio.load(loreHtml);
    const requiredLoreSections = ['provenance', 'pronunciation', 'symbols', 'mythology'];
    for (const section of requiredLoreSections) {
      if (!$lore(`#${section}`).length) {
        ISSUES.missingSections.push(`${id}: #${section} missing in lore`);
      }
    }

    // Broken undefined cards
    if (loreHtml.includes('<h4 class="domain-name">undefined</h4>')) {
      ISSUES.brokenDomainCards.push(`${id}: rendered undefined domain-name in HTML`);
    }

    // Stub pronunciation for catalog-backed entries
    if (hasCatalog) {
      const phonemeEls = $lore('#pronunciation .phoneme-symbol');
      const hasStubPhoneme = phonemeEls.toArray().some((el) => {
        const text = $lore(el).text().trim();
        return text === '…' || text === '...';
      });
      const approxText = $lore('#pronunciation .pronunciation-approx').text();
      const hasStubApprox = /the conventional spoken form/i.test(approxText);
      if (hasStubPhoneme || hasStubApprox) {
        ISSUES.stubPronunciation.push(id);
      }

      // Stub symbols
      const symbolEls = $lore('#symbols .symbol-name');
      let genericSymbolCount = 0;
      symbolEls.each((_, el) => {
        const name = $lore(el).text().trim();
        if (GENERIC_SYMBOL_NAMES.has(name)) genericSymbolCount++;
      });
      if (genericSymbolCount >= 2) {
        ISSUES.stubSymbols.push(`${id}: ${genericSymbolCount} generic symbols`);
      }

      // Mythology richness
      const mythCards = $lore('#mythology .myth-card');
      if (mythCards.length < 2) {
        ISSUES.stubMythology.push(`${id}: only ${mythCards.length} myth card(s)`);
      } else {
        let genericMythCount = 0;
        mythCards.each((_, el) => {
          const title = $lore(el).find('.myth-title').text().trim();
          if (GENERIC_MYTH_TITLES.has(title)) genericMythCount++;
        });
        if (genericMythCount >= 1) {
          ISSUES.stubMythology.push(`${id}: ${genericMythCount} generic myth title(s)`);
        }
      }
    }

    // --- Extended lore page ---
    const extendedHtml = loadHtml(id, 'lore/extended/index.html');
    if (!extendedHtml) {
      ISSUES.missingSections.push(`${id}: lore/extended/index.html missing`);
    }

    // --- Gallery page ---
    const galleryHtml = loadHtml(id, 'gallery/index.html');
    if (!galleryHtml) {
      ISSUES.missingSections.push(`${id}: gallery/index.html missing`);
    } else if (galleryHtml.includes('Gallery images coming soon')) {
      ISSUES.emptyGallery.push(id);
    }

    // --- Tier/canonical explanation ---
    if (entry && entry.tier) {
      const pageText = $lore('body').text();
      if (entry.tier === 'dual') {
        if (
          !pageText.includes('Dual-Tier') &&
          !pageText.includes('Tier‑1') &&
          !pageText.includes('Tier-2')
        ) {
          ISSUES.tierExplanationMissing.push(`${id}: dual-tier explanation missing`);
        }
      } else if (entry.tier === 'tier-1') {
        // Tier-1 Greek entries should mention stress and length
        if (entry.pantheon === 'greek' && !/stress.*length|length.*stress/i.test(pageText)) {
          ISSUES.tierExplanationMissing.push(`${id}: tier-1 stress/length explanation missing`);
        }
      }
    }
  }
}

function printReport() {
  const totalIssues = Object.values(ISSUES).reduce((sum, arr) => sum + arr.length, 0);
  console.log('\nFlagship Content Quality Audit');
  console.log(`Built flagships audited: ${BUILT_IDS.length}`);
  console.log(`Catalog entries found:   ${CATALOG_IDS.length}`);
  console.log(`Total issues found:      ${totalIssues}`);
  console.log('');

  for (const [category, items] of Object.entries(ISSUES)) {
    if (items.length === 0) continue;
    console.log(`▸ ${category} (${items.length})`);
    for (const item of items.slice(0, 20)) {
      console.log(`  • ${item}`);
    }
    if (items.length > 20) {
      console.log(`  ... and ${items.length - 20} more`);
    }
    console.log('');
  }

  return totalIssues;
}

function main() {
  auditCatalogCoverage();
  auditCatalogSchema();
  auditGeneratedPages();
  const totalIssues = printReport();

  assert.strictEqual(
    ISSUES.missingCatalog.length,
    0,
    `${ISSUES.missingCatalog.length} built flagships lack a lore-catalog entry`
  );
  assert.strictEqual(
    ISSUES.brokenDomainCards.length,
    0,
    `${ISSUES.brokenDomainCards.length} broken domain cards found`
  );
  assert.strictEqual(
    ISSUES.stubPronunciation.length,
    0,
    `${ISSUES.stubPronunciation.length} flagships have stub pronunciation`
  );
  assert.strictEqual(
    ISSUES.stubSymbols.length,
    0,
    `${ISSUES.stubSymbols.length} flagships have generic stub symbols`
  );
  assert.strictEqual(
    ISSUES.stubMythology.length,
    0,
    `${ISSUES.stubMythology.length} flagships have thin/generic mythology`
  );
  assert.strictEqual(
    ISSUES.missingSections.length,
    0,
    `${ISSUES.missingSections.length} missing sections/pages found`
  );
  assert.strictEqual(
    ISSUES.emptyGallery.length,
    0,
    `${ISSUES.emptyGallery.length} flagships have empty galleries`
  );
  assert.strictEqual(
    ISSUES.tierExplanationMissing.length,
    0,
    `${ISSUES.tierExplanationMissing.length} flagships lack tier explanation`
  );

  console.log('\n✓ All flagship content quality checks passed');
}

main();
