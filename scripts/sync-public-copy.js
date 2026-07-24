#!/usr/bin/env node
/**
 * Sync public-facing copy and counts with canonical data.
 *
 * Replaces __SYNC:*__ markers and stale hard-coded values on the
 * main marketing pages with counts derived from the lexicon and archetypes.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);

const ownedDomains = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'platform', 'db', 'owned-domains.json'), 'utf8')
);

// Canonical counts
const entryCount = LEXICON.length;
const pantheonCount = new Set(LEXICON.map((e) => e.pantheon)).size;
const archetypeCount = ARCHETYPES.filter((a) => a.built).length;
const dualTierCount = LEXICON.filter((e) => e.tier === 'dual').length;
const tier1Count = LEXICON.filter((e) => e.tier === '1').length;
const tier2Count = LEXICON.filter((e) => e.tier === '2').length;
const domainCount = ownedDomains.length;
const multiDomainCount = dualTierCount; // Big Three dual-tier names
const investment = `$${(Math.round(domainCount * 23 / 100) * 100).toLocaleString('en-US')}`; // ~$23 per domain, rounded to nearest hundred

const realmCount = 32; // Norse 7 + Greek 17 + Japanese 8 (sync with realms/index.html cards)

const syncValues = {
  'entry-count': String(entryCount),
  'pantheon-count': String(pantheonCount),
  'archetype-count': String(archetypeCount),
  'temple-count': String(entryCount),
  'flagship-count': String(archetypeCount),
  'dual-tier-count': String(dualTierCount),
  'tier-1-count': String(tier1Count),
  'tier-2-count': String(tier2Count),
  'domain-count': String(domainCount),
  'multi-domain-count': String(multiDomainCount),
  'investment': investment,
  'realm-count': String(realmCount),
};

function replaceAll(str, replacements) {
  let out = str;
  for (const [key, value] of Object.entries(replacements)) {
    const marker = `__SYNC:${key}__`;
    out = out.split(marker).join(value);
  }
  return out;
}

// Files to sync with stale-value fallbacks so the script is idempotent.
const files = [
  {
    path: path.join(ROOT, 'index.html'),
    regexFallbacks: [
      [/\d+ temples[.,] \d+ pantheons/g, '__SYNC:temple-count__ temples. __SYNC:pantheon-count__ pantheons'],
      [/\d+ temples consecrated/g, '__SYNC:temple-count__ temples consecrated'],
      [/\d+ temples later/g, '__SYNC:temple-count__ temples later'],
      [/\d+ pantheons represented/g, '__SYNC:pantheon-count__ pantheons represented'],
    ],
    fallbacks: {
      '74 temples. 21 pantheons. One mission': `__SYNC:temple-count__ temples. __SYNC:pantheon-count__ pantheons. One mission`,
      '<span class="gold-text">74 temples consecrated.</span>': '<span class="gold-text">__SYNC:temple-count__ temples consecrated.</span>',
      '<span class="dim-text">All pantheons represented.</span>': '<span class="dim-text">__SYNC:pantheon-count__ pantheons represented.</span>',
      '74 temples, 21 pantheons, one mission': '__SYNC:temple-count__ temples, __SYNC:pantheon-count__ pantheons, one mission',
    },
  },
  {
    path: path.join(ROOT, 'about', 'index.html'),
    fallbacks: {
      'a $600 investment': 'a __SYNC:investment__ investment',
      'a $2100 investment': 'a __SYNC:investment__ investment',
      '<span class="stat-num">$600</span>': '<span class="stat-num">__SYNC:investment__</span>',
      '<span class="stat-num">$2100</span>': '<span class="stat-num">__SYNC:investment__</span>',
      '<span class="stat-num">26</span><span class="stat-desc">Domains Registered</span>': '<span class="stat-num">__SYNC:domain-count__</span><span class="stat-desc">Domains Registered</span>',
      '<span class="stat-num">24</span><span class="stat-desc">World Archetypes</span>': '<span class="stat-num">__SYNC:archetype-count__</span><span class="stat-desc">World Archetypes</span>',
      '<span class="stat-num">20</span><span class="stat-desc">Temples Built</span>': '<span class="stat-num">__SYNC:temple-count__</span><span class="stat-desc">Temples Built</span>',
      '<span class="stat-num">7</span><span class="stat-desc">Multi-Domain Names</span>': '<span class="stat-num">__SYNC:multi-domain-count__</span><span class="stat-desc">Multi-Domain Names</span>',
      'Twenty temples built. Four more awaiting consecration. The Pantheon is not complete — it never will be.': '__SYNC:temple-count__ temples built. The Pantheon is not complete — it never will be.',
      'Four names own multiple domain variants: Apollon, Hades, Hekate, and Nike.': '__SYNC:multi-domain-count__ names own multiple domain variants: Apollon, Hekate, and Nike.',
    },
  },
  {
    path: path.join(ROOT, 'pantheon', 'index.html'),
    regexFallbacks: [
      [/of \d+ archetypes/g, 'of __SYNC:archetype-count__ archetypes'],
      [/ \d+ world archetypes/g, ' __SYNC:archetype-count__ world archetypes'],
    ],
    fallbacks: {
      'of 54 archetypes': 'of __SYNC:archetype-count__ archetypes',
      'Pantheon of 54 archetypes': 'Pantheon of __SYNC:archetype-count__ archetypes',
    },
  },
  {
    path: path.join(ROOT, 'lexicon', 'index.html'),
    regexFallbacks: [
      [/Lexicon — \d+ Unicode (Domain )?Names/g, 'Lexicon — __SYNC:entry-count__ Unicode Names'],
      [/all \d+ scholarly Unicode (domain )?names/gi, 'all __SYNC:entry-count__ scholarly Unicode names'],
      [/across \d+ (traditions|pantheons)/g, 'across __SYNC:pantheon-count__ $1'],
    ],
    fallbacks: {
      'Lexicon — 267 Unicode Domain Names': 'Lexicon — __SYNC:entry-count__ Unicode Names',
      'Browse all 267 scholarly Unicode domain names': 'Browse all __SYNC:entry-count__ scholarly Unicode names',
      '267 names across 14 pantheons': '__SYNC:entry-count__ names across __SYNC:pantheon-count__ pantheons',
      '<span class="lexicon-stat-value">850</span>\n                    <span class="lexicon-stat-label">Entries</span>': '<span class="lexicon-stat-value">__SYNC:entry-count__</span>\n                    <span class="lexicon-stat-label">Entries</span>',
      '<span class="lexicon-stat-value">20</span>\n                    <span class="lexicon-stat-label">Pantheons</span>': '<span class="lexicon-stat-value">__SYNC:pantheon-count__</span>\n                    <span class="lexicon-stat-label">Pantheons</span>',
      '<span class="lexicon-stat-value">48</span>\n                    <span class="lexicon-stat-label">Flagships</span>': '<span class="lexicon-stat-value">__SYNC:archetype-count__</span>\n                    <span class="lexicon-stat-label">Flagships</span>',
      '<span class="lexicon-stat-value">4</span>\n                    <span class="lexicon-stat-label">Dual-Tier</span>': '<span class="lexicon-stat-value">__SYNC:dual-tier-count__</span>\n                    <span class="lexicon-stat-label">Dual-Tier</span>',
      '<span class="lexicon-stat-value">125</span>\n                    <span class="lexicon-stat-label">Tier-1</span>': '<span class="lexicon-stat-value">__SYNC:tier-1-count__</span>\n                    <span class="lexicon-stat-label">Tier-1</span>',
    },
  },
  {
    path: path.join(ROOT, 'realms', 'index.html'),
    fallbacks: {
      'Explore 36 mythological realms': 'Explore __SYNC:realm-count__ mythological realms',
    },
  },
  {
    path: path.join(ROOT, 'tiers', 'index.html'),
    fallbacks: {
      '<span class="tier-count">28 archetypes</span>': '<span class="tier-count">__SYNC:tier-1-count__ archetypes</span>',
      '<span class="tier-count">26 archetypes</span>': '<span class="tier-count">__SYNC:tier-2-count__ archetypes</span>',
      'All 54 archetypes': 'All __SYNC:archetype-count__ archetypes',
      'All <span class="pill-count">54</span>': 'All <span class="pill-count">__SYNC:archetype-count__</span>',
      '<span class="pill-count">28</span>': '<span class="pill-count">__SYNC:tier-1-count__</span>',
      '<span class="pill-count">26</span>': '<span class="pill-count">__SYNC:tier-2-count__</span>',
      'Four names carry multiple historically valid domain variants': '__SYNC:multi-domain-count__ names carry multiple historically valid domain variants',
      'Showing <strong id="showing-count">54</strong> of 54 archetypes': 'Showing <strong id="showing-count">__SYNC:archetype-count__</strong> of __SYNC:archetype-count__ archetypes',
    },
  },
];

let changedFiles = 0;

for (const file of files) {
  if (!fs.existsSync(file.path)) {
    console.warn(`skip missing file: ${file.path}`);
    continue;
  }
  let html = fs.readFileSync(file.path, 'utf8');
  const original = html;

  // Apply fallbacks to inject markers where stale hard-coded values still exist.
  for (const [oldStr, newStr] of Object.entries(file.fallbacks || {})) {
    html = html.split(oldStr).join(newStr);
  }
  // Regex fallbacks normalize previously baked counts back to markers so
  // numeric sync spots never go stale.
  for (const [re, newStr] of file.regexFallbacks || []) {
    html = html.replace(re, newStr);
  }

  // Replace all markers with current canonical values.
  html = replaceAll(html, syncValues);

  if (html !== original) {
    fs.writeFileSync(file.path, html, 'utf8');
    console.log(`synced ${path.relative(ROOT, file.path)}`);
    changedFiles++;
  }
}

console.log(`\n✓ Public copy synced for ${changedFiles} file(s).`);
