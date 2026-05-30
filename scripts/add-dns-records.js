#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELAY_MS = 600;

const RECORDS = [
  { domain: 'xn--zes-9na.com',        target: 'zeus.pages.dev' },
  { domain: 'xn--athn-dvab.com',      target: 'athena.pages.dev' },
  { domain: 'xn--poseidn-y0a.com',    target: 'poseidon.pages.dev' },
  { domain: 'xn--apolln-fgb.com',     target: 'apollon.pages.dev' },
  { domain: 'xn--rs-lia5r.com',       target: 'ares.pages.dev' },
  { domain: 'xn--rtemis-ota.com',     target: 'artemis.pages.dev' },
  { domain: 'xn--aphrodt-27a8s.com',  target: 'aphrodite.pages.dev' },
  { domain: 'xn--dmtr-bvabb.com',     target: 'demeter.pages.dev' },
  { domain: 'xn--herms-ksa.com',      target: 'hermes.pages.dev' },
  { domain: 'xn--hra-3qa.com',        target: 'hera.pages.dev' },
  { domain: 'xn--hphaistos-bhb.com',  target: 'hephaistos.pages.dev' },
  { domain: 'xn--hesta-2sa.com',      target: 'hestia.pages.dev' },
  { domain: 'xn--hds-ela5w.com',      target: 'hades.pages.dev' },
  { domain: 'xn--hekt-7na51a.com',    target: 'hekate.pages.dev' },
  { domain: 'xn--persephon-jhb.com',  target: 'persephone.pages.dev' },
  { domain: 'xn--promtheus-ehb.com',  target: 'prometheus.pages.dev' },
  { domain: 'xn--tlas-4na.com',       target: 'atlas.pages.dev' },
  { domain: 'xn--mdousa-bva.com',     target: 'medousa.pages.dev' },
  { domain: 'xn--nk-nja7m.com',       target: 'nike.pages.dev' },
  { domain: 'xn--kr-wma.com',         target: 'ker.pages.dev' },
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

async function createRecord(token, zoneId, domain, target) {
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
      ttl: 1, // auto
      proxied: true,
    }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

async function main() {
  const token = process.env.CF_API_TOKEN;

  for (const rec of RECORDS) {
    const zoneId = await getZoneId(token, rec.domain);
    if (!zoneId) {
      console.log(`${rec.domain}: ZONE NOT FOUND`);
      continue;
    }

    console.log(`${rec.domain}: Adding CNAME → ${rec.target}...`);
    const res = await createRecord(token, zoneId, rec.domain, rec.target);

    if (res.ok) {
      console.log(`  ✓ Created`);
    } else {
      const alreadyExists = res.data?.errors?.some?.(
        (e) => e.message?.includes?.('already exists') || e.code === 81057
      );
      if (alreadyExists) {
        console.log(`  Already exists`);
      } else {
        console.error(`  FAILED:`, JSON.stringify(res.data));
      }
    }

    await sleep(DELAY_MS);
  }

  console.log('\nDone.');
}

main().catch(console.error);
