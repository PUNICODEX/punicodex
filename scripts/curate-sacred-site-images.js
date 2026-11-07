#!/usr/bin/env node
/**
 * PuniCodex — Sacred Atlas Commons image curation.
 *
 *   node scripts/curate-sacred-site-images.js [--limit N] [--only id,id]
 *
 * For each site in data/sacred-sites.json, queries Wikimedia Commons for the
 * site's name (minus parentheticals), applies the curator doctrine's junk
 * signals (no SVG/tiny files, no modern portrait noise, source-category
 * checks where feasible), and writes up to 2 images per site into the
 * dataset as {src, title, license, artist} — where src is the hotlinked
 * upload.wikimedia.org thumb at 960px, exactly like gallery-data.json.
 *
 * Canonical: data/sacred-sites.json (this script is the only sanctioned
 * writer of its images arrays). Idempotent: sites with >=2 images skip.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'sacred-sites.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? Number(args[limitIdx + 1]) : 2;
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1].split(',') : null;

// Junk signals — the same doctrine as curate-gallery-images.js.
const JUNK = /portrait|selfie|\.svg|logo|signature|map of|plan of|floorplan|poster|stamp|banknote|coin|ticket|flyer|banner|screenshot|qr code|video|\.webm|\.ogg/i;
const LICENSE_OK = /cc|public domain|pd|attribution|share-alike/i;

function commonsSearch(query) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search' +
    '&gsrnamespace=6&gsrlimit=12&gsrsearch=' +
    encodeURIComponent(query) +
    '&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata&iiurlwidth=960';
  const tmp = path.join(require('node:os').tmpdir(), `atlas-cur-${process.pid}.json`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync('curl', ['-s', '-m', '30', '-A', 'PuniCodexAtlasCurator/1.0', url], {
        stdio: ['ignore', fs.openSync(tmp, 'w'), 'ignore'],
      });
      return JSON.parse(fs.readFileSync(tmp, 'utf8'));
    } catch {
      /* retry */
    }
  }
  return {};
}

function pickImages(site) {
  const q = site.name.replace(/\(.*?\)/g, '').replace(/[—–].*$/, '').trim();
  const variants = [q, `${q} ${site.place}`, `${q} ${site.country}`];
  for (const v of variants) {
    const j = commonsSearch(v);
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const picks = [];
    for (const p of pages.sort((a, b) => (a.index || 0) - (b.index || 0))) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii || !ii.thumburl) continue;
      if (JUNK.test(p.title) || JUNK.test(ii.url || '')) continue;
      if ((ii.size || 0) < 60000) continue; // tiny files are noise
      const em = ii.extmetadata || {};
      const license = (em.LicenseShortName && em.LicenseShortName.value) || '';
      if (license && !LICENSE_OK.test(license)) continue;
      const artist = ((em.Artist && em.Artist.value) || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
      picks.push({
        src: ii.thumburl,
        title: p.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' '),
        license,
        artist,
      });
      if (picks.length >= LIMIT) break;
    }
    if (picks.length) return picks;
  }
  return [];
}

let filled = 0;
let examined = 0;
for (const site of data.sites) {
  if (ONLY && !ONLY.includes(site.id)) continue;
  if ((site.images || []).length >= LIMIT) continue;
  examined++;
  const picks = pickImages(site);
  if (picks.length) {
    site.images = picks;
    filled++;
    console.log(`✓ ${site.id}: ${picks.length} image(s) — ${picks[0].title} (${picks[0].license || 'license n/a'})`);
  } else {
    console.log(`· ${site.id}: no clean candidates`);
  }
}

if (filled) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`\ncurated: ${filled} site(s) updated of ${examined} examined`);
} else {
  console.log('\nno changes');
}
