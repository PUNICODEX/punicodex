#!/usr/bin/env node
/**
 * Deploy all 43 PUNICODEX flagship temples to Cloudflare Pages
 * and bind their primary custom domains.
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx node scripts/deploy-cloudflare-pages.js
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 600; // Stay well under rate limits

const PROJECTS = [
  { id: 'zeus',        domain: 'zeús.com',        branch: 'master' },
  { id: 'athena',      domain: 'athēnē.com',      branch: 'master' },
  { id: 'poseidon',    domain: 'poseidôn.com',    branch: 'master' },
  { id: 'apollon',     domain: 'apollōn.com',     branch: 'master' },
  { id: 'ares',        domain: 'árēs.com',        branch: 'master' },
  { id: 'artemis',     domain: 'ártemis.com',     branch: 'master' },
  { id: 'aphrodite',   domain: 'aphrodītē.com',   branch: 'master' },
  { id: 'demeter',     domain: 'dēmētēr.com',     branch: 'master' },
  { id: 'hermes',      domain: 'hermês.com',      branch: 'master' },
  { id: 'hera',        domain: 'hēra.com',        branch: 'master' },
  { id: 'hephaistos',  domain: 'hēphaistos.com',  branch: 'master' },
  { id: 'hestia',      domain: 'hestía.com',      branch: 'master' },
  { id: 'hades',       domain: 'hádēs.com',       branch: 'master' },
  { id: 'hekate',      domain: 'hekátē.com',      branch: 'master' },
  { id: 'persephone',  domain: 'persephonē.com',  branch: 'master' },
  { id: 'prometheus',  domain: 'promētheus.com',  branch: 'master' },
  { id: 'atlas',       domain: 'átlas.com',       branch: 'master' },
  { id: 'medousa',     domain: 'médousa.com',     branch: 'master' },
  { id: 'nike',        domain: 'níkē.com',        branch: 'master' },
  { id: 'ker',         domain: 'kēr.com',         branch: 'master' },
  { id: 'selene',      domain: 'selēnē.com',      branch: 'master' },
  { id: 'dionysos',    domain: 'diónysos.com',    branch: 'master' },
  { id: 'gaia',        domain: 'gaîa.com',        branch: 'master' },
  { id: 'chaos',       domain: 'cháos.com',       branch: 'master' },
  { id: 'tartaros',    domain: 'tártaros.com',    branch: 'master' },
  { id: 'pontos',      domain: 'póntos.com',      branch: 'master' },
  { id: 'delphoi',     domain: 'delphoí.com',     branch: 'master' },
  { id: 'olympos',     domain: 'ólympos.com',     branch: 'master' },
  { id: 'sparte',      domain: 'spártē.com',      branch: 'master' },
  { id: 'helios',      domain: 'hēlios.com',      branch: 'master' },
  { id: 'alfheimr',    domain: 'álfheimr.com',    branch: 'master' },
  { id: 'jotunheimr',  domain: 'jötunheimr.com',  branch: 'master' },
  { id: 'midgardr',    domain: 'miðgarðr.com',    branch: 'master' },
  { id: 'helheimr',    domain: 'helheimr.com',    branch: 'master' },
  { id: 'ragnarok',    domain: 'ragnarǫk.com',    branch: 'master' },
  { id: 'odinn',       domain: 'óðinn.com',       branch: 'master' },
  { id: 'thor',        domain: 'þórr.com',        branch: 'master' },
  { id: 'ra',          domain: 'rꜥ.com',          branch: 'master' },
  { id: 'shiva',       domain: 'śiva.com',        branch: 'master' },
  { id: 'kyoto',       domain: 'kyōto.com',       branch: 'master' },
  { id: 'osaka',       domain: 'ōsaka.com',       branch: 'master' },
  { id: 'kobe',        domain: 'kōbe.com',        branch: 'master' },
  { id: 'athenai',     domain: 'athēnai.com',     branch: 'main'   },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cfFetch(path, opts = {}, token) {
  const url = `${CF_API_BASE}${path}`;
  const resp = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

async function createProject(accountId, token, { id, branch }) {
  const body = {
    name: id,
    production_branch: branch,
    source: {
      type: 'github',
      config: {
        owner: 'PUNICODEX',
        repo_name: id,
        production_branch: branch,
        pr_comments_enabled: true,
        deployments_enabled: true,
      },
    },
  };

  return cfFetch(`/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

async function bindDomain(accountId, token, projectName, domain) {
  return cfFetch(`/accounts/${accountId}/pages/projects/${projectName}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  }, token);
}

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  if (!accountId || !token) {
    console.error('Error: Set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.');
    process.exit(1);
  }

  const results = [];

  for (const proj of PROJECTS) {
    console.log(`\n[${proj.id}] Creating project...`);
    const projectRes = await createProject(accountId, token, proj);

    if (!projectRes.ok) {
      const alreadyExists = projectRes.data?.errors?.some?.(
        (e) => e.message?.includes?.('already exists') || e.code === 8000014
      );
      if (alreadyExists) {
        console.log(`  Project already exists, skipping creation.`);
      } else {
        console.error(`  FAILED to create project:`, JSON.stringify(projectRes.data));
        results.push({ id: proj.id, project: 'failed', domain: 'skipped', errors: projectRes.data });
        await sleep(DELAY_MS);
        continue;
      }
    } else {
      console.log(`  Project created.`);
    }

    await sleep(DELAY_MS);

    console.log(`  Binding domain ${proj.domain}...`);
    const domainRes = await bindDomain(accountId, token, proj.id, proj.domain);

    if (domainRes.ok) {
      console.log(`  Domain bound successfully.`);
      results.push({ id: proj.id, project: 'ok', domain: 'bound' });
    } else {
      const needsVerify = domainRes.data?.errors?.some?.(
        (e) => e.message?.includes?.('verify') || e.message?.includes?.('DNS')
      );
      if (needsVerify) {
        console.log(`  Domain needs manual DNS verification.`);
        results.push({ id: proj.id, project: 'ok', domain: 'needs_dns' });
      } else {
        console.error(`  FAILED to bind domain:`, JSON.stringify(domainRes.data));
        results.push({ id: proj.id, project: 'ok', domain: 'failed', errors: domainRes.data });
      }
    }

    await sleep(DELAY_MS);
  }

  console.log('\n========== SUMMARY ==========');
  const bound = results.filter((r) => r.domain === 'bound').length;
  const needsDns = results.filter((r) => r.domain === 'needs_dns').length;
  const failed = results.filter((r) => r.project === 'failed' || r.domain === 'failed').length;
  console.log(`Bound:      ${bound}`);
  console.log(`Needs DNS:  ${needsDns}`);
  console.log(`Failed:     ${failed}`);

  if (needsDns > 0) {
    console.log('\nDomains requiring manual DNS verification:');
    results.filter((r) => r.domain === 'needs_dns').forEach((r) => {
      console.log(`  - ${PROJECTS.find((p) => p.id === r.id).domain}`);
    });
  }

  if (failed > 0) {
    console.log('\nFailures:');
    results.filter((r) => r.project === 'failed' || r.domain === 'failed').forEach((r) => {
      console.log(`  - ${r.id}:`, JSON.stringify(r.errors));
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
