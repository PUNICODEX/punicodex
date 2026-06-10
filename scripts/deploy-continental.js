const { spawn } = require('child_process');
const { domainToASCII } = require('url');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const VERCEL = 'vercel';

const SITES = [
  { id: 'libye', unicode: 'Libye' },
  { id: 'aigyptos', unicode: 'Aígyptos' },
  { id: 'asia', unicode: 'Asía' },
  { id: 'europe', unicode: 'Eurṓpē' },
];

for (const s of SITES) {
  s.punycode = domainToASCII(`${s.unicode}.com`);
  s.siteDir = path.join(ROOT, 'sites', s.id);
  s.projectName = `punycodex-${s.id}`;
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
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

async function main() {
  console.log('--- Deploy 4 Continental Temples to Vercel ---\n');
  const results = [];

  for (const s of SITES) {
    const result = {
      id: s.id,
      unicode: s.unicode,
      punycode: s.punycode,
      project: s.projectName,
      deploy: 'pending',
      deployUrl: null,
      domain: 'pending',
      dnsInstruction: null,
      error: null,
    };

    console.log(`\n?????????????????????????????????????????????????`);
    console.log(`[${s.id}] ${s.unicode} ? ${s.punycode}`);
    console.log(`?????????????????????????????????????????????????`);

    if (!fs.existsSync(path.join(s.siteDir, 'index.html'))) {
      console.log('? No index.html found. Skipping.');
      result.deploy = 'no_site';
      results.push(result);
      continue;
    }

    // 1. Deploy to Vercel
    console.log(`Deploying to Vercel as ${s.projectName}...`);
    const deployRes = await runVercel([
      '--yes',
      '--name', s.projectName,
      '--prod',
      s.siteDir,
    ]);

    if (!deployRes.ok) {
      console.error(`  ? Deploy failed (exit ${deployRes.code})`);
      result.deploy = 'failed';
      result.error = deployRes.stderr.slice(-300);
      results.push(result);
      await sleep(2000);
      continue;
    }

    const urlMatch = deployRes.stdout.match(/https:\/\/[^\s\n]+\.vercel\.app/);
    result.deployUrl = urlMatch ? urlMatch[0] : `https://${s.projectName}.vercel.app`;
    console.log(`  ? Deployed: ${result.deployUrl}`);
    result.deploy = 'ok';

    await sleep(1500);

    // 2. Add custom domain
    console.log(`Adding custom domain ${s.punycode}...`);
    const domainRes = await runVercel([
      'domains', 'add',
      s.punycode,
      s.projectName,
    ]);

    if (domainRes.ok) {
      console.log('  ? Domain added.');
      result.domain = 'ok';
      const aRecordMatch = domainRes.stdout.match(/A\s+\S+\s+([\d.]+)/);
      if (aRecordMatch) {
        result.dnsInstruction = `A  ${s.punycode}  ?  ${aRecordMatch[1]}`;
      }
    } else {
      const alreadyExists = domainRes.stderr.includes('already exists') || domainRes.stdout.includes('already exists');
      if (alreadyExists) {
        console.log('  ? Domain already added.');
        result.domain = 'already_added';
      } else {
        console.log(`  ? Domain add issue: ${domainRes.stderr.slice(-200)}`);
        result.domain = 'warning';
      }
    }

    results.push(result);
    await sleep(2000);
  }

  // Summary
  console.log('\n\n---------------------------------------------------');
  console.log('DEPLOYMENT SUMMARY');
  console.log('---------------------------------------------------');
  for (const r of results) {
    const deployStatus = r.deploy === 'ok' ? '?' : (r.deploy === 'failed' ? '?' : '?');
    const domainStatus = r.domain === 'ok' ? '?' : (r.domain === 'failed' ? '?' : '?');
    console.log(`${deployStatus} ${r.id} | deploy: ${r.deploy} | domain: ${r.domain}`);
    if (r.deployUrl) console.log(`   URL: ${r.deployUrl}`);
    if (r.dnsInstruction) console.log(`   DNS: ${r.dnsInstruction}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  }

  // Write DNS instructions
  const dnsFile = path.join(ROOT, 'scripts', 'continental-dns-instructions.txt');
  let dnsOut = 'DNS INSTRUCTIONS for Cloudflare\n';
  dnsOut += '=================================\n\n';
  dnsOut += 'For each domain, create an A record pointing to Vercel:\n\n';
  for (const r of results) {
    if (r.deploy === 'ok') {
      dnsOut += `${r.unicode} (${r.punycode})\n`;
      dnsOut += `  A  ${r.punycode}  ?  76.76.21.21\n\n`;
    }
  }
  fs.writeFileSync(dnsFile, dnsOut);
  console.log(`\nDNS instructions written to: ${dnsFile}`);
}

main().catch(console.error);
