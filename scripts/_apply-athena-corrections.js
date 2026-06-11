const fs = require('fs');
const https = require('https');

const MANUAL_CORRECTIONS = {
  'Athena_Velletri_Louvre_Ma_2223.jpg': 'Athena of Velletri - Louvre.jpg',
  'Pallas_Athena_%28Velletri_type%29_1.jpg': 'Athena type Velletri.jpg',
  'Athena_Giustiniani_Vatican.jpg': 'Athena Giustiniani, Vatican Museums.jpg',
  'Athena_Promachos_BM_2017.jpg': 'Burgon Group - ABV 89 1 - Athena Promachos - charioteer in biga - London BM 1842-0728-834 - 01.jpg',
  'Athena_Lemnia_Photo.jpg': 'Athena Lemnia (SK Dresden 49) 01.jpg',
  'Athena_and_Marsyas_Mykonos_Archaeological_Museum_1998.jpg': 'Athena Marsyas.jpg',
  'Birth_of_Athena_BM_Vase_E489.jpg': 'Amphora birth Athena Louvre F32.jpg',
  'Athena_Helmeted_Bust_BM_1816.jpg': 'Head of Athena - NAMA inv 1763.jpg',
};

function apiInfo(titles) {
  return new Promise((resolve, reject) => {
    const ts = titles.map(t => 'File:' + encodeURIComponent(t)).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${ts}&prop=imageinfo&iiprop=url|size|mime|thumbmime&iiurlwidth=800&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNYCODEX-gallery-audit/1.0' } }, (res) => {
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
