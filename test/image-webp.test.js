/**
 * WebP upload pipeline tests.
 *
 * Covers the sibling-path convention, real PNG->WebP conversion via sharp,
 * existence-gated serializer output, and the booking-upload integration
 * (upload returns webpPath and the sibling file exists on disk).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  webpSiblingPath,
  writeWebpSibling,
  existingWebpFor,
  WEBP_QUALITY,
} = require('../platform/api/image-webp');

// 1x1 transparent PNG.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function isWebp(buf) {
  return (
    buf.length > 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

const UPLOADS_ROOT = path.join(__dirname, '..', 'platform', 'api', 'public', 'uploads');

async function run() {
  console.log('\n▸ WebP Upload Pipeline Tests\n');

  assert.strictEqual(typeof WEBP_QUALITY, 'number');

  await test('webpSiblingPath maps png/jpg/jpeg to .webp and declines others', () => {
    assert.strictEqual(webpSiblingPath('/uploads/5/1.png'), '/uploads/5/1.webp');
    assert.strictEqual(webpSiblingPath('/uploads/5/1.jpg'), '/uploads/5/1.webp');
    assert.strictEqual(webpSiblingPath('/uploads/5/1.jpeg'), '/uploads/5/1.webp');
    assert.strictEqual(webpSiblingPath('/uploads/5/1.PNG'), '/uploads/5/1.webp');
    assert.strictEqual(webpSiblingPath('/uploads/5/1.webp'), null);
    assert.strictEqual(webpSiblingPath('/uploads/5/1.gif'), null);
    assert.strictEqual(webpSiblingPath(''), null);
    assert.strictEqual(webpSiblingPath(null), null);
  });

  await test('writeWebpSibling encodes a real WebP next to the original', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webp-test-'));
    const pngPath = path.join(dir, 'creative.png');
    fs.writeFileSync(pngPath, PNG_1X1);
    const webpPath = await writeWebpSibling(pngPath, PNG_1X1);
    assert.ok(webpPath, 'sharp must be available and produce a path');
    assert.ok(webpPath.endsWith('.webp'));
    assert.ok(isWebp(fs.readFileSync(webpPath)), 'output must carry RIFF/WEBP magic');
  });

  await test('writeWebpSibling reads from disk when no buffer is given', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webp-test-'));
    const pngPath = path.join(dir, 'creative.png');
    fs.writeFileSync(pngPath, PNG_1X1);
    const webpPath = await writeWebpSibling(pngPath);
    assert.ok(webpPath && isWebp(fs.readFileSync(webpPath)));
  });

  await test('existingWebpFor only advertises siblings that exist under /uploads/', () => {
    const dir = path.join(UPLOADS_ROOT, 'webp-probe');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'probe.png'), PNG_1X1);
    assert.strictEqual(existingWebpFor('/uploads/webp-probe/probe.png'), null);
    fs.writeFileSync(path.join(dir, 'probe.webp'), PNG_1X1); // existence is what matters
    assert.strictEqual(
      existingWebpFor('/uploads/webp-probe/probe.png'),
      '/uploads/webp-probe/probe.webp'
    );
    assert.strictEqual(existingWebpFor('/assets/brand/x.png'), null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  await test('booking upload validates dimensions, then writes original + webp sibling', async () => {
    const { run, get } = require('../platform/db/operational');
    const slot = await get(
      'SELECT id, width, height FROM ad_slots WHERE is_bundle = 0 ORDER BY id LIMIT 1'
    );
    assert.ok(slot, 'golden DB must seed ad_slots');
    const token = `webp-test-${Date.now()}`;
    await run(
      `INSERT INTO bookings (slot_id, email, company_name, status, analytics_token)
       VALUES ($1, $2, $3, 'pending_upload', $4)`,
      [slot.id, 'sponsor@example.com', 'Acme', token]
    );

    const { uploadBookingCreative } = require('../platform/api/booking-upload');

    // Wrong aspect ratio is no longer rejected: the server normalizes every
    // sane image (crop to the slot frame) — the upload UI promised "it will
    // be cropped to fit" and now the server keeps that promise.
    const bad = await uploadBookingCreative(
      token,
      { image: `data:image/png;base64,${PNG_1X1.toString('base64')}`, filename: 'bad.png' },
      {}
    );
    assert.strictEqual(bad.status, 200, 'wrong-ratio uploads are cropped, not rejected');

    // Genuinely unreadable data is still refused, with an honest message.
    await run("UPDATE bookings SET status = 'pending_upload' WHERE analytics_token = $1", [token]);
    const corrupt = await uploadBookingCreative(
      token,
      {
        image: `data:image/png;base64,${Buffer.from('not-a-real-png').toString('base64')}`,
        filename: 'corrupt.png',
      },
      {}
    );
    assert.strictEqual(corrupt.status, 400);
    assert.match(corrupt.body.error, /could not process/i);

    // Exact-size PNG generated with canvas must upload and convert.
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(slot.width, slot.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(0, 0, slot.width, slot.height);
    const png = canvas.toBuffer('image/png');
    const ok = await uploadBookingCreative(
      token,
      { image: `data:image/png;base64,${png.toString('base64')}`, filename: 'creative.png' },
      {}
    );
    assert.strictEqual(ok.status, 200);
    assert.ok(ok.body.path.startsWith('/uploads/'), 'original public path returned');
    assert.ok(ok.body.webpPath, 'webpPath must be present when sharp works');
    const absWebp = path.join(UPLOADS_ROOT, ok.body.webpPath.slice('/uploads/'.length));
    assert.ok(isWebp(fs.readFileSync(absWebp)), 'sibling file is a real WebP');

    const booking = await get('SELECT creative_path FROM bookings WHERE analytics_token = $1', [
      token,
    ]);
    assert.strictEqual(booking.creative_path, ok.body.path);

    fs.rmSync(path.join(UPLOADS_ROOT, String(booking.creative_path.split('/')[2])), {
      recursive: true,
      force: true,
    });
  });

  console.log(`\nWebP pipeline: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
