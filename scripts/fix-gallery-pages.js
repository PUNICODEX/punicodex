#!/usr/bin/env node
/**
 * Surgical fix for flagship gallery pages.
 * Does NOT regenerate whole flagships; only patches gallery/index.html files.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');

function fixGalleryFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  // 1. Remove inline .gallery-item override that clobbered card styles.
  html = html.replace(
    /\.gallery-item\s*\{[\s\S]*?cursor:\s*zoom-in;[\s\S]*?\}/,
    '.gallery-figure {\n    cursor: zoom-in;\n    margin: 0;\n}'
  );

  // 2. Fix lightbox selector to target the element that actually carries data-full-src.
  html = html.replace(
    /document\.querySelectorAll\('\.gallery-item\[data-full-src\]'\)/g,
    "document.querySelectorAll('.gallery-figure[data-full-src]')"
  );

  // 3. Add data-caption to each gallery-figure and class="gallery-img" to the inner img.
  html = html.replace(
    /<figure class="gallery-figure" data-full-src="([^"]+)">\s*<picture><source srcset="([^"]+)" type="image\/webp"><img src="([^"]+)" alt="([^"]*)" loading="lazy"><\/picture>\s*<\/figure>\s*<p class="gallery-caption">([^<]+)<\/p>/g,
    (match, fullSrc, srcset, src, alt, caption) => {
      const escapedCaption = caption.replace(/"/g, '&quot;');
      return `<figure class="gallery-figure" data-full-src="${fullSrc}" data-caption="${escapedCaption}">\n                        <picture><source srcset="${srcset}" type="image/webp"><img class="gallery-img" src="${src}" alt="${alt}" loading="lazy"></picture>\n                    </figure>\n                    <p class="gallery-caption">${caption}</p>`;
    }
  );

  if (html === original) {
    console.log(`  unchanged: ${filePath}`);
    return false;
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  fixed: ${filePath}`);
  return true;
}

function main() {
  const entries = fs.readdirSync(SITES_DIR, { withFileTypes: true });
  let fixed = 0;
  let total = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const galleryPath = path.join(SITES_DIR, entry.name, 'gallery', 'index.html');
    if (!fs.existsSync(galleryPath)) continue;
    total++;
    if (fixGalleryFile(galleryPath)) fixed++;
  }

  console.log(`\nDone. ${fixed}/${total} gallery pages needed fixes.`);
}

main();
