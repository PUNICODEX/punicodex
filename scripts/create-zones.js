#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 800;

const DOMAINS = [
  'xn--zes-9na.com',
  'xn--athn-dvab.com',
  'xn--poseidn-y0a.com',
  'xn--apolln-fgb.com',
  'xn--rs-lia5r.com',
  'xn--rtemis-ota.com',
  'xn--aphrodt-27a8s.com',
  'xn--dmtr-bvabb.com',
  'xn--herms-ksa.com',
  'xn--hra-3qa.com',
  'xn--hphaistos-bhb.com',
  'xn--hesta-2sa.com',
  'xn--hds-ela5w.com',
  'xn--hekt-7na51a.com',
  'xn--persephon-jhb.com',
  'xn--promtheus-ehb.com',
  'xn--tlas-4na.com',
  'xn--mdousa-bva.com',
  'xn--nk-nja7m.com',
  'xn--kr-wma.com',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createZone(accountId, token, domain) {
  const resp = await fetch(`${CF_API_BASE}/zones`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: domain,
      account: { id: accountId },
      type: 'full',
      jump_start: false,
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

async function listZones(accountId, token, domain) {
  const resp = await fetch(`${CF_API_BASE}/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  return data.result || [];
}

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  const results = [];

  for (const domain of DOMAINS) {
    // Check if zone already exists
    const existing = await listZones(accountId, token, domain);
    if (existing.length > 0) {
      const z = existing[0];
      console.log(`${domain}: ALREADY EXISTS | ns=${z.name_servers?.join(', ')}`);
      results.push({ domain, status: 'exists', ns: z.name_servers });
      await sleep(DELAY_MS);
      continue;
    }

    console.log(`${domain}: Creating zone...`);
    const res = await createZone(accountId, token, domain);

    if (res.ok && res.data.success) {
      const z = res.data.result;
      console.log(`${domain}: CREATED | ns=${z.name_servers?.join(', ')}`);
      results.push({ domain, status: 'created', ns: z.name_servers });
    } else {
      console.error(`${domain}: FAILED`, JSON.stringify(res.data));
      results.push({ domain, status: 'failed', errors: res.data });
    }

    await sleep(DELAY_MS);
  }

  console.log('\n========== NAMESERVER SUMMARY ==========');
  console.log('Copy these into GoDaddy for each domain:\n');
  for (const r of results) {
    if (r.status === 'created' || r.status === 'exists') {
      console.log(`${r.domain}:`);
      for (const ns of r.ns || []) {
        console.log(`  ${ns}`);
      }
    }
  }

  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length > 0) {
    console.log('\n========== FAILURES ==========');
    for (const f of failed) {
      console.log(`${f.domain}:`, JSON.stringify(f.errors));
    }
  }
}

main().catch(console.error);
