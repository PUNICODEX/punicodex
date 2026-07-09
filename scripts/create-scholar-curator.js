#!/usr/bin/env node
/**
 * PÚNYCODEX — Create a Scholarly Edition curator account.
 *
 * Usage: node scripts/create-scholar-curator.js email@domain.com password
 *
 * Creates a curator user in the Scholars DB with active status. The password
 * is hashed with bcrypt. Existing users with the same email are updated to
 * curator role and active status (their password is NOT changed).
 */

const { getDb, closeDb } = require('../platform/db/connection');
const { migrate } = require('../platform/db/migrate-scholars');
const { migrate: migrateQuality } = require('../platform/db/migrate-scholars-quality');
const dbApi = require('../platform/db/scholars');
const { hashPassword } = require('../platform/scholars/auth');

const MIN_PASSWORD_LENGTH = 8;

function printUsage() {
  console.error('Usage: node scripts/create-scholar-curator.js <email> <password>');
  console.error('Password must be at least 8 characters.');
}

function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    console.error('Error: A valid email is required.');
    process.exitCode = 1;
    return;
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Error: Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  migrate(db);
  migrateQuality(db);

  const normalizedEmail = email.toLowerCase().trim();
  const existing = dbApi.getUserByEmail(normalizedEmail);

  if (existing) {
    if (existing.role !== 'curator' || existing.account_status !== 'active') {
      dbApi.updateUserRole(existing.id, 'curator');
      dbApi.updateUserStatus(existing.id, 'active');
      console.log(`Updated existing user ${normalizedEmail} to active curator.`);
    } else {
      console.log(`Curator ${normalizedEmail} already exists and is active.`);
      console.log('Password was not changed. Use the password-reset flow to change it.');
    }
    closeDb();
    return;
  }

  const passwordHash = hashPassword(password);
  const result = dbApi.createUserWithPassword({
    email: normalizedEmail,
    institutionId: null,
    role: 'curator',
    displayName: normalizedEmail.split('@')[0],
    passwordHash,
    accountStatus: 'active',
  });

  console.log(`Created curator ${normalizedEmail} (id: ${result.lastInsertRowid}).`);
  closeDb();
}

main();
