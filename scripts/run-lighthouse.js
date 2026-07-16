#!/usr/bin/env node
/**
 * PÚNYCODEX — Lighthouse sample runner.
 *
 * Starts a local static server, audits a representative sample of pages with
 * Lighthouse (desktop preset), and writes JSON + HTML reports to
 * docs/lighthouse/. Prints a summary table to stdout.
 *
 * Run: node scripts/run-lighthouse.js
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'docs', 'lighthouse');
const PORT = 3000;
const HOST = 'http://127.0.0.1:3000';

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'pantheon', path: '/pantheon/' },
  { slug: 'lexicon', path: '/lexicon/' },
  { slug: 'connections', path: '/connections/' },
  { slug: 'type', path: '/type/' },
  { slug: 'search', path: '/search.html' },
  { slug: 'sites-zeus', path: '/sites/zeus/' },
  { slug: 'sites-odinn', path: '/sites/odinn/' },
  { slug: 'sites-tlaloc', path: '/sites/tlaloc/' },
  { slug: 'sites-amitabha', path: '/sites/amitabha/' },
  { slug: 'sites-yam', path: '/sites/yam/' },
  { slug: 'sites-hypnos', path: '/sites/hypnos/' },
  { slug: 'sites-hekate', path: '/sites/hekate/' },
  { slug: 'sites-nike', path: '/sites/nike/' },
  { slug: 'sites-perkunas', path: '/sites/perkunas/' },
  { slug: 'sites-ra', path: '/sites/ra/' },
  { slug: 'sites-apollon', path: '/sites/apollon/' },
  { slug: 'sites-manannan', path: '/sites/manannan/' },
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function shouldCompress(filePath, ext) {
  // Only compress text-based assets and HTML documents.
  const textExts = new Set([
    '.html',
    '.css',
    '.js',
    '.json',
    '.svg',
    '.xml',
    '.txt',
    '.ico',
    '.webmanifest',
  ]);
  const size = fs.statSync(filePath).size;
  return textExts.has(ext) && size > 256;
}

function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, decodeURIComponent(req.url).split('?')[0]);
    if (filePath.endsWith(path.sep)) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const useGzip = acceptEncoding.includes('gzip') && shouldCompress(filePath, ext);

    const headers = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    };
    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`  Static server listening on ${HOST} (gzip enabled)`);
      resolve(server);
    });
  });
}

function runLighthouse(url, outputBase) {
  return new Promise((resolve) => {
    const args = [
      url,
      '--output=json',
      '--output=html',
      `--output-path=${outputBase}`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-features=HttpsUpgrades',
      '--preset=desktop',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    console.log(`  Auditing ${url}`);
    const child = spawn('npx', ['lighthouse', ...args], {
      cwd: ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error(`    ✗ Failed to start Lighthouse for ${url}: ${err.message}`);
      resolve(null);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`    ✗ Lighthouse exited ${code} for ${url}`);
        if (stderr.includes('Chrome') || stderr.includes('Could not find Chrome')) {
          console.error('    Chrome may not be installed or discoverable.');
        }
        resolve(null);
        return;
      }
      const generatedJson = `${outputBase}.report.json`;
      const generatedHtml = `${outputBase}.report.html`;
      const finalJson = `${outputBase}.json`;
      const finalHtml = `${outputBase}.html`;
      try {
        if (fs.existsSync(generatedJson)) fs.renameSync(generatedJson, finalJson);
        if (fs.existsSync(generatedHtml)) fs.renameSync(generatedHtml, finalHtml);
        const report = JSON.parse(fs.readFileSync(finalJson, 'utf8'));
        resolve(report);
      } catch (e) {
        console.error(`    ✗ Could not read report for ${url}: ${e.message}`);
        resolve(null);
      }
    });
  });
}

function extractScores(report) {
  const categories = report.categories || {};
  return {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
  };
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const date = new Date().toISOString().split('T')[0];

  console.log('▸ Starting local static server...');
  const server = await startServer();

  const results = [];
  let chromeMissing = false;

  try {
    console.log('▸ Running Lighthouse (desktop preset)...');
    for (const page of PAGES) {
      const url = `${HOST}${page.path}`;
      const outputBase = path.join(REPORT_DIR, `${page.slug}-${date}`);
      const report = await runLighthouse(url, outputBase);
      if (report === null) {
        chromeMissing = true;
        continue;
      }
      const scores = extractScores(report);
      results.push({ slug: page.slug, url, ...scores });
    }
  } finally {
    server.close();
  }

  if (chromeMissing && results.length === 0) {
    console.error('\n✗ Lighthouse could not run. Chrome is required but was not found.');
    process.exit(1);
  }

  // Print summary table
  console.log(
    '\n╔════════════════════════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║  Lighthouse Summary (desktop)                                                      ║'
  );
  console.log(
    '╠═════════════════════════╦═════════════╦═════════════╦═══════════════╦════════════╣'
  );
  console.log(
    '║ Page                    ║ Performance ║ Accessibility ║ Best Practices ║ SEO      ║'
  );
  console.log(
    '╠═════════════════════════╬═════════════╬═══════════════╬════════════════╬══════════╣'
  );
  for (const r of results) {
    const name = r.slug.padEnd(23);
    const p = String(r.performance).padStart(11);
    const a = String(r.accessibility).padStart(13);
    const b = String(r.bestPractices).padStart(14);
    const s = String(r.seo).padStart(8);
    console.log(`║ ${name} ║ ${p} ║ ${a} ║ ${b} ║ ${s} ║`);
  }
  console.log(
    '╚═════════════════════════╩═════════════╩═══════════════╩════════════════╩══════════╝'
  );

  if (chromeMissing) {
    console.log('\n⚠ Some audits were skipped because Chrome was not available.');
  }

  const summaryPath = path.join(REPORT_DIR, `summary-${date}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Reports saved to ${REPORT_DIR}`);
  console.log(`✓ Summary saved to ${summaryPath}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
