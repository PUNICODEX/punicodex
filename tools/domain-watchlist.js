#!/usr/bin/env node
/**
 * PuniCodex — Domain acquisition watchlist.
 *
 * For every lexicon entry whose canonical Unicode domain is NOT already owned,
 * computes the canonical `.com` form (+ fallback-hierarchy alternates when the
 * lexicon carries variants), punycode, and REGISTRATION status, then writes a
 * ranked markdown report to .superpowers/domain-watchlist.md.
 *
 * Status is authoritative: Verisign RDAP (404 = unregistered, 200 = taken).
 * Do NOT regress this to a DNS lookup — parked domains like brahmā.com are
 * registered but resolve to nothing, and a DNS check called them available.
 * Re-run weekly; rán.com was registered by a speculator on 2026-08-04 while
 * we weren't watching.
 *
 * Usage: node tools/domain-watchlist.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { loadArchetypes } = require(path.join(ROOT, 'scripts', 'flywheel-utils.js'));

const CONCURRENCY = 8;
const RDAP_DELAY_MS = 120;

function candidateForms(entry) {
  const forms = [];
  const push = (label, form) => {
    if (!form) return;
    const d = `${form.toLowerCase()}.com`;
    if (!forms.some((f) => f.domain === d)) forms.push({ label, domain: d });
  };
  push('canonical', entry.unicode);
  for (const v of entry.variants || []) push(v.type || 'variant', v.unicode);
  // Circumflex/macron alternates are already variants when attested; the ASCII
  // form is listed last purely as orientation (never a recommended target).
  push('ascii (last resort)', entry.ascii);
  return forms;
}

async function check(domain) {
  const puny = domainToASCII(domain);
  if (!puny) return { puny: '', status: 'unregistrable' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://rdap.verisign.com/com/v1/domain/${puny}`, {
        headers: { 'User-Agent': 'PuniCodexWatchlist/1.0 (https://punicodex.com)' },
      });
      if (res.status === 404) return { puny, status: 'available' };
      if (res.status === 200) {
        const j = await res.json();
        const reg = (j.events || []).find((e) => e.eventAction === 'registration');
        return { puny, status: 'registered', since: reg ? reg.eventDate.slice(0, 10) : null };
      }
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { puny, status: `unknown (HTTP ${res.status})` };
    } catch (e) {
      if (attempt === 2) return { puny, status: `unknown (${e.message})` };
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

async function main() {
  const owned = new Set(
    require(path.join(ROOT, 'platform', 'db', 'owned-domains.json')).map((d) => d.toLowerCase()),
  );
  const flagshipIds = new Set(
    loadArchetypes()
      .list.filter((a) => a.built)
      .map((a) => a.id),
  );

  const rows = [];
  for (const entry of LEXICON) {
    if (flagshipIds.has(entry.id)) continue; // flagship = domain already owned
    const forms = candidateForms(entry).filter((f) => !owned.has(f.domain));
    if (!forms.length) continue;
    rows.push({
      id: entry.id,
      unicode: entry.unicode,
      pantheon: entry.pantheon,
      tier: entry.tier,
      forms,
    });
  }

  console.log(`Checking ${rows.length} lexicon entries without owned domains (Verisign RDAP)…`);
  let done = 0;
  const queue = rows.slice();
  async function worker() {
    while (queue.length) {
      const row = queue.shift();
      for (const f of row.forms) {
        const r = await check(f.domain);
        f.puny = r.puny;
        f.status = r.status;
        f.since = r.since || null;
        await new Promise((r2) => setTimeout(r2, RDAP_DELAY_MS));
      }
      if (++done % 50 === 0) console.log(`  … ${done}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Keep entries where at least the canonical form is available.
  const free = rows.filter((r) => r.forms[0] && r.forms[0].status === 'available');
  const taken = rows.filter((r) => !free.includes(r));

  const tierRank = { dual: 0, 1: 1, 2: 2 };
  free.sort(
    (a, b) => (tierRank[a.tier] ?? 3) - (tierRank[b.tier] ?? 3) || a.id.localeCompare(b.id),
  );

  const lines = [];
  lines.push('# Domain Acquisition Watchlist', '');
  lines.push(`Generated: ${new Date().toISOString()} — ${free.length} lexicon entries have an AVAILABLE canonical Unicode domain; ${taken.length} are registered.`);
  lines.push('Status is authoritative (Verisign RDAP). Confirm price/premium status at a registrar before purchase.', '');
  lines.push('## Available canonical domains', '');
  lines.push('| Entry | Unicode | Pantheon | Tier | Domain | Punycode |');
  lines.push('|-------|---------|----------|------|--------|----------|');
  for (const r of free) {
    const f = r.forms[0];
    lines.push(`| ${r.id} | ${r.unicode} | ${r.pantheon} | ${r.tier} | ${f.domain} | ${f.puny} |`);
  }
  lines.push('', '## Registered (canonical form taken)', '');
  lines.push('| Entry | Unicode | Pantheon | Domain | Registered | Fallback availability |');
  lines.push('|-------|---------|----------|--------|------------|----------------------|');
  for (const r of taken) {
    const fallbacks = r.forms
      .slice(1)
      .map((f) => `${f.domain}: ${f.status}${f.since ? ` (${f.since})` : ''}`)
      .join('; ');
    lines.push(`| ${r.id} | ${r.unicode} | ${r.pantheon} | ${r.forms[0].domain} | ${r.forms[0].since || '—'} | ${fallbacks} |`);
  }

  const out = path.join(ROOT, '.superpowers', 'domain-watchlist.md');
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log(`\nWrote ${out}`);
  console.log(`Available canonical: ${free.length} · Registered: ${taken.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
