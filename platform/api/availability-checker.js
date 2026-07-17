/**
 * PUNICODEX — Domain Availability Checker
 * Fast, honest DNS + HTTP probes, with optional Verisign RDAP verification.
 */

const dns = require('node:dns');
const { isSafeUrl, isBlockedHost } = require('../crawler');

const DNS_TIMEOUT = 3000;
const HTTP_TIMEOUT = 4000;
const RDAP_TIMEOUT = 5000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

async function checkDnsHttp(domain) {
  const clean = domain.trim().toLowerCase();
  const checkedAt = new Date().toISOString();

  // Reject internal / unsafe targets before any probe
  if (!isSafeUrl(`http://${clean}`)) {
    return {
      status: 'unknown',
      details: 'Unsafe or internal target',
      ip: null,
      httpStatus: null,
      checkedAt,
    };
  }

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
    if (ip && isBlockedHost(ip)) {
      return {
        status: 'unknown',
        details: 'Resolved to unsafe address',
        ip: null,
        httpStatus: null,
        checkedAt,
      };
    }
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
      if (lookup && isBlockedHost(lookup)) {
        return {
          status: 'unknown',
          details: 'Resolved to unsafe address',
          ip: null,
          httpStatus: null,
          checkedAt,
        };
      }
      resolves = true;
      ip = lookup;
    } catch (lookupErr) {
      const lookupMsg = lookupErr.message || '';
      const lookupCode = lookupErr.code || '';
      if (lookupCode === 'ENOTFOUND' || lookupCode === 'ENODATA') {
        return { status: 'available', details: 'NXDOMAIN', ip: null, httpStatus: null, checkedAt };
      }
      return {
        status: 'unknown',
        details: lookupMsg.includes('TIMEOUT') ? 'DNS timeout' : 'DNS error',
        ip: null,
        httpStatus: null,
        checkedAt,
      };
    }
  }

  if (!resolves) {
    return {
      status: 'available',
      details: 'No DNS records',
      ip: null,
      httpStatus: null,
      checkedAt,
    };
  }

  // Step 2: HTTP probe (https first, then http)
  for (const protocol of ['https', 'http']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT);
    try {
      const response = await fetch(`${protocol}://${clean}/`, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'PUNICODEX-AvailabilityChecker/1.0',
          Accept: 'text/html',
        },
      });

      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');

      if (response.status >= 200 && response.status < 400 && isHtml) {
        return {
          status: 'live',
          details: `HTTP ${response.status}`,
          ip,
          httpStatus: response.status,
          protocol,
          checkedAt,
        };
      }

      return {
        status: 'registered',
        details: `HTTP ${response.status} (${isHtml ? 'HTML' : 'non-HTML'})`,
        ip,
        httpStatus: response.status,
        protocol,
        checkedAt,
      };
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') continue;
      if (fetchErr.message?.includes('TIMEOUT')) continue;
      // Try next protocol
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    status: 'registered',
    details: 'DNS resolves, no HTTP',
    ip,
    httpStatus: null,
    protocol: null,
    checkedAt,
  };
}

async function checkWhoisRdap(domain) {
  const clean = domain.trim().toLowerCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RDAP_TIMEOUT);

  try {
    const response = await fetch(
      `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(clean)}`,
      {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'PUNICODEX-RDAP-Probe/1.0 (https://punicodex.com)',
          Accept: 'application/json',
        },
      }
    );

    if (response.status === 200) {
      return { status: 'registered', details: 'RDAP 200' };
    }
    if (response.status === 404) {
      return { status: 'available', details: 'RDAP 404' };
    }
    return { status: 'unknown', details: `RDAP ${response.status}` };
  } catch (fetchErr) {
    const msg = fetchErr.name === 'AbortError' ? 'RDAP timeout' : fetchErr.message || 'RDAP error';
    return { status: 'unknown', details: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function checkDomain(domain, opts = {}) {
  const dnsHttpResult = await checkDnsHttp(domain);
  if (!opts.whoisRdap) {
    return dnsHttpResult;
  }

  const rdapResult = await checkWhoisRdap(domain);

  // A live site wins over everything else.
  if (dnsHttpResult.status === 'live') {
    return {
      ...dnsHttpResult,
      details: `${dnsHttpResult.details}; ${rdapResult.details}`,
    };
  }

  if (rdapResult.status === 'registered') {
    return {
      ...dnsHttpResult,
      status: 'registered',
      details: `RDAP registered; ${dnsHttpResult.details}`,
    };
  }

  if (rdapResult.status === 'available') {
    if (dnsHttpResult.status === 'registered') {
      // DNS resolves but RDAP says unregistered: stale/blocked RDAP, trust DNS.
      return {
        ...dnsHttpResult,
        details: `DNS registered; ${rdapResult.details}`,
      };
    }
    return {
      ...dnsHttpResult,
      status: 'available',
      details: `DNS/RDAP available; ${dnsHttpResult.details}`,
    };
  }

  return {
    ...dnsHttpResult,
    details: `DNS ${dnsHttpResult.status}; ${rdapResult.details}`,
  };
}

async function checkBulk(domains, concurrency = 10, onProgress = null, opts = {}) {
  const results = [];
  let completed = 0;

  async function processOne(domain) {
    const result = await checkDomain(domain, opts);
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

module.exports = { checkDomain, checkBulk, checkWhoisRdap };
