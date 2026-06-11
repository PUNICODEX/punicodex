const https = require('https');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'batch-update-galleries.js'), 'utf8');

// Parse site blocks and image srcs via regex
const entries = [];
const siteBlockRegex = /(\w+):\s*\{\s*images:\s*\[([\s\S]*?)\]\s*\}/g;
let m;
while ((m = siteBlockRegex.exec(src)) !== null) {
  const siteId = m[1];
  const block = m[2];
  const srcRegex = /src:\s*'([^']+)'/g;
  let sm;
  while ((sm = srcRegex.exec(block)) !== null) {
    const url = sm[1];
    const match = url.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\/960px-/);
    if (match) {
      entries.push({ siteId, filename: decodeURIComponent(match[1]), src: url });
    }
  }
}

console.log(`Auditing ${entries.length} images across ${new Set(entries.map(e => e.siteId)).size} sites...`);

const results = { ok: [], missing: [], full: [], error: [] };

function normalize(name) {
  return name.replace(/_/g, ' ').trim();
}

function apiInfo(titles) {
  return new Promise((resolve, reject) => {
    const ts = titles.map(t => 'File:' + encodeURIComponent(t)).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${ts}&prop=imageinfo&iiprop=url|size|mime|thumbmime&iiurlwidth=960&format=json&origin=*`;
    https.get(url, { headers: { 'User-Agent': 'PUNYCODEX-gallery-audit/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const batchSize = 8;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    try {
      const data = await apiInfo(batch.map(e => e.filename));
      const lookup = new Map(batch.map(e => [normalize(e.filename), e]));
      for (const n of data.query.normalized || []) {
        lookup.set(normalize(n.to), lookup.get(normalize(n.from)));
      }
      for (const pid of Object.keys(data.query.pages || {})) {
        const page = data.query.pages[pid];
        const title = page.title?.replace(/^File:/, '');
        const entry = lookup.get(normalize(title));
        if (!entry) {
          console.log('SKIP', title);
          continue;
        }
        if (page.missing !== undefined) {
          results.missing.push(entry);
          console.log('MISS', entry.siteId, title);
        } else if (page.imageinfo?.[0]) {
          const info = page.imageinfo[0];
          const hashMatch = info.thumburl && info.thumburl.match(/\/thumb\/([a-f0-9])\/([a-f0-9]{2})\//);
          if (hashMatch) {
            results.ok.push({ ...entry, hash: `${hashMatch[1]}/${hashMatch[2]}` });
            console.log('OK  ', entry.siteId, title, '->', `${hashMatch[1]}/${hashMatch[2]}`);
          } else {
            results.full.push(entry);
            console.log('FULL', entry.siteId, title);
          }
        } else {
          results.missing.push(entry);
          console.log('MISS', entry.siteId, title);
        }
      }
    } catch (err) {
      for (const e of batch) {
        results.error.push({ ...e, reason: err.message });
        console.log('ERR ', e.siteId, e.filename, err.message);
      }
    }
    if (i + batchSize < entries.length) {
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  fs.writeFileSync(path.join(__dirname, '_audit-results.json'), JSON.stringify(results, null, 2));
  console.log('\nDONE');
  console.log('OK:', results.ok.length);
  console.log('MISSING:', results.missing.length);
  console.log('FULL:', results.full.length);
  console.log('ERROR:', results.error.length);
  console.log('Report written to scripts/_audit-results.json');
}

run();
