const fs = require('fs');
const https = require('https');
const vm = require('vm');

// Load batch-update-galleries.js in a sandbox to get galleryData
const scriptText = fs.readFileSync('scripts/batch-update-galleries.js', 'utf8');
const galleryDataMatch = scriptText.match(/const galleryData = \{([\s\S]*?)\n\};/);
if (!galleryDataMatch) {
  console.log('Could not parse galleryData');
  process.exit(1);
}

const context = { galleryData: {} };
vm.createContext(context);
vm.runInContext('galleryData = {' + galleryDataMatch[1].slice(1) + '}', context);
const galleryData = context.galleryData;

function apiInfo(titles) {
  return new Promise((resolve, reject) => {
    const ts = titles.map(t => 'File:' + encodeURIComponent(t)).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${ts}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=100&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNYCODEX-gallery-audit/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const sites = Object.entries(galleryData);
  console.log(`Auditing ${sites.length} sites...\n`);

  for (const [siteId, data] of sites) {
    const filenames = data.images.map(img => {
      const m = img.src.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//);
      return m ? decodeURIComponent(m[1]) : null;
    }).filter(Boolean);

    try {
      const apiData = await apiInfo(filenames);
      const pages = apiData.query?.pages || {};
      let ok = 0, missing = 0;
      for (const pid of Object.keys(pages)) {
        const page = pages[pid];
        if (page.missing !== undefined || page.invalid !== undefined) missing++;
        else if (page.imageinfo?.[0]) ok++;
      }
      const status = missing === 0 ? '✅ ALL GOOD' : missing === filenames.length ? '❌ ALL BROKEN' : `⚠️  ${ok}/${filenames.length} OK`;
      console.log(`${status.padEnd(18)} ${siteId.padEnd(18)} (${filenames.length} images)`);
      await sleep(800);
    } catch (e) {
      console.log(`⚠️  API ERROR         ${siteId.padEnd(18)} ${e.message}`);
    }
  }
}

run();
