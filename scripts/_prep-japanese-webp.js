const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const NAMES = [
  'amaterasu', 'amida', 'benzaiten', 'ebisu', 'fuji', 'goshin', 'hachiman',
  'hoderi', 'hoori', 'inari', 'ise', 'izanagi', 'izanami', 'kagutsuchi',
  'kannon', 'kotoshironushi', 'kumano', 'marishiten', 'nagoya', 'ninigi',
  'nishinakahime', 'omononushi', 'raijin', 'sarutahiko', 'shikoku',
  'sukunahikona', 'tajikarao', 'takachiho', 'toyotama', 'tsukuyomi',
  'ugayafukiaezu',
];

let converted = 0;
for (const id of NAMES) {
  const assetsDir = path.join(ROOT, 'sites', id, 'assets');
  for (const base of [`${id}_logolockup`, `${id}_logomark`, `${id}_mascot`]) {
    const png = path.join(assetsDir, `${base}.png`);
    const webp = path.join(assetsDir, `${base}.webp`);
    if (!fs.existsSync(png)) continue;
    if (fs.existsSync(webp)) continue;
    const result = spawnSync('python', [
      '-c',
      `from PIL import Image; img=Image.open(r'${png}'); img=img.convert('RGBA' if img.mode in ('RGBA','P') else 'RGB'); img.save(r'${webp}', 'WEBP', quality=85, method=4)`,
    ], { cwd: ROOT, encoding: 'utf8' });
    if (result.status !== 0) {
      console.error(`Failed ${png}: ${result.stderr}`);
    } else {
      converted++;
      console.log(`Converted ${path.relative(ROOT, webp)}`);
    }
  }
}
console.log(`Converted ${converted} files.`);
