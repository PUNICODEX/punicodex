const fs = require('fs');
const https = require('https');

const MANUAL_CORRECTIONS = {
  'Apollo_Belvedere_%28cropped%29.jpg': 'Belvedere Apollo Pio-Clementino Inv1015 (cropped).jpg',
  'Apollo_Lykeios_Louvre_Ma_645.jpg': 'Rome Apollo Lykeios type.jpg',
  'Apollo_Sauroktonos_Louvre_Ma_441.jpg': 'Apollo Sauroktonos Louvre Ma441 n01.jpg',
  'Apollo_and_Daphne_-_Gian_Lorenzo_Bernini_-_Borghese_Gallery_-_Rome.jpg': 'Apollo and Daphne (Bernini).jpg',
  'Apollo_Python_Louvre_CA_5732.jpg': 'Apollo Tityos Leto Louvre G375.jpg',
  'Apollo_Citharoedus_Musei_Capitolini_MC649.jpg': '0 Apollo kitharoidos - Musei capitolini.JPG',
  'Apollo_Hermitage.jpg': 'Statue of Apollo Hermitage GR-4186 n1.jpg',
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

  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3);
    const correctFilenames = batch.map(([_, c]) => c);
    try {
      const data = await apiInfo(correctFilenames);
      const infoMap = {};
      for (const pid of Object.keys(data.query?.pages || {})) {
        const page = data.query.pages[pid];
        if (page.imageinfo?.[0]) {
          infoMap[page.title.replace(/^File:/, '')] = page.imageinfo[0];
        }
      }

      for (const [oldFilename, correctFilename] of batch) {
        const info = infoMap[correctFilename];
        if (!info) {
          console.log('SKIP:', correctFilename);
          continue;
        }
        const srcUrl = info.thumburl || info.url;
        const thumbMatch = srcUrl.match(/(?:\/thumb)?\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)(?:\/|$)/);
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
        if (text.match(oldUrlPattern)) {
          text = text.replace(oldUrlPattern, newUrl);
          console.log(`FIXED: ${oldFilename} => ${correctFilename}`);
        } else {
          console.log(`NOT FOUND: ${oldFilename}`);
        }
      }
    } catch (e) {
      console.error('Batch error:', e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  fs.writeFileSync('scripts/batch-update-galleries.js', text, 'utf8');
}

run();
