#!/usr/bin/env node
/**
 * PuniCodex — Curate gallery images from Wikimedia Commons for flagship temples.
 *
 * For every flagship archetype that has no curated entry in
 * scripts/gallery-data.json, searches Wikimedia Commons for real
 * art-historical depictions (statues, vase paintings, reliefs, miniatures,
 * temple carvings), filters to freely licensed images (PD / CC0 / CC BY /
 * CC BY-SA), and appends a curated entry with scholarly captions and
 * license attribution.
 *
 * Usage:
 *   node scripts/curate-gallery-images.js                 # all missing flagships
 *   node scripts/curate-gallery-images.js --only id1,id2  # specific ids
 *   node scripts/curate-gallery-images.js --audit         # HEAD-check all curated URLs
 *   node scripts/curate-gallery-images.js --dry-run       # print, do not write
 *
 * Never overwrites an existing curated entry.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GALLERY_PATH = path.join(__dirname, 'gallery-data.json');
const UA = 'PuniCodexGalleryBot/1.0 (https://punicodex.com; contact: punicodex@gmail.com)';
const IMAGES_PER_TEMPLE = 6;
const MIN_WIDTH = 900;
const GOOD_LICENSES = /^(public domain|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?(-\d\.\d)?|pd|cc by-sa \d\.\d)/i;

// Junk signals in file titles — modern, non-depiction, or off-topic material.
const JUNK =
  /logo|map|diagram|flag|coat of arms|seal|svg|icon|tattoo|cosplay|anime|manga|game|screenshot|poster|album|film|movie|dvd|comic|card|meme|clipart|drawing by|sketch by|render|3d model|wedding|football|soccer|basket|volley|rugby|hockey|cricket|olympics 20|miss |pageant|band |album cover|perfume|watch|car |aircraft|ship |locomotive|building in|street in|town in|village in|city in|school|university|hospital|hotel|restaurant|company|factory|bridge in|river in|mountain in|lake in|cartoon|punch|satire|caricature|thumbnail|gillam|discurso|caminhada|feira|evento|entrevista|\bship\b|\bvessel\b|rotterdam|port of|canal|offshore|crane|tugboat|\bboat\b|\btug\b|harbor|harbour|quarters|sundkaj|close-up|aritana|perfil/i;

// Depiction signals in file titles.
const DEPICT =
  /statue|sculpture|vase|kylix|amphora|krater|oinochoe|lekythos|hydria|fresco|relief|bust|painting|mosaic|coin|stele|stela|temple|museum|louvre|british museum|vatican|metropolitan|naples|athens|olympia|delphi|berlin|munich|cairo|bronze|marble|terracotta|ivory|cameo|gem|sarcophagus|tomb|pyxis|plate|cup|bowl|jug|fragment|miniature|manuscript|illuminated|thangka|gandhara|borobudur|ajanta|sanchi|bodhgaya|nara|kyoto|wutai|dunhuang|longmen|yungang|angkor|prambanan|pahari|rajput|kangra|mughal|hieroglyph|papyrus|obelisk|sphinx|pyramid|karnak|luxor|abydos|dendera|edfu|philae|rune|picture stone|gotland|manuscript|eddic|carving|stave|urnes|mammen|jelling/i;

// Per-id search aliases for names whose Commons coverage lives under a
// different spelling or disambiguation (diacritics-stripped ASCII works best).
const ALIASES = {
  hermod: ['Hermóðr', 'Hermod Hel', 'Hermod Baldr', 'Hermodr', 'Hermod'],
  cerberus: ['Herakles Cerberus', 'Heracles Cerberus', 'Cerberus', 'Kerberos'],
  ochosi: ['Oxossi', 'Oxóssi', 'Ochosi'],
  radha: ['Radha'],
  shakyamuni: ['Shakyamuni', 'Buddha Shakyamuni', 'Gautama Buddha'],
  akshobhya: ['Akshobhya'],
  vairocana: ['Vairocana', 'Mahavairocana', 'Dainichi'],
  manjushri: ['Manjushri'],
  vajrapani: ['Vajrapani'],
  ksitigarbha: ['Ksitigarbha', 'Jizo', 'Dizang'],
  mara: ['Mara daughters', 'Mara army', 'Mara demon', 'Temptation of the Buddha', 'Maravijaya', 'Versuchung des Buddha'],
};

// Pantheon-specific query context to keep results on-topic.
const CONTEXT = {
  greek: 'ancient Greek (statue OR vase OR relief OR mosaic OR coin OR fresco)',
  'greek-location': '(ancient OR ruins OR temple OR archaeological)',
  roman: 'Roman (statue OR sculpture OR mosaic OR relief OR coin OR fresco)',
  egyptian: 'Egyptian (statue OR relief OR hieroglyph OR temple OR papyrus OR stela)',
  norse: 'Norse (painting OR manuscript OR carving OR runestone OR illustration)',
  sanskrit: '(sculpture OR temple OR painting OR miniature OR statue)',
  buddhist: '(statue OR sculpture OR thangka OR temple OR gandhara OR painting)',
  chinese: '(statue OR temple OR painting OR sculpture OR porcelain)',
  taoist: '(statue OR temple OR painting OR sculpture)',
  japanese: '(shrine OR statue OR painting OR woodblock OR temple)',
  yoruba: '(sculpture OR shrine OR art OR statue OR carving)',
  nahuatl: '(codex OR sculpture OR stone OR temple OR mural)',
  mesopotamian: '(relief OR stele OR cylinder seal OR statue OR plaque)',
  canaanite: '(relief OR stele OR statue OR figurine OR plaque)',
  phoenician: '(relief OR stele OR statue OR sarcophagus)',
  hittite: '(relief OR orthostat OR statue OR seal)',
  celtic: '(sculpture OR stone OR manuscript OR carving)',
  slavic: '(statue OR idol OR manuscript OR icon OR embroidery)',
  baltic: '(statue OR idol OR folk art OR illustration)',
  polynesian: '(statue OR carving OR tiki OR illustration)',
  incan: '(sculpture OR textile OR ceramic OR ruins)',
  korean: '(statue OR temple OR painting)',
  zoroastrian: '(relief OR fire temple OR manuscript OR carving)',
};

function ascii(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ðÐ]/g, 'd')
    .replace(/[þÞ]/g, 'th')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe');
}

function stripHtml(s) {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function commonsSearch(query, limit) {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '960',
  });
  const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const j = await res.json();
  return Object.values(j.query?.pages || {});
}

// Strong contextual junk: tested against title AND description.
const CONTEXT_JUNK =
  /tugboat|\bvessel\b|\bimo\b|shipyard|seagoing|cargo ship|offshore|\btug\b|harbou?r|ferry|\byacht\b|\btanker\b|bulk carrier/i;

function scorePage(page, aliasSet) {
  const ii = page.imageinfo?.[0];
  if (!ii || !ii.thumburl) return -1;
  const title = page.title.replace(/^File:/, '');
  const license = ii.extmetadata?.LicenseShortName?.value || '';
  if (!GOOD_LICENSES.test(license.trim())) return -1;
  if ((ii.width || 0) < MIN_WIDTH) return -1;
  if (/^(thumbnail|image|img|dsc|img_)/i.test(title)) return -1;
  if (/thumbnail/i.test(title) && (ii.width || 0) < 1200) return -1;
  if (/\.(svg|gif|tif|tiff|pdf|ogv|webm|mp3|wav)$/i.test(ii.url)) return -1;

  // Topicality gate: the deity name must appear in the title or the
  // description — otherwise Commons full-text search returns generic noise.
  // Compared on alphanumerics so "Mara's Daughters" matches alias "Mara daughters".
  const squash = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = squash(title);
  const descRaw = stripHtml(ii.extmetadata?.ImageDescription?.value || '');
  const desc = squash(descRaw);
  const squashedAliases = aliasSet.map((a) => squash(a)).filter((a) => a.length >= 4);
  const aliasInTitle = squashedAliases.some((a) => t.includes(a));
  const aliasInDesc = squashedAliases.some((a) => desc.includes(a));
  if (!aliasInTitle && !aliasInDesc) return -1;
  if (CONTEXT_JUNK.test(title) || CONTEXT_JUNK.test(descRaw)) return -1;

  let score = 0;
  if (aliasInTitle) score += 6;
  if (aliasInDesc) score += 2;
  const depictHits = (title.match(DEPICT) || []).length;
  score += Math.min(depictHits, 3) * 2;
  if (JUNK.test(title)) score -= 20;
  // Theme-park / roadside modern monuments are not gallery material.
  if (/theme park|garden|cemetery|road|100 feet|giant|amusement/i.test(title)) score -= 8;
  // Art-historical dating signals are a plus.
  if (/BCE|\bcentury\b|\b1[0-8][0-9]{2}\b/i.test(title + desc)) score += 2;
  if (/public domain|cc0|pd/i.test(license)) score += 2;
  score += Math.min((ii.width || 0) / 4000, 2);
  return score;
}

function buildCaption(page) {
  const ii = page.imageinfo[0];
  const em = ii.extmetadata || {};
  let title = page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
  const desc = stripHtml(em.ImageDescription?.value || '');
  const artist = stripHtml(em.Artist?.value || '');
  const license = (em.LicenseShortName?.value || '').trim();

  // First sentence of the description, bounded.
  let blurb = desc.split(/(?<=[.!?])\s/)[0] || '';
  if (blurb.length > 180) blurb = `${blurb.slice(0, 177)}…`;
  if (blurb.toLowerCase() === title.toLowerCase()) blurb = '';

  // Over-long catalog-style titles (e.g. Louvre-Lens exhibition files) make
  // poor captions — lead with the description instead.
  if (title.length > 70) {
    if (blurb && blurb.length >= 20) {
      title = blurb;
      blurb = '';
    } else {
      title = `${title.slice(0, 67)}…`;
    }
  }

  let caption = `<strong>${title}</strong>`;
  if (blurb) caption += ` — ${blurb}`;
  const credit = artist ? `Photo/art: ${artist}. ` : '';
  caption += ` <span class="gallery-credit">${credit}${license} via Wikimedia Commons.</span>`;
  return caption;
}

// Hand-verified file titles for ids where search is unreliable (name
// collisions, sparse coverage). These bypass search (still license-checked).
const MANUAL = {
  hermod: [
    'File:SÁM 66, 75r, Hermóðr and Baldr.jpg',
    'File:Hermod before Hela.jpg',
    'File:Hermodr.jpg',
    'File:Treated NKS hermodr.jpg',
    'File:Balder and Nanna with Hermod.jpg',
  ],
};

async function commonsTitles(titles) {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '960',
  });
  const res = await fetch('https://commons.wikimedia.org/w/api.php?' + q, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const j = await res.json();
  return Object.values(j.query?.pages || {}).filter((p) => p.imageinfo?.[0]?.thumburl);
}

async function curateOne(id, archetype, dryRun) {
  // Manual fast-path: hand-verified titles, no search.
  if (MANUAL[id]) {
    const pages = await commonsTitles(MANUAL[id]);
    const images = pages
      .filter((p) => GOOD_LICENSES.test((p.imageinfo[0].extmetadata?.LicenseShortName?.value || '').trim()))
      .slice(0, IMAGES_PER_TEMPLE)
      .map((p) => {
        const ii = p.imageinfo[0];
        const altText = stripHtml(ii.extmetadata?.ImageDescription?.value || '') || p.title.replace(/^File:/, '').replace(/_/g, ' ');
        return {
          src: ii.thumburl,
          alt: altText.length > 220 ? `${altText.slice(0, 217)}…` : altText,
          caption: buildCaption(p),
        };
      });
    if (images.length >= 2) {
      if (dryRun) {
        console.log(`  DRY ${id} (manual): ${images.length} images`);
        images.forEach((im) => console.log(`    - ${im.src.split('/').slice(-2).join('/').slice(0, 80)}`));
      }
      return { images };
    }
  }

  const aliases = ALIASES[id] || [...new Set([archetype.name, ascii(archetype.name), id])];
  const aliasSet = aliases;

  const candidates = new Map();
  const BROAD =
    '(statue OR vase OR painting OR relief OR sculpture OR mosaic OR fresco OR coin OR temple OR thangka OR miniature OR manuscript OR woodblock OR codex OR bust OR bronze OR marble)';
  for (const alias of aliases.slice(0, 5)) {
    const queries = [`File: ${alias} ${BROAD}`, `File: ${alias}`];
    for (const query of queries) {
      let pages = [];
      try {
        pages = await commonsSearch(query, 25);
      } catch (e) {
        console.error(`  ! search failed for ${alias}: ${e.message}`);
      }
      for (const p of pages) {
        const score = scorePage(p, aliasSet);
        if (score > 0 && !candidates.has(p.title)) candidates.set(p.title, { page: p, score });
      }
      // Stop early once this alias has surfaced enough candidates.
      if (candidates.size >= IMAGES_PER_TEMPLE * 2) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (candidates.size >= IMAGES_PER_TEMPLE * 2) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const best = [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .filter(({ page }, i, arr) => {
      // Series dedupe: collapse near-identical photo sets (same title stem
      // with trailing numbering) to one representative.
      const stem = ascii(page.title)
        .toLowerCase()
        .replace(/[^a-z]/g, '')
        .replace(/(0[1-9]|[0-9]{2,4})$/, '');
      return arr.findIndex((x) => ascii(x.page.title).toLowerCase().replace(/[^a-z]/g, '').replace(/(0[1-9]|[0-9]{2,4})$/, '') === stem) === i;
    })
    .slice(0, IMAGES_PER_TEMPLE);
  if (best.length < 2) {
    console.log(`  ✗ ${id}: only ${best.length} usable image(s) found — skipped`);
    return null;
  }

  const images = best.map(({ page }) => {
    const ii = page.imageinfo[0];
    const caption = buildCaption(page);
    const altText = stripHtml(ii.extmetadata?.ImageDescription?.value || '') || page.title.replace(/^File:/, '').replace(/_/g, ' ');
    return {
      src: ii.thumburl,
      alt: altText.length > 220 ? `${altText.slice(0, 217)}…` : altText,
      caption,
    };
  });

  if (dryRun) {
    console.log(`  DRY ${id}: ${images.length} images`);
    images.forEach((im) => console.log(`    - ${im.src.split('/').pop().slice(0, 72)}`));
  }
  return { images };
}

async function audit(gallery) {
  const ids = Object.keys(gallery);
  let checked = 0;
  let dead = 0;
  for (const id of ids) {
    for (const img of gallery[id].images || []) {
      const url = img.src.replace(/\.webp$/, '');
      try {
        const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
        if (!res.ok) {
          dead++;
          console.log(`  DEAD ${id}: ${url.slice(-70)} (${res.status})`);
        }
      } catch (e) {
        dead++;
        console.log(`  DEAD ${id}: ${url.slice(-70)} (${e.message})`);
      }
      checked++;
      if (checked % 40 === 0) console.log(`  … ${checked} checked, ${dead} dead`);
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  console.log(`\nAudit complete: ${checked} URLs checked, ${dead} dead.`);
}

async function main() {
  const args = process.argv.slice(2);
  const gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf8'));

  if (args.includes('--audit')) {
    await audit(gallery);
    return;
  }

  const { loadArchetypes } = require('./flywheel-utils');
  const { list } = loadArchetypes();
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;
  const dryRun = args.includes('--dry-run');

  const missing = list.filter(
    (a) => (!gallery[a.id] || !(gallery[a.id].images || []).length) && (!only || only.includes(a.id)),
  );
  console.log(`Flagships without curated gallery: ${missing.length}${only ? ` (filtered to ${only.length})` : ''}`);

  let added = 0;
  for (const a of missing) {
    process.stdout.write(`→ ${a.id} … `);
    const entry = await curateOne(a.id, a, dryRun);
    if (entry) {
      console.log(`${entry.images.length} images`);
      if (!dryRun) {
        gallery[a.id] = entry;
        added++;
        // Write after every temple so a kill/timeout never loses progress.
        fs.writeFileSync(GALLERY_PATH, `${JSON.stringify(gallery, null, 2)}\n`);
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!dryRun && added > 0) {
    console.log(`\nWrote ${added} new curated entries to scripts/gallery-data.json`);
  } else {
    console.log('\nNo changes written.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
