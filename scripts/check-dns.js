#!/usr/bin/env node
/**
 * Check DNS resolution for all 42 flagship punycode domains
 * Uses Cloudflare 1.1.1.1 DoH to bypass local resolver
 */

const { domainToASCII } = require('url');

const DOH = 'https://cloudflare-dns.com/dns-query';

// 42 flagships (10 Cloudflare Pages + 32 Vercel)
const FLAGSHIPS = [
  // Cloudflare Pages (10)
  { id: 'ker',         unicode: 'Kēr',         platform: 'CF' },
  { id: 'nike',        unicode: 'Níkē',        platform: 'CF' },
  { id: 'medousa',     unicode: 'Médousa',     platform: 'CF' },
  { id: 'atlas',       unicode: 'Átlas',       platform: 'CF' },
  { id: 'prometheus',  unicode: 'Promētheus',  platform: 'CF' },
  { id: 'persephone',  unicode: 'Persephonē',  platform: 'CF' },
  { id: 'hekate',      unicode: 'Hekátē',      platform: 'CF' },
  { id: 'hades',       unicode: 'Hádēs',       platform: 'CF' },
  { id: 'hestia',      unicode: 'Hestía',      platform: 'CF' },
  { id: 'hephaistos',  unicode: 'Hēphaistos',  platform: 'CF' },
  // Vercel (32)
  { id: 'zeus',        unicode: 'Zeús',        platform: 'Vercel' },
  { id: 'athena',      unicode: 'Athēnē',      platform: 'Vercel' },
  { id: 'poseidon',    unicode: 'Poseidôn',    platform: 'Vercel' },
  { id: 'apollon',     unicode: 'Apóllōn',     platform: 'Vercel' },
  { id: 'ares',        unicode: 'Árēs',        platform: 'Vercel' },
  { id: 'artemis',     unicode: 'Ártemis',     platform: 'Vercel' },
  { id: 'aphrodite',   unicode: 'Aphrodítē',   platform: 'Vercel' },
  { id: 'demeter',     unicode: 'Dēmētēr',     platform: 'Vercel' },
  { id: 'hermes',      unicode: 'Hermês',      platform: 'Vercel' },
  { id: 'hera',        unicode: 'Hēra',        platform: 'Vercel' },
  { id: 'selene',      unicode: 'Selēnē',      platform: 'Vercel' },
  { id: 'dionysos',    unicode: 'Diónysos',    platform: 'Vercel' },
  { id: 'gaia',        unicode: 'Gaîa',        platform: 'Vercel' },
  { id: 'chaos',       unicode: 'Cháos',       platform: 'Vercel' },
  { id: 'tartaros',    unicode: 'Tártaros',    platform: 'Vercel' },
  { id: 'pontos',      unicode: 'Póntos',      platform: 'Vercel' },
  { id: 'delphoi',     unicode: 'Delphoí',     platform: 'Vercel' },
  { id: 'olympos',     unicode: 'Ólympos',     platform: 'Vercel' },
  { id: 'sparte',      unicode: 'Spártē',      platform: 'Vercel' },
  { id: 'helios',      unicode: 'Hēlios',      platform: 'Vercel' },
  { id: 'alfheimr',    unicode: 'Álfheimr',    platform: 'Vercel' },
  { id: 'jotunheimr',  unicode: 'Jötunheimr',  platform: 'Vercel' },
  { id: 'midgardr',    unicode: 'Miðgarðr',    platform: 'Vercel' },
  { id: 'ragnarok',    unicode: 'Ragnarǫk',    platform: 'Vercel' },
  { id: 'odinn',       unicode: 'Óðinn',       platform: 'Vercel' },
  { id: 'thor',        unicode: 'Þórr',        platform: 'Vercel' },
  { id: 'ra',          unicode: 'Rꜥ',          platform: 'Vercel' },
  { id: 'shiva',       unicode: 'Śiva',        platform: 'Vercel' },
  { id: 'kyoto',       unicode: 'Kyōto',       platform: 'Vercel' },
  { id: 'osaka',       unicode: 'Ōsaka',       platform: 'Vercel' },
  { id: 'kobe',        unicode: 'Kōbe',        platform: 'Vercel' },
  { id: 'athenai',     unicode: 'Athēnai',     platform: 'Vercel' },
];

for (const f of FLAGSHIPS) {
  f.punycode = domainToASCII(`${f.unicode}.com`);
}

async function dohLookup(name, type = 'A') {
  try {
    const resp = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' }
    });
    const data = await resp.json();
    return data.Answer || [];
  } catch (e) {
    return [];
  }
}

async function checkDomain(f) {
  const results = {
    id: f.id,
    unicode: f.unicode,
    punycode: f.punycode,
    platform: f.platform,
    ns: [],
    a: [],
    cname: [],
    status: 'unknown',
    detail: '',
  };

  // NS lookup
  const nsAns = await dohLookup(f.punycode, 'NS');
  results.ns = nsAns.map(r => r.data.replace(/\.$/, ''));

  // A lookup
  const aAns = await dohLookup(f.punycode, 'A');
  results.a = aAns.map(r => r.data);

  // CNAME lookup
  const cnameAns = await dohLookup(f.punycode, 'CNAME');
  results.cname = cnameAns.map(r => r.data.replace(/\.$/, ''));

  // Determine status
  if (results.ns.length === 0 && results.a.length === 0 && results.cname.length === 0) {
    results.status = 'NO_DNS';
    results.detail = 'No DNS records found';
  } else if (results.a.includes('216.69.185.18') || results.a.includes('208.109.192.70') || results.a.includes('184.168.131.241') || results.a.includes('50.63.202.32')) {
    results.status = 'PARKED';
    results.detail = 'GoDaddy/default parked page: ' + results.a.join(', ');
  } else if (results.a.includes('34.102.136.180') || results.a.includes('76.76.21.21') || results.a.includes('75.2.60.5')) {
    results.status = 'VERCEL';
    results.detail = 'Vercel IP: ' + results.a.join(', ');
  } else if (results.cname.some(c => c.includes('pages.dev'))) {
    results.status = 'CF_PAGES';
    results.detail = 'Cloudflare Pages CNAME: ' + results.cname.join(', ');
  } else if (results.a.length > 0) {
    results.status = 'OTHER';
    results.detail = 'Other IP: ' + results.a.join(', ');
  } else if (results.cname.length > 0) {
    results.status = 'CNAME';
    results.detail = 'CNAME to: ' + results.cname.join(', ');
  } else {
    results.status = 'NS_ONLY';
    results.detail = 'NS: ' + results.ns.join(', ');
  }

  return results;
}

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('DNS AUDIT: 42 FLAGSHIP PUNYCODE DOMAINS');
  console.log(`${'='.repeat(80)}\n`);

  const results = [];
  for (const f of FLAGSHIPS) {
    const r = await checkDomain(f);
    results.push(r);
    // Small delay to be nice to DoH
    await new Promise(res => setTimeout(res, 150));
  }

  // Group by status
  const byStatus = {};
  for (const r of results) {
    byStatus[r.status] = byStatus[r.status] || [];
    byStatus[r.status].push(r);
  }

  const statusOrder = ['PARKED', 'NO_DNS', 'NS_ONLY', 'OTHER', 'VERCEL', 'CF_PAGES', 'CNAME'];
  for (const status of statusOrder) {
    const list = byStatus[status];
    if (!list || list.length === 0) continue;
    console.log(`\n── ${status} (${list.length}) ──`);
    for (const r of list) {
      const nsStr = r.ns.length ? ` | NS: ${r.ns.join(', ')}` : '';
      console.log(`  ${r.unicode.padEnd(12)} ${r.punycode.padEnd(35)} ${r.detail}${nsStr}`);
    }
  }

  const bad = results.filter(r => r.status === 'PARKED' || r.status === 'NO_DNS' || r.status === 'NS_ONLY' || r.status === 'OTHER');
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TOTAL: ${results.length} | GOOD: ${results.length - bad.length} | BROKEN: ${bad.length}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
