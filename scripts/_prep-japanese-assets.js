const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const NAMES = [
  'amaterasu', 'amida', 'benzaiten', 'ebisu', 'fuji', 'goshin', 'hachiman',
  'hoderi', 'hoori', 'inari', 'ise', 'izanagi', 'izanami', 'kagutsuchi',
  'kannon', 'kotoshironushi', 'kumano', 'marishiten', 'nagoya', 'ninigi',
  'nishinakahime', 'omononushi', 'raijin', 'sarutahiko', 'shikoku',
  'sukunahikona', 'tajikarao', 'takachiho', 'toyotama', 'tsukuyomi',
  'ugayafukiaezu',
];

const SOURCE_ROOT = path.join(ROOT, 'ascii pantheon 28-08-26', 'punycodex');

let copied = 0;
for (const id of NAMES) {
  const sourceDir = path.join(SOURCE_ROOT, id);
  const targetDir = path.join(ROOT, 'sites', id, 'assets');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  for (const name of [`${id}_logolockup`, `${id}_logomark`, `${id}_mascot`]) {
    const src = path.join(sourceDir, `${name}.png`);
    const dst = path.join(targetDir, `${name}.png`);
    if (!fs.existsSync(src)) {
      console.error(`Missing source asset: ${src}`);
      process.exit(1);
    }
    fs.copyFileSync(src, dst);
    copied++;
  }
}
console.log(`Copied ${copied} PNG assets for ${NAMES.length} Japanese entries.`);

console.log('Converting PNGs to WebP...');
execSync('python scripts/png_to_webp.py', { cwd: ROOT, stdio: 'inherit' });

console.log('Syncing to .masters/ mirror...');
execSync('node scripts/sync-masters-assets.js', { cwd: ROOT, stdio: 'inherit' });
