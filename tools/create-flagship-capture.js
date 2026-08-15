#!/usr/bin/env node
/**
 * One-off debug harness (SEO template work, 2026-08): runs create-flagship for
 * a temple with all fs write primitives stubbed, capturing the would-be output
 * in memory so generated HTML can be inspected without touching sites/.
 *
 * Usage: node tools/create-flagship-capture.js <id> <relative-path> [regex]
 * Example: node tools/create-flagship-capture.js zeus lore/index.html "name-variations"
 */
const fs = require('node:fs');
const path = require('node:path');

const captured = {};
fs.writeFileSync = (dest, data) => {
  captured[path.normalize(String(dest))] = String(data);
};
fs.renameSync = (src, dest) => {
  const s = path.normalize(String(src));
  const d = path.normalize(String(dest));
  if (captured[s] !== undefined) {
    captured[d] = captured[s];
    delete captured[s];
  }
};
fs.copyFileSync = () => {};
fs.mkdirSync = () => {};

const [, , id, rel, needle] = process.argv;
if (!id || !rel) {
  console.error('Usage: node tools/create-flagship-capture.js <id> <relative-path> [substr-or-regex]');
  process.exit(1);
}
process.argv = ['node', 'create-flagship.js', id];
require('../scripts/create-flagship.js');

const file = captured[path.normalize(path.join(__dirname, '..', 'sites', id, rel))];
if (!file) {
  console.error('not captured:', rel, '\nhave:', Object.keys(captured).join('\n'));
  process.exit(1);
}
if (!needle) {
  process.stdout.write(file);
} else {
  const re = new RegExp(`[\\s\\S]*${needle}[\\s\\S]*`);
  const m = file.match(re);
  console.log(m ? m[0] : `NEEDLE NOT FOUND: ${needle}`);
}
