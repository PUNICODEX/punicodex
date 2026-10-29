#!/usr/bin/env node
/**
 * Bump ?v= cache-busting tokens for edited CSS/JS assets across all HTML
 * pages and the generator scripts that hardcode them.
 *
 * Immutable 1-year caching on /css and /js means any edit to those files must
 * ship with a bumped ?v= or clients never see the change. Tokens are matched
 * as exact literals, so untouched references stay untouched. Run after any
 * edit to the mapped assets; extend MAP when editing other versioned assets.
 *
 * Usage: node tools/bump-asset-versions.js [--check]
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');

// asset path (repo-relative) → { old, next } token strings.
const MAP = [
  { asset: 'css/main.css', old: 'v=perf26', next: 'v=perf27' },
  { asset: 'css/mobile-menu.css', old: 'v=4', next: 'v=5' },
  { asset: 'css/home-critical.css', old: 'v=1', next: 'v=2' },
  { asset: 'css/oracle.css', old: 'v=2', next: 'v=3' },
  { asset: 'js/archetypes-v2.js', old: 'v=61146c8472', hash: true },
  { asset: 'js/store-configurator.js', old: 'v=a925d6609e', hash: true },
  { asset: 'css/store-configurator.css', old: 'v=af83704a04', hash: true },
];

const SKIP_DIRS = new Set(['node_modules', '.git', '.masters', '.vercel', '.gradle']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(html|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveTokens() {
  return MAP.map((m) => {
    let next = m.next;
    if (m.hash) {
      const body = fs.readFileSync(path.join(ROOT, m.asset));
      next = `v=${crypto.createHash('md5').update(body).digest('hex').slice(0, 10)}`;
    }
    return { ...m, next };
  });
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const tokens = resolveTokens();
  const files = walk(ROOT);
  let changed = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    // Never rewrite the assets themselves.
    if (tokens.some((t) => rel.split(path.sep).join('/') === t.asset)) continue;
    let text = fs.readFileSync(file, 'utf8');
    const original = text;
    for (const t of tokens) {
      // Match the repo-root-absolute reference so same-named assets in other
      // directories (e.g. mobile/css/main.css) are never touched.
      const needle = `/${t.asset}?${t.old}`;
      const replacement = `/${t.asset}?${t.next}`;
      if (!text.includes(needle)) continue;
      text = text.split(needle).join(replacement);
    }
    if (text !== original) {
      changed++;
      if (!checkOnly) fs.writeFileSync(file, text, 'utf8');
      console.log(`${checkOnly ? 'stale: ' : 'bumped '}${rel}`);
    }
  }
  console.log(`${checkOnly ? 'files needing bump: ' : 'files updated: '}${changed}`);
  if (checkOnly && changed > 0) process.exit(1);
}

main();
