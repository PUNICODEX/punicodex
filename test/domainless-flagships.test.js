/**
 * PuniCodex — Domain-less flagship contract tests
 *
 * Domain-less flagships (ASCII-only names whose plain .com is unregistrable,
 * or taken names watched for a drop) must:
 *   1. carry NO domain fields on the archetype (domainUnicode/domainPunycode/domainAlt)
 *   2. never appear in owned-domains.json or the middleware DOMAIN_MAP
 *   3. still get the clean /{id}/ URL (LEXICON_IDS)
 *   4. show the "watched for release" state on the lore page and never claim
 *      ownership (no "Owned ·" badges, no "live temple domain" copy)
 *   5. serve sponsorship on punicodex.com/{id} (dashboard shows the temple path)
 *
 * Run: node --test test/domainless-flagships.test.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const { loadArchetypes } = require(path.join(ROOT, 'scripts', 'flywheel-utils.js'));

const archetypes = loadArchetypes().list;
const domainless = archetypes.filter((a) => a.domainless === true);
const ownedDomains = require(path.join(ROOT, 'platform', 'db', 'owned-domains.json'));
const middlewareSrc = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');

test('domainless archetypes carry no domain fields', () => {
  for (const a of domainless) {
    assert.strictEqual(a.domainUnicode, undefined, `${a.id}: domainUnicode must be absent`);
    assert.strictEqual(a.domainPunycode, undefined, `${a.id}: domainPunycode must be absent`);
    assert.ok(!a.domainAlt || a.domainAlt.length === 0, `${a.id}: domainAlt must be empty`);
  }
});

test('domainless ids are not in owned-domains.json', () => {
  const owned = new Set(ownedDomains.map((d) => d.toLowerCase()));
  for (const a of domainless) {
    assert.ok(!owned.has(`${a.id}.com`), `${a.id}.com must not be owned`);
  }
});

test('domainless ids get clean URLs but no DOMAIN_MAP entries', () => {
  const idsBlock = middlewareSrc.match(/LEXICON_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(idsBlock, 'LEXICON_IDS block found');
  for (const a of domainless) {
    assert.ok(
      idsBlock[1].includes(`'${a.id}'`),
      `${a.id}: must be in LEXICON_IDS (clean /{id}/ URL)`
    );
    const mapBlock = middlewareSrc.match(/DOMAIN_MAP\s*=\s*\{([\s\S]*?)\n\}/);
    assert.ok(
      !mapBlock[1].includes(`'/sites/${a.id}'`),
      `${a.id}: must not have a DOMAIN_MAP domain entry`
    );
  }
});

test('domainless lore pages show watched state and never claim ownership', () => {
  for (const a of domainless) {
    const lore = path.join(ROOT, 'sites', a.id, 'lore', 'index.html');
    if (!fs.existsSync(lore)) continue; // not yet promoted
    const html = fs.readFileSync(lore, 'utf8');
    assert.ok(
      html.includes('watched for release'),
      `${a.id}: lore page must show the watched-for-release state`
    );
    assert.ok(
      !html.includes('Owned · Primary'),
      `${a.id}: lore page must not claim an owned primary domain`
    );
    assert.ok(
      !html.includes('The live temple domain'),
      `${a.id}: lore page must not claim a live temple domain`
    );
  }
});

test('domainless dashboards serve sponsorship on the temple path', () => {
  for (const a of domainless) {
    const dash = path.join(ROOT, 'sites', a.id, 'dashboard', 'index.html');
    if (!fs.existsSync(dash)) continue;
    const html = fs.readFileSync(dash, 'utf8');
    assert.ok(
      html.includes(`punicodex.com/${a.id}`),
      `${a.id}: dashboard must reference the temple path`
    );
  }
});
