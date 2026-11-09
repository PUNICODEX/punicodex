const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { isAsciiForm } = require('../scripts/lib/ascii-editorial.js');

const built = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const entries = LEXICON.filter((entry) => built.has(entry.id) && isAsciiForm(entry.unicode));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

assert.ok(entries.length >= 250, `expected the full ASCII flagship cohort, got ${entries.length}`);

const forbiddenEditorial = /\bunicode\b|\bpunycode\b|\bIDNA 2008\b|\bIDN\b/i;
const falseAsciiClaims =
  /DNS compromise|domain-name compromise|unregistrable plain-ASCII|prosodic information visible|preserves the prosodic features|carries the same vowel quantities|carries the name's full information|marks are the message/i;
const visibleText = (value) => String(value).replace(/[\u200B\u200C]/g, '');
function editorialHtmlText(value) {
  const attributes = [...String(value).matchAll(/\b(?:content|alt|title|aria-label)="([^"]*)"/gi)]
    .map((match) => match[1])
    .join(' ');
  const text = String(value)
    .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return visibleText(`${attributes} ${text}`);
}
for (const entry of entries) {
  for (const rel of [
    `platform/scholars/content/${entry.id}.json`,
    `platform/blog/content/${entry.id}.json`,
    `platform/blog/series/restoration/${entry.id}.json`,
    `platform/blog/series/resonance/${entry.id}.json`,
    `platform/blog/series/canonical/${entry.id}.json`,
  ]) {
    const text = visibleText(read(rel));
    check(
      !forbiddenEditorial.test(text),
      `${entry.id}: Unicode-centric editorial remains in ${rel}`
    );
    check(!falseAsciiClaims.test(text), `${entry.id}: false ASCII claim remains in ${rel}`);
  }
  for (const rel of [
    `sites/${entry.id}/index.html`,
    `sites/${entry.id}/lore/index.html`,
    `sites/${entry.id}/lore/extended/index.html`,
    `sites/${entry.id}/scholars/index.html`,
    `sites/${entry.id}/patron/index.html`,
    `sites/${entry.id}/blog/index.html`,
    `sites/${entry.id}/blog/restoration/index.html`,
    `sites/${entry.id}/blog/resonance/index.html`,
    `sites/${entry.id}/blog/canonical/index.html`,
  ]) {
    const html = visibleText(read(rel));
    const editorial = editorialHtmlText(html);
    check(
      !/Unicode restoration|Unicode orthography|Unicode Character Breakdown|restored Unicode temple|Punycode|IDNA 2008/i.test(
        editorial
      ),
      `${entry.id}: Unicode-centric template copy remains in ${rel}`
    );
    check(!falseAsciiClaims.test(editorial), `${entry.id}: false ASCII claim remains in ${rel}`);
    if (rel === `sites/${entry.id}/lore/index.html`) {
      check(
        html.includes('class="card-unicode"') && !html.includes('class="card-canonical"'),
        `${entry.id}: editorial prose transform damaged the Lore card class`
      );
    }
    if (rel === `sites/${entry.id}/lore/extended/index.html`) {
      check(
        html.includes('id="unicode-breakdown"') && !html.includes('domain encoding-explainer'),
        `${entry.id}: editorial prose transform damaged Extended Lore anchors or classes`
      );
    }
  }
}

const home = read('index.html');
check(home.includes('Station I · The Collection'), 'homepage: Station I is not labelled');
check(
  !home.includes('true Unicode orthography'),
  'homepage: ASCII-only entries are still overclaimed'
);
const collection = home.slice(home.indexOf('id="pantheon"'), home.indexOf('id="wall"'));
check(
  (collection.match(/class="section-divider pc-divider-strip"/g) || []).length === 1,
  'homepage: Collection must have exactly one following divider'
);
check(
  home.includes('attested scholarly spelling where ASCII is already sufficient'),
  'homepage: inclusive collection copy missing'
);
const homeJs = read('js/home.js');
check(
  homeJs.includes('ensurePrint') && homeJs.includes('/assets/store-base/'),
  'homepage: colour mockups are not wired'
);
check(
  homeJs.includes('color === product.composite'),
  'homepage: baked composite colour is not respected'
);

const nav = read('scripts/nav-tree.js');
check(nav.includes("label: 'Strata'"), 'World: STRATA label missing');
check(nav.includes("label: 'Geography'"), 'World: Geography label missing');
const strataData = read('data/pantheon-strata.json');
check(
  strataData.includes('does not demonstrate one unchanged religious system'),
  'STRATA: Sahul occupation is still conflated with unchanged religion'
);
check(
  !strataData.includes('carried unbroken since the first settlement of Sahul'),
  'STRATA: unsupported continuity claim remains'
);
const chapters = read('scripts/arche-chapters.js');
check(chapters.includes('The Norse solar goddess — Sól'), 'Archē: Sól is misidentified');
check(
  !chapters.includes('Nearly every tradition opens its story here'),
  'Archē: universalizing chaos claim remains'
);
check(
  !chapters.includes('Nearly every people tells this story the same way'),
  'Archē: universalizing separation claim remains'
);
const globe = read('js/sacred-globe.js');
check(
  globe.includes('buildClusters') && globe.includes('pointerdown') && globe.includes('keydown'),
  'Sacred Geography: interactive globe contracts missing'
);

assert.deepStrictEqual(failures.slice(0, 30), [], `${failures.length} ASCII/editorial failures`);
console.log(
  `ASCII Editorial Truth: ${entries.length} flagship entries verified across Scholar, blog, temple, and homepage sources`
);
