/**
 * Applies tools/new-domains/bespoke-sections.js:
 *  - epithets / homeric-hymns / oracle-sites: inserted into
 *    platform/scholars/content/{id}.json as bespoke sections (preserved by
 *    the fill-only-missing generator).
 *  - mythology.addMyth: appended to the entry's lore-catalog mythology.myths,
 *    then the scholars 'mythology' section is deleted so it re-synthesizes
 *    with the added myth on the next generate-scholars-content run.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const bespoke = require(path.join(__dirname, 'bespoke-sections.js'));
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

let sectionsAdded = 0;
let mythsAdded = 0;
const missing = [];

for (const [id, sections] of Object.entries(bespoke)) {
  const contentPath = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  if (!fs.existsSync(contentPath)) {
    missing.push(id);
    continue;
  }
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  content.sections = content.sections || {};
  let dirty = false;

  for (const [key, sec] of Object.entries(sections)) {
    if (key === 'mythology' && sec.addMyth) {
      const entry = lore[id];
      if (!entry?.mythology?.myths) throw new Error(`no lore mythology for ${id}`);
      if (!entry.mythology.myths.some((m) => m.title === sec.addMyth.title)) {
        entry.mythology.myths.push(sec.addMyth);
        mythsAdded++;
      }
      delete content.sections.mythology;
      dirty = true;
      continue;
    }
    content.sections[key] = {
      body: sec.body,
      sources: sec.sources || [],
      generatedFrom: ['hand-authored'],
      bespoke: true,
    };
    sectionsAdded++;
    dirty = true;
  }

  if (dirty) fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

if (missing.length) {
  console.error('MISSING scholars content for:', missing.join(', '));
  process.exit(1);
}

fs.writeFileSync(LORE_PATH, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log(`bespoke sections added: ${sectionsAdded}; myths appended: ${mythsAdded}`);
