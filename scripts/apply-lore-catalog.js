#!/usr/bin/env node
/**
 * Apply mythology content from scripts/lore-catalog.json to flagship lore pages.
 *
 * Usage:
 *   node scripts/apply-lore-catalog.js apsu ab varuna
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const CATALOG = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
const RENDERER_LEXICON = require(path.join(ROOT, 'platform', 'browser', 'renderer', 'lexicon.json'));

function findEntry(id) {
  return RENDERER_LEXICON.entries.find((e) => e.id === id);
}

function buildMythologySection(entry, catalogEntry) {
  const m = catalogEntry.mythology;
  const myths = (m.myths || [])
    .map((my, i) => {
      const textHtml = my.text?.trim().startsWith('<p')
        ? my.text
        : `<p class="myth-text">${my.text}</p>`;
      return `
      <div class="myth-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="myth-marker"></div>
        <div class="myth-content">
          <span class="myth-tag">${my.tag}</span>
          <h3 class="myth-title">${my.title}</h3>
          ${textHtml}
        </div>
      </div>`;
    })
    .join('');

  const leadPara = m.lead
    ? (m.lead.trim().startsWith('<p') ? m.lead : `<p class="lead-text">${m.lead}</p>`)
    : '';

  const content = `${leadPara}\n      <div class="myths-timeline">${myths}</div>`;

  return `
    <!-- Mythology -->
    <section class="section section-mythology" id="mythology">
    <div class="container">
        <div class="section-header reveal-up">
            <span class="section-number">04</span>
            <h2 class="section-title">Mythology</h2>
            <p class="section-subtitle">Stories of ${entry.unicode}</p>
        </div>
        ${content}
    </div>
</section>`;
}

function applyToSite(id) {
  const entry = findEntry(id);
  if (!entry) {
    console.error(`skip ${id}: not in lexicon`);
    return false;
  }
  const catalogEntry = CATALOG[id];
  if (!catalogEntry?.mythology?.myths?.length) {
    console.error(`skip ${id}: no mythology in catalog`);
    return false;
  }

  const filePath = path.join(ROOT, 'sites', id, 'lore', 'index.html');
  if (!fs.existsSync(filePath)) {
    console.error(`skip ${id}: ${filePath} not found`);
    return false;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const section = $('#mythology.section-mythology, #mythology').first();
  if (!section.length) {
    console.error(`skip ${id}: no #mythology section`);
    return false;
  }

  const newSection = buildMythologySection(entry, catalogEntry);
  section.replaceWith(newSection);

  fs.writeFileSync(filePath, $.html());
  console.log(`applied catalog myths: ${id}`);
  return true;
}

function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error('Usage: node scripts/apply-lore-catalog.js <id> [<id> ...]');
    process.exit(1);
  }
  for (const id of ids) applyToSite(id);
}

main();
