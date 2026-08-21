#!/usr/bin/env node
/**
 * One-off: mobile Lighthouse audit of the home page only (perf workstream).
 * Serves the repo statically, audits / with Lighthouse's default mobile
 * profile (simulated slow 4G), writes docs/lighthouse/home-mobile-<tag>.json.
 *
 * Run: node tools/perf-home-lighthouse.js <tag>
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'docs', 'lighthouse');
const PORT = 3100;
const HOST = `http://127.0.0.1:${PORT}`;
const TAG = process.argv[2] || 'run';

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
  '.xml': 'text/xml',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, decodeURIComponent(req.url).split('?')[0]);
    if (filePath.endsWith(path.sep)) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const textExts = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.webmanifest']);
    const useGzip = acceptEncoding.includes('gzip') && textExts.has(ext) && fs.statSync(filePath).size > 256;
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

function runLighthouse(url, outputBase) {
  return new Promise((resolve) => {
    const args = [
      url,
      '--output=json',
      `--output-path=${outputBase}.json`,
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      '--only-categories=performance',
      '--quiet',
    ];
    const child = spawn('npx', ['-y', 'lighthouse@12', ...args], {
      cwd: ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CHROME_PATH: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    });
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c.toString();
    });
    child.on('error', (err) => {
      console.error(`lighthouse failed to start: ${err.message}`);
      resolve(null);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`lighthouse exited ${code}\n${stderr.slice(-2000)}`);
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(fs.readFileSync(`${outputBase}.json`, 'utf8')));
      } catch (e) {
        console.error(`could not read report: ${e.message}`);
        resolve(null);
      }
    });
  });
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const outputBase = path.join(REPORT_DIR, `home-mobile-${TAG}`);
  try {
    const report = await runLighthouse(`${HOST}/`, outputBase);
    if (!report) {
      process.exitCode = 1;
      return;
    }
    const a = report.audits;
    const summary = {
      tag: TAG,
      performance: Math.round((report.categories.performance?.score || 0) * 100),
      fcp: a['first-contentful-paint']?.numericValue,
      lcp: a['largest-contentful-paint']?.numericValue,
      tbt: a['total-blocking-time']?.numericValue,
      cls: a['cumulative-layout-shift']?.numericValue,
      si: a['speed-index']?.numericValue,
      lcpElement: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet,
      mainThreadWork: a['mainthread-work-breakdown']?.numericValue,
    };
    fs.writeFileSync(`${outputBase}.summary.json`, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
