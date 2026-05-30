#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 500;

const ZONES = [
  { domain: 'xn--zes-9na.com',        project: 'zeus' },
  { domain: 'xn--rs-lia5r.com',       project: 'ares' },
  { domain: 'xn--rtemis-ota.com',     project: 'artemis' },
  { domain: 'xn--promtheus-ehb.com',  project: 'prometheus' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getZoneId(token, domain) {
  const resp = await fetch(`${CF_API_BASE}/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.result?.[0]?.id;
}

async function listRecords(token, zoneId) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.result || [];
}

async function updateRecord(token, zoneId, recId, domain, target) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
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
  return resp.ok;
}

async function main() {
  const token = process.env.CF_API_TOKEN;

  for (const z of ZONES) {
    const zoneId = await getZoneId(token, z.domain);
    if (!zoneId) continue;

    const records = await listRecords(token, zoneId);
    const cname = records.find(r => r.type === 'CNAME' && r.name === z.domain);
    if (!cname) {
      console.log(`${z.domain}: No CNAME found`);
      continue;
    }

    console.log(`${z.domain}: Unproxying CNAME (${cname.id})...`);
    const ok = await updateRecord(token, zoneId, cname.id, z.domain, cname.content);
    console.log(`  ${ok ? '✓ Done' : 'FAILED'}`);
    await sleep(DELAY_MS);
  }

  console.log('\nDone. Now delete and re-add the Pages custom domains to trigger validation.');
}

main().catch(console.error);
