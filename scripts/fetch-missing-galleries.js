#!/usr/bin/env node
/**
 * Fetch Wikimedia Commons gallery images for flagships that came up empty
 * or short during the batch run.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GALLERY_PATH = path.join(ROOT, 'scripts', 'gallery-data.json');

const NEEDS = [
  { id: 'phoenix', queries: ['Phoenix mythology', 'Phoenix bird art', 'Phoenix fresco Pompeii'] },
  { id: 'tiandi', queries: ['Tian Di Chinese', 'Heaven and Earth Chinese', 'Tian Di temple'] },
  { id: 'yam', queries: ['Yam god Ugaritic', 'Yam sea god Canaanite', 'Yam ancient near east'] },
];

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        if (i < retries - 1) {
          const delay = 2000 * (i + 1);
          console.log(`    non-JSON, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error('Non-JSON response after retries');
      }
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('fetchJson failed');
}

async function fetchCommonsImages(query, limit = 6) {
  const searchUrl =
    'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&format=json&origin=*&srlimit=20&srsearch=' +
    encodeURIComponent(query);
  const searchJson = await fetchJson(searchUrl);
  const titles = (searchJson.query?.search || []).map((s) => s.title);
  if (!titles.length) return [];

  const infoUrl =
    'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=960&format=json&origin=*&titles=' +
    titles.map(encodeURIComponent).join('|');
  const infoJson = await fetchJson(infoUrl);
  const pages = Object.values(infoJson.query?.pages || {});

  const images = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || !info.thumburl) continue;
    const meta = info.extmetadata || {};
    const width = info.width || 0;
    if (width < 300) continue;

    const objectName = stripHtml(meta.ObjectName?.value || page.title?.replace(/^File:/, '').replace(/_/g, ' '));
    const desc = stripHtml(meta.ImageDescription?.value || '');
    const license = stripHtml(meta.LicenseShortName?.value || '');
    const artist = stripHtml(meta.Artist?.value || '');

    let caption = `<strong>${objectName}</strong>`;
    if (desc) caption += ` — ${desc}`;
    if (artist || license) {
      const metaParts = [artist, license].filter(Boolean).join(', ');
      caption += ` <em>(${metaParts})</em>`;
    }

    let src = info.thumburl;
    if (src.endsWith('.jpg')) src += '.webp';

    images.push({ src, alt: objectName, caption });
    if (images.length >= limit) break;
  }
  return images;
}

async function main() {
  delete require.cache[require.resolve(GALLERY_PATH)];
  const gallery = require(GALLERY_PATH);

  for (const { id, queries } of NEEDS) {
    const existing = gallery[id]?.images || [];
    if (existing.length >= 4) {
      console.log(`${id}: already has ${existing.length} images`);
      continue;
    }

    const collected = [...existing];
    for (const query of queries) {
      if (collected.length >= 6) break;
      try {
        const images = await fetchCommonsImages(query, 6 - collected.length);
        for (const img of images) {
          if (!collected.some((c) => c.src === img.src)) {
            collected.push(img);
          }
        }
        console.log(`  ${id} / "${query}": ${images.length} image(s)`);
      } catch (err) {
        console.error(`  ${id} / "${query}" error: ${err.message}`);
      }
      await sleep(2500);
    }

    if (collected.length) {
      gallery[id] = { images: collected };
      console.log(`${id}: ${collected.length} total image(s)`);
    } else {
      console.log(`${id}: still no images`);
    }
  }

  fs.writeFileSync(GALLERY_PATH, JSON.stringify(gallery, null, 2) + '\n', 'utf8');
  console.log('\nGallery data saved.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
