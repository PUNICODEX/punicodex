#!/usr/bin/env node
/**
 * PuniCodex — Check Before You Ink: index generator.
 *
 * Bakes data/ink-index.json — the attested-script corpus the /ink/ verifier
 * checks names and scripts against, plus the curated myth registry:
 *
 *   entries — every lexicon entry with a verified original script: the
 *             script specimen, its script name/family/period/region, the
 *             transliteration and normalized reading, the per-sign breakdown
 *             (name, value, note), and the pronunciation respelling.
 *   myths   — the curated famous tattoo errors (type/js/ink-myths.js).
 *
 * Canonical inputs (never edit the output by hand):
 *   type/js/lexicon.js, type/js/original-scripts.js,
 *   type/js/pronunciation-rules.js, type/js/ink-myths.js
 *
 * Run: node scripts/generate-ink-index.js  (part of npm run generate)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const {
  hasOriginalScript,
  getOriginalScript,
  getScriptName,
  getRichProvenance,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const { derivePronunciation } = require(path.join(ROOT, 'type', 'js', 'pronunciation-rules.js'));
const { INK_MYTHS } = require(path.join(ROOT, 'type', 'js', 'ink-myths.js'));

const OUT = path.join(ROOT, 'data', 'ink-index.json');

function main() {
  const entries = [];
  for (const e of LEXICON) {
    if (!hasOriginalScript(e)) continue;
    const script = getOriginalScript(e);
    if (!script || script === '—') continue;
    const rich = getRichProvenance(e) || {};
    const pron = derivePronunciation(e) || {};
    entries.push({
      id: e.id,
      u: e.unicode,
      a: e.ascii,
      p: e.pantheon,
      script,
      name: rich.scriptName || getScriptName(e) || null,
      family: rich.scriptFamily || null,
      period: rich.timePeriod || null,
      region: rich.region || null,
      direction: rich.writingDirection || null,
      trans: rich.transliteration || null,
      reading: rich.normalizedReading || null,
      recon: rich.phoneticReconstruction || null,
      signs: Array.isArray(rich.signs)
        ? rich.signs.map((s) => ({ sign: s.sign, name: s.name, value: s.value, note: s.note }))
        : [],
      r: pron.derived === false ? null : pron.respelling || null,
      ipa: pron.derived === false ? null : pron.ipa || null,
    });
  }

  const index = {
    meta: {
      generator: 'scripts/generate-ink-index.js',
      warning: 'GENERATED FILE — do not edit by hand. Run npm run generate.',
      entries: entries.length,
      myths: INK_MYTHS.length,
    },
    entries,
    myths: INK_MYTHS,
  };

  fs.writeFileSync(OUT, `${JSON.stringify(index)}\n`);
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(
    `Ink index: ${entries.length} attested forms, ${INK_MYTHS.length} myths → data/ink-index.json (${kb} KB)`
  );
}

main();
