/**
 * Creator merch pipeline tests
 *
 * Covers: consent recorded only for verified accounts, approval-with-consent
 * auto-listing, exact revenue-split math (odd cent to platform), withdrawal
 * excluding products from the store endpoint, and earnings summary totals.
 */

const http = require('node:http');
const assert = require('node:assert');
const express = require('express');
const { Jimp } = require('jimp');
const { setupTestDb, startScholarsServer } = require('../platform/scholars/test-helpers');
const creativeRouter = require('../platform/api/creative-marketplace');
const {
  computeOrderSplit,
  recordCreatorOrder,
  handleMerchOrderPaid,
  getCreatorProductByAssetId,
} = require('../platform/api/creator-merch');
const { migrate: migrateCreatorMerch } = require('../platform/db/migrate-creator-merch');

async function generateTestImage({ width = 400, height = 400, color = 0xff6b35ff }) {
  const image = new Jimp({ width, height, color });
  const buffer = await image.getBuffer('image/png');
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

function fetchStoreProducts() {
  // Required lazily: the handler runs its idempotent migration at load time,
  // which needs PUNICODEX_TEST_DB_PATH and the creatives tables in place.
  const handler = require('../api/store/products');
  const res = createMockRes();
  handler({ method: 'GET', headers: {} }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  return res.body.products;
}

async function startMerchServer() {
  setupTestDb('creator-merch');
  const { dbLayer, hashPassword, ctx, cleanup: scholarsCleanup } = await startScholarsServer();
  const { getDb } = require('../platform/db/connection');
  const db = getDb();

  // The merch migration runs on serverless cold starts; tests mount the
  // router directly, so run it here. Twice, to prove idempotency.
  migrateCreatorMerch(db);
  migrateCreatorMerch(db);

  dbLayer.updateInstitutionAllowlist(ctx.institutionId, ['Classics', 'History', 'graphic_design']);

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

  // Active account, but not eligible for the creatives program (department
  // outside the institution allowlist) — canSubmitCreative() must refuse.
  const outsider = dbLayer.createUserWithPassword({
    email: 'outsider@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Outside Student',
    department: 'chemistry',
    passwordHash: hashPassword('StudentPass123!'),
    accountStatus: 'active',
  });
  const outsiderId = outsider.lastInsertRowid;

  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const studentSessionId = `student-session-${Date.now()}`;
  const outsiderSessionId = `outsider-session-${Date.now()}`;
  dbLayer.createSession({ id: studentSessionId, userId: studentId, expiresAt: farFuture });
  dbLayer.createSession({ id: outsiderSessionId, userId: outsiderId, expiresAt: farFuture });

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
    db,
    request,
    cleanup,
    ctx: { ...ctx, studentId, studentSessionId, outsiderId, outsiderSessionId },
  };
}

async function runTests() {
  console.log('\n▸ Creator Merch Tests\n');

  // ── Unit: revenue split math ──
  {
    const split = computeOrderSplit({ grossCents: 2800, baseCents: 1300, feesCents: 112 });
    assert.deepStrictEqual(split, {
      netMarginCents: 1388,
      creatorShareCents: 694,
      platformShareCents: 694,
    });

    const odd = computeOrderSplit({ grossCents: 2801, baseCents: 1300, feesCents: 112 });
    assert.strictEqual(odd.netMarginCents, 1389);
    assert.strictEqual(odd.creatorShareCents, 694, 'creator gets the floor');
    assert.strictEqual(odd.platformShareCents, 695, 'odd cent goes to the platform');
    assert.strictEqual(odd.creatorShareCents + odd.platformShareCents, odd.netMarginCents);

    const loss = computeOrderSplit({ grossCents: 1000, baseCents: 1300, feesCents: 112 });
    assert.deepStrictEqual(loss, {
      netMarginCents: -412,
      creatorShareCents: 0,
      platformShareCents: 0,
    });
    console.log('  ✓ split math is exact; odd cent to platform; non-positive margin pays nobody');
  }

  // ── Integration: consent, listing, store, withdrawal, accounting ──
  const { db, request, cleanup, ctx } = await startMerchServer();
  try {
    const image = await generateTestImage({ width: 400, height: 400 });

    // Consent is never recorded for accounts the API cannot verify.
    const outsiderRes = await request('POST', '/api/v1/creatives', {
      body: {
        title: 'Unverified Work',
        description: 'Should never be accepted.',
        department: 'chemistry',
        priceCents: 1000,
        image,
        merchConsent: true,
      },
      headers: { 'x-scholars-session': ctx.outsiderSessionId },
    });
    assert.strictEqual(outsiderRes.status, 403, `expected 403, got ${outsiderRes.status}`);
    assert.strictEqual(
      db.prepare('SELECT COUNT(*) AS count FROM creative_assets').get().count,
      0,
      'no asset (and no consent) recorded for unverified account'
    );
    console.log('  ✓ merch consent is recorded only for verified accounts');

    // Verified student uploads with consent.
    const uploadRes = await request('POST', '/api/v1/creatives', {
      body: {
        title: 'Victory Laurel Pattern',
        description: 'A repeating laurel pattern inspired by Níkē.',
        department: 'graphic_design',
        inspirationEntryId: 'nike',
        priceCents: 2500,
        image,
        merchConsent: true,
      },
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(uploadRes.status, 201, `upload failed: ${uploadRes.body?.error}`);
    const consentedAssetId = uploadRes.body.data.assetId;
    const consentedRow = db
      .prepare('SELECT * FROM creative_assets WHERE id = ?')
      .get(consentedAssetId);
    assert.strictEqual(consentedRow.merch_consent, 1, 'consent flag stored');
    assert.ok(consentedRow.merch_consent_at, 'consent timestamp stored');
    assert.strictEqual(consentedRow.merch_rev_share, 0.5, 'default 50% revenue share stored');
    console.log('  ✓ verified upload records consent flag, timestamp, and 50% share');

    // Second upload without consent.
    const noConsentRes = await request('POST', '/api/v1/creatives', {
      body: {
        title: 'Obsidian Trident Study',
        description: 'A study of trident silhouettes.',
        department: 'graphic_design',
        priceCents: 1800,
        image,
      },
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(noConsentRes.status, 201);
    const plainAssetId = noConsentRes.body.data.assetId;
    assert.strictEqual(
      db.prepare('SELECT merch_consent FROM creative_assets WHERE id = ?').get(plainAssetId)
        .merch_consent,
      0,
      'no consent recorded when the checkbox is unticked'
    );

    // Approving the consented asset auto-creates a live store product.
    const reviewRes = await request('POST', `/api/v1/creatives/${consentedAssetId}/review`, {
      body: { decision: 'approved', comment: 'Great work' },
      headers: { 'x-scholars-session': ctx.reviewerSessionId },
    });
    assert.strictEqual(reviewRes.status, 200, `review failed: ${reviewRes.body?.error}`);
    const product = getCreatorProductByAssetId(consentedAssetId);
    assert.ok(product, 'product auto-created on approval with consent');
    assert.strictEqual(product.status, 'live');
    assert.strictEqual(product.product_type, 'poster', 'default product type is the poster');
    assert.strictEqual(product.price_cents, 2900, 'price from the module config map');
    assert.strictEqual(product.base_cost_cents, 1100, 'base cost from pod-integration.md figures');
    assert.strictEqual(product.creator_name, 'Creative Student');
    assert.strictEqual(product.creator_university, 'Load Test Academy');
    assert.ok(product.image_path, 'product carries an image reference');
    console.log('  ✓ approval with consent auto-creates a live product with catalog defaults');

    // Approving the non-consented asset creates nothing.
    const plainReview = await request('POST', `/api/v1/creatives/${plainAssetId}/review`, {
      body: { decision: 'approved' },
      headers: { 'x-scholars-session': ctx.reviewerSessionId },
    });
    assert.strictEqual(plainReview.status, 200);
    assert.strictEqual(
      getCreatorProductByAssetId(plainAssetId),
      undefined,
      'no product without consent'
    );
    console.log('  ✓ approval without consent lists nothing');

    // Store endpoint surfaces the live product in the static-catalog shape.
    let storeProducts = fetchStoreProducts();
    assert.strictEqual(storeProducts.length, 1);
    assert.strictEqual(storeProducts[0].id, `creator-${product.id}`);
    assert.strictEqual(storeProducts[0].price, 29);
    assert.strictEqual(storeProducts[0].category, 'art-prints');
    assert.deepStrictEqual(storeProducts[0].creator, {
      name: 'Creative Student',
      university: 'Load Test Academy',
    });
    // The artwork's inspiration entry surfaces as the temple linkage so the
    // collection page can place creator editions inside the right temple.
    assert.strictEqual(storeProducts[0].temple, 'nike');
    console.log('  ✓ store endpoint returns the live product with the creator badge payload');

    // Only the creator can opt in; a reviewer session is refused.
    const forbiddenOptIn = await request('POST', `/api/v1/creatives/${plainAssetId}/merch/opt-in`, {
      headers: { 'x-scholars-session': ctx.reviewerSessionId },
    });
    assert.strictEqual(forbiddenOptIn.status, 403);

    // Creator opt-in on an already-approved asset lists it immediately.
    const optInRes = await request('POST', `/api/v1/creatives/${plainAssetId}/merch/opt-in`, {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(optInRes.status, 200, `opt-in failed: ${optInRes.body?.error}`);
    const secondProduct = getCreatorProductByAssetId(plainAssetId);
    assert.ok(secondProduct, 'opt-in on approved asset creates the product');
    assert.strictEqual(secondProduct.status, 'live');
    storeProducts = fetchStoreProducts();
    assert.strictEqual(storeProducts.length, 2, 'store now lists both consented works');
    const plainListing = storeProducts.find((p) => p.id === `creator-${secondProduct.id}`);
    assert.ok(plainListing, 'opted-in product present in the store listing');
    assert.strictEqual(plainListing.temple, null, 'no inspiration entry → no temple linkage');
    console.log('  ✓ creator opt-in re-lists an approved asset; other roles are refused');

    // Withdrawal revokes consent and pulls the product from the store.
    const withdrawRes = await request(
      'POST',
      `/api/v1/creatives/${consentedAssetId}/merch/withdraw`,
      { headers: { 'x-scholars-session': ctx.studentSessionId } }
    );
    assert.strictEqual(withdrawRes.status, 200);
    assert.strictEqual(getCreatorProductByAssetId(consentedAssetId).status, 'withdrawn');
    const afterWithdraw = db
      .prepare('SELECT merch_consent, merch_consent_at FROM creative_assets WHERE id = ?')
      .get(consentedAssetId);
    assert.strictEqual(afterWithdraw.merch_consent, 0, 'consent flag revoked');
    assert.ok(afterWithdraw.merch_consent_at, 'original consent timestamp kept for audit');
    storeProducts = fetchStoreProducts();
    assert.strictEqual(storeProducts.length, 1, 'withdrawn product leaves the store');
    assert.strictEqual(storeProducts[0].id, `creator-${secondProduct.id}`);
    console.log('  ✓ withdrawal revokes consent and excludes the product from the store endpoint');

    // Order accounting: split computed at order time, idempotent on order_ref.
    const order1 = recordCreatorOrder({
      orderRef: 'cm-order-1',
      productId: secondProduct.id,
      grossCents: 2800,
      feesCents: 112,
    });
    assert.strictEqual(order1.netMarginCents, 1588, 'base cost defaults to the product base');
    assert.strictEqual(order1.creatorShareCents, 794);
    assert.strictEqual(order1.platformShareCents, 794);

    const duplicate = recordCreatorOrder({
      orderRef: 'cm-order-1',
      productId: secondProduct.id,
      grossCents: 2800,
      feesCents: 112,
    });
    assert.strictEqual(duplicate.alreadyRecorded, true, 'duplicate order_ref is a no-op');
    assert.strictEqual(
      db.prepare('SELECT COUNT(*) AS count FROM creator_order_ledger').get().count,
      1,
      'duplicate webhook delivery cannot double-count'
    );

    const order2 = recordCreatorOrder({
      orderRef: 'cm-order-2',
      productId: secondProduct.id,
      grossCents: 2802,
      baseCents: 1100,
      feesCents: 113,
    });
    assert.strictEqual(order2.netMarginCents, 1589);
    assert.strictEqual(order2.creatorShareCents, 794);
    assert.strictEqual(order2.platformShareCents, 795);

    // The documented webhook stub validates and records the same way.
    const stubbed = handleMerchOrderPaid({
      orderRef: 'cm-order-3',
      productId: secondProduct.id,
      grossCents: 2800,
      feesCents: 112,
    });
    assert.strictEqual(stubbed.alreadyRecorded, false);
    assert.strictEqual(stubbed.creatorShareCents, 794);

    assert.throws(
      () => recordCreatorOrder({ orderRef: 'cm-order-x', productId: 99999, grossCents: 100 }),
      /Unknown creator product/,
      'unknown products are rejected'
    );
    console.log('  ✓ ledger writes are exact, idempotent on order_ref, and validate the product');

    // Earnings summary: per-product breakdown and lifetime total.
    const earningsRes = await request('GET', '/api/v1/creatives/merch/earnings', {
      headers: { 'x-scholars-session': ctx.studentSessionId },
    });
    assert.strictEqual(earningsRes.status, 200);
    const earnings = earningsRes.body.data;
    const expectedTotal = 794 + 794 + 794;
    assert.strictEqual(earnings.totalEarnedCents, expectedTotal);
    const row = earnings.products.find((p) => p.product_id === secondProduct.id);
    assert.ok(row, 'per-product breakdown includes the sold product');
    assert.strictEqual(row.orders, 3);
    assert.strictEqual(row.creator_share_cents, expectedTotal);
    assert.strictEqual(row.gross_cents, 2800 + 2802 + 2800);

    const unauthEarnings = await request('GET', '/api/v1/creatives/merch/earnings');
    assert.strictEqual(unauthEarnings.status, 401, 'earnings require authentication');
    console.log('  ✓ earnings summary sums correctly and requires authentication');
  } finally {
    await cleanup();
  }

  console.log('\nCreator Merch tests complete.\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
