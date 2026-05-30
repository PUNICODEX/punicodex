#!/usr/bin/env node
/**
 * PUNYCODEX — Deploy 43 Flagship Temples to Cloudflare Pages (Direct Upload)
 *
 * Corrects the previous broken approach by uploading local site folders
 * directly instead of expecting non-existent Git repos.
 *
 * Prerequisites:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. Set CF_ACCOUNT_ID and CF_API_TOKEN environment variables
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx node scripts/deploy-flagships.js
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx node scripts/deploy-flagships.js --dry-run
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx node scripts/deploy-flagships.js zeus athena
 */

const { spawn } = require('child_process');
const { domainToASCII } = require('url');
const path = require('path');
const fs = require('fs');

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 1200; // Stay under rate limits

const ROOT = path.join(__dirname, '..');

// ─── Load 42 flagships from database with correct punycodes ───
// Skips helheimr (plain ASCII, user request) and punycodex (not a flagship)
function loadFlagships() {
  const dbPath = path.join(ROOT, 'platform', 'db', 'punycodex.db');
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);

  const ids = [
    'zeus','athena','poseidon','apollon','ares','artemis','aphrodite','demeter',
    'hermes','hera','hephaistos','hestia','hades','hekate','persephone','prometheus',
    'atlas','medousa','nike','ker','selene','dionysos','gaia','chaos','tartaros',
    'pontos','delphoi','olympos','sparte','helios','alfheimr','jotunheimr','midgardr',
    'ragnarok','odinn','thor','ra','shiva','kyoto','osaka','kobe','athenai'
  ];

  const flagships = [];
  for (const id of ids) {
    const row = db.prepare('SELECT unicode, ascii FROM entries WHERE id = ?').get(id);
    const unicode = row ? row.unicode : id;
    const punycode = domainToASCII(`${unicode}.com`);
    const siteDir = path.join(ROOT, 'sites', id);
    const hasSite = fs.existsSync(path.join(siteDir, 'index.html'));
    flagships.push({ id, unicode, punycode, hasSite, siteDir });
  }
  db.close();
  return flagships;
}

// ─── CLI args ───
const isDryRun = process.argv.includes('--dry-run');
const filterIds = process.argv.slice(2).filter(a => !a.startsWith('--'));

// ─── Auth ───
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const TOKEN = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !TOKEN) {
  console.error('Error: Set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.');
  console.error('');
  console.error('  1. Go to https://dash.cloudflare.com/profile/api-tokens');
  console.error('  2. Create a Custom Token with these permissions:');
  console.error('     - Cloudflare Pages:Edit');
  console.error('     - Zone:Edit');
  console.error('     - Zone:Read');
  console.error('  3. Set environment variables:');
  console.error('     $env:CF_ACCOUNT_ID="your-account-id"');
  console.error('     $env:CF_API_TOKEN="your-api-token"');
  console.error('');
  console.error('  Or use wrangler login instead of an API token:');
  console.error('     wrangler login');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function cfFetch(apiPath, opts = {}) {
  const url = `${CF_API_BASE}${apiPath}`;
  const resp = await fetch(url, {
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

// ─── Pages Projects ───
async function listProjects() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects?page=${page}&per_page=50`);
    if (!res.ok || !res.data.result?.length) break;
    all.push(...res.data.result);
    if (res.data.result.length < 50) break;
    page++;
  }
  return all;
}

async function createProject(name) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      production_branch: 'main',
      // Intentionally omitting "source" — creates a direct-upload project
    }),
  });
}

async function deleteProject(name) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${name}`, {
    method: 'DELETE',
  });
}

// ─── Domain Binding ───
async function bindDomain(projectName, domain) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
}

async function listDomains(projectName) {
  const res = await cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains`);
  return res.ok ? (res.data.result || []) : [];
}

async function deleteDomain(projectName, domain) {
  return cfFetch(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains/${domain}`, {
    method: 'DELETE',
  });
}

// ─── DNS ───
async function getZoneId(domain, unicodeFallback) {
  // Try punycode first
  let resp = await fetch(`${CF_API_BASE}/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  let data = await resp.json();
  if (data.result?.[0]?.id) return data.result[0].id;

  // Some zones were created with old wrong punycode — try Unicode fallback
  if (unicodeFallback) {
    resp = await fetch(`${CF_API_BASE}/zones?name=${encodeURIComponent(unicodeFallback)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    data = await resp.json();
    if (data.result?.[0]?.id) return data.result[0].id;
  }

  return null;
}

async function listDnsRecords(zoneId) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records?type=CNAME`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await resp.json();
  return data.result || [];
}

async function createDnsRecord(zoneId, domain, target) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: domain,
      content: target,
      ttl: 1, // auto
      proxied: false, // GRAY CLOUD — unproxied for SSL validation
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

async function updateDnsRecord(zoneId, recordId, domain, target) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: domain,
      content: target,
      ttl: 1,
      proxied: false,
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

// ─── Wrangler Upload ───
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
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: TOKEN, // Ensure wrangler uses our token
      },
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

// ─── Verify Domain ───
async function verifyDomain(domain) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Main ───
async function main() {
  console.log('═══ PUNYCODEX Flagship Deployment ═══');
  console.log(isDryRun ? '\n[DRY RUN] No changes will be made.\n' : '\n');

  // Load flagships
  let flagships = loadFlagships();
  if (filterIds.length > 0) {
    flagships = flagships.filter(f => filterIds.includes(f.id));
  }

  console.log(`Loaded ${flagships.length} flagships from database.`);
  const missingSites = flagships.filter(f => !f.hasSite);
  if (missingSites.length > 0) {
    console.warn('\n⚠ Missing site folders (no index.html):');
    missingSites.forEach(f => console.warn(`  - ${f.id}`));
  }
  console.log('');

  // Verify API token is valid
  console.log('Verifying API token...');
  const tokenCheck = await cfFetch('/user/tokens/verify');
  if (!tokenCheck.ok || !tokenCheck.data.result?.status === 'active') {
    console.error('\n❌ API token is invalid or expired.');
    console.error('   Check your CF_API_TOKEN and CF_ACCOUNT_ID.');
    process.exit(1);
  }
  console.log('✓ API token valid.\n');

  // Verify wrangler is installed
  try {
    const wranglerCheck = spawn('wrangler', ['--version'], { shell: true });
    let ver = '';
    wranglerCheck.stdout.on('data', d => ver += d);
    await new Promise(r => wranglerCheck.on('close', r));
    console.log(`✓ Wrangler ${ver.trim()}\n`);
  } catch (e) {
    console.error('\n❌ Wrangler not found. Install it:');
    console.error('   npm install -g wrangler');
    process.exit(1);
  }

  // Fetch existing projects
  console.log('Fetching existing Cloudflare Pages projects...');
  const existingProjects = await listProjects();
  const existingMap = new Map(existingProjects.map(p => [p.name, p]));
  console.log(`Found ${existingProjects.length} existing projects.\n`);

  const results = [];

  for (const f of flagships) {
    const result = {
      id: f.id,
      unicode: f.unicode,
      punycode: f.punycode,
      project: 'skipped',
      deploy: 'skipped',
      domain: 'skipped',
      dns: 'skipped',
      verify: 'skipped',
    };

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${f.id}] ${f.unicode} → ${f.punycode}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (!f.hasSite) {
      console.log('⚠ No site folder found. Skipping.');
      results.push(result);
      continue;
    }

    // ─── 1. Ensure project exists ───
    const existing = existingMap.get(f.id);
    if (existing) {
      const hasGitSource = existing.source && existing.source.type === 'github';
      if (hasGitSource) {
        console.log('Project exists with Git source. Deleting + recreating as direct-upload...');
        if (!isDryRun) {
          const delRes = await deleteProject(f.id);
          if (!delRes.ok) {
            console.log(`  Delete warning:`, JSON.stringify(delRes.data));
          }
          await sleep(500);
          const createRes = await createProject(f.id);
          if (!createRes.ok) {
            console.error(`  ❌ Failed to recreate project:`, JSON.stringify(createRes.data));
            result.project = 'failed';
            results.push(result);
            continue;
          }
          console.log('  ✓ Recreated as direct-upload project.');
          result.project = 'recreated';
        } else {
          console.log('  [DRY RUN] Would delete + recreate.');
          result.project = 'dry_recreate';
        }
      } else {
        console.log('✓ Project exists (direct-upload).');
        result.project = 'exists';
      }
    } else {
      console.log('Creating project...');
      if (!isDryRun) {
        const createRes = await createProject(f.id);
        if (!createRes.ok) {
          console.error(`  ❌ Failed:`, JSON.stringify(createRes.data));
          result.project = 'failed';
          results.push(result);
          continue;
        }
        console.log('  ✓ Created.');
        result.project = 'created';
      } else {
        console.log('  [DRY RUN] Would create project.');
        result.project = 'dry_created';
      }
    }

    // ─── 2. Deploy content ───
    console.log(`Deploying from ${path.relative(ROOT, f.siteDir)}...`);
    if (!isDryRun) {
      try {
        await wranglerDeploy(f.siteDir, f.id);
        console.log('  ✓ Deployed.');
        result.deploy = 'ok';
      } catch (e) {
        console.error(`  ❌ Deploy failed:`, e.message);
        result.deploy = 'failed';
        results.push(result);
        continue;
      }
    } else {
      console.log('  [DRY RUN] Would deploy via wrangler.');
      result.deploy = 'dry';
    }

    await sleep(DELAY_MS);

    // ─── 3. Bind custom domain ───
    console.log(`Binding domain ${f.punycode}...`);
    if (!isDryRun) {
      // Check if already bound
      const boundDomains = await listDomains(f.id);
      const alreadyBound = boundDomains.some(d => d.name === f.punycode);
      if (alreadyBound) {
        console.log('  ✓ Already bound.');
        result.domain = 'already_bound';
      } else {
        const bindRes = await bindDomain(f.id, f.punycode);
        if (bindRes.ok) {
          console.log('  ✓ Bound successfully.');
          result.domain = 'bound';
        } else {
          const errCode = bindRes.data?.errors?.[0]?.code;
          const errMsg = bindRes.data?.errors?.[0]?.message || '';
          if (errCode === 8000017 || errMsg.includes('already exists')) {
            console.log('  ✓ Already bound.');
            result.domain = 'already_bound';
          } else {
            console.error(`  ⚠ Bind issue:`, JSON.stringify(bindRes.data));
            result.domain = 'needs_dns';
          }
        }
      }
    } else {
      console.log('  [DRY RUN] Would bind domain.');
      result.domain = 'dry';
    }

    await sleep(DELAY_MS);

    // ─── 4. DNS record ───
    console.log(`Checking DNS...`);
    if (!isDryRun) {
      const zoneId = await getZoneId(f.punycode, `${f.unicode}.com`);
      if (zoneId) {
        const records = await listDnsRecords(zoneId);
        const target = `${f.id}.pages.dev`;
        const existingRec = records.find(r => r.name === f.punycode && r.type === 'CNAME');
        if (existingRec) {
          if (existingRec.content === target && existingRec.proxied === false) {
            console.log('  ✓ DNS record correct (unproxied CNAME).');
            result.dns = 'ok';
          } else {
            console.log(`  Updating DNS record: ${f.punycode} → ${target} (unproxied)...`);
            const upd = await updateDnsRecord(zoneId, existingRec.id, f.punycode, target);
            if (upd.ok) {
              console.log('  ✓ Updated.');
              result.dns = 'updated';
            } else {
              console.error(`  ⚠ Update failed:`, JSON.stringify(upd.data));
              result.dns = 'failed';
            }
          }
        } else {
          console.log(`  Creating CNAME: ${f.punycode} → ${target} (unproxied)...`);
          const create = await createDnsRecord(zoneId, f.punycode, target);
          if (create.ok) {
            console.log('  ✓ Created.');
            result.dns = 'created';
          } else {
            console.error(`  ⚠ Create failed:`, JSON.stringify(create.data));
            result.dns = 'failed';
          }
        }
      } else {
        console.log(`  ⚠ No Cloudflare zone found for ${f.punycode}.`);
        console.log(`     Add this CNAME at your DNS provider (GoDaddy):`);
        console.log(`       ${f.punycode} → ${f.id}.pages.dev`);
        result.dns = 'no_zone';
      }
    } else {
      console.log('  [DRY RUN] Would check/create DNS record.');
      result.dns = 'dry';
    }

    results.push(result);
    await sleep(DELAY_MS);
  }

  // ─── Summary ───
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('                      DEPLOYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');

  const ok = results.filter(r => r.deploy === 'ok' || r.deploy === 'dry');
  const failedDeploy = results.filter(r => r.deploy === 'failed');
  const bound = results.filter(r => r.domain === 'bound' || r.domain === 'already_bound');
  const dnsOk = results.filter(r => ['ok','created','updated'].includes(r.dns));
  const noZone = results.filter(r => r.dns === 'no_zone');

  console.log(`\nTotal:          ${results.length}`);
  console.log(`Deployed:       ${ok.length}`);
  console.log(`Deploy failed:  ${failedDeploy.length}`);
  console.log(`Domain bound:   ${bound.length}`);
  console.log(`DNS OK:         ${dnsOk.length}`);
  console.log(`No Cloudflare zone (needs manual DNS): ${noZone.length}`);

  if (failedDeploy.length > 0) {
    console.log('\n─── Deploy Failures ───');
    failedDeploy.forEach(r => console.log(`  - ${r.id} (${r.punycode})`));
  }

  if (noZone.length > 0) {
    console.log('\n─── Manual DNS Required (GoDaddy) ───');
    console.log('Add these CNAME records at GoDaddy (or change nameservers to Cloudflare):');
    noZone.forEach(r => {
      console.log(`  ${r.punycode.padEnd(28)} → ${r.id}.pages.dev`);
    });
  }

  // Save full results
  const reportPath = path.join(ROOT, 'deploy-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: isDryRun,
    results,
  }, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
