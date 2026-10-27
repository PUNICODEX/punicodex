#!/usr/bin/env node
/**
 * PuniCodex — mockup fleet audit.
 *
 * The composite product mockups (.masters/mockups/{id}.jpg) are gitignored
 * and served from the masters deployment — but a deployment only carries
 * what exists on the machine that deploys. This script scans the local
 * fleet, verifies each file is actually LIVE on the masters host (HEAD),
 * and writes the committed store/mockup-fleet.json that generate-store-
 * pages.js uses to decide which PDPs may reference a composite mockup URL.
 *
 * Products whose composites are not in the fleet render the blank-garment
 * base + art overlay instead (the configurator's universal compositing) —
 * never a 404 img.
 *
 * Usage:
 *   node scripts/audit-mockup-fleet.js            (scan + verify + write)
 *   node scripts/audit-mockup-fleet.js --scan-only
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MOCKUPS_DIR = path.join(ROOT, '.masters', 'mockups');
const OUT_FILE = path.join(ROOT, 'store', 'mockup-fleet.json');
const MASTERS_BASE = 'https://punycodex-masters.vercel.app/mockups';

async function main() {
  const scanOnly = process.argv.includes('--scan-only');
  const ids = new Set();
  if (fs.existsSync(MOCKUPS_DIR)) {
    for (const f of fs.readdirSync(MOCKUPS_DIR)) {
      const m = f.match(/^([a-z0-9-]+)\.jpg$/);
      if (m) ids.add(m[1]);
    }
  }

  const fleet = {};
  let live = 0;
  let dead = [];
  const CONCURRENCY = 12;
  const list = [...ids];
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const batch = list.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        if (scanOnly) return { id, ok: true };
        try {
          const res = await fetch(`${MASTERS_BASE}/${id}.jpg`, { method: 'HEAD' });
          return { id, ok: res.status === 200 };
        } catch {
          return { id, ok: false };
        }
      }),
    );
    for (const r of results) {
      fleet[r.id] = r.ok;
      if (r.ok) live++;
      else dead.push(r.id);
    }
  }

  const tmp = `${OUT_FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(fleet, null, 2)}\n`);
  fs.renameSync(tmp, OUT_FILE);

  console.log(
    `Mockup fleet: ${ids.size} local file(s) — ${live} live, ${dead.length} not reachable.` +
      (dead.length ? ` Unreachable: ${dead.slice(0, 8).join(', ')}` : ''),
  );
  console.log(`Fleet map → ${path.relative(ROOT, OUT_FILE)}`);
  if (dead.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Fleet audit stopped: ${err.message}`);
  process.exit(1);
});
