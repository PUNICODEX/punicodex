const fs = require('fs');
const https = require('https');

const MANUAL_CORRECTIONS = {
  'Hades_Entscheidung_des_Paris_Staatliche_Antikensammlungen_3965.jpg': 'Acheloos Painter - ABV 383 12 - Sisyphos with Persephone and Hades - München AS 1549 - 01.jpg',
  'Hades_and_Persephone_BM_Vase_E82.jpg': 'Persephone Hades BM Vase E82.jpg',
  'Hades_Capua_Museo_Provinciale.jpg': 'PLUTO STATUE.jpg',
  'Cerberus_Hercules_BM_B163.jpg': 'Herakles Kerberos Staatliche Antikensammlungen 1493.jpg',
  'Nekyia_Painter_Louvre_CA_1982.jpg': 'Apulian Red Figure volute krater with scenes of the Underworld, ca. 340-330 BC, Staatliche Antikensammlungen, Munich (8956886411).jpg',
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
