#!/usr/bin/env node
/**
 * PUNICODEX — Promote all entries with extended flagship materials
 *
 * Copies assets from 'extended flagship materials/punicodex/{Folder}/'
 * to sites/{id}/assets/ and runs promote-to-flagship.js for each.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const MATERIALS_DIR = path.join(ROOT, 'extended flagship materials', 'punicodex');
const SITES_DIR = path.join(ROOT, 'sites');

const JOBS = [
  { id: 'ahuramazda', domain: 'ahuramazdā.com' },
  { id: 'lakshmi', domain: 'lakṣmī.com' },
  { id: 'nikko', domain: 'nikkō.com' },
  { id: 'nirmata', domain: 'nirmātā.com' },
  { id: 'parvati', domain: 'pārvatī.com' },
  { id: 'ptah', domain: 'ptḥ.com' },
  { id: 'rama', domain: 'rāma.com' },
  { id: 'tiamat', domain: 'tiāmat.com' },
  { id: 'tyr', domain: 'týr.com' },
  { id: 'valholl', domain: 'valhǫll.com' },
];

function findMaterialsFolder(id) {
  const entries = fs.readdirSync(MATERIALS_DIR, { withFileTypes: true });
  const match = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === id.toLowerCase());
  return match ? path.join(MATERIALS_DIR, match.name) : null;
}

function copyAsset(srcDir, destDir, baseName, destName) {
  const exts = ['png', 'webp', 'jpg', 'mp4', 'webm'];
  for (const ext of exts) {
    const src = path.join(srcDir, `${baseName}.${ext}`);
    if (fs.existsSync(src)) {
      const dest = path.join(destDir, `${destName}.${ext}`);
      fs.copyFileSync(src, dest);
      return dest;
    }
  }
  return null;
}

function promote(job) {
  const { id, domain } = job;
  const folder = findMaterialsFolder(id);
  if (!folder) {
    console.error(`✗ ${id}: materials folder not found`);
    return false;
  }

  const assetsDir = path.join(SITES_DIR, id, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Copy logolockup and logomark
  copyAsset(folder, assetsDir, `${id}_logolockup`, `${id}_logolockup`);
  copyAsset(folder, assetsDir, `${id}_logomark`, `${id}_logomark`);

  // Copy hero video if present
  copyAsset(folder, assetsDir, `${id}_hero_video`, `${id}_hero_video`);

  // Pick best mascot
  const mascotVariants = [`${id}_mascot`, `${id}_mascot_personified`, `${id}_mascot_phenomenon`];
  let mascotCopied = false;
  for (const variant of mascotVariants) {
    const copied = copyAsset(folder, assetsDir, variant, `${id}_mascot`);
    if (copied) {
      console.log(`  ${id}: copied mascot from ${path.basename(copied)}`);
      mascotCopied = true;
      break;
    }
  }
  if (!mascotCopied) {
    console.error(`✗ ${id}: no mascot found`);
    return false;
  }

  // Run promote-to-flagship.js (skip generate/validate; we run once at the end)
  try {
    execSync(`node scripts/promote-to-flagship.js ${id} --domain ${domain} --skip-generate --skip-validate`, {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 600000,
    });
    return true;
  } catch (err) {
    console.error(`✗ ${id}: promotion failed`);
    return false;
  }
}

function main() {
  let succeeded = 0;
  for (const job of JOBS) {
    console.log(`\n=== Promoting ${job.id} ===`);
    if (promote(job)) succeeded++;
  }

  if (succeeded > 0) {
    console.log('\n=== Running generator ===');
    execSync('npm run generate', { cwd: ROOT, stdio: 'inherit', timeout: 600000 });

    console.log('\n=== Running SEO validator ===');
    execSync('node scripts/validate-seo.js', { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  }

  console.log(`\nPromoted ${succeeded}/${JOBS.length} entries`);
}

main();
