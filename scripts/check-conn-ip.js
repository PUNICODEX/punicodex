#!/usr/bin/env node
const { domainToASCII } = require('url');
const net = require('net');

const SITES = [
  {id:'ker', u:'Kēr'}, {id:'nike', u:'Níkē'}, {id:'medousa', u:'Médousa'},
  {id:'persephone', u:'Persephonē'}, {id:'hestia', u:'Hestía'}, {id:'hephaistos', u:'Hēphaistos'},
  {id:'demeter', u:'Dēmētēr'}, {id:'hermes', u:'Hermês'}, {id:'hera', u:'Hēra'},
  {id:'apollon', u:'Apóllōn'}, {id:'aphrodite', u:'Aphrodítē'}
];

function resolveLocal(hostname) {
  return new Promise((resolve, reject) => {
    net.resolve4(hostname, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
}

async function main() {
  for (const s of SITES) {
    try {
      const puny = domainToASCII(s.u + '.com');
      const ips = await resolveLocal(puny);
      const ipStr = ips.join(', ');
      const isCf = ips.some(ip => ip.startsWith('172.66.') || ip.startsWith('104.'));
      const isVercel = ips.some(ip => ip === '76.76.21.21');
      const isGoDaddy = !isCf && !isVercel;
      const status = isGoDaddy ? '❌ STALE (GoDaddy)' : isCf ? '✅ Cloudflare' : isVercel ? '✅ Vercel' : '?';
      console.log(s.id.padEnd(12) + ' ' + ipStr.padEnd(25) + ' ' + status);
    } catch (e) {
      console.log(s.id.padEnd(12) + ' ' + e.code?.padEnd(25) + ' ❌');
    }
  }
}
main().catch(console.error);
