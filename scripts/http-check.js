#!/usr/bin/env node
const { domainToASCII } = require('url');

const SITES = [
  {id:'ker', u:'Kēr'}, {id:'nike', u:'Níkē'}, {id:'medousa', u:'Médousa'},
  {id:'atlas', u:'Átlas'}, {id:'prometheus', u:'Promētheus'}, {id:'persephone', u:'Persephonē'},
  {id:'hekate', u:'Hekátē'}, {id:'hades', u:'Hádēs'}, {id:'hestia', u:'Hestía'}, {id:'hephaistos', u:'Hēphaistos'}
];

const VERCEL_SITES = [
  {id:'zeus', u:'Zeús'}, {id:'athena', u:'Athēnē'}, {id:'poseidon', u:'Poseidôn'},
  {id:'apollon', u:'Apóllōn'}, {id:'ares', u:'Árēs'}, {id:'artemis', u:'Ártemis'},
  {id:'aphrodite', u:'Aphrodítē'}, {id:'demeter', u:'Dēmētēr'}, {id:'hermes', u:'Hermês'},
  {id:'hera', u:'Hēra'}, {id:'selene', u:'Selēnē'}, {id:'dionysos', u:'Diónysos'},
  {id:'gaia', u:'Gaîa'}, {id:'chaos', u:'Cháos'}, {id:'tartaros', u:'Tártaros'},
  {id:'pontos', u:'Póntos'}, {id:'delphoi', u:'Delphoí'}, {id:'olympos', u:'Ólympos'},
  {id:'sparte', u:'Spártē'}, {id:'helios', u:'Hēlios'}, {id:'alfheimr', u:'Álfheimr'},
  {id:'jotunheimr', u:'Jötunheimr'}, {id:'midgardr', u:'Miðgarðr'}, {id:'ragnarok', u:'Ragnarǫk'},
  {id:'odinn', u:'Óðinn'}, {id:'thor', u:'Þórr'}, {id:'ra', u:'Rꜥ'},
  {id:'shiva', u:'Śiva'}, {id:'kyoto', u:'Kyōto'}, {id:'osaka', u:'Ōsaka'},
  {id:'kobe', u:'Kōbe'}, {id:'athenai', u:'Athēnai'}
];

async function checkHttp(url, id) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    const body = await resp.text();
    const hasPunycodex = body.includes('PUNYCODEX');
    const hasLander = body.includes('/lander') || body.includes('GoDaddy') || body.includes('parked');
    const hasError = body.includes('404') || body.includes('Not Found') || body.includes('Bad Request');
    const len = body.length;
    if (hasPunycodex && len > 5000) return { ok: true, status: resp.status, len, detail: 'temple page' };
    if (hasLander) return { ok: false, status: resp.status, len, detail: 'PARKED /lander' };
    if (hasError || resp.status >= 400) return { ok: false, status: resp.status, len, detail: 'HTTP ' + resp.status };
    return { ok: false, status: resp.status, len, detail: 'unknown (' + len + 'b)' };
  } catch (e) {
    return { ok: false, status: 0, len: 0, detail: e.message.split('\n')[0] };
  }
}

async function main() {
  console.log('Checking 10 Cloudflare Pages custom domains...\n');
  for (const s of SITES) {
    const puny = domainToASCII(s.u + '.com');
    const r = await checkHttp('https://' + puny + '/', s.id);
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${s.id.padEnd(12)} https://${puny}/ → ${r.detail}`);
    await new Promise(res => setTimeout(res, 300));
  }

  console.log('\nChecking 32 Vercel custom domains...\n');
  for (const s of VERCEL_SITES) {
    const puny = domainToASCII(s.u + '.com');
    const r = await checkHttp('https://' + puny + '/', s.id);
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${s.id.padEnd(12)} https://${puny}/ → ${r.detail}`);
    await new Promise(res => setTimeout(res, 300));
  }
}
main().catch(console.error);
