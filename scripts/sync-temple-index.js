#!/usr/bin/env node
/**
 * Sync a static, crawlable temple index into the hub pages.
 *
 * The 2026-08 SEO audit found that the primary browse surfaces ship ZERO
 * crawlable temple links: the lexicon and pantheon grids are populated by
 * JS at runtime (`lexicon/js/lexicon-browse.js`, `js/pantheon.js`), so the
 * internal-link graph to sites/{id}/ depended entirely on Google's JS
 * rendering — 119 temples had zero static inbound links. This script bakes
 * a marker-delimited <details> index of plain anchors into the hub pages:
 * collapsed for UX, fully present in the HTML for crawlers. The JS grids
 * stay untouched (progressive enhancement, never a fork).
 *
 * Sister to sync-desktop-nav.js / sync-footer.js: strip-then-inject,
 * idempotent, deterministic (derived only from the canonical lexicon and
 * archetype list — no dates, no randomness; the CI divergence gate re-runs
 * generation and diffs bytes).
 *
 * Targets:
 *   lexicon/index.html       — every lexicon entry (the full index)
 *   pantheon/index.html      — built flagships, grouped by pantheon
 *   pronunciation/index.html — built flagships (flat)
 *   tiers/index.html         — built flagships (flat)
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');

const ROOT = path.join(__dirname, '..');

const START = '<!-- PUNICODEX-TEMPLE-INDEX:START -->';
const END = '<!-- PUNICODEX-TEMPLE-INDEX:END -->';

const TARGETS = [
  { page: path.join('lexicon', 'index.html'), set: 'all' },
  { page: path.join('pantheon', 'index.html'), set: 'flagships', grouped: true },
  { page: path.join('pronunciation', 'index.html'), set: 'flagships' },
  { page: path.join('tiers', 'index.html'), set: 'flagships' },
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `<style>
.px-temple-index{max-width:1100px;margin:0 auto 2.5rem;padding:0 1.25rem;font-size:.85rem}
.px-temple-index summary{cursor:pointer;letter-spacing:.12em;text-transform:uppercase;opacity:.65;font-size:.75rem;padding:.6rem 0}
.px-temple-index summary:hover{opacity:1}
.px-temple-index ul{list-style:none;margin:1rem 0 0;padding:1.1rem 0 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.3rem .9rem;border-top:1px solid currentColor}
.px-temple-index li{min-width:0}
.px-temple-index a{color:inherit;text-decoration:none;opacity:.75}
.px-temple-index a:hover{opacity:1;text-decoration:underline}
.px-temple-index .px-temple-index-group{grid-column:1/-1;margin:.9rem 0 .1rem;letter-spacing:.14em;text-transform:uppercase;font-size:.7rem;opacity:.55}
</style>`;

function builtFlagships() {
  const list = (ARCHETYPES || []).filter((a) => a && a.built && a.id);
  const byId = new Map(list.map((a) => [a.id, a]));
  // Lexicon order is the curated order; keep it for the anchors.
  return LEXICON.filter((e) => byId.has(e.id));
}

function entryAnchor(entry) {
  return `<li><a href="/sites/${entry.id}/">${esc(entry.unicode)}</a></li>`;
}

function buildBlock(target) {
  const entries = target.set === 'all' ? LEXICON : builtFlagships();
  const label =
    target.set === 'all'
      ? `Browse the full index — ${entries.length} restored names`
      : `Enter a temple — ${entries.length} restored flagships`;
  let items;
  if (target.grouped) {
    const byPantheon = new Map();
    for (const e of entries) {
      const key = e.pantheon || 'Other';
      if (!byPantheon.has(key)) byPantheon.set(key, []);
      byPantheon.get(key).push(e);
    }
    items = [...byPantheon.entries()]
      .map(
        ([pantheon, list]) =>
          `<li class="px-temple-index-group" aria-hidden="true">${esc(pantheon)}</li>` +
          list.map(entryAnchor).join('')
      )
      .join('');
  } else {
    items = entries.map(entryAnchor).join('');
  }
  return `${START}\n${STYLE}\n<details class="px-temple-index">\n  <summary>${esc(label)}</summary>\n  <ul>${items}</ul>\n</details>\n${END}`;
}

function syncPage(target) {
  const abs = path.join(ROOT, target.page);
  if (!fs.existsSync(abs)) {
    console.error(`  ✗ ${target.page}: file not found — skipping`);
    return false;
  }
  let html = fs.readFileSync(abs, 'utf8');
  // Strip the old block plus the whitespace run before it; then normalize the
  // gap before <footer> wholesale. Both steps are a fixed point — run-to-run
  // byte-identical — which the CI divergence gate verifies on fresh regen.
  const stripRe = new RegExp(
    `\\s*${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  html = html.replace(stripRe, '');
  if (!html.includes('<footer class="site-footer">')) {
    console.error(`  ✗ ${target.page}: no <footer class="site-footer"> anchor — skipping`);
    return false;
  }
  const block = buildBlock(target);
  html = html.replace(/\s*(<footer class="site-footer">)/, `\n\n    ${block}\n\n$1`);
  writeFileWithRetry(abs, html);
  return true;
}

function main() {
  let synced = 0;
  for (const target of TARGETS) {
    if (syncPage(target)) {
      synced++;
      console.log(`  ✓ temple index synced: ${target.page}`);
    }
  }
  console.log(`Temple index sync: ${synced}/${TARGETS.length} pages.`);
  if (synced !== TARGETS.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { TARGETS, START, END, buildBlock };
