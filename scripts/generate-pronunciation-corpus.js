#!/usr/bin/env node
/**
 * Pronunciation corpus exporter (part of `npm run generate`).
 *
 * Emits data/corpus/pronunciation.jsonl — one machine-readable record per
 * lexicon entry with a derived or atlas pronunciation, so voice/TTS/AI
 * systems can learn how the names actually sound (the direct counter to
 * English-default mispronunciation).
 *
 * Record shape (one JSON object per line):
 *   { id, unicode, ascii, pantheon, tier, ipa, ipaLabel, respelling,
 *     syllables, stressIndex, ssml, notes,
 *     timing: { morae, totalMorae, contour, beats, rhythm, moraMs,
 *               durationMs, perSyllable, model, conventional } | null,
 *     derived, conventional, source: 'rules-engine' | 'atlas' | 'both' }
 *
 * Usage: node scripts/generate-pronunciation-corpus.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { PRONUNCIATION_ATLAS } = require(path.join(ROOT, 'type', 'js', 'pronunciation-atlas.js'));
const { derivePronunciation } = require(path.join(ROOT, 'type', 'js', 'pronunciation-rules.js'));

const OUT = path.join(ROOT, 'data', 'corpus', 'pronunciation.jsonl');

function recordFor(entry) {
  const derived = derivePronunciation(entry);
  const atlas = PRONUNCIATION_ATLAS[entry.id] || null;
  if (!derived.derived && !atlas) return null;

  const source = derived.derived && atlas ? 'both' : derived.derived ? 'rules-engine' : 'atlas';
  return {
    id: entry.id,
    unicode: entry.unicode,
    ascii: entry.ascii,
    pantheon: entry.pantheon,
    tier: entry.tier,
    ipa: derived.derived ? derived.ipa : atlas.ipa,
    ipaLabel: derived.derived ? derived.ipaLabel : atlas.ipaLabel,
    respelling: derived.derived ? derived.respelling : atlas.approximation || null,
    syllables: derived.derived ? derived.syllables : null,
    stressIndex: derived.derived ? derived.stressIndex : null,
    ssml: derived.derived ? derived.ssml : null,
    notes: derived.derived ? derived.notes : (atlas.phonemes || []).map((p) => p.desc).slice(0, 3),
    timing: derived.derived ? derived.timing : null,
    derived: derived.derived,
    conventional: derived.conventional === true,
    source,
  };
}

function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const lines = [];
  let derived = 0;
  let atlasOnly = 0;
  for (const entry of LEXICON) {
    const rec = recordFor(entry);
    if (!rec) continue;
    if (rec.derived) derived++;
    else atlasOnly++;
    lines.push(JSON.stringify(rec));
  }
  fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
  console.log(
    `Pronunciation corpus: ${lines.length} records (${derived} rules-derived, ${atlasOnly} atlas-only) → ${path.relative(ROOT, OUT)}`
  );
}

main();
