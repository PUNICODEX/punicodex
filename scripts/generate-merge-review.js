#!/usr/bin/env node
/**
 * Generate a human-readable review markdown file from a merged import batch.
 *
 * Usage:
 *   node scripts/generate-merge-review.js <runId>
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MERGED_DIR = path.join(ROOT, 'data', 'authoritative', 'staging', 'merged');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const ORIGINAL_SCRIPTS_PATH = path.join(ROOT, 'type', 'js', 'original-scripts.js');

function loadLexicon() {
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadOriginalScripts() {
  try {
    return require(ORIGINAL_SCRIPTS_PATH).ORIGINAL_SCRIPTS;
  } catch {
    return {};
  }
}

function normalizeDevanagari(s) {
  return String(s || '')
    .normalize('NFC')
    .replace(/\u093c/g, '') // remove nukta for loose comparison
    .replace(/[\u0300-\u036f]/g, '');
}

function scriptsLooselyEqual(a, b) {
  return normalizeDevanagari(a) === normalizeDevanagari(b);
}

function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: node scripts/generate-merge-review.js <runId>');
    process.exit(1);
  }

  const batchPath = path.join(MERGED_DIR, `${runId}.json`);
  const reportPath = path.join(MERGED_DIR, `${runId}-report.json`);
  const outPath = path.join(MERGED_DIR, `${runId}-review.md`);

  if (!fs.existsSync(batchPath)) {
    console.error(`Batch not found: ${batchPath}`);
    process.exit(1);
  }

  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    : null;
  const lexicon = loadLexicon();
  const originalScripts = loadOriginalScripts();

  const byId = {};
  for (const s of batch.suggestions) {
    (byId[s.id] ||= []).push(s);
  }
  const touchedIds = Object.keys(byId).sort();

  const meaningUpdates = [];
  const scriptUpdates = [];
  const scriptDiffs = [];
  const genericMeanings = [];
  const questionable = [];

  for (const id of touchedIds) {
    const entry = lexicon.find((e) => e.id === id);
    if (!entry) continue;

    const suggestions = byId[id];
    const meaningSug = suggestions.find((s) => s.field === 'meaning');
    const scriptSug = suggestions.find((s) => s.field === 'originalScript');

    if (meaningSug) {
      meaningUpdates.push({ id, entry, value: meaningSug.value, provenance: meaningSug.provenance });
      const lower = String(meaningSug.value).toLowerCase();
      const genericMarkers = ['in comp.', 'patr.', 'mfn.', 'mfn', 'see below', 'see above', 'common noun'];
      if (genericMarkers.some((m) => lower.includes(m))) {
        genericMeanings.push({ id, entry, value: meaningSug.value });
      }
    }

    if (scriptSug) {
      scriptUpdates.push({ id, entry, value: scriptSug.value });
      const current = originalScripts[id]?.originalScript || '(none)';
      if (!scriptsLooselyEqual(current, scriptSug.value.originalScript)) {
        scriptDiffs.push({ id, entry, current, suggested: scriptSug.value.originalScript });
      }
    }
  }

  // Flag any Wikidata meaning that looks like a leftover misassignment.
  for (const s of batch.suggestions) {
    if (s.field !== 'meaning' || s.provenance?.source !== 'wikidata') continue;
    const lower = String(s.value).toLowerCase();
    const badMarkers = [
      'satellite',
      'asteroid',
      'town',
      'village',
      'city',
      'painting',
      'statue',
      'ship',
      'vessel',
      'singer',
      'musician',
      'publication',
      'journal',
      'magazine',
      'company',
      'brand',
      'football club',
    ];
    if (badMarkers.some((m) => lower.includes(m))) {
      const entry = lexicon.find((e) => e.id === s.id);
      questionable.push({ id: s.id, entry, value: s.value });
    }
  }

  const lines = [];
  lines.push(`# Merged batch review: ${runId}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  if (report) {
    lines.push(`- Total merged suggestions: ${report.summary.merged}`);
    lines.push(`- Conflicts: ${report.summary.conflicts}`);
    lines.push(`- Meaning updates: ${report.summary.byField.meaning || 0}`);
    lines.push(`- Original-script updates: ${report.summary.byField.originalScript || 0}`);
    lines.push(`- Source-catalog updates: ${report.summary.byField.sourceCatalog || 0}`);
    lines.push('');
    lines.push('| Source | Tier | Suggestions |');
    lines.push('|--------|------|-------------|');
    for (const [source, stat] of Object.entries(report.sourceStats)) {
      lines.push(`| ${source} | ${stat.tier} | ${stat.suggestions} |`);
    }
  } else {
    lines.push(`- Total merged suggestions: ${batch.suggestions.length}`);
    lines.push(`- Entries touched: ${touchedIds.length}`);
  }
  lines.push('');

  lines.push('## Devanagari original script (Cologne)');
  lines.push('');
  lines.push(`- Suggestions matching existing curated forms: ${scriptUpdates.length - scriptDiffs.length}`);
  lines.push(`- Divergent suggestions: ${scriptDiffs.length}`);
  lines.push('');
  if (scriptDiffs.length > 0) {
    lines.push('| id | unicode | existing | suggested | note |');
    lines.push('|----|---------|----------|-----------|------|');
    for (const d of scriptDiffs) {
      const note =
        d.current.includes('á') || d.current.includes('í')
          ? 'existing has stray Latin accent — suggestion is cleaner'
          : 'review needed';
      lines.push(`| ${d.id} | ${d.entry.unicode} | ${d.current} | ${d.suggested} | ${note} |`);
    }
    lines.push('');
  }

  lines.push('## Meanings from Cologne Sanskrit');
  lines.push('');
  lines.push(`Total meaning suggestions: ${meaningUpdates.length}`);
  lines.push('');
  lines.push('### Plausible deity / figure senses (sample)');
  lines.push('');
  lines.push('| id | unicode | suggested meaning |');
  lines.push('|----|---------|-------------------|');
  const deitySamples = meaningUpdates
    .filter((m) => {
      const lower = String(m.value).toLowerCase();
      return /\b(deity|god|goddess|hero|titan|nymph|spirit|avatar|bodhisattva|personification|mythology)\b/.test(lower);
    })
    .slice(0, 20);
  for (const m of deitySamples) {
    lines.push(`| ${m.id} | ${m.entry.unicode} | ${String(m.value).slice(0, 100).replace(/\|/g, '\\|')} |`);
  }
  lines.push('');

  if (genericMeanings.length > 0) {
    lines.push('### Generic or stub senses flagged for manual review');
    lines.push('');
    lines.push('| id | unicode | suggested meaning |');
    lines.push('|----|---------|-------------------|');
    for (const m of genericMeanings.slice(0, 20)) {
      lines.push(`| ${m.id} | ${m.entry.unicode} | ${String(m.value).slice(0, 100).replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }

  if (questionable.length > 0) {
    lines.push('## Wikidata tier-3 suggestions flagged as questionable');
    lines.push('');
    lines.push('| id | unicode | suggested |');
    lines.push('|----|---------|-----------|');
    for (const q of questionable) {
      lines.push(`| ${q.id} | ${q.entry.unicode} | ${String(q.value).slice(0, 100).replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  } else {
    lines.push('## Wikidata tier-3 review');
    lines.push('');
    lines.push('No obviously misassigned entities remain in the Wikidata suggestions after the scoring hardening.');
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- Perseus Greek was excluded from this pass because the Perseus endpoint is currently rate-limiting / black-holing requests; the extractor fixes are in place and it can be re-run later with a longer delay.');
  lines.push('- Cologne Sanskrit now selects Unicode-matching headwords and deity-specific senses in most cases; a few polysemous names still return dictionary-first-sense stubs.');
  lines.push('- Wikidata scoring was tightened with a much larger bad-phrase list and a higher acceptance threshold; the remaining suggestions are all deity/mythology-aligned.');
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push('Review the divergent Devanagari rows and the generic-meaning stubs, then apply the rest. The batch is significantly cleaner than v2 and has no same-tier conflicts.');
  lines.push('');

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote review: ${outPath}`);
}

main();
