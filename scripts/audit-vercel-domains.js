// Audit all Vercel domains and their project assignments
// Run: node scripts/audit-vercel-domains.js

const { execSync } = require('child_process');

const domains = [
  'xn--m-yw3e.com', 'hekaweb.com', 'punycodex.com',
  'xn--poseidn-bmb.com', 'xn--hekat-mza.com', 'xn--eurp-eva06a.com',
  'muspellheimr.com', 'helheimr.com', 'xn--tlas-4na.com',
  'xn--promtheus-ehb.com', 'xn--nk-fjak.com', 'xn--nk-nja7m.com',
  'xn--nik-5qa.com', 'xn--persephon-jhb.com', 'xn--mdousa-bva.com',
  'xn--kr-wma.com', 'xn--hekt-7na51a.com', 'xn--hds-ela5w.com',
  'xn--hphaistos-bhb.com', 'xn--asa-sma.com', 'xn--hesta-2sa.com',
  'xn--eurp-eva0406b.com', 'xn--agyptos-7ya.com',
  'xn--liby-eva.com', 'xn--s-2w3e.com', 'xn--m-2w3e.com',
  'xn--b-xw3e.com', 'xn--9gg9559c.com', 'xn--w-4ma.com',
  'xn--athn-dpa9l.com', 'xn--herms-lza.com', 'xn--aphrodt-27a8s.com',
  'xn--apolln-fgb.com', 'xn--athnai-r3a.com', 'xn--kbe-qxa.com',
  'xn--saka-k3a.com', 'xn--kyto-m3a.com', 'xn--iva-bza.com',
  'xn--r-2w3e.com', 'xn--rr-4ja7b.com', 'xn--inn-2mao.com',
  'xn--ragnark-fnc.com', 'xn--migarr-qwad.com', 'xn--jtunheimr-07a.com',
  'xn--lfheimr-gwa.com', 'xn--hlios-iza.com', 'xn--sprt-6na61a.com',
  'xn--lympos-9wa.com', 'xn--delpho-8va.com', 'xn--pntos-0ta.com',
  'xn--trtaros-hwa.com', 'xn--chos-6na.com', 'xn--gaa-wma.com',
  'xn--dinysos-m0a.com', 'xn--seln-dvab.com', 'xn--hra-3qa.com',
  'xn--herms-ksa.com', 'xn--dmtr-bvabb.com', 'xn--aphrodt-dza75a.com',
  'xn--rtemis-ota.com', 'xn--rs-lia5r.com', 'xn--aplln-1ta64d.com',
  'xn--poseidn-y0a.com', 'xn--zes-9na.com',
  'coastalconcretesleepers.com.au', 'hekacalendar.com',
  'stigmator.com', 'meekmeet.com', 'srevol.com', 'antidosis.com', 'oilamor.com'
];

const results = {
  onMain: [],
  onIndividual: [],
  onStandalone: [],
  other: [],
  errors: []
};

for (const domain of domains) {
  process.stderr.write(`Checking ${domain}... `);
  try {
    const output = execSync(`vercel --no-color domains inspect ${domain} 2>&1`, {
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (output.includes('punycodex-main')) {
      results.onMain.push(domain);
      process.stderr.write('MAIN\n');
    } else if (output.includes('punycodex-')) {
      const m = output.match(/punycodex-[a-z0-9-]+/);
      const project = m ? m[0] : 'unknown-punycodex';
      results.onIndividual.push({ domain, project });
      process.stderr.write(`INDIVIDUAL → ${project}\n`);
    } else if (output.includes('Project')) {
      const lines = output.split('\n');
      let projectName = 'unknown';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('Project') && !trimmed.startsWith('Domains') && 
            !trimmed.startsWith('Name') && !trimmed.startsWith('Registrar') &&
            !trimmed.startsWith('punycodex-') && trimmed.length > 1 &&
            /^[a-z0-9-]+$/.test(trimmed.split(/\s+/)[0])) {
          const firstWord = trimmed.split(/\s+/)[0];
          if (firstWord !== 'Third' && firstWord !== 'ns1.vercel-dns.com' && 
              firstWord !== 'ns2.vercel-dns.com' && firstWord !== 'Intended' &&
              firstWord !== 'General' && firstWord !== 'Nameservers' &&
              firstWord !== 'Edge' && firstWord !== 'Creator' &&
              firstWord !== 'Created' && firstWord !== 'Renewal' &&
              firstWord !== 'Fetching' && firstWord !== 'Domain') {
            projectName = firstWord;
            break;
          }
        }
      }
      results.onStandalone.push({ domain, project: projectName });
      process.stderr.write(`STANDALONE → ${projectName}\n`);
    } else {
      results.other.push(domain);
      process.stderr.write('OTHER\n');
    }
  } catch (err) {
    results.errors.push({ domain, error: err.message.substring(0, 100) });
    process.stderr.write('ERROR\n');
  }
}

console.log('\n=== SUMMARY ===');
console.log(`On punycodex-main: ${results.onMain.length}`);
console.log(`On individual punycodex-* projects: ${results.onIndividual.length}`);
console.log(`On standalone projects: ${results.onStandalone.length}`);
console.log(`Other: ${results.other.length}`);
console.log(`Errors: ${results.errors.length}`);

console.log('\n=== ON punycodex-main ===');
results.onMain.forEach(d => console.log(`  ${d}`));

console.log('\n=== NEED MIGRATION (individual punycodex-* projects) ===');
results.onIndividual.forEach(({ domain, project }) => console.log(`  ${domain} → ${project}`));

console.log('\n=== NEED MIGRATION (standalone projects) ===');
results.onStandalone.forEach(({ domain, project }) => console.log(`  ${domain} → ${project}`));

console.log('\n=== MIGRATION COMMANDS ===');
console.log('# Remove from old projects and add to punycodex-main:');
for (const { domain, project } of results.onIndividual) {
  console.log(`vercel domains rm ${domain} ${project} --yes`);
  console.log(`vercel domains add ${domain} punycodex-main --yes`);
}
for (const { domain, project } of results.onStandalone) {
  console.log(`vercel domains rm ${domain} ${project} --yes`);
  console.log(`vercel domains add ${domain} punycodex-main --yes`);
}
