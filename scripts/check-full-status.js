#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

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

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  for (const proj of PROJECTS) {
    // Check Pages domain status
    const pagesResp = await fetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects/${proj.id}/domains`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pagesData = await pagesResp.json();
    const domainInfo = (pagesData.result || []).find(d => d.name === proj.domain);

    // Check zone DNS records
    const zoneResp = await fetch(`${CF_API_BASE}/zones?name=${encodeURIComponent(proj.domain)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const zoneData = await zoneResp.json();
    const zone = zoneData.result?.[0];

    let dnsRecords = 'no zone';
    if (zone) {
      const dnsResp = await fetch(`${CF_API_BASE}/zones/${zone.id}/dns_records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dnsData = await dnsResp.json();
      dnsRecords = (dnsData.result || []).map(r => `${r.type} ${r.name} → ${r.content}`).join('; ') || 'none';
    }

    const status = domainInfo?.status || 'unknown';
    const ssl = domainInfo?.ssl?.status || 'no ssl data';
    console.log(`${proj.id}: domain_status=${status} | ssl=${ssl} | dns=[${dnsRecords}]`);
  }
}

main().catch(console.error);
