const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const NAMES = [
  'amaterasu', 'amida', 'benzaiten', 'ebisu', 'fuji', 'goshin', 'hachiman',
  'hoderi', 'hoori', 'inari', 'ise', 'izanagi', 'izanami', 'kagutsuchi',
  'kannon', 'kotoshironushi', 'kumano', 'marishiten', 'nagoya', 'ninigi',
  'nishinakahime', 'omononushi', 'raijin', 'sarutahiko', 'shikoku',
  'sukunahikona', 'tajikarao', 'takachiho', 'toyotama', 'tsukuyomi',
  'ugayafukiaezu',
];

for (const id of NAMES) {
  console.log(`\n=== Promoting ${id} ===`);
  try {
    execSync(`node scripts/promote-to-flagship.js ${id} --domainless --skip-generate --skip-validate`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`Promotion failed for ${id}: ${err.message}`);
    process.exit(1);
  }
}
console.log('\nAll 31 Japanese entries promoted.');
