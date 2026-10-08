/**
 * Creative Upload Pipeline Tests — the sponsor creative flow, end to end.
 *
 * The two failures a founding-sponsor test surfaced, pinned forever:
 *   - The page promised "it will be cropped to fit" and the server rejected
 *     with 400 — now the server normalizes every sane image (EXIF rotate,
 *     center-crop to slot aspect, downscale to 2×) so uploads just work.
 *   - A creative stuck in pending_approval could not be replaced — the
 *     reviewer always sees the latest, so replacement is allowed.
 * Plus the architecture split: the token dashboard is read-only analytics
 * with an advertiser-panel CTA; management lives in the panel.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);
{
  const Database = require('better-sqlite3');
  const tmpDb = new Database(testDb);
  require('../platform/db/migrate-tenant-portal.js').migrate(tmpDb);
  tmpDb.close();
}

const { createCanvas } = require('canvas');
const { uploadBookingCreative } = require('../platform/api/booking-upload.js');
const { getBookingByToken } = require('../platform/api/bookings.js');
const { run, get } = require('../platform/db/operational');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function pngDataUrl(width, height, color = '#123456') {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  const buf = canvas.toBuffer('image/png');
  return `data:image/png;base64,${buf.toString('base64')}`;
}

let booking = null;

test('setup: a booking in pending_upload on a 1200x400 banner slot', async () => {
  const slot = await get(
    'SELECT id, site_slug, width, height FROM ad_slots WHERE width = 1200 AND height = 400 LIMIT 1'
  );
  assert.ok(slot, 'banner slot present in golden DB');
  const token = `testtoken${Date.now()}`;
  await run(
    `INSERT INTO bookings (slot_id, email, company_name, analytics_token, status, lease_months, site_slug)
     VALUES ($1, 'sponsor@test.co', 'Test Co', $2, 'pending_upload', 12, $3)`,
    [slot.id, token, slot.site_slug]
  );
  const row = await get('SELECT id FROM bookings WHERE analytics_token = $1', [token]);
  booking = { id: row.id, token, slot };
  assert.ok(booking.id, 'booking inserted');
});

test('a 3840x2160 photo uploads cleanly — server crops to the 3:1 frame at 2x', async () => {
  // The exact failure from the sponsor test: huge 16:9 photo into a 3:1 slot.
  const result = await uploadBookingCreative(
    booking.token,
    { image: pngDataUrl(3840, 2160), filename: 'big-photo.png' },
    {}
  );
  assert.strictEqual(result.status, 200, JSON.stringify(result.body));
  const sharp = require('sharp');
  const saved = path.join(ROOT, 'platform', 'api', 'public', result.body.path);
  const meta = await sharp(fs.readFileSync(saved)).metadata();
  assert.strictEqual(meta.width, 2400, 'downscaled to 2x slot width');
  assert.strictEqual(meta.height, 800, 'center-cropped to slot aspect');
  const updated = await getBookingByToken(booking.token);
  assert.strictEqual(updated.status, 'pending_approval');
  fs.rmSync(path.dirname(saved), { recursive: true, force: true });
});

test('a creative under review changes only through the panel, never the view token', async () => {
  // The analytics token is a view credential: after the first creative is
  // submitted (pending_approval), token uploads stop and management moves to
  // the session-authed advertiser panel, where changes are attributed.
  await run("UPDATE bookings SET status = 'pending_upload' WHERE id = $1", [booking.id]);
  const first = await uploadBookingCreative(
    booking.token,
    { image: pngDataUrl(1200, 400), filename: 'v1.png' },
    {}
  );
  assert.strictEqual(first.status, 200);
  const mid = await getBookingByToken(booking.token);
  assert.strictEqual(mid.status, 'pending_approval');
  const second = await uploadBookingCreative(
    booking.token,
    { image: pngDataUrl(1600, 1200, '#654321'), filename: 'v2.png' },
    {}
  );
  assert.strictEqual(second.status, 403, 'view token must not rewrite a creative under review');
  assert.match(second.body.error, /advertiser panel/);
  const saved = path.join(ROOT, 'platform', 'api', 'public', first.body.path);
  fs.rmSync(path.dirname(saved), { recursive: true, force: true });
  // The panel queue covers replacement: its status list includes under-review.
  const portal = read('platform/api/tenant-portal.js');
  assert.ok(portal.includes("'pending_approval'"), 'panel queue allows under-review replacement');
  const brand = read('account/brand/brand.js');
  assert.ok(brand.includes("'pending_approval'"), 'panel UI offers replacement under review');
});

test('oversized payloads are refused with an honest message (not a silent 400)', async () => {
  await run("UPDATE bookings SET status = 'pending_upload' WHERE id = $1", [booking.id]);
  const huge = `data:image/png;base64,${Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64')}`;
  const result = await uploadBookingCreative(
    booking.token,
    { image: huge, filename: 'huge.png' },
    {}
  );
  assert.strictEqual(result.status, 400);
  assert.match(result.body.error, /under 4MB/);
});

test('the token dashboard is read-only: no upload surface, panel CTA present', () => {
  const html = read('templates/flagship/dashboard.html');
  assert.ok(!html.includes('dash-upload-zone'), 'upload zone removed');
  assert.ok(!html.includes('openSlotEditor'), 'slot editor removed');
  assert.ok(!html.includes('saveChanges'), 'edit handlers removed');
  assert.ok(html.includes('/account/login/'), 'panel CTA links the advertiser panel');
  assert.ok(html.includes('Your Placement'), 'read-only placement summary');
  assert.ok(!html.includes('isEditable'), 'no edit gating left');
});

test('the temple modal normalizes before upload and the template loads the helper', () => {
  const tpl = read('templates/flagship/index.html');
  const normIdx = tpl.indexOf('/js/creative-normalize.js?v=');
  const scriptIdx = tpl.indexOf('script.js?v=');
  assert.ok(normIdx !== -1, 'creative-normalize loaded');
  assert.ok(scriptIdx !== -1 && normIdx < scriptIdx, 'helper loads before the temple script');
  const js = read('templates/flagship/flagship.js');
  assert.ok(js.includes('CreativeNormalize.normalizeCreative'), 'modal uses the normalizer');
  assert.ok(!js.includes('under 2MB'), 'the dishonest 2MB wall is gone');
  // The success step frames both destinations by role.
  assert.ok(tpl.includes('Advertiser Panel'), 'step 3 names the panel');
  assert.ok(tpl.includes('Analytics snapshot'), 'step 3 names the snapshot');
  assert.ok(tpl.includes('/account/login/'), 'step 3 links the panel');
});

test('the advertiser panel normalizes too, allows replacement, and offers support', () => {
  const brand = read('account/brand/brand.js');
  assert.ok(brand.includes('pending_approval'), 'panel allows replacement during review');
  assert.ok(brand.includes('CreativeNormalize.normalizeCreative'), 'panel normalizes');
  const brandPage = read('account/brand/index.html');
  assert.ok(brandPage.includes('/js/creative-normalize.js?v='), 'helper loaded on the brand page');
  const home = read('account/index.html');
  assert.ok(home.includes('Contact us'), 'support: contact');
  assert.ok(home.includes('Report a bug'), 'support: bug report');
});

test('the booking confirmation frames the two links by role', () => {
  const email = read('platform/api/email.js');
  assert.ok(email.includes('Open the Advertiser Panel'), 'panel primary CTA');
  assert.ok(email.includes('View the Analytics Snapshot'), 'snapshot secondary CTA');
  assert.ok(email.includes('view-only'), 'roles spelled out');
});

test('the shared normalizer exists with the dual export and a sane size guard', () => {
  const js = read('js/creative-normalize.js');
  const api = require(path.join(ROOT, 'js', 'creative-normalize.js'));
  assert.ok(typeof api.normalizeCreative === 'function', 'Node export');
  assert.ok(js.includes('20 * 1024 * 1024'), 'absurd-input guard');
  assert.ok(js.includes('window.CreativeNormalize'), 'browser export');
});

test('the uploads serving route streams from the storage root with a traversal guard', async () => {
  const handler = require(path.join(ROOT, 'api', 'uploads', '[[...slug]].js'));
  const { ensureUploadsDir } = require(path.join(ROOT, 'platform', 'api', 'upload-storage.js'));
  const dir = ensureUploadsDir('test-serve');
  fs.writeFileSync(path.join(dir, 'probe.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  const mkRes = () => ({
    status(s) {
      this.s = s;
      return this;
    },
    setHeader(k, v) {
      (this.h ||= {})[k] = v;
      return this;
    },
    json(o) {
      this.b = o;
      return this;
    },
    send(b) {
      this.b = b;
      return this;
    },
    end() {
      return this;
    },
  });
  const res = mkRes();
  await handler({ method: 'GET', query: { slug: 'test-serve/probe.png' } }, res);
  assert.strictEqual(res.s, 200);
  assert.strictEqual(res.h['Content-Type'], 'image/png');
  assert.match(res.h['Cache-Control'], /immutable/);
  assert.strictEqual(res.h['X-Content-Type-Options'], 'nosniff');

  let res2 = mkRes();
  await handler({ method: 'GET', query: { slug: '../../../vercel.json' } }, res2);
  assert.strictEqual(res2.s, 404, 'parent refs never escape the root');
  res2 = mkRes();
  await handler({ method: 'GET', query: { slug: 'test-serve/missing.png' } }, res2);
  assert.strictEqual(res2.s, 404);
  res2 = mkRes();
  await handler({ method: 'POST', query: { slug: 'test-serve/probe.png' } }, res2);
  assert.strictEqual(res2.s, 405);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('vercel.json routes /uploads/* to the serving function', () => {
  const config = JSON.parse(read('vercel.json'));
  const rw = (config.rewrites || []).find((r) => r.destination === '/api/uploads/[[...slug]]');
  assert.ok(rw, 'uploads rewrite present');
  assert.ok(rw.source.includes(':slug*'), 'captures subpaths');
});

test('Blob mode: creatives persist to Vercel Blob and creative_path is the public URL', async () => {
  // Mock the Blob SDK at the module boundary, then flip the token on.
  const blobPath = require.resolve('@vercel/blob');
  const realBlob = require(blobPath);
  const puts = [];
  require.cache[blobPath].exports = {
    ...realBlob,
    put: async (name, buffer, opts) => {
      puts.push({ name, size: buffer.length, access: opts.access });
      return { url: `https://store.public.blob.vercel-storage.com/${name}` };
    },
  };
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  try {
    const { storeCreativeBuffer, blobEnabled } = require('../platform/api/upload-storage.js');
    assert.ok(blobEnabled(), 'blob mode active with the token set');
    const stored = await storeCreativeBuffer(
      '42',
      'card.png',
      Buffer.from('png-bytes'),
      'image/png'
    );
    assert.strictEqual(stored.url, 'https://store.public.blob.vercel-storage.com/42/card.png');
    assert.strictEqual(puts.length, 1);
    assert.strictEqual(puts[0].access, 'public', 'creatives are public reads');
    // And an end-to-end token upload in Blob mode stores the absolute URL.
    await run("UPDATE bookings SET status = 'pending_upload' WHERE id = $1", [booking.id]);
    const result = await uploadBookingCreative(
      booking.token,
      { image: pngDataUrl(2400, 800), filename: 'blobbed.png' },
      {}
    );
    assert.strictEqual(result.status, 200);
    assert.ok(result.body.path.startsWith('https://'), 'creative_path is the blob URL');
    assert.strictEqual(result.body.webpPath, null, 'no local webp sibling in blob mode');
    const row = await getBookingByToken(booking.token);
    assert.ok(row.creative_path.startsWith('https://'), 'booking carries the durable URL');
  } finally {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    require.cache[blobPath].exports = realBlob;
  }
});

test('display layers resolve both /uploads/ paths and absolute blob URLs', () => {
  const flagship = read('templates/flagship/flagship.js');
  assert.ok(
    flagship.includes('/^https?:\\/\\//.test(slot.creative_path)'),
    'temple creative render is URL-aware'
  );
  const dash = read('templates/flagship/dashboard.html');
  assert.ok(dash.includes('/^https?:\\/\\//.test(path)'), 'dashboard pictureTag is URL-aware');
  const storage = require('../platform/api/upload-storage.js');
  assert.strictEqual(
    storage.resolveCreativeUrl('https://x.blob/a.png', 'https://site'),
    'https://x.blob/a.png'
  );
  assert.strictEqual(
    storage.resolveCreativeUrl('/uploads/1/a.png', 'https://site'),
    'https://site/uploads/1/a.png'
  );
});

test('creative purge: ended placements lose stored files after the grace period', async () => {
  const {
    purgeEndedCreatives,
    deleteStoredCreative,
  } = require('../platform/api/creative-purge.js');
  const { ensureUploadsDir } = require('../platform/api/upload-storage.js');

  // An ended booking past grace with a local creative file.
  const dir = ensureUploadsDir('purge-test');
  const file = path.join(dir, 'gone.png');
  fs.writeFileSync(file, Buffer.from([137, 80, 78, 71]));
  const token = `purge${Date.now()}`;
  await run(
    `INSERT INTO bookings (slot_id, email, company_name, analytics_token, status, site_slug, creative_path, updated_at)
     VALUES ($1, 'purge@test.co', 'Purge Co', $2, 'ended', 'nike', '/uploads/purge-test/gone.png', '2020-01-01 00:00:00')`,
    [booking.slot.id, token]
  );
  const victim = await get('SELECT id FROM bookings WHERE analytics_token = $1', [token]);

  const result = await purgeEndedCreatives({ graceDays: 30 });
  assert.ok(result.purged >= 1, 'at least the victim purged');
  assert.ok(!fs.existsSync(file), 'the stored file was deleted');
  const after = await get('SELECT creative_path FROM bookings WHERE id = $1', [victim.id]);
  assert.strictEqual(after.creative_path, null, 'creative reference cleared');

  // A booking ended YESTERDAY keeps its creative (grace period).
  await run(
    `UPDATE bookings SET status = 'ended', creative_path = '/uploads/purge-test/keep.png', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [victim.id]
  );
  const keepFile = path.join(dir, 'keep.png');
  fs.writeFileSync(keepFile, Buffer.from([1]));
  await purgeEndedCreatives({ graceDays: 30 });
  assert.ok(fs.existsSync(keepFile), 'inside grace: file kept');
  fs.rmSync(dir, { recursive: true, force: true });

  // Blob URLs delete through the SDK (mocked).
  const blobPath = require.resolve('@vercel/blob');
  const realBlob = require(blobPath);
  const dels = [];
  require.cache[blobPath].exports = { ...realBlob, del: async (url) => dels.push(url) };
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  try {
    await deleteStoredCreative('https://store.public.blob.vercel-storage.com/9/x.png');
    assert.deepStrictEqual(dels, ['https://store.public.blob.vercel-storage.com/9/x.png']);
  } finally {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    require.cache[blobPath].exports = realBlob;
  }
});

test('lease-expiry cron runs the creative purge and reports it', () => {
  const src = read('platform/scripts/lease-expiry.js');
  assert.ok(src.includes('runCreativePurge'), 'purge wired into the daily cron');
  assert.ok(src.includes('endedCreativesPurged'), 'purge results reported');
});

// ─────────────────────────────────────────────────────────────
// Upload guard: malware-shaped and bomb-shaped inputs never reach a decoder.
// ─────────────────────────────────────────────────────────────

const {
  guardImageBuffer,
  sniffImageType,
  MAX_DIMENSION,
} = require('../platform/api/upload-guard.js');

function fakePngDataUrl(width, height) {
  // A structurally valid PNG header (correct signature + IHDR) claiming huge
  // dimensions — imageSize reads these from the header without decoding any
  // pixels, which is exactly what a dimension bomb relies on.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type truecolor
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); // bogus CRC is fine: imageSize does not verify it
    return Buffer.concat([len, body, crc]);
  };
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.from([0x78, 0x9c])),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

test('guard: magic bytes are sniffed, not trusted', async () => {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(4, 4);
  canvas.getContext('2d').fillRect(0, 0, 4, 4);
  const realPng = canvas.toBuffer('image/png');
  const realJpg = canvas.toBuffer('image/jpeg');

  assert.strictEqual(sniffImageType(realPng), 'png');
  assert.strictEqual(sniffImageType(realJpg), 'jpg');
  const webp = await require('sharp')(realPng).webp().toBuffer();
  assert.strictEqual(sniffImageType(webp), 'webp');

  assert.strictEqual(sniffImageType(Buffer.from('MZ\x90\x00'.padEnd(64, '\x00'), 'binary')), null);
  assert.strictEqual(sniffImageType(Buffer.from('PK\x03\x04'.padEnd(64, '\x00'), 'binary')), null);
  assert.strictEqual(sniffImageType(Buffer.from('<svg onload="alert(1)"/>', 'utf8')), null);

  // Declared MIME must match sniffed content.
  const mismatch = guardImageBuffer(realPng, 'image/jpeg');
  assert.ok(mismatch.error, 'png labeled as jpeg is rejected');
  const exe = guardImageBuffer(Buffer.from('MZ\x90\x00'.padEnd(64, '\x00'), 'binary'), 'image/png');
  assert.ok(exe.error, 'executable labeled as png is rejected');
});

test('guard: dimension bombs rejected at header-parse cost', async () => {
  const bomb = Buffer.from(
    fakePngDataUrl(MAX_DIMENSION * 8, MAX_DIMENSION * 8).split(',')[1],
    'base64'
  );
  const result = guardImageBuffer(bomb, 'image/png');
  assert.ok(result.error, 'oversized-dimension bomb rejected');
  assert.ok(result.error.includes('exceed the maximum'), `unexpected error: ${result.error}`);
});

async function makePendingBooking() {
  // Fresh pending_upload booking: earlier suite tests move the shared fixture
  // out of the upload-allowed statuses.
  const slot = await get(
    'SELECT id, site_slug, width, height FROM ad_slots WHERE width = 1200 AND height = 400 LIMIT 1'
  );
  const token = `sectoken${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  await run(
    `INSERT INTO bookings (slot_id, email, company_name, analytics_token, status, lease_months, site_slug)
     VALUES ($1, 'sec@test.co', 'Sec Co', $2, 'pending_upload', 12, $3)`,
    [slot.id, token, slot.site_slug]
  );
  return { token };
}

test('booking upload: executable and bomb payloads get a 400, not a decode', async () => {
  const { token } = await makePendingBooking();
  const exe = `data:image/png;base64,${Buffer.from('MZ\x90\x00'.padEnd(256, '\x00'), 'binary').toString('base64')}`;
  const bad = await uploadBookingCreative(
    token,
    {
      image: exe,
      filename: 'evil.exe',
    },
    { notifyAdminPending: async () => {} }
  );
  assert.strictEqual(bad.status, 400, 'executable rejected');
  assert.ok(bad.body.error.includes('do not match'), `unexpected error: ${bad.body.error}`);

  const bomb = await uploadBookingCreative(
    token,
    {
      image: fakePngDataUrl(50000, 50000),
      filename: 'bomb.png',
    },
    { notifyAdminPending: async () => {} }
  );
  assert.strictEqual(bomb.status, 400, 'dimension bomb rejected');
  assert.ok(bomb.body.error.includes('exceed the maximum'), `unexpected error: ${bomb.body.error}`);
});

test('booking upload: re-encode strips anything appended to the input bytes', async () => {
  const { token } = await makePendingBooking();
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(1200, 400);
  canvas.getContext('2d').fillStyle = '#abcdef';
  canvas.getContext('2d').fillRect(0, 0, 1200, 400);
  const marker = 'EVIL_PAYLOAD_MARKER_7f3a9c';
  const polluted = Buffer.concat([canvas.toBuffer('image/png'), Buffer.from(marker, 'utf8')]);
  assert.strictEqual(sniffImageType(polluted), 'png', 'trailing bytes do not break the sniff');

  const ok = await uploadBookingCreative(
    token,
    {
      image: `data:image/png;base64,${polluted.toString('base64')}`,
      filename: 'polluted.png',
    },
    { notifyAdminPending: async () => {} }
  );
  assert.strictEqual(ok.status, 200, `upload failed: ${JSON.stringify(ok.body)}`);

  // The stored file is a fresh sharp re-encode — the marker cannot survive.
  const rel = ok.body.path.replace('/uploads/', '');
  const stored = fs.readFileSync(path.join('platform/api/public/uploads', rel));
  assert.ok(!stored.includes(marker), 'payload stripped by re-encode');
  const dims = require('image-size').imageSize(stored);
  assert.strictEqual(dims.width, 1200, 'kept at slot width (same aspect, no upscale)');
});

test('marketplace validateImage: sniffs magic bytes and enforces bomb ceilings', async () => {
  const { validateImage } = require('../platform/api/creative-watermark.js');
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(400, 400);
  canvas.getContext('2d').fillRect(0, 0, 400, 400);

  assert.ok(validateImage(canvas.toBuffer('image/png')).dimensions, 'real png accepted');
  assert.ok(
    validateImage(Buffer.from('MZ\x90\x00'.padEnd(256, '\x00'), 'binary')).error,
    'executable rejected before decode'
  );
  const bomb = Buffer.from(fakePngDataUrl(60000, 60000).split(',')[1], 'base64');
  const bombResult = validateImage(bomb);
  assert.ok(bombResult.error, 'bomb rejected before loadImage decode');
  assert.ok(bombResult.error.includes('exceed the maximum'), `unexpected: ${bombResult.error}`);
});

async function runSuite() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(
        `    ${String(err.stack || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nCreative Upload Pipeline: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
