// Migrate domains from individual projects to punycodex-main
// Run from project root (linked to punycodex-main)

const { execSync } = require('child_process');

// Domains confirmed to be on individual projects (from audit)
const migrations = [
  // punycodex-* individual projects
  { domain: 'xn--eurp-eva0406b.com', project: 'punycodex-europe' },
  { domain: 'xn--agyptos-7ya.com', project: 'punycodex-aigyptos' },
  { domain: 'xn--liby-eva.com', project: 'punycodex-libye' },
  { domain: 'xn--athn-dpa9l.com', project: 'punycodex-athena' },
  { domain: 'xn--herms-lza.com', project: 'punycodex-hermes' },
  { domain: 'xn--aphrodt-27a8s.com', project: 'punycodex-aphrodite' },
  { domain: 'xn--apolln-fgb.com', project: 'punycodex-apollon' },
  { domain: 'xn--athnai-r3a.com', project: 'punycodex-athenai' },
  { domain: 'xn--kbe-qxa.com', project: 'punycodex-kobe' },
  { domain: 'xn--saka-k3a.com', project: 'punycodex-osaka' },
  { domain: 'xn--kyto-m3a.com', project: 'punycodex-kyoto' },
  { domain: 'xn--r-2w3e.com', project: 'punycodex-ra' },
  { domain: 'xn--rr-4ja7b.com', project: 'punycodex-thor' },
  { domain: 'xn--lympos-9wa.com', project: 'punycodex-olympos' },
  { domain: 'xn--delpho-8va.com', project: 'punycodex-delphoi' },
  { domain: 'xn--pntos-0ta.com', project: 'punycodex-pontos' },
  { domain: 'xn--trtaros-hwa.com', project: 'punycodex-tartaros' },
  { domain: 'xn--hra-3qa.com', project: 'punycodex-hera' },
  // standalone projects
  { domain: 'xn--hesta-2sa.com', project: 'hestia' },
  { domain: 'xn--s-2w3e.com', project: 'sia' },
  { domain: 'xn--m-2w3e.com', project: 'maa' },
  { domain: 'xn--b-xw3e.com', project: 'ab' },
  { domain: 'xn--9gg9559c.com', project: 'akh' },
  { domain: 'xn--w-4ma.com', project: 'shu' },
  // domains that got errors in audit — verify and migrate
  { domain: 'xn--inn-2mao.com', project: 'punycodex-odinn' },
  { domain: 'xn--ragnark-fnc.com', project: 'punycodex-ragnarok' },
  { domain: 'xn--migarr-qwad.com', project: 'punycodex-midgardr' },
  { domain: 'xn--jtunheimr-07a.com', project: 'punycodex-jotunheimr' },
  { domain: 'xn--lfheimr-gwa.com', project: 'punycodex-alfheimr' },
  { domain: 'xn--hlios-iza.com', project: 'punycodex-helios' },
  { domain: 'xn--sprt-6na61a.com', project: 'punycodex-sparte' },
  { domain: 'xn--chos-6na.com', project: 'punycodex-chaos' },
  { domain: 'xn--gaa-wma.com', project: 'punycodex-gaia' },
  { domain: 'xn--dinysos-m0a.com', project: 'punycodex-dionysos' },
  { domain: 'xn--seln-dvab.com', project: 'punycodex-selene' },
  { domain: 'xn--dmtr-bvabb.com', project: 'punycodex-demeter' },
  { domain: 'xn--aphrodt-dza75a.com', project: 'punycodex-aphrodite' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function migrate() {
  const success = [];
  const failed = [];
  const skipped = [];

  for (const { domain, project } of migrations) {
    process.stdout.write(`\n[${domain}] Checking... `);
    try {
      // Check current status
      const inspectOut = execSync(`vercel --no-color domains inspect ${domain} 2>&1`, {
        encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
      });

      if (inspectOut.includes('Domain not found')) {
        process.stdout.write('not found in team. Adding to main... ');
        execSync(`vercel domains add -- "${domain}" --no-color 2>&1`, {
          encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
        });
        success.push({ domain, action: 'added' });
        process.stdout.write('OK\n');
        await sleep(3000);
        continue;
      }

      if (inspectOut.includes('punycodex-main')) {
        // Check if bare domain is on main or just www
        const lines = inspectOut.split('\n');
        let onMain = false;
        for (const line of lines) {
          if (line.includes('punycodex-main') && line.includes(domain)) {
            onMain = true;
            break;
          }
        }
        if (onMain) {
          skipped.push({ domain, reason: 'already on main' });
          process.stdout.write('ALREADY ON MAIN ✓\n');
          await sleep(2000);
          continue;
        }
      }

      // Domain is on wrong project — migrate
      process.stdout.write(`on ${project}. Removing... `);
      execSync(`vercel domains rm "${domain}" --yes --no-color 2>&1`, {
        encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
      });
      process.stdout.write('removed. Waiting... ');
      await sleep(4000);

      process.stdout.write('Adding to main... ');
      execSync(`vercel domains add -- "${domain}" --no-color 2>&1`, {
        encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
      });
      success.push({ domain, action: 'migrated' });
      process.stdout.write('OK\n');
      await sleep(3000);

    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already assigned')) {
        process.stdout.write('STILL ASSIGNED elsewhere. Will retry on next run.\n');
        failed.push({ domain, error: 'still assigned' });
      } else {
        process.stdout.write(`FAILED: ${msg.substring(0, 120)}\n`);
        failed.push({ domain, error: msg.substring(0, 120) });
      }
      await sleep(3000);
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Success: ${success.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (success.length) {
    console.log('\nMigrated:');
    success.forEach(s => console.log(`  ✓ ${s.domain} (${s.action})`));
  }
  if (skipped.length) {
    console.log('\nAlready on main:');
    skipped.forEach(s => console.log(`  ✓ ${s.domain}`));
  }
  if (failed.length) {
    console.log('\nFailed — retry manually:');
    failed.forEach(f => console.log(`  ✗ ${f.domain} — ${f.error}`));
  }
}

migrate().catch(console.error);
