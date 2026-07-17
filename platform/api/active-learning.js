/**
 * PuniCodex — Active Learning Queue (Phase 14)
 *
 * Samples uncertain predictions for human review, prioritizes under-represented
 * scripts and new attack patterns, and records reviewer feedback as training
 * labels.
 */

const crypto = require('node:crypto');

const DEFAULT_UNCERTAINTY_MIN = 0.4;
const DEFAULT_UNCERTAINTY_MAX = 0.7;
const DEFAULT_MAX_QUEUE_SIZE = 1000;

function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
}

function isUncertain(probability, min = DEFAULT_UNCERTAINTY_MIN, max = DEFAULT_UNCERTAINTY_MAX) {
  return probability >= min && probability <= max;
}

function computePriorityScore(_input, probability, features) {
  const scriptDiversity = features?.scriptEntropy || 0;
  const confusableDensity = features?.confusableDensity || 0;
  const mixedScript = features?.mixedScriptFlag ? 1 : 0;
  const invisibleChars = features?.invisibleCharFlag ? 1 : 0;
  // Higher priority for predictions closest to the decision boundary.
  const distanceFromCenter = 1 - Math.abs(probability - 0.55) * 2;
  return (
    distanceFromCenter + scriptDiversity + confusableDensity * 2 + mixedScript + invisibleChars
  );
}

async function queueUncertainSample(db, input, classification, options = {}) {
  const probability = Number(classification?.probability);
  if (!isUncertain(probability)) {
    return { queued: false, reason: 'probability_out_of_range' };
  }

  const maxQueueSize = Number(options.maxQueueSize) || DEFAULT_MAX_QUEUE_SIZE;
  const countRow = await db.get(
    `SELECT COUNT(*) as c FROM active_learning_queue WHERE reviewed = 0`,
    []
  );
  if (countRow && countRow.c >= maxQueueSize) {
    return { queued: false, reason: 'queue_full' };
  }

  const inputHash = sha256(input);
  const existing = await db.get(
    `SELECT id FROM active_learning_queue WHERE input_hash = $1 AND reviewed = 0`,
    [inputHash]
  );
  if (existing) {
    return { queued: false, reason: 'already_queued' };
  }

  const priority = computePriorityScore(input, probability, classification.features);
  const featuresJson = classification.features ? JSON.stringify(classification.features) : null;

  const id = await db.insert(
    `INSERT INTO active_learning_queue
       (input_hash, input, probability, predicted_verdict, features,
        priority_score, reviewed, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
     RETURNING id`,
    [
      inputHash,
      input,
      probability,
      classification.verdict || 'unknown',
      featuresJson,
      priority,
      new Date().toISOString(),
    ]
  );

  return { queued: true, id, priority };
}

async function getReviewQueue(db, options = {}) {
  const limit = Math.min(Math.max(1, Number(options.limit) || 50), 1000);
  const rows = await db.all(
    `SELECT * FROM active_learning_queue
     WHERE reviewed = 0
     ORDER BY priority_score DESC, created_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((row) => ({
    ...row,
    features: row.features ? JSON.parse(row.features) : null,
  }));
}

async function getQueueSize(db) {
  const row = await db.get(
    `SELECT COUNT(*) as c FROM active_learning_queue WHERE reviewed = 0`,
    []
  );
  return row?.c || 0;
}

async function submitReviewerFeedback(db, inputHash, decision, reviewerId, notes) {
  const previous = await db.get(
    `SELECT predicted_verdict FROM active_learning_queue WHERE input_hash = $1`,
    [inputHash]
  );
  if (!previous) {
    return { updated: false, reason: 'sample_not_found' };
  }

  const result = await db.run(
    `UPDATE active_learning_queue
     SET reviewed = 1,
         reviewer_decision = $1,
         reviewer_id = $2,
         reviewer_notes = $3,
         reviewed_at = $4
     WHERE input_hash = $5`,
    [decision, reviewerId, notes || null, new Date().toISOString(), inputHash]
  );

  if (result.changes === 0) {
    return { updated: false, reason: 'no_change' };
  }

  await db.run(
    `INSERT INTO reviewer_feedback
       (input_hash, decision, previous_verdict, reviewer_id, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      inputHash,
      decision,
      previous.predicted_verdict,
      reviewerId,
      notes || null,
      new Date().toISOString(),
    ]
  );

  return { updated: true };
}

async function recordAppeal(db, input, reviewerId, notes) {
  const inputHash = sha256(input);
  const existing = await db.get(`SELECT id FROM active_learning_queue WHERE input_hash = $1`, [
    inputHash,
  ]);

  if (!existing) {
    await db.insert(
      `INSERT INTO active_learning_queue
         (input_hash, input, probability, predicted_verdict, features,
          priority_score, reviewed, reviewer_decision, reviewer_id,
          reviewer_notes, reviewed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $10)
       RETURNING id`,
      [
        inputHash,
        input,
        0,
        'unknown',
        null,
        0,
        'false-positive',
        reviewerId,
        notes || null,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  await db.run(
    `INSERT INTO reviewer_feedback
       (input_hash, decision, previous_verdict, reviewer_id, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [inputHash, 'false-positive', null, reviewerId, notes || null, new Date().toISOString()]
  );

  return { recorded: true };
}

module.exports = {
  DEFAULT_UNCERTAINTY_MIN,
  DEFAULT_UNCERTAINTY_MAX,
  DEFAULT_MAX_QUEUE_SIZE,
  isUncertain,
  computePriorityScore,
  queueUncertainSample,
  getReviewQueue,
  getQueueSize,
  submitReviewerFeedback,
  recordAppeal,
};
