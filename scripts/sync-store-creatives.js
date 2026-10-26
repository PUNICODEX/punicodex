#!/usr/bin/env node
/**
 * PuniCodex — store creative artworks sync (P4, ops script — NOT in generate).
 *
 * Licensed temple creatives become selectable artwork chips on the temple's
 * Reliquary products. Rights gate (ALL must hold):
 *   - creative_assets.status = 'approved'
 *   - creative_assets.merch_consent = 1          (creator granted merch rights
 *     with revenue share — the existing marketplace consent flow)
 *   - creative_assets.inspiration_entry_id set   (the art belongs to a temple)
 *
 * For every qualifying asset the script:
 *   - copies the ORIGINAL (not the watermarked preview) into
 *     assets/store-creatives/{id}.png — full-res print master; and a 512px
 *     .webp chip derivative
 *   - records it in store/creative-artworks.json keyed by temple id
 *     (inspiration_entry_id), which generate-pod-products.js merges into
 *     product artworks at generation time
 *
 * Idempotent: skip-existing on files (committed bytes win); the JSON is
 * rewritten from the DB every run — an asset that loses approval or consent
 * disappears from the index on the next sync.
 *
 * Usage:
 *   node scripts/sync-store-creatives.js            (local SQLite)
 *   DATABASE_URL=... node scripts/sync-store-creatives.js   (Postgres)
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'store-creatives');
const INDEX_FILE = path.join(ROOT, 'store', 'creative-artworks.json');
const MAX_CREATIVES_PER_TEMPLE = 6;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

// platform/db/operational.all handles both Postgres (DATABASE_URL set) and
// local SQLite transparently — one query either way.
const { all: dbAll } = require('../platform/db/operational');

async function fetchOriginal(originalPath) {
  if (/^https?:\/\//.test(originalPath)) {
    const res = await fetch(originalPath);
    if (!res.ok) throw new Error(`download ${originalPath} → ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_ORIGINAL_BYTES) throw new Error('original exceeds 20 MB cap');
    return buf;
  }
  // Site-relative /uploads/… — local dev file under the uploads root.
  const rel = originalPath.replace(/^\/+/, '');
  const local = path.join(ROOT, 'platform', 'api', 'public', rel.replace(/^uploads\//, 'uploads/'));
  if (!fs.existsSync(local)) throw new Error(`local original missing: ${originalPath}`);
  const buf = fs.readFileSync(local);
  if (buf.length > MAX_ORIGINAL_BYTES) throw new Error('original exceeds 20 MB cap');
  return buf;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = await dbAll(`
    SELECT a.id, a.title, a.original_path, a.inspiration_entry_id,
           u.display_name AS creator_name
    FROM creative_assets a
    JOIN scholars_users u ON a.creator_id = u.id
    WHERE a.status = 'approved'
      AND a.merch_consent = 1
      AND a.inspiration_entry_id IS NOT NULL
      AND a.original_path IS NOT NULL
    ORDER BY a.updated_at DESC
  `);

  const index = {};
  let copied = 0;
  let skipped = 0;
  for (const row of rows) {
    const temple = String(row.inspiration_entry_id || '').trim();
    if (!temple) continue;
    if (!index[temple]) index[temple] = [];
    if (index[temple].length >= MAX_CREATIVES_PER_TEMPLE) continue;
    try {
      const pngPath = path.join(OUT_DIR, `${row.id}.png`);
      const webpPath = path.join(OUT_DIR, `${row.id}.webp`);
      if (!fs.existsSync(pngPath)) {
        const buf = await fetchOriginal(row.original_path);
        fs.writeFileSync(pngPath, buf);
      }
      if (!fs.existsSync(webpPath)) {
        const sharp = require('sharp');
        await sharp(pngPath).resize(512, 512, { fit: 'inside' }).webp({ quality: 85 }).toFile(webpPath);
      }
      copied++;
      index[temple].push({
        id: row.id,
        title: String(row.title || `Creative #${row.id}`),
        creator: row.creator_name || '',
        src: `/assets/store-creatives/${row.id}.webp`,
        printUrl: `https://punicodex.com/assets/store-creatives/${row.id}.png`,
      });
    } catch (err) {
      skipped++;
      console.warn(`  ✗ creative ${row.id}: ${err.message}`);
    }
  }

  // Store-live notifications: entries present in the new index but not the
  // previous one mean a creator's art just became selectable on a temple's
  // products — the best retention moment in the product, so we tell them.
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch {
    previous = {};
  }
  const added = [];
  for (const [temple, list] of Object.entries(index)) {
    const before = new Set((previous[temple] || []).map((c) => String(c.id)));
    for (const c of list) {
      if (!before.has(String(c.id))) added.push({ temple, ...c });
    }
  }
  if (added.length && process.argv.includes('--notify')) {
    const { notifyCreativeEvent } = require('../platform/api/creative-emails.js');
    const { LEXICON } = require('../type/js/lexicon.js');
    for (const entry of added) {
      const templeEntry = (LEXICON || []).find((e) => e.id === entry.temple);
      await notifyCreativeEvent('store_live', {
        assetId: entry.id,
        extra: {
          templeUnicode: templeEntry?.unicode || entry.temple,
          templeUrl: `https://punicodex.com/${entry.temple}/`,
        },
      });
    }
    console.log(`Store-live notifications sent for ${added.length} artwork(s).`);
  }

  // Diff-aware write: the nightly CI job decides whether to regenerate and
  // commit from whether the index actually changed — an unchanged index
  // must leave the tree untouched.
  const total = Object.values(index).reduce((n, l) => n + l.length, 0);
  const next = `${JSON.stringify(index, null, 2)}\n`;
  let changed = true;
  try {
    changed = fs.readFileSync(INDEX_FILE, 'utf8') !== next;
  } catch {
    changed = true;
  }
  if (changed) {
    const tmp = `${INDEX_FILE}.tmp`;
    fs.writeFileSync(tmp, next);
    fs.renameSync(tmp, INDEX_FILE);
  }
  console.log(
    `Creative artworks: ${total} licensed across ${Object.keys(index).length} temple(s) (${copied} ready, ${skipped} skipped) — index ${changed ? 'UPDATED' : 'unchanged'} → ${INDEX_FILE}`,
  );
  if (skipped) console.log('Re-run after fixing the skipped rows; everything else is idempotent.');
}

main().catch((err) => {
  console.error(`Creative sync stopped: ${err.message}`);
  process.exit(1);
});
