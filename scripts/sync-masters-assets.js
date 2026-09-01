const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const SOURCE_ROOT = path.resolve(__dirname, '..', 'sites');
const TARGET_ROOT = path.resolve(__dirname, '..', '.masters', 'sites');
const PATTERN = /_(mascot|logomark|logolockup)\.webp$/;

async function walk(dir, callback) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(p, callback);
    } else {
      await callback(p);
    }
  }
}

async function fileHash(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = (await fs.open(filePath, 'r')).createReadStream();
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

async function copyIfNeeded(sourcePath) {
  const rel = path.relative(SOURCE_ROOT, sourcePath);
  const targetPath = path.join(TARGET_ROOT, rel);

  let targetStat;
  try {
    targetStat = await fs.stat(targetPath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (targetStat) {
    const sourceStat = await fs.stat(sourcePath);
    if (sourceStat.size === targetStat.size) {
      const [sourceHash, targetHash] = await Promise.all([
        fileHash(sourcePath),
        fileHash(targetPath),
      ]);
      if (sourceHash === targetHash) return { action: 'skipped', path: rel };
    }
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return { action: targetStat ? 'updated' : 'copied', path: rel };
}

async function main() {
  const sourceFiles = [];
  await walk(SOURCE_ROOT, async (filePath) => {
    if (PATTERN.test(path.basename(filePath))) sourceFiles.push(filePath);
  });
  sourceFiles.sort((a, b) => a.localeCompare(b));

  let copied = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of sourceFiles) {
    try {
      const result = await copyIfNeeded(filePath);
      if (result.action === 'copied') copied++;
      else if (result.action === 'updated') updated++;
      else skipped++;
    } catch (err) {
      failed++;
      console.error(`Failed: ${path.relative(SOURCE_ROOT, filePath)} - ${err.message}`);
    }
  }

  console.log(`sync-masters-assets complete:`);
  console.log(`  source files: ${sourceFiles.length}`);
  console.log(`  copied:       ${copied}`);
  console.log(`  updated:      ${updated}`);
  console.log(`  skipped:      ${skipped}`);
  console.log(`  failed:       ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
