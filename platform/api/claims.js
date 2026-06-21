const { get, all, run, insert } = require('../db/operational');
const { getDb } = require('../db/connection');

async function createClaim({ entryId, email, unicodeVariant, amount }) {
  const id = await insert(
    `
      INSERT INTO claims (entry_id, email, unicode_variant, amount_paid, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
    `,
    [entryId, email, unicodeVariant, amount]
  );
  return { id };
}

async function updateClaimStripeSession(claimId, sessionId) {
  await run('UPDATE claims SET stripe_session_id = $1, status = $2 WHERE id = $3', [
    sessionId,
    'pending',
    claimId,
  ]);
}

async function getClaimByStripeSession(sessionId) {
  return get('SELECT * FROM claims WHERE stripe_session_id = $1', [sessionId]);
}

async function markClaimPaid(sessionId, paymentIntent) {
  await run(
    'UPDATE claims SET stripe_payment_intent = $1, status = $2 WHERE stripe_session_id = $3',
    [paymentIntent, 'paid', sessionId]
  );
  return getClaimByStripeSession(sessionId);
}

async function markClaimBuilding(claimId, githubRepo) {
  await run('UPDATE claims SET status = $1, github_repo = $2 WHERE id = $3', [
    'building',
    githubRepo,
    claimId,
  ]);
}

async function markClaimActive(claimId, deployUrl) {
  await run('UPDATE claims SET status = $1, deploy_url = $2 WHERE id = $3', [
    'active',
    deployUrl,
    claimId,
  ]);
}

function fetchEntryFields(entryId) {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT ascii, unicode as entry_unicode, greek, pantheon, tier, tier_label, meaning, domain as god_domain FROM entries WHERE id = ?'
    )
    .get(entryId);
  return row || {};
}

async function getClaim(id) {
  const claim = await get('SELECT * FROM claims WHERE id = $1', [id]);
  if (!claim) return null;
  const entry = fetchEntryFields(claim.entry_id);
  return { ...claim, ...entry };
}

async function getClaimsByEmail(email) {
  const claims = await all(
    `
      SELECT *
      FROM claims
      WHERE email = $1
      ORDER BY created_at DESC
    `,
    [email]
  );
  return claims.map((claim) => ({ ...claim, ...fetchEntryFields(claim.entry_id) }));
}

async function getPendingBuilds() {
  const claims = await all(
    `
      SELECT *
      FROM claims
      WHERE status = 'paid'
      ORDER BY created_at ASC
    `,
    []
  );
  return claims.map((claim) => ({ ...claim, ...fetchEntryFields(claim.entry_id) }));
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
