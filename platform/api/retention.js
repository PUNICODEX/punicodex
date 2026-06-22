/**
 * PUNYCODEX — Data retention and cold-storage helpers.
 */

async function purgeExpiredRawInputs(db, retentionDays = 90) {
  const days = Number(retentionDays);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('retentionDays must be a positive integer');
  }

  const result = await db.run(
    `DELETE FROM raw_inputs
     WHERE is_aggregate = 0
       AND created_at < datetime('now', '-${days} days')`,
    []
  );
  return { deleted: result.changes };
}

async function archiveOldPartitions(_db, table, beforeDate) {
  // Placeholder for cold-storage archival. In production this would move
  // partitions/tables to long-term storage (S3, Glacier, etc.).
  return {
    table,
    beforeDate,
    archived: 0,
    message: 'Cold-storage archival is not implemented in this environment',
  };
}

module.exports = { purgeExpiredRawInputs, archiveOldPartitions };
