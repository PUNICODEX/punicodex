/**
 * PUNICODEX — SOC 2 Evidence Generator
 *
 * Reads governance audit logs and tenant state, then writes a dated
 * evidence bundle to docs/soc2-evidence-YYYY-MM-DD.json.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db.js');

const CHANGE_ACTIONS = [
  'tenant.user.create',
  'tenant.user.role_change',
  'tenant.retention.purge',
  'admin.policy.update',
  'admin.tenant.create',
  'admin.tenant.update',
  'admin.tenant.delete',
];

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function generateSoc2Evidence() {
  const db = new Database(getDbPath());
  const today = new Date().toISOString().slice(0, 10);

  const users = db
    .prepare(
      'SELECT tenant_id, email_hash, role, status, created_at FROM tenant_users'
    )
    .all();

  const placeholders = CHANGE_ACTIONS.map(() => '?').join(',');
  const changes = db
    .prepare(
      `SELECT * FROM audit_logs
       WHERE action IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT 1000`
    )
    .all(...CHANGE_ACTIONS);

  const latestBenchmark = db
    .prepare(
      `SELECT * FROM audit_logs
       WHERE action = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get('model.benchmark');

  const evidence = {
    generatedAt: new Date().toISOString(),
    access_review: users.map((u) => ({
      tenantId: u.tenant_id,
      emailHash: u.email_hash,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
    })),
    change_management: changes.map((c) => ({
      id: c.id,
      action: c.action,
      actorType: c.actor_type,
      actorId: c.actor_id,
      resourceType: c.resource_type,
      resourceId: c.resource_id,
      metadata: safeJsonParse(c.metadata),
      createdAt: c.created_at,
    })),
    model_validation: latestBenchmark
      ? {
          id: latestBenchmark.id,
          action: latestBenchmark.action,
          metadata: safeJsonParse(latestBenchmark.metadata),
          createdAt: latestBenchmark.created_at,
        }
      : null,
  };

  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outPath = path.join(docsDir, `soc2-evidence-${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(`SOC2 evidence written to ${outPath}`);

  db.close();
  return outPath;
}

if (require.main === module) {
  generateSoc2Evidence();
}

module.exports = { generateSoc2Evidence };
