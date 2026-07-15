/**
 * PÚNYCODEX — Realms page flagship-badge tests
 *
 * realms/index.html is hand-maintained; its flagship badges drifted out of
 * sync once already (valholl, nikko were promoted but never badged). This
 * suite pins every realm card's flagship marking to the archetype list.
 *
 * Run standalone: node test/realms-page.test.js
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const BUILT = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));

let assertions = 0;

const html = fs.readFileSync(path.join(ROOT, 'realms', 'index.html'), 'utf8');
const re = /href="\/sites\/([^/]+)\/" class="realm-card ([^"]*)"/g;
const cards = [];
let m;
while ((m = re.exec(html)) !== null) {
  cards.push({ id: m[1], flagged: m[2].includes('flagship') });
}

assert.ok(cards.length > 0, 'expected realm cards on the realms page');

for (const card of cards) {
  assertions++;
  assert.strictEqual(
    card.flagged,
    BUILT.has(card.id),
    `realms card "${card.id}" flagship marking (${card.flagged}) does not match built status (${BUILT.has(card.id)})`
  );
}

// Every badged card also carries the visible badge element.
const badgeCount = (html.match(/realm-badge">Flagship</g) || []).length;
const flaggedCards = cards.filter((c) => c.flagged).length;
assert.strictEqual(
  badgeCount,
  flaggedCards,
  `expected ${flaggedCards} Flagship badges, found ${badgeCount}`
);
assertions++;

console.log(`Realms Page Tests: ${assertions} assertions passed`);
