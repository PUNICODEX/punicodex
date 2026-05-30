#!/usr/bin/env node
/**
 * Deploy all 40 modified temples to their respective platforms.
 * 10 Cloudflare Pages + 30 Vercel, with concurrency limit.
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONCURRENCY = 5;

// Cloudflare auth (from project context)
// CLOUDFLARE_API_TOKEN must be set in environment
// CLOUDFLARE_ACCOUNT_ID must be set in environment

// Cloudflare Pages projects (project name = id)
const CF_PROJECTS = [
  'ker', 'nike', 'medousa', 'atlas', 'prometheus',
  'persephone', 'hekate', 'hades', 'hestia', 'hephaistos',
];

// Vercel projects (project name = punycodex-{id})
const VERCEL_PROJECTS = [
  'zeus', 'athena', 'poseidon', 'apollon', 'ares',
  'artemis', 'aphrodite', 'demeter', 'hermes', 'hera',
  'selene', 'dionysos', 'gaia', 'chaos', 'tartaros',
  'pontos', 'delphoi', 'olympos', 'sparte', 'helios',
  'alfheimr', 'jotunheimr', 'midgardr', 'ragnarok', 'odinn',
  'ra', 'kyoto', 'osaka', 'kobe', 'athenai', 'thor',
];

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: cwd || ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => {
      if (code !== 0) reject(new Error(err || out || `exit ${code}`));
      else resolve(out.trim());
    });
  });
}

async function deployCF(id) {
  const siteDir = path.join(ROOT, 'sites', id);
  try {
    const out = await run('npx', [
      'wrangler', 'pages', 'deploy', siteDir,
      `--project-name=${id}`,
      '--branch=main',
    ]);
    console.log(`✅ Cloudflare ${id}: deployed`);
    return { ok: true, id, platform: 'CF' };
  } catch (e) {
    console.error(`❌ Cloudflare ${id}: ${e.message.split('\n')[0]}`);
    return { ok: false, id, platform: 'CF', error: e.message };
  }
}

async function deployVercel(id) {
  const siteDir = path.join(ROOT, 'sites', id);
  try {
    const out = await run('vercel', [
      '--cwd', siteDir,
      '--prod',
      '--yes',
    ]);
    const url = out.match(/https:\/\/[^\s]+/)?.[0] || '';
    console.log(`✅ Vercel ${id}: deployed ${url}`);
    return { ok: true, id, platform: 'Vercel', url };
  } catch (e) {
    console.error(`❌ Vercel ${id}: ${e.message.split('\n')[0]}`);
    return { ok: false, id, platform: 'Vercel', error: e.message };
  }
}

async function batch(tasks, limit) {
  const results = [];
  const executing = [];
  for (const [i, task] of tasks.entries()) {
    const p = task().then(r => { executing.splice(executing.indexOf(p), 1); return r; });
    results.push(p);
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

(async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEPLOYING 40 MODIFIED TEMPLES`);
  console.log(`Cloudflare: ${CF_PROJECTS.length} | Vercel: ${VERCEL_PROJECTS.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`${'='.repeat(60)}\n`);

  const start = Date.now();

  // Deploy Cloudflare
  console.log('--- Cloudflare Pages ---');
  const cfResults = await batch(CF_PROJECTS.map(id => () => deployCF(id)), CONCURRENCY);

  // Deploy Vercel
  console.log('\n--- Vercel ---');
  const vcResults = await batch(VERCEL_PROJECTS.map(id => () => deployVercel(id)), CONCURRENCY);

  const all = [...cfResults, ...vcResults];
  const ok = all.filter(r => r.ok);
  const fail = all.filter(r => !r.ok);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE: ${ok.length}/${all.length} succeeded in ${elapsed}s`);
  if (fail.length) {
    console.log(`FAILED: ${fail.length}`);
    for (const f of fail) console.log(`  - ${f.platform} ${f.id}: ${f.error.split('\n')[0]}`);
  }
  console.log(`${'='.repeat(60)}\n`);
})();
