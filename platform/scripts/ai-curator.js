/**
 * AI Curator Agent
 *
 * Scores every lexicon entry and generates actionable suggestions for admin review.
 *
 * Run:
 *   node platform/scripts/ai-curator.js
 *   node platform/scripts/ai-curator.js --report=weakest.json
 *   node platform/scripts/ai-curator.js --limit=50 --dry-run
 */

const Database = require('better-sqlite3');
const fs = require('node:fs');
const _path = require('node:path');
const { getDbPath } = require('../db/db');

function getDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  return db;
}

// Stress / length detection.
const STRESS_MARKS = /[\u0300\u0301\u0342\u0302\u0304\u0306\u0308\u0311\u0345]/;
const ACUTE_CIRCUMFLEX_UNICODE = /[άέήίόύώΆΈΉΊΌΎΏᾴᾴῄῴ]/;
const LONG_VOWELS = /[ηωῃῳᾐᾑᾗᾘᾙᾝᾞᾟῄῇῃῳῷῴΗΩᾐᾑᾗ]/i;
const COMBINED_MACRON = /[āēīōūĀĒĪŌŪḗḗṓṓ]/;

function hasStress(str) {
  if (!str) return false;
  return STRESS_MARKS.test(str.normalize('NFD')) || ACUTE_CIRCUMFLEX_UNICODE.test(str);
}

function hasLength(str) {
  if (!str) return false;
  return LONG_VOWELS.test(str) || COMBINED_MACRON.test(str);
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return null;
  }
}

function scoreSources(entry) {
  const parsed = safeJsonParse(entry.sources);
  if (!Array.isArray(parsed) || parsed.length === 0)
    return { score: 0, issues: ['missing_sources'] };
  let score = 10;
  if (parsed.length >= 2) score += 5;
  if (parsed.length >= 3) score += 5;
  return { score, issues: [] };
}

function scoreUnicode(entry) {
  const issues = [];
  const stressed = hasStress(entry.unicode);
  const long = hasLength(entry.unicode);
  const hasAnyMark = stressed || long || /[^\x00-\x7F]/.test(entry.unicode || '');
  const isGreek = entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
  const expectedDual = entry.tier === 'dual';
  const expectedOne = entry.tier === '1';
  const expectedTwo = entry.tier === '2';

  let score = 0;

  if (isGreek) {
    if (expectedDual) {
      if (stressed && long) {
        score = 20;
      } else {
        score = stressed || long ? 12 : 5;
        issues.push('dual_tier_missing_stress_or_length');
      }
    } else if (expectedOne) {
      if (stressed && long) {
        score = 20;
      } else if (stressed || long) {
        score = 14;
        issues.push('tier1_missing_one_feature');
      } else {
        score = 5;
        issues.push('tier1_missing_stress_and_length');
      }
    } else if (expectedTwo) {
      if (stressed && long) {
        score = 5;
        issues.push('tier2_has_both_features');
      } else if (stressed || long) {
        score = 20;
      } else {
        score = 15;
        issues.push('tier2_preserves_no_features');
      }
    }
  } else {
    if (hasAnyMark) {
      score = 20;
    } else {
      score = 8;
      issues.push('unicode_lacks_native_script_marks');
    }
  }

  const expectedLabel = entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`;
  if (entry.tier_label && entry.tier_label !== expectedLabel) {
    issues.push('tier_label_mismatch');
    score = Math.max(0, score - 3);
  }

  return { score, issues };
}

function scoreEtymology(entry) {
  if (!entry.etymology) return { score: 0, issues: ['missing_etymology'] };
  const parsed = safeJsonParse(entry.etymology);
  if (!parsed) return { score: 8, issues: ['etymology_not_valid_json'] };
  if (!parsed.derivation && !parsed.protoForm) {
    return { score: 10, issues: ['etymology_lacks_derivation'] };
  }
  return { score: 15, issues: [] };
}

function scoreMeaningDomain(entry) {
  const issues = [];
  if (!entry.meaning) issues.push('missing_meaning');
  if (!entry.domain) issues.push('missing_domain');
  const score = (entry.meaning ? 7.5 : 0) + (entry.domain ? 7.5 : 0);
  return { score, issues };
}

function scoreVariants(entry) {
  const parsed = safeJsonParse(entry.variants);
  const hasVariants = Array.isArray(parsed) && parsed.length > 0;
  if (entry.tier === 'dual') {
    if (!hasVariants || parsed.length < 2) {
      return { score: 0, issues: ['dual_tier_needs_multiple_variants'] };
    }
    return { score: 10, issues: [] };
  }
  return { score: hasVariants ? 5 : 0, issues: hasVariants ? [] : ['missing_variants'] };
}

function scoreAssets(entry, db) {
  const site = db
    .prepare(`
    SELECT id, favicon_path, og_image_path
    FROM indexed_sites
    WHERE lexicon_entry_id = ? AND status = 'active'
    ORDER BY is_flagship DESC
    LIMIT 1
  `)
    .get(entry.id);

  if (!site) {
    return { score: 5, issues: [] };
  }

  const hasFavicon = !!site.favicon_path;
  const hasOgImage = !!site.og_image_path;
  const score = (hasFavicon ? 5 : 0) + (hasOgImage ? 5 : 0);
  const issues = [];
  if (!hasFavicon) issues.push('missing_favicon');
  if (!hasOgImage) issues.push('missing_og_image');
  return { score, issues };
}

function scoreCommercialValue(entry, db) {
  const hasFlagship = entry.has_flagship === 1;
  const availability = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(entry.id);
  const score = (hasFlagship ? 7 : 0) + (availability ? 3 : 0);
  const issues = [];
  if (!hasFlagship && !availability) issues.push('no_flagship_or_availability');
  return { score, issues };
}

function scoreEntry(entry, db) {
  const s1 = scoreSources(entry);
  const s2 = scoreUnicode(entry);
  const s3 = scoreEtymology(entry);
  const s4 = scoreMeaningDomain(entry);
  const s5 = scoreVariants(entry);
  const s6 = scoreAssets(entry, db);
  const s7 = scoreCommercialValue(entry, db);

  const total = Math.round(
    s1.score + s2.score + s3.score + s4.score + s5.score + s6.score + s7.score
  );

  const issues = [
    ...s1.issues,
    ...s2.issues,
    ...s3.issues,
    ...s4.issues,
    ...s5.issues,
    ...s6.issues,
    ...s7.issues,
  ];

  return { score: total, issues };
}

// ─── Suggestion Generators ───

function suggestTierRule(entry) {
  const isGreek = entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
  if (!isGreek) return null;
  const stressed = hasStress(entry.unicode);
  const long = hasLength(entry.unicode);
  const hasBoth = stressed && long;

  const suggestedTier = hasBoth ? 'dual' : stressed || long ? '1' : '2';
  if (suggestedTier === entry.tier) return null;

  return {
    entry_id: entry.id,
    type: 'tier_rule',
    field: 'tier',
    current_value: entry.tier,
    suggested_value: suggestedTier,
    confidence: hasBoth ? 0.9 : 0.75,
    issue: `Unicode has ${stressed ? 'stress' : 'no stress'} and ${long ? 'length' : 'no length'}; tier should be ${suggestedTier}.`,
  };
}

function suggestTierLabel(entry) {
  const expected = entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`;
  if (!entry.tier_label || entry.tier_label === expected) return null;
  return {
    entry_id: entry.id,
    type: 'tier_label',
    field: 'tier_label',
    current_value: entry.tier_label,
    suggested_value: expected,
    confidence: 0.95,
    issue: 'tier_label does not match tier.',
  };
}

function suggestMissingVariants(entry) {
  const parsed = safeJsonParse(entry.variants);
  const count = Array.isArray(parsed) ? parsed.length : 0;
  if (entry.tier === 'dual') {
    if (count >= 2) return null;
    return {
      entry_id: entry.id,
      type: 'missing_variants',
      field: 'variants',
      current_value: entry.variants,
      suggested_value: null,
      confidence: 0.8,
      issue: `Dual-tier entry has only ${count} variant(s); at least 2 are expected.`,
    };
  }
  if (count > 0) return null;
  return {
    entry_id: entry.id,
    type: 'missing_variants',
    field: 'variants',
    current_value: null,
    suggested_value: JSON.stringify([
      { unicode: entry.ascii, type: 'ascii', note: 'Modern English' },
    ]),
    confidence: 0.7,
    issue: 'No variants recorded; consider adding at least an ASCII fallback.',
  };
}

function suggestEtymology(entry) {
  if (entry.etymology) return null;
  return {
    entry_id: entry.id,
    type: 'missing_etymology',
    field: 'etymology',
    current_value: null,
    suggested_value: null,
    confidence: 0.6,
    issue: 'No etymology recorded.',
  };
}

function suggestSources(entry) {
  const parsed = safeJsonParse(entry.sources);
  if (Array.isArray(parsed) && parsed.length > 0) return null;
  return {
    entry_id: entry.id,
    type: 'missing_sources',
    field: 'sources',
    current_value: entry.sources,
    suggested_value: JSON.stringify(['LSJ']),
    confidence: 0.5,
    issue: 'No scholarly sources listed.',
  };
}

function suggestMeaningDomain(entry) {
  if (entry.meaning && entry.domain) return null;
  return {
    entry_id: entry.id,
    type: 'missing_meaning_domain',
    field: entry.meaning ? 'domain' : entry.domain ? 'meaning' : 'meaning,domain',
    current_value: JSON.stringify({ meaning: entry.meaning, domain: entry.domain }),
    suggested_value: null,
    confidence: 0.55,
    issue: `Missing ${!entry.meaning && !entry.domain ? 'meaning and domain' : !entry.meaning ? 'meaning' : 'domain'}.`,
  };
}

function suggestNormalization(entry) {
  if (!entry.unicode) return null;
  const nfc = entry.unicode.normalize('NFC');
  const nfd = entry.unicode.normalize('NFD');
  if (nfc === entry.unicode && nfd === entry.unicode) return null;
  if (entry.unicode !== nfc) {
    return {
      entry_id: entry.id,
      type: 'unicode_normalization',
      field: 'unicode',
      current_value: entry.unicode,
      suggested_value: nfc,
      confidence: 0.95,
      issue: 'Unicode form is not NFC normalized.',
    };
  }
  return null;
}

function detectDuplicate(entries) {
  const seenUnicode = new Map();
  const seenAscii = new Map();
  const suggestions = [];
  for (const e of entries) {
    const u = e.unicode ? e.unicode.normalize('NFC').toLowerCase() : null;
    const a = e.ascii ? e.ascii.toLowerCase() : null;
    if (u && seenUnicode.has(u) && seenUnicode.get(u) !== e.id) {
      suggestions.push({
        entry_id: e.id,
        type: 'duplicate',
        field: 'unicode',
        current_value: e.unicode,
        suggested_value: seenUnicode.get(u),
        confidence: 0.85,
        issue: `Duplicate Unicode form with entry ${seenUnicode.get(u)}.`,
      });
    }
    if (a && seenAscii.has(a) && seenAscii.get(a) !== e.id) {
      suggestions.push({
        entry_id: e.id,
        type: 'duplicate',
        field: 'ascii',
        current_value: e.ascii,
        suggested_value: seenAscii.get(a),
        confidence: 0.85,
        issue: `Duplicate ASCII form with entry ${seenAscii.get(a)}.`,
      });
    }
    if (u) seenUnicode.set(u, e.id);
    if (a) seenAscii.set(a, e.id);
  }
  return suggestions;
}

function generateSuggestionsForEntry(entry) {
  const suggestions = [];
  const fns = [
    suggestTierRule,
    suggestTierLabel,
    suggestMissingVariants,
    suggestEtymology,
    suggestSources,
    suggestMeaningDomain,
    suggestNormalization,
  ];
  for (const fn of fns) {
    const s = fn(entry);
    if (s) suggestions.push(s);
  }
  return suggestions;
}

function upsertSuggestions(db, suggestions) {
  const insert = db.prepare(`
    INSERT INTO curator_suggestions (entry_id, type, field, current_value, suggested_value, confidence, issue, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
  `);
  const check = db.prepare(`
    SELECT id FROM curator_suggestions
    WHERE entry_id = ? AND type = ? AND field = ? AND status = 'open'
    LIMIT 1
  `);
  let added = 0;
  const insertMany = db.transaction((rows) => {
    for (const s of rows) {
      const existing = check.get(s.entry_id, s.type, s.field || '');
      if (existing) continue;
      insert.run(
        s.entry_id,
        s.type,
        s.field || '',
        s.current_value,
        s.suggested_value,
        s.confidence,
        s.issue
      );
      added++;
    }
  });
  insertMany(suggestions);
  return added;
}

function runCurator({ dryRun = false, reportPath = null, limit = 50 } = {}) {
  const db = getDb();

  // Ensure columns exist.
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN confidence_score REAL DEFAULT 0`);
  } catch (_e) {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN ai_issues TEXT`);
  } catch (_e) {
    /* exists */
  }
  try {
    db.exec(`ALTER TABLE entries ADD COLUMN ai_reviewed_at TEXT`);
  } catch (_e) {
    /* exists */
  }

  const entries = db.prepare('SELECT * FROM entries').all();
  const scored = [];
  let allSuggestions = [];

  for (const entry of entries) {
    const result = scoreEntry(entry, db);
    scored.push({ ...entry, ...result });

    if (!dryRun) {
      db.prepare(`
        UPDATE entries
        SET confidence_score = ?, ai_issues = ?, ai_reviewed_at = datetime('now')
        WHERE id = ?
      `).run(result.score, JSON.stringify(result.issues), entry.id);
    }

    allSuggestions = allSuggestions.concat(generateSuggestionsForEntry(entry));
  }

  allSuggestions = allSuggestions.concat(detectDuplicate(entries));

  let added = 0;
  if (!dryRun) {
    added = upsertSuggestions(db, allSuggestions);
  }

  const weakest = scored
    .filter((e) => e.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  if (reportPath) {
    const report = {
      generatedAt: new Date().toISOString(),
      totalEntries: scored.length,
      averageScore: parseFloat(
        (scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(2)
      ),
      below70: scored.filter((e) => e.score < 70).length,
      suggestionsAdded: added,
      weakest: weakest.map((e) => ({
        id: e.id,
        ascii: e.ascii,
        unicode: e.unicode,
        pantheon: e.pantheon,
        tier: e.tier,
        score: e.score,
        issues: e.issues,
      })),
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport written to ${reportPath}`);
  }

  db.close();

  return {
    scored: scored.length,
    averageScore: parseFloat((scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(2)),
    below70: scored.filter((e) => e.score < 70).length,
    suggestions: allSuggestions.length,
    added,
    weakest,
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reportPath = args.find((a) => a.startsWith('--report='))?.split('=')[1];
  const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1], 10) || 50;

  console.log('AI Curator Agent');
  console.log('Scoring all entries and generating suggestions...\n');

  const result = runCurator({ dryRun, reportPath, limit });

  console.log(`Scored ${result.scored} entries`);
  console.log(`Average confidence: ${result.averageScore} / 100`);
  console.log(`Entries below 70: ${result.below70}`);
  console.log(
    `Suggestions generated: ${result.suggestions}${dryRun ? '' : `, new: ${result.added}`}`
  );
  console.log(`\nTop ${limit} weakest entries:`);
  console.table(
    result.weakest.map((e) => ({
      id: e.id,
      unicode: e.unicode,
      tier: e.tier,
      score: e.score,
      issues: e.issues.join(', '),
    }))
  );
}

if (require.main === module) {
  main();
}

module.exports = { runCurator, scoreEntry, generateSuggestionsForEntry, detectDuplicate };
