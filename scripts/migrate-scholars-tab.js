#!/usr/bin/env node
/**
 * Add the Scholars tab to existing generated flagship pages.
 *
 * This is a one-time, additive migration. It inserts a "Scholars" link
 * into the tab navigation of each flagship's home, lore, and gallery
 * pages without altering any other content.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

function insertScholarsTab(html, href) {
  const $ = cheerio.load(html);
  const nav = $('nav.tab-nav .nav-links, nav.main-nav.tab-nav .nav-links').first();
  if (!nav.length) return { changed: false, html };

  const existing = nav.find('a[href*="scholars"]');
  if (existing.length) return { changed: false, html };

  const galleryLink = nav.find('a[href*="gallery"]');
  const extendedLink = nav.find('a[href*="extended"]');

  const scholarsLink = `<a href="${href}" class="nav-link">Scholars</a>`;

  if (extendedLink.length) {
    extendedLink.after(scholarsLink);
  } else if (galleryLink.length) {
    galleryLink.after(scholarsLink);
  } else {
    nav.append(scholarsLink);
  }

  return { changed: true, html: $.html() };
}

function main() {
  const built = ARCHETYPES.filter((a) => a.built);
  let changed = 0;
  let skipped = 0;
  let errors = 0;

  for (const archetype of built) {
    const pages = [
      { file: 'index.html', href: 'scholars/index.html' },
      { file: 'lore/index.html', href: '../scholars/index.html' },
      { file: 'gallery/index.html', href: '../scholars/index.html' },
    ];

    for (const { file, href } of pages) {
      const filePath = path.join(ROOT, 'sites', archetype.id, file);
      if (!fs.existsSync(filePath)) {
        skipped += 1;
        continue;
      }

      try {
        const original = fs.readFileSync(filePath, 'utf8');
        const result = insertScholarsTab(original, href);
        if (result.changed) {
          fs.writeFileSync(filePath, result.html, 'utf8');
          changed += 1;
        } else {
          skipped += 1;
        }
      } catch (err) {
        console.error(`Error migrating ${archetype.id}/${file}:`, err.message);
        errors += 1;
      }
    }
  }

  console.log(`Migrated ${changed} pages, skipped ${skipped} pages${errors > 0 ? `, ${errors} errors` : ''}.`);
  if (errors > 0) process.exit(1);
}

main();
