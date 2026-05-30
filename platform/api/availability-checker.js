/**
 * PUNYCODEX — Domain Availability Checker
 * Fast, honest DNS + HTTP probes.
 */

const dns = require('dns');

const DNS_TIMEOUT = 3000;
const HTTP_TIMEOUT = 4000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    )
  ]);
}

async function checkDomain(domain) {
  const clean = domain.trim().toLowerCase();
  const checkedAt = new Date().toISOString();

  // Step 1: Fast DNS resolve
  let resolves = false;
  let ip = null;
  try {
    const records = await withTimeout(
      new Promise((resolve, reject) => {
        dns.resolve4(clean, (err, addresses) => {
          if (err) reject(err);
          else resolve(addresses);
        });
      }),
      DNS_TIMEOUT
    );
    resolves = records && records.length > 0;
    ip = records[0];
  } catch (dnsErr) {
    const msg = dnsErr.message || '';
    const code = dnsErr.code || '';
    if (msg.includes('TIMEOUT')) {
      return { status: 'unknown', details: 'DNS timeout', ip: null, httpStatus: null, checkedAt };
    }
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return { status: 'available', details: 'NXDOMAIN', ip: null, httpStatus: null, checkedAt };
    }
    // Try lookup as fallback
    try {
      const lookup = await withTimeout(
        new Promise((resolve, reject) => {
          dns.lookup(clean, (err, address) => {
            if (err) reject(err);
            else resolve(address);
          });
        }),
        DNS_TIMEOUT
      );
      resolves = true;
      ip = lookup;
    } catch {
      return { status: 'available', details: 'No DNS records', ip: null, httpStatus: null, checkedAt };
    }
  }

  if (!resolves) {
    return { status: 'available', details: 'No DNS records', ip: null, httpStatus: null, checkedAt };
  }

  // Step 2: HTTP probe (https first, then http)
  for (const protocol of ['https', 'http']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

      const response = await fetch(`${protocol}://${clean}/`, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'PUNYCODEX-AvailabilityChecker/1.0',
          'Accept': 'text/html'
        }
      });

      clearTimeout(timer);

      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');

      if (response.status >= 200 && response.status < 400 && isHtml) {
        return { status: 'live', details: `HTTP ${response.status}`, ip, httpStatus: response.status, protocol, checkedAt };
      }

      return { status: 'registered', details: `HTTP ${response.status} (${isHtml ? 'HTML' : 'non-HTML'})`, ip, httpStatus: response.status, protocol, checkedAt };
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') continue;
      if (fetchErr.message && fetchErr.message.includes('TIMEOUT')) continue;
      // Try next protocol
      continue;
    }
  }

  return { status: 'registered', details: 'DNS resolves, no HTTP', ip, httpStatus: null, protocol: null, checkedAt };
}

async function checkBulk(domains, concurrency = 10, onProgress = null) {
  const results = [];
  let completed = 0;

  async function processOne(domain) {
    const result = await checkDomain(domain);
    completed++;
    if (onProgress) onProgress(completed, domains.length, domain, result);
    return { domain, ...result };
  }

  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
  }

  return results;
}

module.exports = { checkDomain, checkBulk };
