/**
 * PuniCodex — Analytics instrumentation contract tests (Phase 7).
 *
 * Verifies that every cross-product event wired by the Phase 7 instrumentation
 * is registered in platform/api/analytics-events.js, that the registry's
 * validate/normalize pipeline accepts well-formed payloads, and that required
 * properties are enforced.
 */

const assert = require('node:assert');
const test = require('node:test');
const { EVENT_REGISTRY, normalizeEvent } = require('../platform/api/analytics-events.js');

const PHASE7_EVENTS = [
  'sponsor_modal_open',
  'sponsor_apply_submit',
  'sponsor_payment_complete',
  'patron_view',
  'patron_checkout_init',
  'patron_checkout_complete',
  'store_product_view',
  'store_cart_add',
  'store_checkout_init',
  'store_checkout_complete',
  'search_query',
  'search_result_click',
  'tab_switch',
  'outbound_click',
  'newsletter_subscribe',
];

function validBase() {
  return {
    path: '/sites/zeus/',
    session_hash: 'abc123',
  };
}

test('every Phase 7 event is present in the registry', () => {
  for (const name of PHASE7_EVENTS) {
    assert.ok(EVENT_REGISTRY[name], `missing registry entry: ${name}`);
    assert.strictEqual(EVENT_REGISTRY[name].version, 1, `${name} version`);
    assert.ok(Array.isArray(EVENT_REGISTRY[name].requiredProps), `${name} requiredProps`);
    assert.ok(typeof EVENT_REGISTRY[name].validate === 'function', `${name} validate function`);
  }
});

test('path/session_hash are required for temple/product events', () => {
  const pathEvents = [
    'sponsor_modal_open',
    'sponsor_apply_submit',
    'sponsor_payment_complete',
    'patron_view',
    'patron_checkout_init',
    'patron_checkout_complete',
    'store_product_view',
    'store_cart_add',
    'store_checkout_init',
    'store_checkout_complete',
    'tab_switch',
    'outbound_click',
    'newsletter_subscribe',
  ];
  for (const name of pathEvents) {
    assert.ok(EVENT_REGISTRY[name].requiredProps.includes('path'), `${name} requires path`);
    assert.ok(
      EVENT_REGISTRY[name].requiredProps.includes('session_hash'),
      `${name} requires session_hash`
    );
  }
});

test('normalizeEvent accepts valid sponsor_payment_complete', () => {
  const ev = normalizeEvent({
    event_name: 'sponsor_payment_complete',
    ...validBase(),
    slot_id: 'slot-01',
    amount: 42,
    currency: 'USD',
  });
  assert.strictEqual(ev.error, undefined, ev.error);
  assert.strictEqual(ev.event_name, 'sponsor_payment_complete');
  assert.strictEqual(ev.amount, 42);
  assert.strictEqual(ev.slot_id, 'slot-01');
  assert.strictEqual(ev.currency, 'USD');
});

test('normalizeEvent rejects sponsor_payment_complete without amount', () => {
  const ev = normalizeEvent({
    event_name: 'sponsor_payment_complete',
    ...validBase(),
  });
  assert.ok(ev.error, 'should error when amount is missing');
});

test('normalizeEvent accepts valid patron checkout events', () => {
  const init = normalizeEvent({
    event_name: 'patron_checkout_init',
    ...validBase(),
    amount: 5,
    tier_id: '500',
    currency: 'USD',
  });
  assert.strictEqual(init.error, undefined, init.error);
  assert.strictEqual(init.amount, 5);
  assert.strictEqual(init.tier_id, '500');

  const complete = normalizeEvent({
    event_name: 'patron_checkout_complete',
    ...validBase(),
    amount: 7,
    tier_id: '700',
  });
  assert.strictEqual(complete.error, undefined, complete.error);
  assert.strictEqual(complete.amount, 7);
});

test('normalizeEvent accepts valid store events', () => {
  const view = normalizeEvent({
    event_name: 'store_product_view',
    ...validBase(),
    product_id: 'zeus-mug',
  });
  assert.strictEqual(view.error, undefined, view.error);
  assert.strictEqual(view.product_id, 'zeus-mug');

  const add = normalizeEvent({
    event_name: 'store_cart_add',
    ...validBase(),
    product_id: 'zeus-mug',
    quantity: 2,
  });
  assert.strictEqual(add.error, undefined, add.error);
  assert.strictEqual(add.quantity, 2);

  const checkout = normalizeEvent({
    event_name: 'store_checkout_init',
    ...validBase(),
    amount: 22,
    currency: 'USD',
  });
  assert.strictEqual(checkout.error, undefined, checkout.error);
  assert.strictEqual(checkout.amount, 22);

  const complete = normalizeEvent({
    event_name: 'store_checkout_complete',
    ...validBase(),
    amount: 44,
  });
  assert.strictEqual(complete.error, undefined, complete.error);
  assert.strictEqual(complete.amount, 44);
});

test('normalizeEvent rejects store_product_view without product_id', () => {
  const ev = normalizeEvent({
    event_name: 'store_product_view',
    ...validBase(),
  });
  assert.ok(ev.error, 'should error when product_id is missing');
});

test('normalizeEvent accepts valid search events', () => {
  const query = normalizeEvent({
    event_name: 'search_query',
    session_hash: 'abc123',
    query: 'apollo',
    result_count: 12,
  });
  assert.strictEqual(query.error, undefined, query.error);
  assert.strictEqual(query.query, 'apollo');
  assert.strictEqual(query.result_count, 12);

  const click = normalizeEvent({
    event_name: 'search_result_click',
    session_hash: 'abc123',
    query: 'apollo',
    result_id: 'apollo',
    position: 3,
  });
  assert.strictEqual(click.error, undefined, click.error);
  assert.strictEqual(click.result_id, 'apollo');
  assert.strictEqual(click.position, 3);
});

test('normalizeEvent rejects search_result_click without query or result_id', () => {
  const missingQuery = normalizeEvent({
    event_name: 'search_result_click',
    session_hash: 'abc123',
    result_id: 'apollo',
  });
  assert.ok(missingQuery.error, 'should error when query is missing');

  const missingResult = normalizeEvent({
    event_name: 'search_result_click',
    session_hash: 'abc123',
    query: 'apollo',
  });
  assert.ok(missingResult.error, 'should error when result_id is missing');
});

test('normalizeEvent accepts tab_switch and outbound_click', () => {
  const tab = normalizeEvent({
    event_name: 'tab_switch',
    ...validBase(),
    tab_name: 'lore',
  });
  assert.strictEqual(tab.error, undefined, tab.error);
  assert.strictEqual(tab.tab_name, 'lore');

  const out = normalizeEvent({
    event_name: 'outbound_click',
    ...validBase(),
    url: 'https://example.com',
  });
  assert.strictEqual(out.error, undefined, out.error);
  assert.strictEqual(out.url, 'https://example.com');
});

test('normalizeEvent accepts newsletter_subscribe with source', () => {
  const ev = normalizeEvent({
    event_name: 'newsletter_subscribe',
    ...validBase(),
    source: 'footer',
  });
  assert.strictEqual(ev.error, undefined, ev.error);
  assert.strictEqual(ev.source, 'footer');
});

test('normalizeEvent rejects unknown event names', () => {
  const ev = normalizeEvent({ event_name: 'not_real_event', path: '/' });
  assert.ok(ev.error, 'should error for unknown event');
});

test('normalizeEvent coerces numeric strings and clamps out-of-range values', () => {
  const ev = normalizeEvent({
    event_name: 'store_checkout_init',
    ...validBase(),
    amount: '12.50',
    currency: 'USD',
  });
  assert.strictEqual(ev.error, undefined, ev.error);
  assert.strictEqual(ev.amount, 12.5);

  const add = normalizeEvent({
    event_name: 'store_cart_add',
    ...validBase(),
    product_id: 'x',
    quantity: '50000',
  });
  assert.strictEqual(add.quantity, 10000, 'quantity clamps at 10000');

  const query = normalizeEvent({
    event_name: 'search_query',
    session_hash: 's',
    query: 'q',
    result_count: '2000000',
  });
  assert.strictEqual(query.result_count, 1000000, 'result_count clamps at 1000000');
});
