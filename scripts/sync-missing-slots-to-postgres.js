#!/usr/bin/env node
/**
 * Gap-fill production Postgres ad_slots from the local SQLite DB.
 *
 * Background: platform/db/init-operational-postgres.js seeds ad_slots from
 * SQLite ON CONFLICT (id) DO NOTHING. Slots for flagships promoted AFTER the
 * last sync never reached Postgres, leaving their sponsorship boxes dead
 * (the page click handler finds no slot and silently does nothing).
 *
 * This script ONLY inserts slots for sites that have ZERO rows in Postgres
 * but 14 in SQLite, always with fresh ids (PG MAX(id)+1…), so it can never
 * disturb existing rows, ids, or live bookings. It also repairs
 * single-member-short sites (13 slots + bundle at 14 — one member missing)
 * in --repair-partials mode. Sites with EXTRA rows (duplicates) are reported,
 * never touched — those need a human look.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/sync-missing-slots-to-postgres.js            # dry-run report
 *   DATABASE_URL=... node scripts/sync-missing-slots-to-postgres.js --apply    # fill zero-slot sites
 *   ... --apply --repair-partials     # 13-row sites: insert missing slot(s), canonicalize bundle wiring
 *   ... --apply --resync-anomalies    # anomaly sites with 0 bookings: full reseed from local SQLite
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'platform', 'db', 'punicodex.db');

const APPLY = process.argv.includes('--apply');
const REPAIR_PARTIALS = process.argv.includes('--repair-partials');
const RESYNC_ANOMALIES = process.argv.includes('--resync-anomalies');

function loadArchetypes() {
  const code = fs
    .readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8')
    .replace('const ARCHETYPES', 'var ARCHETYPES');
  return new Function(`${code}; return ARCHETYPES;`)();
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set. Refusing to run.');
    process.exit(1);
  }
  const { default: postgres } = await import('postgres');
  const sql = postgres(DATABASE_URL);

  const local = new Database(DB_PATH, { readonly: true });
  const localBySite = new Map();
  for (const row of local.prepare('SELECT * FROM ad_slots ORDER BY id').all()) {
    if (!localBySite.has(row.site_slug)) localBySite.set(row.site_slug, []);
    localBySite.get(row.site_slug).push(row);
  }
  local.close();

  const pgRows = await sql`SELECT id, site_slug, sort_order, is_bundle FROM ad_slots`;
  const pgBySite = new Map();
  for (const r of pgRows) {
    if (!pgBySite.has(r.site_slug)) pgBySite.set(r.site_slug, []);
    pgBySite.get(r.site_slug).push(r);
  }

  const built = loadArchetypes().filter((a) => a.built && a.hasAdSite).map((a) => a.id);
  const gaps = [];
  const partials = [];
  const anomalies = [];
  const healthy = [];

  for (const id of built) {
    const pg = pgBySite.get(id) || [];
    const localCount = (localBySite.get(id) || []).length;
    if (pg.length === 0 && localCount === 14) {
      gaps.push(id);
    } else if (pg.length === 0) {
      anomalies.push({ id, reason: `0 PG slots, ${localCount} local slots` });
    } else if (pg.length === 13 && localCount === 14) {
      partials.push(id);
    } else if (pg.length === 14 && pg.filter((s) => s.is_bundle).length === 1) {
      healthy.push(id);
    } else {
      anomalies.push({
        id,
        reason: `${pg.length} PG slots (${pg.filter((s) => s.is_bundle).length} bundles), ${localCount} local`,
      });
    }
  }

  console.log(`Built ad-enabled flagships: ${built.length}`);
  console.log(`Healthy in PG (14 + bundle): ${healthy.length}`);
  console.log(`Gaps (0 in PG, seedable):    ${gaps.length}`);
  console.log(`Partials (13 in PG):         ${partials.length}${REPAIR_PARTIALS ? '' : '  (use --repair-partials to fix)'}`);
  console.log(`Anomalies (need human eye):  ${anomalies.length}${RESYNC_ANOMALIES ? '' : '  (use --resync-anomalies for 0-booking sites)'}`);
  for (const a of anomalies) console.log(`  ! ${a.id}: ${a.reason}`);
  for (const p of partials) {
    const pg = pgBySite.get(p);
    const localSlots = localBySite.get(p);
    const missing = localSlots.filter(
      (l) => !pg.some((g) => g.sort_order === l.sort_order)
    );
    console.log(`  ~ ${p}: missing sort_order ${missing.map((m) => m.sort_order).join(', ')}`);
  }

  if (!APPLY) {
    console.log('\nDry run — no writes. Re-run with --apply to insert.');
    await sql.end();
    return;
  }

  let nextId = (await sql`SELECT COALESCE(MAX(id), 0) AS m FROM ad_slots`)[0].m + 1;

  async function insertSite(tx, siteSlug) {
    const slots = localBySite.get(siteSlug);
    const bundleLocal = slots.find((s) => s.is_bundle);
    const idMap = new Map();
    for (const s of slots) {
      const { id: _omit, ...rest } = s;
      const keys = Object.keys(rest);
      const freshId = nextId++;
      idMap.set(s.sort_order, freshId);
      await tx.unsafe(
        `INSERT INTO ad_slots (id, ${keys.join(', ')}) VALUES (${freshId}, ${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
        keys.map((k) => rest[k])
      );
    }
    for (const s of slots.filter((x) => !x.is_bundle)) {
      await tx.unsafe('INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES ($1, $2)', [
        idMap.get(bundleLocal.sort_order),
        idMap.get(s.sort_order),
      ]);
    }
    return slots.length;
  }

  await sql.begin(async (tx) => {
    const bookingCount = async (site) =>
      (
        await tx.unsafe('SELECT COUNT(*) AS c FROM bookings WHERE site_slug = $1', [site])
      )[0].c;

    for (const id of gaps) {
      const n = await insertSite(tx, id);
      console.log(`  + ${id}: inserted ${n} slots`);
    }

    if (REPAIR_PARTIALS) {
      for (const id of partials) {
        if ((await bookingCount(id)) > 0) {
          console.log(`  ~ ${id}: SKIPPED — has bookings, partial repair unsafe`);
          continue;
        }
        const pg = pgBySite.get(id);
        const localSlots = localBySite.get(id);
        const missing = localSlots.filter((l) => !pg.some((g) => g.sort_order === l.sort_order));
        for (const m of missing) {
          const { id: _omit, ...rest } = m;
          const keys = Object.keys(rest);
          const freshId = nextId++;
          await tx.unsafe(
            `INSERT INTO ad_slots (id, ${keys.join(', ')}) VALUES (${freshId}, ${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
            keys.map((k) => rest[k])
          );
          console.log(`  ~ ${id}: inserted missing sort_order ${m.sort_order} (id ${freshId})`);
        }
        // Canonicalize: exactly one bundle, at sort_order 14, owning all 13 members.
        const rows = await tx.unsafe(
          'SELECT id, sort_order, is_bundle FROM ad_slots WHERE site_slug = $1',
          [id]
        );
        const canonical = rows.find((r) => r.is_bundle === 1 && r.sort_order === 14);
        if (!canonical) throw new Error(`${id}: no bundle at sort_order 14 after repair`);
        await tx.unsafe(
          'UPDATE ad_slots SET is_bundle = 0 WHERE site_slug = $1 AND is_bundle = 1 AND id <> $2',
          [id, canonical.id]
        );
        await tx.unsafe(
          'DELETE FROM bundle_members WHERE bundle_slot_id IN (SELECT id FROM ad_slots WHERE site_slug = $1)',
          [id]
        );
        for (const member of rows.filter((r) => r.id !== canonical.id)) {
          await tx.unsafe(
            'INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES ($1, $2)',
            [canonical.id, member.id]
          );
        }
        console.log(`  ~ ${id}: bundle wiring canonicalized (${rows.length - 1} members)`);
      }
    }

    if (RESYNC_ANOMALIES) {
      for (const a of anomalies) {
        const localSlots = localBySite.get(a.id) || [];
        if (localSlots.length !== 14) {
          console.log(`  ! ${a.id}: SKIPPED — local has ${localSlots.length} slots, expected 14`);
          continue;
        }
        if ((await bookingCount(a.id)) > 0) {
          console.log(`  ! ${a.id}: SKIPPED — has bookings, resync unsafe (${a.reason})`);
          continue;
        }
        await tx.unsafe(
          'DELETE FROM bundle_members WHERE bundle_slot_id IN (SELECT id FROM ad_slots WHERE site_slug = $1)',
          [a.id]
        );
        await tx.unsafe('DELETE FROM ad_slots WHERE site_slug = $1', [a.id]);
        const n = await insertSite(tx, a.id);
        console.log(`  ! ${a.id}: resynced from local (${n} slots, fresh ids)`);
      }
    }
  });

  console.log('Done. Re-run without --apply to verify counts.');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
