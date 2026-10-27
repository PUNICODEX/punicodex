#!/usr/bin/env node
/**
 * PuniCodex — sponsorship scouting engine.
 *
 * Fills the sponsorship frames of the flagship temples with matched
 * businesses. Mirrors the university crawling ecosystem: canonical pattern
 * seats (industry-patterns.json) define WHICH industries belong to each
 * temple; candidate businesses arrive from curated seeds, the crawler's
 * discovered-site index, and manual additions; each candidate is scored
 * against the temple's seats and upserted into business_prospects for the
 * admin portal's preview-first pitch flow.
 *
 * Sources (extensible — add a load*Candidates function and merge):
 *   seed    store/sponsor-seed.json (curated ground truth)
 *   crawl   indexed_sites tenant businesses already on the Unicode web
 *   manual  rows already in the DB with source 'manual' are never touched
 *
 * Usage:
 *   node scripts/scout-temple-sponsors.js [--check] [--temple <id>] [--top <n>]
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'data', 'crawler', 'sponsors');

const vm = require('node:vm');
const ARCHETYPES = vm.runInNewContext(
  `(function(){${fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8')};return ARCHETYPES;})()`
);
const FLAGSHIPS = ARCHETYPES.filter((a) => a.built).map((a) => a.id);
const PATTERNS = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));

const CHECK = process.argv.includes('--check');
const topArg = process.argv.indexOf('--top');
const TOP_N = topArg !== -1 ? Number(process.argv[topArg + 1]) || 5 : 5;
const templeArg = process.argv.indexOf('--temple');
const ONLY_TEMPLE = templeArg !== -1 ? process.argv[templeArg + 1] : null;

/* ── Candidate sources ─────────────────────────────────────────────── */

function loadSeedCandidates() {
  try {
    const seed = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'store', 'sponsor-seed.json'), 'utf8')
    );
    return seed.map((s) => ({
      temple: s.temple,
      business: s.business,
      domain: s.domain || null,
      seat: s.seat,
      source: 'seed',
    }));
  } catch {
    return [];
  }
}

/** Businesses the crawler already discovered on the Unicode web. */
function loadCrawlCandidates() {
  let rows = [];
  try {
    const { getDb } = require(path.join(ROOT, 'platform', 'db', 'connection.js'));
    rows = getDb()
      .prepare(
        `SELECT domain, title, tenant_name, tenant_category, lexicon_entry_id, archetype_score
         FROM indexed_sites
         WHERE tenant_name IS NOT NULL AND tenant_name != ''`
      )
      .all();
  } catch {
    return [];
  }
  return rows.map((r) => ({
    temple: r.lexicon_entry_id || null,
    business: r.tenant_name || r.title || r.domain,
    domain: r.domain,
    seat: r.tenant_category || null, // mapped to a pattern seat at score time
    source: 'crawl',
    archetypeScore: r.archetype_score || 0,
  }));
}

/* ── Scoring ───────────────────────────────────────────────────────── */

/**
 * Score a candidate against a temple's pattern seats (0–100).
 * Weight: seat rank in the temple's map, seat weight, crawl archetype signal.
 */
function scoreCandidate(candidate, seats) {
  if (!seats.length) return { score: 0, signals: [] };
  let score = 0;
  const signals = [];
  const idx = candidate.seat ? seats.findIndex((s) => s.industry === candidate.seat) : -1;
  if (idx !== -1) {
    const seat = seats[idx];
    score += 50 - Math.min(idx, 4) * 5 + (seat.weight || 0) * 10;
    signals.push(
      `${seat.name} seat (rank ${idx + 1}, weight ${seat.weight})${seat.why ? ` — ${seat.why}` : ''}`
    );
  } else if (candidate.seat) {
    // Category named but not a temple seat — weak signal only.
    score += 10;
    signals.push(`Adjacent category: ${candidate.seat}`);
  }
  if (candidate.source === 'crawl' && candidate.archetypeScore) {
    score += Math.min(20, Math.round(candidate.archetypeScore / 5));
    signals.push(`Crawler archetype signal ${candidate.archetypeScore}`);
  }
  return { score: Math.min(100, score), signals };
}

/* ── Main ──────────────────────────────────────────────────────────── */

async function main() {
  const prospects = require(path.join(ROOT, 'platform', 'db', 'business-prospects.js'));

  const candidates = [...loadSeedCandidates(), ...loadCrawlCandidates()];
  const temples = ONLY_TEMPLE ? [ONLY_TEMPLE] : FLAGSHIPS;

  const report = {
    generated_at: new Date().toISOString(),
    temples: {},
    upserts: 0,
    skipped_no_seats: [],
  };

  for (const temple of temples) {
    const seats = (PATTERNS.byEntry?.[temple] || []).slice(0, TOP_N);
    if (!seats.length) {
      report.skipped_no_seats.push(temple);
      continue;
    }
    const matched = candidates
      .filter((c) => c.temple === temple)
      .map((c) => ({ ...c, ...scoreCandidate(c, seats) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    report.temples[temple] = matched.map((c) => ({
      business: c.business,
      domain: c.domain,
      score: c.score,
      source: c.source,
    }));

    for (const c of matched) {
      if (CHECK) continue;
      const seatMeta = seats.find((s) => s.industry === c.seat);
      await prospects.upsertProspect({
        temple_id: temple,
        business_name: c.business,
        domain: c.domain || null,
        industry_seat: c.seat || null,
        industry_name: seatMeta?.name || c.seat || null,
        source: c.source,
        score: c.score,
        signals: c.signals,
        metadata: { scouted_by: 'scripts/scout-temple-sponsors.js', v: 1 },
      });
      report.upserts++;
    }
  }

  const total = Object.values(report.temples).reduce((n, list) => n + list.length, 0);
  console.log(
    `Scout: ${total} candidate placements across ${Object.keys(report.temples).length} temples` +
      (report.skipped_no_seats.length ? `; ${report.skipped_no_seats.length} temples without seats skipped` : '') +
      (CHECK ? ' (check — no writes)' : `; ${report.upserts} upserted`)
  );

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, 'scout-report.json'),
    JSON.stringify(report, null, 2)
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Sponsor scout stopped: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { scoreCandidate, loadSeedCandidates, loadCrawlCandidates };
