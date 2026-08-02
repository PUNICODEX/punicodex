/**
 * Mythic Duel — Economy & Save Integrity
 *
 * Three defects from the 2026-08 audit, each of which either took a player's
 * money or destroyed what they owned:
 *
 *  1. Pantheon Packs were offered for pantheons with no flagship cards. Packs
 *     draw from flagship editions only, so the pool was empty: 150 Ink was
 *     deducted and the draw yielded undefined.
 *  2. Returning to ?ink_session=cs_... re-credited the full bundle every time,
 *     because the client trusted `ink > 0` even when the server said
 *     alreadyRedeemed. Cleaning the address bar was the only guard.
 *  3. loadSave round-tripped the deck through an object keyed by card id,
 *     collapsing the legal second copy of every card on every page load.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SET = require('../game/cards.json');
const GAME_JS = fs.readFileSync(path.join(ROOT, 'game', 'game.js'), 'utf8');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── 1. Pack pools ──────────────────────────────────────────────────────────

test('the card set really does contain pantheons with no flagship pool', () => {
  // If this ever stops being true the guard is still correct, but this test
  // documents the concrete condition that made the crash reachable.
  const all = new Set();
  const flagship = new Set();
  for (const c of SET.cards) {
    if (!c.pantheon) continue;
    all.add(c.pantheon);
    if (c.flagship) flagship.add(c.pantheon);
  }
  const empty = [...all].filter((p) => !flagship.has(p));
  assert.ok(all.size > flagship.size, 'expected at least one flagship-less pantheon');
  assert.ok(empty.length > 0, `flagship-less pantheons: ${empty.join(', ')}`);
});

test('the pack picker offers only pantheons with a flagship pool', () => {
  assert.ok(
    /packPantheons\.forEach\(/.test(GAME_JS),
    'the pantheon picker must iterate packPantheons, not every pantheon'
  );
  assert.ok(
    /if \(c\.flagship && c\.pantheon && !seenPack\[c\.pantheon\]\)/.test(GAME_JS),
    'packPantheons must be built from flagship cards only'
  );
});

test('a pack is drawn before any Ink is spent, and an incomplete pull refunds', () => {
  const open = GAME_JS.slice(GAME_JS.indexOf('function openPack('));
  const body = open.slice(0, open.indexOf('\n  function ', 10));
  const drawAt = body.indexOf('drawPackCards(');
  const chargeAt = body.indexOf('save.ink -= def.cost');
  assert.ok(drawAt > -1 && chargeAt > -1, 'openPack should both draw and charge');
  assert.ok(drawAt < chargeAt, 'the draw must happen before the Ink is deducted');
  assert.ok(
    /drawn\.every\(function \(c\) \{[\s\S]*?return c && c\.id;/.test(body),
    'every drawn card must be validated before the charge'
  );
  assert.ok(
    /your Ink is untouched/.test(body),
    'an empty pull must tell the player their Ink was not spent'
  );
});

// ── 2. Ink redemption ──────────────────────────────────────────────────────

function redeemSource() {
  const start = GAME_JS.indexOf('async function redeemInkSession()');
  assert.ok(start > -1, 'redeemInkSession not found');
  const rest = GAME_JS.slice(start);
  return rest.slice(0, rest.indexOf('\n  /*'));
}

test('a redeemed Ink session is banked locally so a replay cannot re-credit', () => {
  const src = redeemSource();
  assert.ok(/save\.inkSessions = save\.inkSessions \|\| \{\}/.test(src), 'no local session ledger');
  assert.ok(
    /if \(save\.inkSessions\[sessionId\]\)/.test(src),
    'an already-banked session must short-circuit before the fetch'
  );
  assert.ok(
    /save\.inkSessions\[sessionId\] = true;/.test(src),
    'a successful credit must record the session'
  );
  // The ledger write must accompany the credit, not trail it by an early return.
  const creditAt = src.indexOf('save.ink += data.ink');
  const recordAt = src.indexOf('save.inkSessions[sessionId] = true');
  const persistAt = src.indexOf('persist()');
  assert.ok(creditAt > -1 && recordAt > creditAt, 'the session must be recorded with the credit');
  assert.ok(persistAt > recordAt, 'the ledger must be persisted');
});

test('a failed redeem keeps the session id in the URL so the money is recoverable', () => {
  const src = redeemSource();
  const catchAt = src.indexOf('} catch (err) {');
  assert.ok(catchAt > -1, 'redeemInkSession should still handle network failure');
  const catchBody = src.slice(catchAt);
  assert.ok(
    !/cleanUrl\(\)/.test(catchBody),
    'a network failure must NOT discard the session id — it is the only handle on a paid checkout'
  );
  assert.ok(/refresh to try again/.test(catchBody), 'the player should be told how to retry');
  // Definitive outcomes still retire the token.
  assert.ok(
    (src.match(/cleanUrl\(\);/g) || []).length >= 3,
    'success, definitive rejection, and the already-banked path should all clean the URL'
  );
});

// ── 3. Deck integrity ──────────────────────────────────────────────────────

test('loadSave migrates the deck element-wise, preserving duplicate copies', () => {
  const start = GAME_JS.indexOf('function loadSave()');
  const src = GAME_JS.slice(start, GAME_JS.indexOf('function persist()'));
  assert.ok(
    !/Object\.fromEntries\(data\.deck/.test(src),
    'the deck must not be round-tripped through an id-keyed object'
  );
  assert.ok(!/data\.deck = Object\.keys\(/.test(src), 'Object.keys collapses legal duplicates');
  assert.ok(
    /data\.deck\s*\n?\s*\.map\(migrateOneId\)/.test(src),
    'the deck should migrate per element'
  );
  assert.ok(/MAX_COPIES/.test(src), 'per-id copies should be clamped to the engine rule');
});

test('migrateOneId exists and is shared by both save shapes', () => {
  assert.ok(/function migrateOneId\(id\)/.test(GAME_JS), 'single-id migration helper missing');
  // The collection map still uses the count-preserving wrapper.
  assert.ok(/var next = migrateOneId\(id\);/.test(GAME_JS), 'migrateIds should reuse migrateOneId');
});

test('the deck migration rule matches the engine, and the engine still allows duplicates', () => {
  const Engine = require('../game/engine.js');
  assert.strictEqual(Engine.RULES.MAX_COPIES, 2, 'a deck may legally hold two copies of a card');
  assert.ok(Engine.RULES.DECK_SIZE > Engine.RULES.MAX_COPIES, 'decks are larger than one playset');
});

(async () => {
  console.log('\n▸ Mythic Duel Economy & Save Integrity\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nGame Economy Safety: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
