const { execSync } = require('child_process');

const promotions = [
  ['aer', 'aḗr.com'],
  ['aganju', 'aganjú.com'],
  ['obatala', 'ọbatálá.com'],
  ['orunmila', 'ọrunmila.com'],
  ['shango', 'ṣàngó.com'],
  ['oshun', 'ọṣun.com'],
  ['olodumare', 'olódùmarè.com'],
  ['babaluaye', 'ọbalúayé.com'],
  ['acheron', 'achérōn.com'],
  ['rhea', 'rhéā.com'],
  ['ameretat', 'amərətāt.com'],
  ['haurvatat', 'haurvatāt.com'],
  ['ananke', 'anánkē.com'],
  ['coatlicue', 'cōātlīcue.com'],
  ['tlaltecuhtli', 'tlaltecuhtli.com'],
  ['cihuacoatl', 'cihuacōātl.com'],
  ['huitzilopochtli', 'huitzilopōchtli.com'],
  ['durga', 'durgā.com'],
  ['eshu', 'ẹṣu.com'],
  ['fujin', 'fūjin.com'],
  ['arche', 'archḗ.com'],
  ['atlantis', 'atlantís.com'],
  ['pyr', 'pŷr.com'],
];

for (const [id, domain] of promotions) {
  console.log(`\n=== Promoting ${id} with ${domain} ===`);
  try {
    execSync(`node scripts/promote-to-flagship.js ${id} --domain ${domain} --skip-generate --skip-validate`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed to promote ${id}:`, e.message);
    process.exit(1);
  }
}

console.log('\n✓ All promotions complete. Run npm run generate next.');
