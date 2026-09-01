#!/usr/bin/env node
/**
 * PuniCodex — hero stat sync.
 *
 * The home page quotes fleet counts in prose ("271 digital temples
 * restored. 25 pantheons."). Hand-maintained numbers rot — the 11-temple
 * wave of 2026-08 shipped with the hero still saying 271. This sync
 * recomputes both numbers from the canonical sources and stamps every
 * occurrence in index.html:
 *
 *   - temples   = built archetypes in js/archetypes-v2.js
 *   - pantheons = distinct pantheon values in type/js/lexicon.js
 *
 * Idempotent: correct numbers produce zero writes. Guarded by
 * test/hero-stats.test.js so a stale hero fails the battery.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HOME = path.join(ROOT, 'index.html');

function stats() {
  const ARCH = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
  const archetypes = ARCH.ARCHETYPES || ARCH;
  const temples = archetypes.filter((a) => a.built).length;

  const LEX = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
  const lexicon = LEX.LEXICON || LEX;
  const pantheons = new Set(lexicon.map((e) => e.pantheon)).size;

  const POD = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'products.json'), 'utf8'));
  const productTypes = new Set(POD.products.map((p) => p.id.split('-').pop())).size;

  return { temples, pantheons, productTypes, entries: lexicon.length };
}

function sync(html, { temples, pantheons, productTypes, entries }) {
  let out = html;
  // "<n> digital temples restored" (hero line, origin section, meta description)
  out = out.replace(/\d+ digital temples restored/g, `${temples} digital temples restored`);
  // "<n> temples restored —" (origin paragraph variant)
  out = out.replace(/\d+ temples restored —/g, `${temples} temples restored —`);
  // <span class="tier-example"><n> temples</span>
  out = out.replace(
    /(<span class="tier-example">)\d+ temples(<\/span>)/g,
    `$1${temples} temples$2`
  );
  // The four stat cards, anchored on their labels.
  const card = (label, value) => {
    const re = new RegExp(
      `(<span class="stat-number" data-count=")\\d+(">0</span>\\s*<span class="stat-label">${label})`,
      'g'
    );
    out = out.replace(re, `$1${value}$2`);
  };
  card('Digital Temples Restored', temples);
  card('Pantheons', pantheons);
  card('Pantheon Traditions', pantheons);
  card('Scholarly Entries', entries);
  card('Lexicon Entries', entries);
  card('Product Types in the Reliquary', productTypes);
  // "<n> pantheons" (hero + "pantheons represented" + meta description)
  out = out.replace(/\d+ pantheons/g, `${pantheons} pantheons`);
  return out;
}

function main() {
  const current = stats();
  const html = fs.readFileSync(HOME, 'utf8');
  const next = sync(html, current);
  if (next !== html) {
    fs.writeFileSync(HOME, next);
    console.log(
      `Hero stats: stamped ${current.temples} temples / ${current.pantheons} pantheons into index.html`
    );
  } else {
    console.log(
      `Hero stats: index.html already current (${current.temples} temples / ${current.pantheons} pantheons)`
    );
  }
}

if (require.main === module) main();

module.exports = { stats, sync };
