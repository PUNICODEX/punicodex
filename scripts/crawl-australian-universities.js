#!/usr/bin/env node
/**
 * PuniCodex — Australian university discovery + backlink verification.
 *
 * Extends the university_prospects seed by crawling each institution's
 * public site (robots-respecting, ~1 req/2s, hard page caps):
 *
 *   1. DEPARTMENT DISCOVERY — homepage → faculty/school index pages → unit
 *      names matched against the department-benefit vocabulary in
 *      platform/api/university-pitch-email.js. Matches MERGE into the
 *      prospect's departments (human-curated seed entries are never
 *      removed); discovered-only departments are tagged in the report.
 *   2. CONTACT PAGES — school-office / head-of-school page URLs go into
 *      metadata.contact_pages[] for the operator to choose a recipient.
 *      Personal emails are never scraped (ACMA spam rules).
 *   3. BACKLINK VERIFICATION — the homepage and up to 3 crawled pages are
 *      scanned for a link to punicodex.com; the result feeds the pledge
 *      lifecycle (markBacklink) so a verified pledge is stamped
 *      automatically.
 *
 * Output: data/crawler/universities/YYYY-MM-DD.json (committed by the
 * weekly workflow when it changes).
 *
 * Usage:
 *   node scripts/crawl-australian-universities.js [--dry-run] [--only <slug>]
 *     [--skip-backlinks] [--max-domains N]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const prospects = require(path.join(ROOT, 'platform', 'db', 'university-prospects.js'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_BACKLINKS = args.includes('--skip-backlinks');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const MAX_DOMAINS = args.includes('--max-domains')
  ? Number(args[args.indexOf('--max-domains') + 1])
  : Infinity;

const UA = 'PuniCodex-UniversityDiscovery/1.0 (+https://punicodex.com; scholarly partnership crawler)';
const REQUEST_GAP_MS = 2000;
const FETCH_TIMEOUT_MS = 10000;
const MAX_PAGES_PER_DOMAIN = 6;
const LINK_RE = /href=["']([^"'#]+)["']/gi;
const STRIP_TAGS_RE = /<[^>]*>/g;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        Referer: `https://${new URL(url).host}/`,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const type = String(res.headers.get('content-type') || '');
    // 403/429 = bot shield — return null and let the caller record the
    // domain as blocked (never as "backlink not found": a miss must not
    // downgrade a pledge; only a positive hit verifies).
    if (!res.ok || !type.includes('text/html')) return { blocked: res.status === 403 || res.status === 429, html: null };
    const html = await res.text();
    return html.length > 2_000_000 ? null : html; // cap page weight
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractLinks(html, baseHost) {
  const out = [];
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(html)) !== null) {
    const href = m[1];
    if (!href.startsWith('/')) {
      try {
        const u = new URL(href);
        if (u.host !== baseHost) continue;
        out.push(u.pathname + u.search);
      } catch {
        continue;
      }
    } else {
      out.push(href);
    }
  }
  return out;
}

/** Visible-text words from a page, for unit-name matching. */
function visibleText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(STRIP_TAGS_RE, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// ─── Department vocabulary ────────────────────────────────────
// Single source of truth: the benefit map keys, plus the seed's own naming
// habits. Match on whole phrases against visible text.
const EXTRA_PATTERNS = {
  'ancient history': /\bancient history\b/,
  'classics and ancient history': /\bclassics\b.{0,30}\bancient history\b|\bancient history\b.{0,30}\bclassics\b/,
  classics: /\bclassics\b/,
  egyptology: /\begyptolog/i,
  archaeology: /\barchaeolog/i,
  'religious studies': /\breligious studies\b|\btheolog(y|ical studies)\b/,
  linguistics: /\blinguistic/i,
  'digital humanities': /\bdigital humanities\b/i,
  'indigenous studies': /\bindigenous studies\b|\baboriginal studies\b/i,
  design: /\bschool of design\b|\bdesign\b.{0,20}\b(school|faculty|department)\b/i,
  marketing: /\bmarketing\b.{0,20}\b(school|faculty|department)\b/i,
};

function detectDepartments(text) {
  const found = new Set();
  for (const [name, re] of Object.entries(EXTRA_PATTERNS)) {
    if (re.test(text)) found.add(displayNameFor(name));
  }
  // Canonicalise against the benefit map's keys where possible.
  return [...found];
}

function displayNameFor(key) {
  const map = {
    classics: 'Classics and Ancient History',
    egyptology: 'Egyptology',
    archaeology: 'Archaeology',
    'religious studies': 'Religious Studies',
    linguistics: 'Linguistics',
    'digital humanities': 'Digital Humanities',
    'indigenous studies': 'Indigenous Studies',
    design: 'Design',
    marketing: 'Marketing',
    'ancient history': 'Ancient History',
    'classics and ancient history': 'Classics and Ancient History',
  };
  return map[key] || key;
}

const FACULTY_PATH_HINTS = /facult|schools|departments|units|about.{0,15}structure/i;
const CONTACT_PATH_HINTS = /contact|people|staff|head-of|leadership/i;

function uniqueLimited(paths, limit) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    const clean = p.split('?')[0].replace(/\/+$/, '') || '/';
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

async function crawlDomain(domain) {
  const base = `https://${domain}`;
  const result = {
    domain,
    departments: new Set(),
    contactPages: [],
    backlinkFound: false,
    pagesFetched: 0,
    errors: [],
  };

  const queue = ['/'];
  const visited = new Set();
  const linkBank = []; // all same-host links seen, for the backlink scan

  while (queue.length && result.pagesFetched < MAX_PAGES_PER_DOMAIN) {
    const pagePath = queue.shift();
    if (visited.has(pagePath)) continue;
    visited.add(pagePath);
    const fetched = await fetchText(base + pagePath);
    if (fetched && fetched.blocked) {
      result.errors.push(`blocked (${fetched.blocked}) at ${pagePath}`);
      break;
    }
    const html = fetched ? fetched.html : null;
    if (!html) continue;
    result.pagesFetched++;

    const text = visibleText(html);
    for (const d of detectDepartments(text)) result.departments.add(d);
    linkBank.push(html);

    const links = extractLinks(html, domain);
    result.contactPages.push(
      ...links.filter((l) => CONTACT_PATH_HINTS.test(l)).slice(0, 3),
    );
    // Follow faculty/school index pages first.
    if (pagePath === '/') {
      for (const l of links.filter((x) => FACULTY_PATH_HINTS.test(x))) {
        if (!visited.has(l)) queue.push(l);
      }
      queue.push(...links.filter((l) => !FACULTY_PATH_HINTS.test(l)).slice(0, 2));
    }
    await sleep(REQUEST_GAP_MS);
  }

  result.contactPages = uniqueLimited(result.contactPages, 4);

  if (!SKIP_BACKLINKS) {
    const needle = /punicodex\.com/i;
    result.backlinkFound = linkBank.some((html) => needle.test(html));
  }

  return result;
}

async function main() {
  const all = await prospects.listProspects();
  let targets = all.filter((p) => p.domain && String(p.country || 'AU') === 'AU');
  if (ONLY) targets = targets.filter((p) => p.slug === ONLY);
  if (Number.isFinite(MAX_DOMAINS)) targets = targets.slice(0, MAX_DOMAINS);

  console.log(`University crawl: ${targets.length} domain(s)${DRY_RUN ? ' (dry run)' : ''}.`);
  const report = { date: new Date().toISOString().slice(0, 10), domains: [], changes: [] };

  for (const p of targets) {
    const before = new Set(JSON.parse(p.departments || '[]'));
    const r = await crawlDomain(p.domain);
    const discovered = [...r.departments].filter((d) => !before.has(d));
    report.domains.push({
      slug: p.slug,
      institution: p.institution_name,
      pagesFetched: r.pagesFetched,
      departments: [...r.departments],
      discoveredNew: discovered,
      contactPages: r.contactPages,
      backlinkFound: SKIP_BACKLINKS ? null : r.backlinkFound,
      blocked: r.errors.length > 0,
    });

    if (!DRY_RUN) {
      if (discovered.length) {
        const merged = [...before, ...discovered];
        await prospects.updateDepartments(p.id, merged);
        report.changes.push({ slug: p.slug, addedDepartments: discovered });
      }
      if (!SKIP_BACKLINKS) {
        const { getProspectById, markBacklink } = prospects;
        const current = await getProspectById(p.id);
        // Only flip to verified on a positive hit; never downgrade an
        // already-verified pledge back on a single failed crawl.
        if (r.backlinkFound && current.backlink_status !== 'verified') {
          await markBacklink(p.id, true);
          report.changes.push({ slug: p.slug, backlinkVerified: true });
        }
      }
    }
    console.log(
      `  ${p.slug}: ${r.pagesFetched} page(s)${r.errors.length ? ' · ' + r.errors.join('; ') : ''} · ${r.departments.size} dept match(es) · backlink ${
        SKIP_BACKLINKS ? 'skipped' : r.backlinkFound ? 'FOUND' : r.errors.length ? 'unknown (blocked)' : 'not found'
      }`,
    );
  }

  // Overdue sweep rides along on the same schedule.
  if (!DRY_RUN) {
    const overdue = await prospects.sweepOverdueBacklinks();
    const list = Array.isArray(overdue) ? overdue : [];
    if (list.length) {
      report.changes.push({ overdueBacklinks: list.map((o) => o.institution_name || o.slug) });
      console.log(`  overdue pledges: ${list.length}`);
    }
  }

  const outDir = path.join(ROOT, 'data', 'crawler', 'universities');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${report.date}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report → ${path.relative(ROOT, outFile)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`University crawl stopped: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { detectDepartments, extractLinks, visibleText, uniqueLimited };
