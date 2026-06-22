/**
 * PÚNYCODEX — Edge Function sample for the Authenticity Shield.
 *
 * This module targets Vercel Edge Functions (WinterCG-compatible runtimes).
 * It caches classification results at the CDN edge using a deterministic key
 * derived from the normalized input, model version, and tenant policy hash.
 *
 * In production, point a route such as `/api/edge/authenticity/check` to this
 * function. It will serve cache hits directly and forward misses to the origin
 * `/api/v2/authenticity/check` endpoint.
 */

const MODEL_VERSION = '2.0.6'; // Keep in sync with data-version.json.

function sha256Hex(message) {
  // Edge runtimes support crypto.subtle; Node tests can also load this module.
  const msgBuffer = new TextEncoder().encode(message);
  return crypto.subtle.digest('SHA-256', msgBuffer).then((buf) => {
    const bytes = new Uint8Array(buf);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

function normalizeInput(input) {
  return String(input || '').trim().normalize('NFC').toLowerCase();
}

function cacheKey(input, type, policyHash) {
  const payload = `${normalizeInput(input)}|${type}|${MODEL_VERSION}|${policyHash}`;
  return sha256Hex(payload);
}

function cacheTtl(verdict) {
  switch (verdict) {
    case 'canonical':
    case 'verified-variant':
    case 'safe':
      return 86400;
    case 'suspicious':
    case 'deceptive':
    case 'known-threat':
    case 'homograph-spoof':
    case 'mixed-script-spoof':
    case 'lookalike-domain':
    case 'unsafe':
      return 300;
    default:
      return 3600;
  }
}

export default async function handler(request) {
  const url = new URL(request.url);
  const input = url.searchParams.get('input');
  const type = url.searchParams.get('type') || 'auto';
  const policyHash = request.headers.get('x-tenant-id') || 'default';

  if (!input) {
    return new Response(JSON.stringify({ error: 'Query parameter "input" is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Edge KV/cache is not implemented in this sample; the code demonstrates the
  // contract and cache-key derivation. A production deployment would check
  // `process.env.VERCEL_EDGE_CONFIG` or a Cloudflare KV binding here.
  const edgeCacheDisabled = url.searchParams.has('nocache');
  const key = await cacheKey(input, type, policyHash);

  const originUrl = `${url.origin}/api/v2/authenticity/check?input=${encodeURIComponent(
    input
  )}&type=${encodeURIComponent(type)}`;

  try {
    const originResponse = await fetch(originUrl, {
      headers: { 'x-tenant-id': policyHash },
      cf: { cacheTtl: edgeCacheDisabled ? 0 : 3600 },
    });

    const body = await originResponse.text();
    let verdict = 'unknown';
    try {
      const parsed = JSON.parse(body);
      verdict = parsed?.data?.verdict || parsed?.verdict || 'unknown';
    } catch {
      // keep default
    }

    const headers = new Headers(originResponse.headers);
    headers.set('X-Punycodex-Edge-Cache-Key', key);
    headers.set('X-Punycodex-Edge-Cache-Ttl', String(cacheTtl(verdict)));
    headers.set('X-Punycodex-Edge-Model-Version', MODEL_VERSION);

    return new Response(body, {
      status: originResponse.status,
      headers,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Edge origin fetch failed.', message: err.message }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
