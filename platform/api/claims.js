const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');

function getDb() {
  return new Database(DB_PATH);
}

function createClaim({ entryId, email, unicodeVariant, amount }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO claims (entry_id, email, unicode_variant, amount_paid, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(entryId, email, unicodeVariant, amount);
  db.close();
  return { id: result.lastInsertRowid };
}

function updateClaimStripeSession(claimId, sessionId) {
  const db = getDb();
  db.prepare('UPDATE claims SET stripe_session_id = ?, status = ? WHERE id = ?').run(
    sessionId,
    'pending',
    claimId
  );
  db.close();
}

function markClaimPaid(sessionId, paymentIntent) {
  const db = getDb();
  db.prepare(
    'UPDATE claims SET stripe_payment_intent = ?, status = ? WHERE stripe_session_id = ?'
  ).run(paymentIntent, 'paid', sessionId);
  const claim = db.prepare('SELECT * FROM claims WHERE stripe_session_id = ?').get(sessionId);
  db.close();
  return claim;
}

function markClaimBuilding(claimId, githubRepo) {
  const db = getDb();
  db.prepare('UPDATE claims SET status = ?, github_repo = ? WHERE id = ?').run(
    'building',
    githubRepo,
    claimId
  );
  db.close();
}

function markClaimActive(claimId, deployUrl) {
  const db = getDb();
  db.prepare('UPDATE claims SET status = ?, deploy_url = ? WHERE id = ?').run(
    'active',
    deployUrl,
    claimId
  );
  db.close();
}

function getClaim(id) {
  const db = getDb();
  const claim = db
    .prepare(`
    SELECT c.*, e.ascii, e.unicode as entry_unicode, e.greek, e.pantheon, e.tier, e.tier_label, e.meaning, e.domain as god_domain
    FROM claims c
    JOIN entries e ON c.entry_id = e.id
    WHERE c.id = ?
  `)
    .get(id);
  db.close();
  return claim;
}

function getClaimsByEmail(email) {
  const db = getDb();
  const claims = db
    .prepare(`
    SELECT c.*, e.ascii, e.unicode as entry_unicode, e.pantheon, e.tier
    FROM claims c
    JOIN entries e ON c.entry_id = e.id
    WHERE c.email = ?
    ORDER BY c.created_at DESC
  `)
    .all(email);
  db.close();
  return claims;
}

function getPendingBuilds() {
  const db = getDb();
  const claims = db
    .prepare(`
    SELECT c.*, e.ascii, e.unicode as entry_unicode, e.greek, e.pantheon, e.tier, e.meaning, e.domain as god_domain
    FROM claims c
    JOIN entries e ON c.entry_id = e.id
    WHERE c.status = 'paid'
    ORDER BY c.created_at ASC
  `)
    .all();
  db.close();
  return claims;
}

module.exports = {
  createClaim,
  updateClaimStripeSession,
  markClaimPaid,
  markClaimBuilding,
  markClaimActive,
  getClaim,
  getClaimsByEmail,
  getPendingBuilds,
};
