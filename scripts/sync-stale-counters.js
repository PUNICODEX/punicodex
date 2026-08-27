#!/usr/bin/env node
/**
 * One-off sync for stale static counters discovered after the 2026-08
 * flagship expansion. Reads canonical numbers from lexicon/archetypes/
 * owned-domains and stamps them into hand-edited HTML/JSON pages.
 */

const fs = require('node:fs');
const path = require('node:path');
const glob = require('glob');

const ROOT = path.join(__dirname, '..');

const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const OWNED = require('../platform/db/owned-domains.json');

const temples = ARCHETYPES.filter((a) => a.built).length;
const entries = LEXICON.length;
const pantheons = new Set(LEXICON.map((e) => e.pantheon)).size;
const domains = (OWNED.domains || OWNED).length;
const baseTemples = entries - temples;
const dual = LEXICON.filter((e) => e.tier === 'dual').length;
const tier1 = LEXICON.filter((e) => e.tier === '1').length;
const tier2 = LEXICON.filter((e) => e.tier === '2').length;

console.log(`Canonical: ${temples} flagships, ${entries} entries, ${pantheons} pantheons, ${domains} domains, ${baseTemples} base temples`);

const replacements = [
  // index.html title + any remaining 924
  {
    file: 'index.html',
    rules: [
      [/PUNICODEX — The Unicode Pantheon: 924 Restored Names/g, `PUNICODEX — The Unicode Pantheon: ${entries} Restored Names`],
      [/Hand-crafting 266 archetype temples/g, `Hand-crafting ${temples} archetype temples`],
    ],
  },
  // pantheon OG
  {
    file: 'pantheon/index.html',
    rules: [
      [/282 flagship temples/g, `${temples} flagship temples`],
    ],
  },
  // about page
  {
    file: 'about/index.html',
    rules: [
      [/927 temples built/g, `${entries} temples built`],
      [/296 domains registered/gi, `${domains} domains registered`],
      [/266 world archetypes/gi, `${temples} world archetypes`],
      [/<span class="stat-num">296<\/span><span class="stat-desc">Domains Registered<\/span>/g, `<span class="stat-num">${domains}</span><span class="stat-desc">Domains Registered</span>`],
      [/<span class="stat-num">266<\/span><span class="stat-desc">World Archetypes<\/span>/g, `<span class="stat-num">${temples}</span><span class="stat-desc">World Archetypes</span>`],
      [/<span class="stat-num">927<\/span><span class="stat-desc">Temples Built<\/span>/g, `<span class="stat-num">${entries}</span><span class="stat-desc">Temples Built</span>`],
    ],
  },
  // about founder
  {
    file: 'about/founder/index.html',
    rules: [
      [/196 flagship temples/g, `${temples} flagship temples`],
      [/926 restorations/g, `${entries} restorations`],
      [/196 of them built out as flagships/g, `${temples} of them built out as flagships`],
    ],
  },
  // type page
  {
    file: 'type/index.html',
    rules: [
      [/<span class="stat-num" id="stat-entries">927<\/span>/g, `<span class="stat-num" id="stat-entries">${entries}</span>`],
      [/<span class="stat-num" id="stat-flagships">266<\/span>/g, `<span class="stat-num" id="stat-flagships">${temples}</span>`],
      [/<span class="stat-num" id="stat-pantheons">24<\/span>/g, `<span class="stat-num" id="stat-pantheons">${pantheons}</span>`],
    ],
  },
  // herald
  {
    file: 'herald/index.html',
    rules: [
      [/927 lexicon entries\. 266 flagship temples\. 24 pantheons\. 296 domains owned/g, `${entries} lexicon entries. ${temples} flagship temples. ${pantheons} pantheons. ${domains} domains owned`],
      [/two hundred sixty-six flagship temples/g, `${temples} flagship temples`],
      [/two hundred sixty-six times over/g, `${temples} times over`],
    ],
  },
  // cards meta
  {
    file: 'cards/index.html',
    rules: [
      [/282 flagship temples/g, `${temples} flagship temples`],
    ],
  },
  // codex building-the-temple
  {
    file: 'codex/building-the-temple/index.html',
    rules: [
      [/all 927 names/g, `all ${entries} names`],
      [/generating 680 base temples/g, `generating ${baseTemples} base temples`],
      [/hand-expanding 235 flagships/g, `hand-expanding ${temples} flagships`],
    ],
  },
  // mobile manifest
  {
    file: 'mobile/manifest.json',
    rules: [
      [/927 restored names across 24 pantheons/g, `${entries} restored names across ${pantheons} pantheons`],
    ],
  },
  // extension options
  {
    file: 'extension/options/options.html',
    rules: [
      [/915 scholarly name restorations<\/strong> across 24 pantheons/g, `${entries} scholarly name restorations</strong> across ${pantheons} pantheons`],
    ],
  },
  // app page
  {
    file: 'app/index.html',
    rules: [
      [/All 924 scholarly restorations/g, `All ${entries} scholarly restorations`],
    ],
  },
  // game page
  {
    file: 'game/index.html',
    rules: [
      [/Battle the Oracle in Mythic Duel, the free trading-card game where 282 restored gods and realms fight as living mascots/g, `Battle the Oracle in Mythic Duel, the free trading-card game where ${temples} restored gods and realms fight as living mascots`],
    ],
  },
  // codex hub
  {
    file: 'codex/index.html',
    rules: [
      [/Explore 924 scholarly name restorations/g, `Explore ${entries} scholarly name restorations`],
      [/Instant lookup across all 924 restorations/g, `Instant lookup across all ${entries} restorations`],
      [/924 names, one map/g, `${entries} names, one map`],
    ],
  },
  // extension landing page
  {
    file: 'extension/index.html',
    rules: [
      [/The full 924-entry lexicon/g, `The full ${entries}-entry lexicon`],
    ],
  },
  // search page
  {
    file: 'search/index.html',
    rules: [
      [/Search the PUNICODEX lexicon of 927 Unicode domain names/g, `Search the PUNICODEX lexicon of ${entries} Unicode domain names`],
    ],
  },
  // lexicon hub
  {
    file: 'lexicon/index.html',
    rules: [
      [/\b924\s+[Ss]cholarly\s+[Uu]nicode\s+[Rr]estorations\b/g, `${entries} Scholarly Unicode Restorations`],
      [/\bShow all 924\b/g, `Show all ${entries}`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Entries<\/span>/g, `<span class="lexicon-stat-value">${entries}</span>\n                    <span class="lexicon-stat-label">Entries</span>`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Pantheons<\/span>/g, `<span class="lexicon-stat-value">${pantheons}</span>\n                    <span class="lexicon-stat-label">Pantheons</span>`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Flagships<\/span>/g, `<span class="lexicon-stat-value">${temples}</span>\n                    <span class="lexicon-stat-label">Flagships</span>`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Dual-Tier<\/span>/g, `<span class="lexicon-stat-value">${dual}</span>\n                    <span class="lexicon-stat-label">Dual-Tier</span>`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Tier-1<\/span>/g, `<span class="lexicon-stat-value">${tier1}</span>\n                    <span class="lexicon-stat-label">Tier-1</span>`],
      [/<span class="lexicon-stat-value">\d+<\/span>\s*<span class="lexicon-stat-label">Tier-2<\/span>/g, `<span class="lexicon-stat-value">${tier2}</span>\n                    <span class="lexicon-stat-label">Tier-2</span>`],
    ],
  },
  // codex restoring-the-names article
  {
    file: 'codex/restoring-the-names/index.html',
    rules: [
      [/A lexicon of 966 names/g, `A lexicon of ${entries} names`],
    ],
  },
  // admin portal system docs (canonical + root copy)
  {
    file: 'platform/public/admin-portal/system/index.html',
    rules: [
      [/The \d+-entry lexicon/g, `The ${entries}-entry lexicon`],
    ],
  },
  {
    file: 'admin-portal/system/index.html',
    rules: [
      [/The \d+-entry lexicon/g, `The ${entries}-entry lexicon`],
    ],
  },
  // extension popup
  {
    file: 'extension/popup/popup.html',
    rules: [
      [/<span class="popup-count">915 entries<\/span>/g, `<span class="popup-count">${entries} entries</span>`],
    ],
  },
  // patterns hub + methodology
  {
    file: 'patterns/index.html',
    rules: [
      [/all 399 flagship temples/g, `all ${temples} flagship temples`],
    ],
  },
  {
    file: 'patterns/methodology/index.html',
    rules: [
      [/399 flagship temples/g, `${temples} flagship temples`],
    ],
  },
  // rulebook
  {
    file: 'rulebook/index.html',
    rules: [
      [/every one of the 895 lexicon entries/g, `every one of the ${entries} lexicon entries`],
    ],
  },
  // oracle
  {
    file: 'oracle/index.html',
    rules: [
      [/data-count="\d+">0<\/span>\s*<span class="os-stat-label">Canonical lexicon entries<\/span>/g, `data-count="${entries}">0</span>\n            <span class="os-stat-label">Canonical lexicon entries</span>`],
      [/data-count="\d+">0<\/span>\s*<span class="os-stat-label">Flagship temples<\/span>/g, `data-count="${temples}">0</span>\n            <span class="os-stat-label">Flagship temples</span>`],
    ],
  },
  // type test page
  {
    file: 'type/test.html',
    rules: [
      [/test\(s4, '22 pantheons represented', \(\) => \{/g, `test(s4, '${pantheons} pantheons represented', () => {`],
      [/assertEqual\(pantheons\.size, 21\)/g, `assertEqual(pantheons.size, ${pantheons})`],
    ],
  },
  // platform public search
  {
    file: 'platform/public/search.html',
    rules: [
      [/Search the PUNICODEX lexicon of 850 Unicode domain names/g, `Search the PUNICODEX lexicon of ${entries} Unicode domain names`],
    ],
  },
  // scholars portal canonical + root copy
  {
    file: 'platform/public/scholars/index.html',
    rules: [
      [/\d+ flagship temples with university-edited scholarly sections/g, `${temples} flagship temples with university-edited scholarly sections`],
      [/\d+ temples\. \d+ pantheons/g, `${temples} temples. ${pantheons} pantheons`],
      [/<span class="num" id="stat-editions">\d+<\/span>/g, `<span class="num" id="stat-editions">${temples}</span>`],
      [/<span class="num" id="stat-pantheons">\d+<\/span>/g, `<span class="num" id="stat-pantheons">${pantheons}</span>`],
    ],
  },
  {
    file: 'scholars/index.html',
    rules: [
      [/<span class="num" id="stat-editions">\d+<\/span>/g, `<span class="num" id="stat-editions">${temples}</span>`],
      [/<span class="num" id="stat-pantheons">\d+<\/span>/g, `<span class="num" id="stat-pantheons">${pantheons}</span>`],
    ],
  },
];

// Marketing / sponsorship pitch templates
const marketingFiles = glob.sync('Marketing/Sponsorship Pitches/**/*.html', { cwd: ROOT });
for (const f of marketingFiles) {
  replacements.push({
    file: f,
    rules: [
      [/271 digital temples and 25 pantheons/g, `${temples} digital temples and ${pantheons} pantheons`],
      [/271 temples · 25 pantheons/g, `${temples} temples · ${pantheons} pantheons`],
      [/271 restored temples/g, `${temples} restored temples`],
    ],
  });
}

let totalWrites = 0;
for (const { file, rules } of replacements) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    console.error(`  ✗ ${file}: not found`);
    continue;
  }
  let html = fs.readFileSync(abs, 'utf8');
  let changed = false;
  for (const [re, replacement] of rules) {
    if (re.test(html)) {
      html = html.replace(re, replacement);
      changed = true;
    }
    // reset lastIndex for regexes with global flag
    re.lastIndex = 0;
  }
  if (changed) {
    fs.writeFileSync(abs, html);
    console.log(`  ✓ ${file}`);
    totalWrites++;
  }
}

console.log(`Synced counters in ${totalWrites} files.`);
