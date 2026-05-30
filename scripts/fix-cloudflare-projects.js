#!/usr/bin/env node
/**
 * Fix 10 existing Cloudflare Pages projects by deleting broken Git-sourced
 * projects and recreating them as direct-upload with actual content.
 */

const { spawn } = require('child_process');
const { domainToASCII } = require('url');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 1500;

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;

if (!ACCOUNT_ID || !TOKEN) {
  console.error('Error: Set CF_ACCOUNT_ID and CF_API_TOKEN');
  process.exit(1);
}

// The 10 existing broken projects + their punycodes from the database
const PROJECTS = [
  { id: 'ker',         unicode: 'Kēr' },
  { id: 'nike',        unicode: 'Níkē' },
  { id: 'medousa',     unicode: 'Médousa' },
  { id: 'atlas',       unicode: 'Átlas' },
  { id: 'prometheus',  unicode: 'Promētheus' },
  { id: 'persephone',  unicode: 'Persephonē' },
  { id: 'hekate',      unicode: 'Hekátē' },
  { id: 'hades',       unicode: 'Hádēs' },
  { id: 'hestia',      unicode: 'Hestía' },
  { id: 'hephaistos',  unicode: 'Hēphaistos' },
];

for (const p of PROJECTS) {
  p.punycode = domainToASCII(`${p.unicode}.com`);
  p.siteDir = path.join(ROOT, 'sites', p.id);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function cfFetch(apiPath, opts = {}) {
  const resp = await fetch(`${CF_API_BASE}${apiPath}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

async function deleteProject(name) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${name}`, { method: 'DELETE' });
}

async function createProject(name) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      production_branch: 'main',
    }),
  });
}

async function bindDomain(projectName, domain) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
}

function wranglerDeploy(siteDir, projectName) {
  return new Promise((resolve, reject) => {
    const args = [
      'pages', 'deploy', siteDir,
      '--project-name', projectName,
      '--branch', 'main',
      '--commit-dirty', 'true',
    ];
    const proc = spawn('wrangler', args, {
      cwd: ROOT,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: TOKEN },
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; process.stdout.write(d); });
    proc.stderr.on('data', d => { stderr += d; process.stderr.write(d); });
    proc.on('close', code => {
      if (code === 0) resolve({ ok: true, stdout, stderr });
      else reject(new Error(`wrangler exited ${code}. stderr: ${stderr.slice(-500)}`));
    });
  });
}

async function main() {
  console.log('═══ Fix 10 Cloudflare Pages Projects ═══\n');

  const results = [];

  for (const p of PROJECTS) {
    const result = { id: p.id, punycode: p.punycode, status: 'pending', error: null };
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${p.id}] ${p.unicode} → ${p.punycode}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // 1. Delete existing project
    console.log('Deleting broken Git project...');
    const delRes = await deleteProject(p.id);
    if (delRes.ok) {
      console.log('  ✓ Deleted.');
    } else {
      console.log(`  ⚠ Delete response:`, JSON.stringify(delRes.data).slice(0, 200));
    }

    await sleep(1000);

    // 2. Recreate as direct-upload
    console.log('Recreating as direct-upload project...');
    const createRes = await createProject(p.id);
    if (createRes.ok) {
      const subdomain = createRes.data.result?.subdomain || `${p.id}.pages.dev`;
      result.subdomain = subdomain;
      console.log(`  ✓ Created. Subdomain: ${subdomain}`);
    } else {
      console.error(`  ❌ Failed to create:`, JSON.stringify(createRes.data));
      result.status = 'failed_create';
      result.error = createRes.data;
      results.push(result);
      continue;
    }

    await sleep(1000);

    // 3. Deploy content
    console.log(`Deploying from sites/${p.id}...`);
    try {
      await wranglerDeploy(p.siteDir, p.id);
      console.log('  ✓ Deployed.');
    } catch (e) {
      console.error(`  ❌ Deploy failed:`, e.message);
      result.status = 'failed_deploy';
      result.error = e.message;
      results.push(result);
      continue;
    }

    await sleep(1000);

    // 4. Re-bind custom domain
    console.log(`Binding domain ${p.punycode}...`);
    const bindRes = await bindDomain(p.id, p.punycode);
    if (bindRes.ok) {
      console.log('  ✓ Domain bound.');
      result.status = 'ok';
    } else {
      const alreadyExists = bindRes.data?.errors?.some?.(
        e => e.message?.includes('already exists') || e.code === 8000017
      );
      if (alreadyExists) {
        console.log('  ✓ Already bound.');
        result.status = 'ok';
      } else {
        console.error(`  ⚠ Bind issue:`, JSON.stringify(bindRes.data));
        result.status = 'needs_dns';
        result.error = bindRes.data;
      }
    }

    results.push(result);
    await sleep(DELAY_MS);
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');

  const ok = results.filter(r => r.status === 'ok');
  const failed = results.filter(r => r.status.startsWith('failed'));
  const needsDns = results.filter(r => r.status === 'needs_dns');

  console.log(`Fixed:      ${ok.length}`);
  console.log(`Failed:     ${failed.length}`);
  console.log(`Needs DNS:  ${needsDns.length}`);

  if (failed.length > 0) {
    console.log('\n─── Failures ───');
    failed.forEach(r => console.log(`  - ${r.id}: ${r.status}`));
  }

  console.log('\n─── DNS Records to Create/Update (Cloudflare Dashboard) ───');
  console.log('Your API token lacks Zone:Edit. Add these CNAME records manually:\n');
  for (const r of results) {
    if (r.status === 'ok' || r.status === 'needs_dns') {
      const target = r.subdomain || `${r.id}.pages.dev`;
      console.log(`  ${r.punycode.padEnd(25)} → ${target}  (unproxied / gray cloud)`);
    }
  }

  // Save report
  const fs = require('fs');
  fs.writeFileSync(
    path.join(ROOT, 'fix-cloudflare-report.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
