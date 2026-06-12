/**
 * AI Curator MVP
 *
 * Scores every lexicon entry on completeness, Unicode correctness,
 * etymology quality, and commercial value. Flags the weakest entries
 * and stores confidence_score + ai_issues back into the database.
 *
 * Run:
 *   node platform/scripts/ai-curator.js
 *   node platform/scripts/ai-curator.js --report=weakest.json
 *   node platform/scripts/ai-curator.js --limit=50 --dry-run
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { getDbPath } = require('../db/db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

// Ensure curator columns exist.
try { db.exec(`ALTER TABLE entries ADD COLUMN confidence_score REAL DEFAULT 0`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE entries ADD COLUMN ai_issues TEXT`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE entries ADD COLUMN ai_reviewed_at TEXT`); } catch (e) { /* exists */ }

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reportPath = args.find(a => a.startsWith('--report='))?.split('=')[1];
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1], 10) || 50;

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
  try { return JSON.parse(str); } catch (e) { return null; }
}

function scoreSources(entry) {
  const parsed = safeJsonParse(entry.sources);
  if (!Array.isArray(parsed) || parsed.length === 0) return { score: 0, issues: ['missing_sources'] };
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
    // For non-Greek pantheons, reward any use of native-script Unicode.
    if (hasAnyMark) {
      score = 20;
    } else {
      score = 8;
      issues.push('unicode_lacks_native_script_marks');
    }
  }

  // Validate tier_label consistency.
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

function scoreAssets(entry) {
  const site = db.prepare(`
    SELECT id, favicon_path, og_image_path
    FROM indexed_sites
    WHERE lexicon_entry_id = ? AND status = 'active'
    ORDER BY is_flagship DESC
    LIMIT 1
  `).get(entry.id);

  // If there is no active site yet, assets are not applicable.
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

function scoreCommercialValue(entry) {
  const hasFlagship = entry.has_flagship === 1;
  const availability = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(entry.id);
  const score = (hasFlagship ? 7 : 0) + (availability ? 3 : 0);
  const issues = [];
  if (!hasFlagship && !availability) issues.push('no_flagship_or_availability');
  return { score, issues };
}

function scoreEntry(entry) {
  const s1 = scoreSources(entry);
  const s2 = scoreUnicode(entry);
  const s3 = scoreEtymology(entry);
  const s4 = scoreMeaningDomain(entry);
  const s5 = scoreVariants(entry);
  const s6 = scoreAssets(entry);
  const s7 = scoreCommercialValue(entry);

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
    ...s7.issues
  ];

  return { score: total, issues };
}

function main() {
  console.log('AI Curator MVP');
  console.log('Scoring all entries...\n');

  const entries = db.prepare('SELECT * FROM entries').all();
  const scored = [];

  for (const entry of entries) {
    const result = scoreEntry(entry);
    scored.push({ ...entry, ...result });

    if (!dryRun) {
      db.prepare(`
        UPDATE entries
        SET confidence_score = ?, ai_issues = ?, ai_reviewed_at = datetime('now')
        WHERE id = ?
      `).run(result.score, JSON.stringify(result.issues), entry.id);
    }
  }

  const weakest = scored
    .filter(e => e.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  console.log(`Scored ${scored.length} entries`);
  console.log(`Average confidence: ${(scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(1)} / 100`);
  console.log(`Entries below 70: ${scored.filter(e => e.score < 70).length}`);
  console.log(`\nTop ${limit} weakest entries:`);
  console.table(weakest.map(e => ({
    id: e.id,
    unicode: e.unicode,
    tier: e.tier,
    score: e.score,
    issues: e.issues.join(', ')
  })));

  if (reportPath) {
    const report = {
      generatedAt: new Date().toISOString(),
      totalEntries: scored.length,
      averageScore: parseFloat((scored.reduce((a, b) => a + b.score, 0) / scored.length).toFixed(2)),
      below70: scored.filter(e => e.score < 70).length,
      weakest: weakest.map(e => ({
        id: e.id,
        ascii: e.ascii,
        unicode: e.unicode,
        pantheon: e.pantheon,
        tier: e.tier,
        score: e.score,
        issues: e.issues
      }))
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport written to ${reportPath}`);
  }

  db.close();
}

main();
