/**
 * Creative Marketplace integration tests
 */

const http = require('node:http');
const assert = require('node:assert');
const express = require('express');
const { Jimp } = require('jimp');
const { setupTestDb, startScholarsServer } = require('../platform/scholars/test-helpers');
const creativeRouter = require('../platform/api/creative-marketplace');
const { moderateAsset } = require('../platform/api/creative-moderation');
const { parseBase64Image } = require('../platform/api/creative-watermark');

async function generateTestImage({ width = 400, height = 400, color = 0xff6b35ff }) {
  const image = new Jimp({ width, height, color });
  const buffer = await image.getBuffer('image/png');
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function startCreativeServer() {
  setupTestDb('creative-marketplace');
  const {
    dbLayer,
    hashPassword,
    sessionHeader,
    ctx,
    cleanup: scholarsCleanup,
  } = await startScholarsServer();

  // Add a creative department to the test institution allowlist.
  dbLayer.updateInstitutionAllowlist(ctx.institutionId, ['Classics', 'History', 'graphic_design']);

  // Create a student in the creative department.
  const student = dbLayer.createUserWithPassword({
    email: 'creative@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Creative Student',
    department: 'graphic_design',
    passwordHash: hashPassword('StudentPass123!'),
    accountStatus: 'active',
  });
  const studentId = student.lastInsertRowid;

  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const studentSessionId = `student-session-${Date.now()}`;
  dbLayer.createSession({ id: studentSessionId, userId: studentId, expiresAt: farFuture });

  const app = express();
  app.use('/api/v1/creatives', creativeRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  function request(method, urlPath, { body = null, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlPath, baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      };

      if (body && typeof body === 'object') {
        const json = JSON.stringify(body);
        options.headers['content-type'] = 'application/json';
        options.headers['content-length'] = Buffer.byteLength(json);
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            if (data && res.headers['content-type']?.includes('application/json')) {
              parsed = JSON.parse(data);
            }
          } catch (_e) {
            // leave as string
          }
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      });

      req.on('error', reject);

      if (body && typeof body === 'object') {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async function cleanup() {
    await new Promise((resolve) => server.close(() => resolve()));
    await scholarsCleanup();
  }

  return {
    dbLayer,
    request,
    sessionHeader,
    cleanup,
    ctx: {
      ...ctx,
      studentId,
      studentSessionId,
    },
  };
}

async function runTests() {
  console.log('\n▸ Creative Marketplace Tests\n');

  // ── Unit: moderation ──
  {
    const ok = moderateAsset({
      title: 'Laurel wreath motif',
      description: 'A myth-inspired pattern suitable for academic study.',
      tags: ['pattern', 'gold'],
    });
    assert.strictEqual(ok.allowed, true, 'clean asset should pass moderation');

    const bad = moderateAsset({
      title: 'Nike swoosh inspired logo',
      description: 'Official brand kit for a sportswear company.',
      tags: ['nike', 'logo'],
    });
    assert.strictEqual(bad.allowed, false, 'trademark asset should be blocked');
    assert.ok(
      bad.findings.some((f) => f.source === 'trademark'),
      'should report trademark finding'
    );
    console.log('  ✓ moderation blocklist allows clean assets and blocks trademarks');
  }

  // ── Unit: base64 parsing ──
  {
    const bad = parseBase64Image('not-valid');
    assert.ok(bad.error, 'invalid data URI should error');
    console.log('  ✓ base64 parser rejects invalid image data');
  }

  // ── Integration: upload and review flow ──
  const { dbLayer, request, cleanup, ctx } = await startCreativeServer();
  try {
    const image = await generateTestImage({ width: 400, height: 400 });

    const uploadRes = await request('POST', '/api/v1/creatives', {
      body: {
        title: 'Victory Laurel Pattern',
        description: 'A repeating laurel pattern inspired by Níkē.',
        department: 'graphic_design',
        inspirationEntryId: 'nike',
        priceCents: 2500,
        tags: ['pattern', 'gold', 'laurel'],
        image,
      },
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(uploadRes.status, 201, `upload failed: ${uploadRes.body?.error}`);
    const assetId = uploadRes.body.data.assetId;
    console.log('  ✓ student can upload a creative asset');

    // Public listing should not show pending asset.
    const publicList = await request('GET', '/api/v1/creatives');
    assert.strictEqual(publicList.status, 200);
    assert.strictEqual(
      publicList.body.data.assets.length,
      0,
      'pending assets are hidden from public'
    );
    console.log('  ✓ public listing excludes pending assets');

    // Reviewer approves asset.
    const reviewRes = await request('POST', `/api/v1/creatives/${assetId}/review`, {
      body: { decision: 'approved', comment: 'Looks good' },
      headers: { 'x-scholars-session': ctx.reviewerSessionId },
    });
    assert.strictEqual(reviewRes.status, 200, `review failed: ${reviewRes.body?.error}`);
    console.log('  ✓ reviewer can approve a pending asset');

    // Public listing now shows the asset.
    const publicList2 = await request('GET', '/api/v1/creatives');
    assert.strictEqual(
      publicList2.body.data.assets.length,
      1,
      'approved asset appears in public list'
    );
    console.log('  ✓ approved asset appears in public listing');

    // Detail endpoint returns the asset.
    const detailRes = await request('GET', `/api/v1/creatives/${assetId}`);
    assert.strictEqual(detailRes.status, 200);
    assert.ok(detailRes.body.data.previewPath, 'detail includes preview path');
    console.log('  ✓ public detail returns asset with preview path');

    // Creator dashboard returns the asset.
    const dashboardRes = await request('GET', '/api/v1/creatives/dashboard', {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(dashboardRes.status, 200);
    assert.strictEqual(dashboardRes.body.data.assets.length, 1);
    console.log('  ✓ creator dashboard lists uploaded asset');

    // Institution dashboard returns stats.
    const instDashboardRes = await request('GET', '/api/v1/creatives/institution/dashboard', {
      headers: { 'x-scholars-session': ctx.adminSessionId },
    });
    assert.strictEqual(instDashboardRes.status, 200);
    assert.strictEqual(instDashboardRes.body.data.approvedCount, 1);
    console.log('  ✓ institution dashboard reports approved count');

    // Tags are persisted and returned in public listings.
    const taggedList = await request('GET', '/api/v1/creatives');
    assert.strictEqual(taggedList.status, 200);
    assert.ok(Array.isArray(taggedList.body.data.assets[0]?.tags), 'tags array present');
    assert.ok(
      taggedList.body.data.assets[0].tags.includes('pattern'),
      'uploaded tag appears in listing'
    );
    console.log('  ✓ tags appear in public marketplace listing');

    // Departments endpoint returns the institution allowlist.
    const departmentsRes = await request('GET', '/api/v1/creatives/departments', {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(departmentsRes.status, 200);
    assert.ok(
      departmentsRes.body.data.departments.includes('graphic_design'),
      'allowlist contains creative department'
    );
    console.log('  ✓ creator studio fetches institution departments dynamically');

    // Reviewer feedback is visible to the creator.
    const feedbackRes = await request('GET', '/api/v1/creatives/reviews', {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(feedbackRes.status, 200);
    assert.strictEqual(feedbackRes.body.data.reviews.length, 1);
    assert.strictEqual(feedbackRes.body.data.reviews[0].decision, 'approved');
    console.log('  ✓ creator sees reviewer feedback');

    // Purchase verify returns a download link after payment and accrues a payout.
    const purchaseResult = dbLayer.createCreativePurchase({
      assetId,
      licenseeBookingId: null,
      licenseeEmail: 'buyer@example.com',
      licenseType: 'single_use',
      priceCents: 2500,
      platformFeeCents: 750,
      creatorPayoutCents: 1750,
      universityCreditCents: 1750,
    });
    const purchaseId = purchaseResult.lastInsertRowid;
    const stripeSessionId = `cs_test_${Date.now()}`;
    dbLayer.updateCreativePurchaseStatus(purchaseId, { status: 'paid', stripeSessionId });
    const verifyRes = await request(
      'GET',
      `/api/v1/creatives/purchases/verify?sessionId=${encodeURIComponent(stripeSessionId)}`
    );
    assert.strictEqual(verifyRes.status, 200);
    assert.ok(verifyRes.body.data.downloadUrl, 'verify response includes download url');
    assert.strictEqual(verifyRes.body.data.assetId, assetId);
    const payouts = dbLayer.listCreativePayouts(ctx.studentId);
    assert.ok(
      payouts.some((p) => p.purchase_id === purchaseId),
      'payout accrued for creator'
    );
    console.log('  ✓ paid purchase verify returns download url and accrues payout');

    // All-access pass grants download access to any approved asset.
    const passResult = dbLayer.createCreativePurchase({
      assetId: null,
      licenseeBookingId: null,
      licenseeEmail: 'sponsor@brand.com',
      licenseType: 'all_access_pass',
      priceCents: 99900,
      platformFeeCents: 29970,
      creatorPayoutCents: 69930,
      universityCreditCents: 69930,
    });
    const passId = passResult.lastInsertRowid;
    dbLayer.updateCreativePurchaseStatus(passId, { status: 'paid' });
    const downloadRes = await request(
      'GET',
      `/api/v1/creatives/${assetId}/download?email=${encodeURIComponent('sponsor@brand.com')}`
    );
    assert.strictEqual(downloadRes.status, 200);
    console.log('  ✓ all-access pass grants download access');

    // Public creator profile endpoint returns approved assets.
    const profileRes = await request('GET', `/api/v1/creatives/creators/${ctx.studentId}`);
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.body.data.assets.length, 1);
    assert.strictEqual(profileRes.body.data.id, ctx.studentId);
    console.log('  ✓ public creator profile lists approved assets');

    // Creator analytics endpoint returns view and purchase counts.
    const analyticsRes = await request('GET', '/api/v1/creatives/analytics/creator', {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(analyticsRes.body.data.purchases, 1);
    assert.ok(analyticsRes.body.data.views >= 1, 'analytics includes views');
    console.log('  ✓ creator analytics reflects views and purchases');
  } finally {
    await cleanup();
  }

  console.log('\nCreative Marketplace tests complete.\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
