#!/usr/bin/env node
const { domainToASCII } = require('url');
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API = 'https://api.cloudflare.com/client/v4';

const SITES = [
  {id:'ker', u:'Kēr'}, {id:'nike', u:'Níkē'}, {id:'medousa', u:'Médousa'},
  {id:'atlas', u:'Átlas'}, {id:'prometheus', u:'Promētheus'}, {id:'persephone', u:'Persephonē'},
  {id:'hekate', u:'Hekátē'}, {id:'hades', u:'Hádēs'}, {id:'hestia', u:'Hestía'}, {id:'hephaistos', u:'Hēphaistos'}
];

async function check() {
  for (const s of SITES) {
    try {
      const puny = domainToASCII(s.u + '.com');
      const zr = await fetch(`${CF_API}/zones?name=${puny}`, {
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
      });
      const zd = await zr.json();
      if (!zd.result?.length) { console.log(s.id + ': ZONE NOT FOUND for ' + puny); continue; }
      const zone = zd.result[0];

      const dr = await fetch(`${CF_API}/zones/${zone.id}/dns_records`, {
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
      });
      const dd = await dr.json();
      const recs = dd.result.map(r => `${r.type}:${r.name}=${r.content}${r.proxied ? '(P)' : '(G)'}`).join(' | ');

      const pr = await fetch(`${CF_API}/accounts/${ACCT}/pages/projects/${s.id}/domains`, {
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }
      });
      const pd = await pr.json();
      const domains = pd.result?.map(d => `${d.name}=${d.status}`).join(' | ') || 'no domains';

      console.log(`${s.id} | zone:${zone.status} | dns:${recs} | pages:${domains}`);
    } catch (e) {
      console.log(`${s.id}: ERROR ${e.message}`);
    }
  }
}
check().catch(e => console.error(e.message));
