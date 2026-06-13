const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ids = fs.readdirSync('sites').filter(id => {
  const assets = path.join('sites', id, 'assets');
  if (!fs.existsSync(assets)) return false;
  return fs.readdirSync(assets).some(f => f.endsWith('_mascot.png'));
});

for (const id of ids) {
  const assets = path.join('sites', id, 'assets');
  for (const base of ['_mascot', '_logomark', '_logolockup']) {
    const png = path.join(assets, id + base + '.png');
    const webp = path.join(assets, id + base + '.webp');
    if (!fs.existsSync(png)) continue;
    if (fs.existsSync(webp)) { console.log('skip', webp); continue; }
    console.log('convert', png, '->', webp);
    execSync(`"${ffmpeg}" -y -i "${png}" "${webp}"`, { stdio: 'inherit' });
  }
}
