#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 600;

const ZONES = [
  { domain: 'xn--zes-9na.com',        project: 'zeus' },
  { domain: 'xn--athn-dvab.com',      project: 'athena' },
  { domain: 'xn--poseidn-y0a.com',    project: 'poseidon' },
  { domain: 'xn--apolln-fgb.com',     project: 'apollon' },
  { domain: 'xn--rs-lia5r.com',       project: 'ares' },
  { domain: 'xn--rtemis-ota.com',     project: 'artemis' },
  { domain: 'xn--aphrodt-27a8s.com',  project: 'aphrodite' },
  { domain: 'xn--dmtr-bvabb.com',     project: 'demeter' },
  { domain: 'xn--herms-ksa.com',      project: 'hermes' },
  { domain: 'xn--hra-3qa.com',        project: 'hera' },
  { domain: 'xn--hphaistos-bhb.com',  project: 'hephaistos' },
  { domain: 'xn--hesta-2sa.com',      project: 'hestia' },
  { domain: 'xn--hds-ela5w.com',      project: 'hades' },
  { domain: 'xn--hekt-7na51a.com',    project: 'hekate' },
  { domain: 'xn--persephon-jhb.com',  project: 'persephone' },
  { domain: 'xn--promtheus-ehb.com',  project: 'prometheus' },
  { domain: 'xn--tlas-4na.com',       project: 'atlas' },
  { domain: 'xn--mdousa-bva.com',     project: 'medousa' },
  { domain: 'xn--nk-nja7m.com',       project: 'nike' },
  { domain: 'xn--kr-wma.com',         project: 'ker' },
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

async function deleteRecord(token, zoneId, recordId) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return resp.ok;
}

async function createCname(token, zoneId, domain, target) {
  const resp = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: domain,
      content: target,
      ttl: 1,
      proxied: true,
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

async function main() {
  const token = process.env.CF_API_TOKEN;

  for (const z of ZONES) {
    const zoneId = await getZoneId(token, z.domain);
    if (!zoneId) {
      console.log(`${z.domain}: ZONE NOT FOUND`);
      continue;
    }

    const records = await listRecords(token, zoneId);
    const rootA = records.filter(r => r.type === 'A' && r.name === z.domain);
    const rootCname = records.find(r => r.type === 'CNAME' && r.name === z.domain);

    // Delete root A records (GoDaddy parking IPs)
    for (const a of rootA) {
      console.log(`${z.domain}: Deleting A record -> ${a.content}`);
      await deleteRecord(token, zoneId, a.id);
      await sleep(200);
    }

    // If no root CNAME exists, create one
    if (!rootCname) {
      const target = `${z.project}.pages.dev`;
      console.log(`${z.domain}: Creating CNAME -> ${target}`);
      const res = await createCname(token, zoneId, z.domain, target);
      if (res.ok) {
        console.log(`  ✓ Created`);
      } else {
        console.error(`  FAILED:`, JSON.stringify(res.data));
      }
    } else {
      console.log(`${z.domain}: CNAME already exists -> ${rootCname.content}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\nDone.');
}

main().catch(console.error);
