#!/usr/bin/env node
/**
 * One-off maintenance: prune temple .backup snapshot bloat.
 *
 * create-flagship.js snapshots 9 generated files into sites/{id}/.backup/<ts>/
 * before every regeneration and (pre-fix) never pruned them — 597 temples
 * accumulated ~27 GB. The snapshots are copies of GENERATED pages; canonical
 * sources live in type/js + templates/, so every snapshot is regenerable.
 *
 * This keeps the newest snapshot per temple and removes the rest. Run once;
 * create-flagship.js now self-prunes, so this should never be needed again.
 */
const fs = require('node:fs');
const path = require('node:path');

const SITES = path.join(__dirname, '..', 'sites');
const KEEP = 1;

let scanned = 0;
let removedDirs = 0;
let freedBytes = 0;

function rmdirRecursive(p) {
  let bytes = 0;
  for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, ent.name);
    if (ent.isDirectory()) bytes += rmdirRecursive(full);
    else {
      bytes += fs.statSync(full).size;
      fs.unlinkSync(full);
    }
  }
  fs.rmdirSync(p);
  return bytes;
}

for (const id of fs.readdirSync(SITES)) {
  const backupRoot = path.join(SITES, id, '.backup');
  if (!fs.existsSync(backupRoot)) continue;
  const snaps = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => e.name)
    .sort();
  scanned++;
  const stale = snaps.slice(0, Math.max(0, snaps.length - KEEP));
  for (const ts of stale) {
    freedBytes += rmdirRecursive(path.join(backupRoot, ts));
    removedDirs++;
  }
  if (fs.readdirSync(backupRoot).length === 0) fs.rmdirSync(backupRoot);
}

console.log(
  `Pruned ${removedDirs} stale snapshot(s) across ${scanned} temple(s) — ` +
    `${(freedBytes / 1024 / 1024 / 1024).toFixed(2)} GB freed.`,
);
