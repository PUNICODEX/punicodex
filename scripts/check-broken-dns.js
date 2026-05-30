#!/usr/bin/env node
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_API = 'https://api.cloudflare.com/client/v4';
const { domainToASCII } = require('url');

const SITES = [
  {id:'ker', u:'Kēr', p:'CF'}, {id:'nike', u:'Níkē', p:'CF'}, {id:'medousa', u:'Médousa', p:'CF'},
  {id:'persephone', u:'Persephonē', p:'CF'}, {id:'hestia', u:'Hestía', p:'CF'}, {id:'hephaistos', u:'Hēphaistos', p:'CF'},
  {id:'demeter', u:'Dēmētēr', p:'Vercel'}, {id:'hermes', u:'Hermês', p:'Vercel'}, {id:'hera', u:'Hēra', p:'Vercel'}
];

async function check() {
  for (const s of SITES) {
    try {
      const puny = domainToASCII(s.u + '.com');
      const zr = await fetch(`${CF_API}/zones?name=${puny}`, {
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
      });
      const zd = await zr.json();
      if (!zd.result?.length) { console.log(s.id + ': NO ZONE'); continue; }
      const zone = zd.result[0];
      const dr = await fetch(`${CF_API}/zones/${zone.id}/dns_records`, {
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
      });
      const dd = await dr.json();
      const recs = dd.result.map(r => `${r.type}:${r.name}=${r.content}${r.proxied ? '(P)' : '(G)'}`).join(' | ');
      console.log(s.id.padEnd(12) + ' | ' + recs);
    } catch (e) {
      console.log(s.id + ': ERROR ' + e.message);
    }
  }
}
check().catch(console.error);
