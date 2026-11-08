#!/usr/bin/env node
/**
 * Backfill canonical PuniCodex Accounts from tenant and Scholar profiles.
 * Default is a read-only dry run; use --apply to write. Conflicts are reported
 * and skipped rather than silently relinking an identity.
 */
const identity = require('../platform/api/identity');

async function collect() {
  await identity.ensureIdentitySchema();
  const operational = require('../platform/db/operational');
  const tenant = await operational.all('SELECT id, email FROM tenant_accounts');
  const scholars = await operational.all('SELECT id, email FROM scholars_users');
  const emails = new Set([...tenant, ...scholars].map((row) => identity.normalizeEmail(row.email)).filter(identity.validEmail));
  return [...emails].sort();
}

async function runBackfill({ apply = false, only = null } = {}) {
  const emails = await collect();
  const report = { mode: apply ? 'apply' : 'dry-run', scanned: 0, created: 0, existing: 0, linked: 0, conflicts: [], skipped: [] };
  for (const email of emails) {
    if (only && email !== identity.normalizeEmail(only)) continue;
    report.scanned++;
    try {
      const before = await identity.getAccountByEmail(email);
      if (before) report.existing++;
      if (!apply) continue;
      const account = await identity.provisionFromLegacy(email);
      if (!account) {
        report.skipped.push({ email, reason: 'no_legacy_profile' });
        continue;
      }
      if (!before) report.created++;
      const links = await identity.getIdentityLinks(account.id);
      report.linked += links.length;
    } catch (err) {
      report.conflicts.push({ email, code: err.code || 'error', message: err.message });
    }
  }
  return report;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
  const report = await runBackfill({ apply, only });
  console.log(JSON.stringify(report, null, 2));
  if (report.conflicts.length) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runBackfill, collect };
