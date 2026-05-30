#!/usr/bin/env node
/**
 * Deploy 32 PUNYCODEX flagships to Vercel + bind custom punycode domains.
 *
 * Prerequisites:
 *   - vercel CLI installed and authenticated (`vercel login`)
 *   - domains registered and available for configuration
 */

const { spawn } = require('child_process');
const { domainToASCII } = require('url');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

const VERCEL = 'vercel';

// 32 flagships for Vercel (42 total - 10 Cloudflare - helheimr skipped)
const FLAGSHIPS = [
  { id: 'zeus',        unicode: 'Zeús' },
  { id: 'athena',      unicode: 'Athēnē' },
  { id: 'poseidon',    unicode: 'Poseidôn' },
  { id: 'apollon',     unicode: 'Apóllōn' },
  { id: 'ares',        unicode: 'Árēs' },
  { id: 'artemis',     unicode: 'Ártemis' },
  { id: 'aphrodite',   unicode: 'Aphrodítē' },
  { id: 'demeter',     unicode: 'Dēmētēr' },
  { id: 'hermes',      unicode: 'Hermês' },
  { id: 'hera',        unicode: 'Hēra' },
  { id: 'selene',      unicode: 'Selēnē' },
  { id: 'dionysos',    unicode: 'Diónysos' },
  { id: 'gaia',        unicode: 'Gaîa' },
  { id: 'chaos',       unicode: 'Cháos' },
  { id: 'tartaros',    unicode: 'Tártaros' },
  { id: 'pontos',      unicode: 'Póntos' },
  { id: 'delphoi',     unicode: 'Delphoí' },
  { id: 'olympos',     unicode: 'Ólympos' },
  { id: 'sparte',      unicode: 'Spártē' },
  { id: 'helios',      unicode: 'Hēlios' },
  { id: 'alfheimr',    unicode: 'Álfheimr' },
  { id: 'jotunheimr',  unicode: 'Jötunheimr' },
  { id: 'midgardr',    unicode: 'Miðgarðr' },
  { id: 'ragnarok',    unicode: 'Ragnarǫk' },
  { id: 'odinn',       unicode: 'Óðinn' },
  { id: 'thor',        unicode: 'Þórr' },
  { id: 'ra',          unicode: 'Rꜥ' },
  { id: 'shiva',       unicode: 'Śiva' },
  { id: 'kyoto',       unicode: 'Kyōto' },
  { id: 'osaka',       unicode: 'Ōsaka' },
  { id: 'kobe',        unicode: 'Kōbe' },
  { id: 'athenai',     unicode: 'Athēnai' },
];

for (const f of FLAGSHIPS) {
  f.punycode = domainToASCII(`${f.unicode}.com`);
  f.siteDir = path.join(ROOT, 'sites', f.id);
  f.projectName = `punycodex-${f.id}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function runVercel(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(VERCEL, args, {
      cwd: cwd || ROOT,
      stdio: 'pipe',
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; process.stdout.write(d); });
    proc.stderr.on('data', d => { stderr += d; process.stderr.write(d); });
    proc.on('close', code => {
      if (code === 0) resolve({ ok: true, stdout, stderr });
      else resolve({ ok: false, code, stdout, stderr }); // Don't reject, just report
    });
  });
}

async function main() {
  console.log('═══ Deploy 32 Flagships to Vercel ═══\n');

  const results = [];

  for (const f of FLAGSHIPS) {
    const result = {
      id: f.id,
      unicode: f.unicode,
      punycode: f.punycode,
      project: f.projectName,
      deploy: 'pending',
      deployUrl: null,
      domain: 'pending',
      dnsInstruction: null,
      error: null,
    };

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${f.id}] ${f.unicode} → ${f.punycode}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (!fs.existsSync(path.join(f.siteDir, 'index.html'))) {
      console.log('⚠ No index.html found. Skipping.');
      result.deploy = 'no_site';
      results.push(result);
      continue;
    }

    // 1. Deploy to Vercel
    console.log(`Deploying to Vercel as ${f.projectName}...`);
    const deployRes = await runVercel([
      '--yes',
      '--name', f.projectName,
      '--prod',
      f.siteDir,
    ]);

    if (!deployRes.ok) {
      console.error(`  ❌ Deploy failed (exit ${deployRes.code})`);
      result.deploy = 'failed';
      result.error = deployRes.stderr.slice(-300);
      results.push(result);
      await sleep(2000);
      continue;
    }

    // Extract deployment URL
    const urlMatch = deployRes.stdout.match(/https:\/\/[^\s\n]+\.vercel\.app/);
    result.deployUrl = urlMatch ? urlMatch[0] : `https://${f.projectName}.vercel.app`;
    console.log(`  ✓ Deployed: ${result.deployUrl}`);
    result.deploy = 'ok';

    await sleep(1500);

    // 2. Add custom domain
    console.log(`Adding custom domain ${f.punycode}...`);
    const domainRes = await runVercel([
      'domains', 'add',
      f.punycode,
      f.projectName,
    ]);

    if (domainRes.ok) {
      console.log('  ✓ Domain added.');
      result.domain = 'ok';

      // Extract DNS instruction from output
      const aRecordMatch = domainRes.stdout.match(/A\s+\S+\s+([\d.]+)/);
      if (aRecordMatch) {
        result.dnsInstruction = `A  ${f.punycode}  →  ${aRecordMatch[1]}`;
      }
    } else {
      const alreadyExists = domainRes.stderr.includes('already exists') || domainRes.stdout.includes('already exists');
      if (alreadyExists) {
        console.log('  ✓ Domain already added.');
        result.domain = 'already_added';
      } else {
        console.error(`  ⚠ Domain add issue:`, domainRes.stderr.slice(-200));
        result.domain = 'needs_manual';
      }
    }

    results.push(result);
    await sleep(2000);
  }

  // ─── Summary ───
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('                      VERCEL DEPLOYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');

  const ok = results.filter(r => r.deploy === 'ok');
  const failed = results.filter(r => r.deploy === 'failed');
  const noSite = results.filter(r => r.deploy === 'no_site');

  console.log(`\nTotal:     ${results.length}`);
  console.log(`Deployed:  ${ok.length}`);
  console.log(`Failed:    ${failed.length}`);
  console.log(`No site:   ${noSite.length}`);

  if (failed.length > 0) {
    console.log('\n─── Failures ───');
    failed.forEach(r => console.log(`  - ${r.id}: ${r.error}`));
  }

  // Live URLs
  console.log('\n─── Live Vercel URLs ───');
  ok.forEach(r => console.log(`  https://${r.project}.vercel.app  →  ${r.unicode}`));

  // DNS instructions
  console.log('\n─── DNS A Records to Add ───');
  console.log('Add these A records at your DNS provider (Cloudflare dashboard or GoDaddy):\n');
  for (const r of ok) {
    const dns = r.dnsInstruction || `A  ${r.punycode}  →  76.76.21.21`;
    console.log(`  ${dns}`);
  }

  // Save report
  fs.writeFileSync(
    path.join(ROOT, 'vercel-deploy-report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log(`\nFull report saved to: vercel-deploy-report.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
