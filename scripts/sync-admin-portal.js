/**
 * PuniCodex — Sync Admin Portal
 *
 * Copies the static admin portal pages from platform/public/admin-portal/
 * to admin-portal/ at the project root so they are served at /admin-portal/*
 * in production. The copy is idempotent: the destination directory is removed
 * first, then recreated from the canonical source.
 *
 * Run: node scripts/sync-admin-portal.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'platform', 'public', 'admin-portal');
const DESTINATION = path.join(ROOT, 'admin-portal');

function syncAdminPortal() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`✗ Admin portal source directory not found: ${SOURCE}`);
    process.exit(1);
  }

  // Remove destination for a clean, idempotent copy.
  if (fs.existsSync(DESTINATION)) {
    fs.rmSync(DESTINATION, { recursive: true, force: true });
  }

  fs.cpSync(SOURCE, DESTINATION, { recursive: true, preserveTimestamps: true });

  const files = [];
  function collectFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else {
        files.push(path.relative(DESTINATION, fullPath));
      }
    }
  }
  collectFiles(DESTINATION);

  console.log(`✓ Admin portal synced to ${path.relative(ROOT, DESTINATION)}/`);
  console.log(`  ${files.length} files copied`);
  for (const file of files.sort()) {
    console.log(`    ${file}`);
  }
}

syncAdminPortal();
