/**
 * PuniCodex — Mobile menu drift test.
 *
 * Closes the chrome-drift gap the 6-round pre-push loop exposed: pages that
 * embed the canonical mobile menu at GENERATION time (store, texts, screen,
 * herald, arche, …) were only re-verified by the slow divergence gate. This
 * suite scans EVERY tracked HTML file and byte-compares each embedded menu
 * against the canonical block — drift surfaces in ~2s inside the battery,
 * not at the 15-minute divergence gate.
 *
 * Scope notes:
 *   - sites/ temples carry an intentional simplified menu (a separate design);
 *     they are excluded, as is the frozen archive/tier-system snapshot.
 *   - Read-only: never writes, safe to run in parallel phases.
 *
 * Run standalone: node test/mobile-menu-drift.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const { CANONICAL_MENU, MENU_OPEN, TARGETS, findBalancedDivEnd, menuForPage } = require(
  path.join(root, 'scripts', 'sync-mobile-menu.js')
);

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => fs.existsSync(path.join(root, f)))
  .filter((f) => !f.startsWith('sites/') && !f.startsWith('archive/tier-system/'));

// Allowed set: the canonical menu plus every self-referenced href marked
// active (menuForPage returns CANONICAL_MENU unchanged for non-needles, so
// the Set dedupes harmlessly).
const hrefs = [...new Set([...CANONICAL_MENU.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]))];
const allowed = new Set([CANONICAL_MENU, ...hrefs.map((h) => menuForPage(h))]);
// No canonical target adds a second Account link inside the drawer.
for (const t of TARGETS) {
  allowed.add(menuForPage(t.active));
}

let checked = 0;
const drifted = [];
for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const start = html.indexOf(MENU_OPEN);
  if (start === -1) continue;
  const end = findBalancedDivEnd(html, start);
  if (end === -1) {
    drifted.push(`${rel}: unbalanced .mobile-menu div`);
    continue;
  }
  if (!allowed.has(html.slice(start, end))) drifted.push(rel);
  checked++;
}

assert.deepStrictEqual(
  drifted,
  [],
  `${drifted.length} page(s) carry a non-canonical mobile menu — regenerate ` +
    'the owning generator or run node scripts/sync-mobile-menu.js, then npm run generate'
);
assert.ok(checked >= 100, `expected 100+ menu-bearing pages, found ${checked}`);
console.log(`Mobile menu drift: ${checked} pages byte-canonical`);
