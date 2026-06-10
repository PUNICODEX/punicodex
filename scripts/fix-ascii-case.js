#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

const lexiconModule = require(LEXICON_PATH);
const lexicon = lexiconModule.LEXICON || lexiconModule;
const lexiconMap = new Map();
for (const entry of lexicon) {
  lexiconMap.set(entry.id, entry);
}

let fixed = 0;

const sites = fs.readdirSync(SITES_DIR)
  .filter(id => fs.statSync(path.join(SITES_DIR, id)).isDirectory());

for (const siteId of sites) {
  const entry = lexiconMap.get(siteId);
  if (!entry) continue;

  const lorePath = path.join(SITES_DIR, siteId, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) continue;

  let html = fs.readFileSync(lorePath, 'utf8');

  const regex = /(<p class="card-ascii">)\s*([^<]+)\s*(<\/p>)/;
  const match = html.match(regex);
  if (match) {
    const current = match[2].trim();
    if (current !== entry.ascii) {
      html = html.replace(regex, `$1${entry.ascii}$3`);
      fs.writeFileSync(lorePath, html, 'utf8');
      fixed++;
      console.log(`${siteId}: '${current}' → '${entry.ascii}'`);
    }
  }
}

console.log(`\nFixed ${fixed} sites.`);
