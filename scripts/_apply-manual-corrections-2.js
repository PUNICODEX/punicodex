const fs = require('fs');
const https = require('https');

const MANUAL_CORRECTIONS = {
  "Venus_de%27_Medici_-_Galleria_degli_Uffizi.jpg": 'Medici Venus (Uffizi).jpg',
};

function apiInfo(titles) {
  return new Promise((resolve, reject) => {
    const ts = titles.map(t => 'File:' + encodeURIComponent(t)).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${ts}&prop=imageinfo&iiprop=url|size|mime|thumbmime&iiurlwidth=800&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNICODEX-gallery-audit/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function run() {
  let text = fs.readFileSync('scripts/batch-update-galleries.js', 'utf8');
  const entries = Object.entries(MANUAL_CORRECTIONS);
  const correctFilenames = entries.map(([_, c]) => c);
  const data = await apiInfo(correctFilenames);
  const infoMap = {};
  for (const pid of Object.keys(data.query?.pages || {})) {
    const page = data.query.pages[pid];
    if (page.imageinfo?.[0]) {
      infoMap[page.title.replace(/^File:/, '')] = page.imageinfo[0];
    }
  }

  for (const [oldFilename, correctFilename] of entries) {
    const info = infoMap[correctFilename];
    if (!info) {
      console.log('SKIP:', correctFilename);
      continue;
    }
    // Match /thumb/{h1}/{h2}/{filename}/ from thumburl or url
    const srcUrl = info.thumburl || info.url;
    const thumbMatch = srcUrl.match(/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)\//);
    if (!thumbMatch) {
      console.log('SKIP hash:', correctFilename, srcUrl);
      continue;
    }
    const [, h1, h2, encodedFilename] = thumbMatch;
    const newUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${h1}/${h2}/${encodedFilename}/960px-${encodedFilename}.webp`;

    const oldUrlPattern = new RegExp(
      `https://upload\\.wikimedia\\.org/wikipedia/commons/thumb/[^/'"\\s]+/[^/'"\\s]+/${oldFilename.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/[^'"\\s]+`,
      'g'
    );
    const matches = text.match(oldUrlPattern);
    if (matches) {
      text = text.replace(oldUrlPattern, newUrl);
      console.log(`FIXED: ${oldFilename} => ${correctFilename}`);
    } else {
      console.log(`NOT FOUND: ${oldFilename}`);
    }
  }

  fs.writeFileSync('scripts/batch-update-galleries.js', text, 'utf8');
}

run();
