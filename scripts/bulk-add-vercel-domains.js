/**
 * Bulk-add owned Unicode domains to the linked Vercel project,
 * then inspect each one to capture its DNS configuration status.
 *
 * Run: node scripts/bulk-add-vercel-domains.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { domainToASCII } = require('url');

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'scripts', '_vercel-domain-report.json');

const domains = [
  'ꜣḫ.com','ēa.com','aígyptos.com','aithḗr.com','ꜥanat.com','aphrodītē.com','aphrodítē.com','apóllōn.com','apollōn.com','asía.com','ꜥasherah.com','aštart.com','athénā.com','athēnā.com','athēnai.com','ꜣb.com','bꜣ.com','baꜥal.com','cháos.com','delphoí.com','diónysos.com','dēmētēr.com','enlīl.com','eurṓpē.com','eurōpē.com','gaîa.com','gaṇeśa.com','hádēs.com','hekatē.com','hekátē.com','hermês.com','hermēs.com','hestía.com','hēlios.com','hēphaistos.com','hēra.com','jötunheimr.com','ḥkꜣ.com','kꜣ.com','kōbe.com','kālī.com','kēr.com','krónos.com','kyōto.com','ēl.com','álfheimr.com','libyē.com','ólympos.com','mꜥ.com','mꜣ.com','médousa.com','miðgarðr.com','nikē.com','níkê.com','níkē.com','persephonē.com','póntos.com','poseidōn.com','poseidôn.com','prajāpati.com','promētheus.com','rꜥ.com','ḥr.com','ragnarǫk.com','þórr.com','érōs.com','árēs.com','ártemis.com','sꜥ.com','ōsaka.com','selēnē.com','spártē.com','ṛta.com','átlas.com','tártaros.com','typhōn.com','viṣṇu.com','šw.com','zeús.com','helheimr.com','muspellheimr.com'
];

function puny(d) {
  try {
    return domainToASCII(d).toLowerCase();
  } catch (e) {
    console.error('Punycode failed for', d, e.message);
    return null;
  }
}

function run(args) {
  const result = spawnSync('npx vercel ' + args.map(a => `"${a}"`).join(' '), {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 1024 * 1024,
    timeout: 120000,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const report = [];

for (const d of domains) {
  const p = puny(d);
  if (!p) continue;
  console.log(`\n▸ ${d} (${p})`);

  const add = run(['domains', 'add', p]);
  const addOk = add.status === 0;
  const addErr = add.stderr || add.stdout;
  console.log(addOk ? '  added/verified' : '  add returned non-zero (may already exist)');

  const inspect = run(['domains', 'inspect', p]);
  const text = inspect.stdout + inspect.stderr;

  const nameMatch = text.match(/Name\s+([\S]+)/);
  const registrarMatch = text.match(/Registrar\s+(\S.*)/);
  const intendedMatch = text.match(/Intended Nameservers\s+([\S\s]+?)Current Nameservers/);
  const currentMatch = text.match(/Current Nameservers\s+([\S\s]+?)(?:Projects|WARNING|$)/);
  const aRecordMatch = text.match(/A\s+([\S]+)\s+([\d.]+)/);

  const intended = intendedMatch ? intendedMatch[1].trim().split(/\s+/) : [];
  const current = currentMatch ? currentMatch[1].trim().split(/\s+/) : [];
  const configured = intended.length > 0 && current.length > 0 && intended.every(ns => current.includes(ns));

  report.push({
    unicode: d,
    punycode: nameMatch ? nameMatch[1] : p,
    registrar: registrarMatch ? registrarMatch[1].trim() : null,
    intendedNameservers: intended,
    currentNameservers: current,
    configured,
    recommendedA: aRecordMatch ? aRecordMatch[2] : '76.76.21.21',
    addOk,
    addMessage: addErr.slice(0, 500),
    inspectText: text,
  });

  console.log(`  configured: ${configured ? 'YES' : 'NO'}`);
  console.log(`  current NS: ${current.join(', ') || 'unknown'}`);
}

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n✓ Report written to ${REPORT_PATH}`);
console.log(`  Total: ${report.length}, configured: ${report.filter(r => r.configured).length}, pending: ${report.filter(r => !r.configured).length}`);
