const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MATERIALS = path.join(ROOT, 'extended flagship materials', '15-07-26', 'punycodex');

const mapping = {
  Acheron: 'acheron',
  Aer: 'aer',
  Aganju: 'aganju',
  Amertat: 'ameretat',
  Ananke: 'ananke',
  Arche: 'arche',
  Atlantis: 'atlantis',
  Cihuacoatl: 'cihuacoatl',
  Coatlicue: 'coatlicue',
  Durga: 'durga',
  Esu: 'eshu',
  Fujin: 'fujin',
  Haurvatat: 'haurvatat',
  Huitzilopochtli: 'huitzilopochtli',
  Obaluaye: 'babaluaye',
  Obatala: 'obatala',
  Olodumare: 'olodumare',
  Orunmila: 'orunmila',
  Osun: 'oshun',
  Pyr: 'pyr',
  Rhea: 'rhea',
  Sango: 'shango',
  Tlaltecuhtli: 'tlaltecuhtli',
};

const kinds = ['mascot', 'logolockup', 'logomark'];

for (const [folder, id] of Object.entries(mapping)) {
  const srcDir = path.join(MATERIALS, folder);
  const destDir = path.join(ROOT, 'sites', id, 'assets');
  fs.mkdirSync(destDir, { recursive: true });

  for (const kind of kinds) {
    const srcName = `${kind === 'mascot' ? folder.toLowerCase() : folder.toLowerCase()}_${kind}.png`;
    const srcPath = path.join(srcDir, srcName);
    const destBase = `${id}_${kind}`;
    const destPng = path.join(destDir, `${destBase}.png`);
    const destWebp = path.join(destDir, `${destBase}.webp`);

    if (!fs.existsSync(srcPath)) {
      console.error(`Missing: ${srcPath}`);
      continue;
    }

    fs.copyFileSync(srcPath, destPng);
    console.log(`Copied ${srcPath} -> ${destPng}`);

    try {
      execSync(`npx sharp-cli -i "${destPng}" -o "${destWebp}" -f webp`, { stdio: 'inherit' });
      console.log(`Converted ${destWebp}`);
    } catch (e) {
      console.error(`Failed to convert ${destPng}:`, e.message);
      process.exit(1);
    }
  }
}

console.log('Asset copy/convert complete');
