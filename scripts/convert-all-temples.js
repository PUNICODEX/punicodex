#!/usr/bin/env node
/**
 * PUNICODEX — Batch Temple-to-Ad Conversion
 *
 * Converts all non-ad temples in one run.
 *
 * Usage:
 *   node scripts/convert-all-temples.js           # Convert all remaining temples
 *   node scripts/convert-all-temples.js --limit=5 # Convert first 5 only
 *   node scripts/convert-all-temples.js --skip=zeus,apollo # Skip specific temples
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITES_DIR = path.join(__dirname, '..', 'sites');

// Ad pages that are already converted (don't touch these)
const AD_PAGES = new Set(['nike', 'hermes', 'ra', 'akh']);

function isAlreadyConverted(id) {
  const lorePath = path.join(SITES_DIR, id, 'lore', 'index.html');
  if (!fs.existsSync(lorePath)) return false;
  const loreHtml = fs.readFileSync(lorePath, 'utf8');
  return loreHtml.includes('tab-nav');
}

function getTempleIds() {
  return fs.readdirSync(SITES_DIR)
    .filter(id => {
      const fullPath = path.join(SITES_DIR, id);
      if (!fs.statSync(fullPath).isDirectory()) return false;
      if (AD_PAGES.has(id)) return false;
      // Must have index.html
      if (!fs.existsSync(path.join(fullPath, 'index.html'))) return false;
      // Skip already converted
      if (isAlreadyConverted(id)) return false;
      return true;
    })
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const skipArg = args.find(a => a.startsWith('--skip='));
  const skipSet = skipArg ? new Set(skipArg.split('=')[1].split(',')) : new Set();

  const dryRun = args.includes('--dry-run');

  const allIds = getTempleIds();
  const toConvert = allIds.filter(id => !skipSet.has(id)).slice(0, limit);

  console.log(`\n📊 Batch Conversion Report`);
  console.log(`   Total temples: ${allIds.length}`);
  console.log(`   Ad pages (skip): ${AD_PAGES.size}`);
  console.log(`   Skipped by flag: ${skipSet.size}`);
  console.log(`   To convert: ${toConvert.length}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

  if (dryRun) {
    console.log('Temples that would be converted:');
    toConvert.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
    return;
  }

  const results = { success: [], failed: [] };

  for (let i = 0; i < toConvert.length; i++) {
    const id = toConvert[i];
    const progress = `[${i + 1}/${toConvert.length}]`;
    process.stdout.write(`${progress} Converting ${id}... `);

    try {
      execSync(`node scripts/create-flagship.js ${id}`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        encoding: 'utf8',
      });
      console.log('✅');
      results.success.push(id);
    } catch (err) {
      console.log('❌');
      console.error(`   ${err.stderr || err.message}`);
      results.failed.push(id);
    }
  }

  console.log(`\n📋 Results`);
  console.log(`   Success: ${results.success.length}`);
  console.log(`   Failed: ${results.failed.length}`);

  if (results.failed.length) {
    console.log(`\n   Failed temples:`);
    results.failed.forEach(id => console.log(`     - ${id}`));
    process.exit(1);
  }
}

main();
