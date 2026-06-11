const fs = require('fs');
const https = require('https');

// Manually curated filename corrections for fabricated galleryData filenames
// Format: oldFilename -> correct Commons filename
const MANUAL_CORRECTIONS = {
  // Aphrodite
  'Capitoline_Venus_-_Musei_Capitolini_-_MC0409.jpg': 'Capitoline Venus Musei Capitolini MC0409.jpg',
  'Aphrodite_of_Cnidus_-_Glyptothek_Munich_258.jpg': 'Aphrodite Braschi Glyptothek Munich 258.jpg',
  'Titian_-_Venus_Anadyomene_-_Google_Art_Project.jpg': "Titian (Tiziano Vecellio) - Venus Rising from the Sea ('Venus Anadyomene') - Google Art Project.jpg",
  'Peter_Paul_Rubens_-_The_Judgement_of_Paris_-_WGA20307.jpg': 'Rubens - Judgement of Paris.jpg',
  'Sandro_Botticelli_-_Venus_and_Mars_-_Google_Art_Project.jpg': 'Venus and Mars, Sandro Botticelli.jpg',
  "Venus_de'_Medici_-_Galleria_degli_Uffizi.jpg": 'Medici Venus (Uffizi).jpg',
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  let text = fs.readFileSync('scripts/batch-update-galleries.js', 'utf8');
  const entries = Object.entries(MANUAL_CORRECTIONS);
  console.log(`Applying ${entries.length} manual corrections...`);

  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3);
    const correctFilenames = batch.map(([_, correct]) => correct);
    try {
      const data = await apiInfo(correctFilenames);
      const infoMap = {};
      for (const pid of Object.keys(data.query?.pages || {})) {
        const page = data.query.pages[pid];
        if (page.imageinfo?.[0]) {
          const title = page.title.replace(/^File:/, '');
          infoMap[title] = page.imageinfo[0];
        }
      }

      for (const [oldFilename, correctFilename] of batch) {
        const info = infoMap[correctFilename];
        if (!info) {
          console.log('  SKIP (not found):', correctFilename);
          continue;
        }
        const thumbMatch = info.thumburl.match(/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\/([^/]+)\//);
        if (!thumbMatch) {
          console.log('  SKIP (no thumb):', correctFilename);
          continue;
        }
        const [, h1, h2, encodedFilename] = thumbMatch;
        const newUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${h1}/${h2}/${encodedFilename}/960px-${encodedFilename}.webp`;

        // Replace old URLs - match any URL containing the old filename
        // The old filename in URLs uses underscores for spaces
        const oldFilenameInUrl = oldFilename.replace(/ /g, '_');
        const oldUrlPattern = new RegExp(
          `https://upload\\.wikimedia\\.org/wikipedia/commons/thumb/[^/'"\\s]+/[^/'"\\s]+/${oldFilenameInUrl.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/[^'"\\s]+`,
          'g'
        );
        const matches = text.match(oldUrlPattern);
        if (matches) {
          text = text.replace(oldUrlPattern, newUrl);
          console.log(`  FIXED: ${oldFilename} => ${correctFilename}`);
        } else {
          console.log(`  NOT FOUND in source: ${oldFilename}`);
        }
      }
    } catch (e) {
      console.error('Batch error:', e.message);
    }
    await sleep(3000);
  }

  fs.writeFileSync('scripts/batch-update-galleries.js', text, 'utf8');
  console.log('Updated batch-update-galleries.js');
}

run();
