/**
 * PuniCodex — DNS Enricher
 *
 * Resolves basic DNS records for a domain and, when possible, estimates domain
 * age from a WHOIS creation date. Includes a synchronous mock helper for tests.
 */

const dns = require('node:dns');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');

const DNS_TIMEOUT_MS = 3000;
const NEWLY_REGISTERED_DAYS = 30;

const resolveA = promisify(dns.resolve4.bind(dns));
const resolveMx = promisify(dns.resolveMx.bind(dns));
const resolveNs = promisify(dns.resolveNs.bind(dns));
const resolveTxt = promisify(dns.resolveTxt.bind(dns));

function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timer]);
}

async function safeResolve(fn, hostname) {
  try {
    const result = await withTimeout(fn(hostname), DNS_TIMEOUT_MS);
    return result;
  } catch {
    return null;
  }
}

async function queryWhoisCreationDate(domain) {
  return new Promise((resolve) => {
    execFile('whois', [domain], { timeout: DNS_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error || (!stdout && !stderr)) {
        resolve(null);
        return;
      }
      const output = stdout || stderr || '';
      // Common patterns: "Creation Date: 2020-01-01T00:00:00Z" or "created: 2020-01-01"
      const patterns = [
        /creation date:\s*(\d{4}-\d{2}-\d{2})/i,
        /created:\s*(\d{4}-\d{2}-\d{2})/i,
        /created on:\s*(\d{4}-\d{2}-\d{2})/i,
        /registration time:\s*(\d{4}-\d{2}-\d{2})/i,
      ];
      for (const re of patterns) {
        const match = re.exec(output);
        if (match) {
          resolve(new Date(match[1]));
          return;
        }
      }
      resolve(null);
    });
  });
}

function computeAgeDays(creationDate) {
  if (!creationDate || Number.isNaN(creationDate.getTime())) return null;
  const ms = Date.now() - creationDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function enrichDomain(domain) {
  const hostname = String(domain)
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^[^@]*@/, '')
    .replace(/:\d+$/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '');

  const [aRecords, mxRecords, nsRecords, txtRecords] = await Promise.all([
    safeResolve(resolveA, hostname),
    safeResolve(resolveMx, hostname),
    safeResolve(resolveNs, hostname),
    safeResolve(resolveTxt, hostname),
  ]);

  const hasA = Array.isArray(aRecords) && aRecords.length > 0;
  const hasMx = Array.isArray(mxRecords) && mxRecords.length > 0;
  const hasNs = Array.isArray(nsRecords) && nsRecords.length > 0;
  const txtFlat = Array.isArray(txtRecords)
    ? txtRecords.map((record) => (Array.isArray(record) ? record.join('') : String(record)))
    : [];

  const resolves = hasA || hasMx || hasNs;

  let ageDays = null;
  let isNewlyRegistered = null;
  let error = null;

  if (resolves) {
    try {
      const creationDate = await queryWhoisCreationDate(hostname);
      ageDays = computeAgeDays(creationDate);
      isNewlyRegistered = ageDays !== null ? ageDays < NEWLY_REGISTERED_DAYS : null;
    } catch (e) {
      error = e.message;
    }
  }

  return {
    resolves,
    hasA,
    hasMx,
    hasNs,
    txtRecords: txtFlat,
    ageDays,
    isNewlyRegistered,
    error,
  };
}

function mockEnrichDomain(_domain, record = {}) {
  const ageDays = Object.hasOwn(record, 'ageDays') ? record.ageDays : null;
  const isNewlyRegistered =
    ageDays !== null && ageDays !== undefined ? ageDays < NEWLY_REGISTERED_DAYS : null;
  const defaults = {
    resolves: false,
    hasA: false,
    hasMx: false,
    hasNs: false,
    txtRecords: [],
    ageDays,
    isNewlyRegistered,
    error: undefined,
  };
  return { ...defaults, ...record, isNewlyRegistered };
}

module.exports = {
  enrichDomain,
  mockEnrichDomain,
  DNS_TIMEOUT_MS,
  NEWLY_REGISTERED_DAYS,
};
