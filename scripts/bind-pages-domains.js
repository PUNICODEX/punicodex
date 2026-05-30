#!/usr/bin/env node
/**
 * Bind custom domains (Punycode) to existing Cloudflare Pages projects.
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx node scripts/bind-pages-domains.js
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 600;

const PROJECTS = [
  { id: 'zeus',        domain: 'xn--zes-9na.com' },
  { id: 'athena',      domain: 'xn--athn-dvab.com' },
  { id: 'poseidon',    domain: 'xn--poseidn-y0a.com' },
  { id: 'apollon',     domain: 'xn--apolln-fgb.com' },
  { id: 'ares',        domain: 'xn--rs-lia5r.com' },
  { id: 'artemis',     domain: 'xn--rtemis-ota.com' },
  { id: 'aphrodite',   domain: 'xn--aphrodt-27a8s.com' },
  { id: 'demeter',     domain: 'xn--dmtr-bvabb.com' },
  { id: 'hermes',      domain: 'xn--herms-ksa.com' },
  { id: 'hera',        domain: 'xn--hra-3qa.com' },
  { id: 'hephaistos',  domain: 'xn--hphaistos-bhb.com' },
  { id: 'hestia',      domain: 'xn--hesta-2sa.com' },
  { id: 'hades',       domain: 'xn--hds-ela5w.com' },
  { id: 'hekate',      domain: 'xn--hekt-7na51a.com' },
  { id: 'persephone',  domain: 'xn--persephon-jhb.com' },
  { id: 'prometheus',  domain: 'xn--promtheus-ehb.com' },
  { id: 'atlas',       domain: 'xn--tlas-4na.com' },
  { id: 'medousa',     domain: 'xn--mdousa-bva.com' },
  { id: 'nike',        domain: 'xn--nk-nja7m.com' },
  { id: 'ker',         domain: 'xn--kr-wma.com' },
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
    console.log(`[${proj.id}] Binding ${proj.domain}...`);
    const domainRes = await bindDomain(accountId, token, proj.id, proj.domain);

    if (domainRes.ok) {
      console.log(`  ✓ Bound successfully.`);
      results.push({ id: proj.id, status: 'bound' });
    } else {
      const alreadyExists = domainRes.data?.errors?.some?.(
        (e) => e.message?.includes?.('already exists') || e.code === 8000017
      );
      if (alreadyExists) {
        console.log(`  Domain already bound.`);
        results.push({ id: proj.id, status: 'already_bound' });
      } else {
        console.error(`  FAILED:`, JSON.stringify(domainRes.data));
        results.push({ id: proj.id, status: 'failed', errors: domainRes.data });
      }
    }

    await sleep(DELAY_MS);
  }

  console.log('\n========== SUMMARY ==========');
  const bound = results.filter((r) => r.status === 'bound').length;
  const already = results.filter((r) => r.status === 'already_bound').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  console.log(`Bound:         ${bound}`);
  console.log(`Already bound: ${already}`);
  console.log(`Failed:        ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
