const fs = require('fs');
const path = require('path');
const L = require('../type/js/lexicon.js').LEXICON;
const lexiconMap = new Map(L.map(e => [e.id, e]));

const SITES_DIR = path.join(__dirname, '..', 'sites');

function hasBookingSystem(siteId) {
  const jsPath = path.join(SITES_DIR, siteId, 'script.js');
  if (!fs.existsSync(jsPath)) return false;
  return fs.readFileSync(jsPath, 'utf8').includes('BOOKING SYSTEM');
}

const adSites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory())
  .filter(hasBookingSystem)
  .sort();

console.log(`Checking pantheon Greek names across ${adSites.length} sites...\n`);

let found = 0;

for (const siteId of adSites) {
  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) continue;

  const html = fs.readFileSync(lorePath, 'utf8');
  const cards = [];
  html.replace(/<a href="\/sites\/([^\/]+)\/" class="olympian-card">[\s\S]*?<span class="olympian-greek">([^<]+)<\/span>[\s\S]*?<span class="olympian-name">([^<]+)<\/span>/g, (m, targetId, greek, name) => {
    cards.push({ targetId, greek: greek.trim(), name: name.trim() });
  });

  if (cards.length === 0) continue;

  for (const card of cards) {
    const targetEntry = lexiconMap.get(card.targetId);
    if (!targetEntry) {
      // Target not in lexicon - might be a base temple or missing
      continue;
    }

    const expectedGreek = targetEntry.greek;
    if (expectedGreek === '—' || !expectedGreek) {
      // Non-Greek deity - skip Greek check
      continue;
    }

    if (card.greek !== expectedGreek) {
      console.log(`${siteId}: pantheon card for ${card.targetId} shows "${card.greek}" but lexicon says "${expectedGreek}"`);
      found++;
    }
  }
}

console.log(`\n${found} mismatches found.`);
