/**
 * PuniCodex — Printful order fulfillment client.
 *
 * Creates and confirms Printful orders for paid merch orders. One order
 * per store order; `external_id` carries our order_ref so Printful
 * webhooks and dashboard views join back to store_orders.
 *
 * Env: PRINTFUL_API_KEY (store-level private token).
 */

const API = 'https://api.printful.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, endpoint, body, attempt = 0) {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error('PRINTFUL_API_KEY is not set');
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 5) {
    const wait = Number(res.headers.get('retry-after') || 2 ** attempt * 2);
    await sleep(wait * 1000);
    return api(method, endpoint, body, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Printful ${method} ${endpoint} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  return json.result;
}

/**
 * Normalize our stored shipping address to Printful's recipient shape.
 * Returns null when the address is unusable (caller queues the order).
 */
function toRecipient({ name, address }) {
  if (!name || !address) return null;
  const a = typeof address === 'string' ? JSON.parse(address) : address;
  if (!a.line1 || !a.city || !a.country || !a.postal_code) return null;
  return {
    name,
    address1: a.line1,
    address2: a.line2 || undefined,
    city: a.city,
    state_code: a.state || undefined,
    country_code: a.country,
    zip: a.postal_code,
  };
}

/**
 * Fetch a Printful order by our external id (order_ref). Returns null when
 * no order carries it. Used to self-heal the "created at Printful but the
 * response never reached us" crash window before retrying a create.
 */
async function getOrderByExternalId(externalId) {
  try {
    return await api('GET', `/orders/@${encodeURIComponent(externalId)}`);
  } catch (err) {
    if (/→ 404:/.test(err.message)) return null;
    throw err;
  }
}

/**
 * Create + confirm a Printful order for a paid store order.
 * @param {object} order — store_orders row (needs order_ref, quantity, shipping fields)
 * @param {number} syncVariantId — Printful sync variant to fulfill
 * @returns {{ id: number, status: string }}
 */
async function createAndConfirmOrder(order, syncVariantId) {
  const recipient = toRecipient({ name: order.shipping_name, address: order.shipping_address });
  if (!recipient) {
    throw new Error('shipping address incomplete — cannot create Printful order');
  }
  let created;
  try {
    created = await api('POST', '/orders', {
      external_id: order.order_ref,
      recipient,
      items: [{ sync_variant_id: syncVariantId, quantity: order.quantity }],
    });
  } catch (err) {
    // Duplicate external_id: a previous attempt created the order but the
    // id never made it back to us. Recover that order instead of failing.
    if (!/external_id/i.test(err.message)) throw err;
    const existing = await getOrderByExternalId(order.order_ref);
    if (!existing) throw err;
    created = existing;
  }
  if (created.status === 'draft') {
    const confirmed = await api('POST', `/orders/${created.id}/confirm`);
    return { id: created.id, status: confirmed.status || 'confirmed' };
  }
  // Already confirmed (or further along) by the earlier attempt.
  return { id: created.id, status: created.status || 'confirmed' };
}

module.exports = { createAndConfirmOrder, getOrderByExternalId, toRecipient };
