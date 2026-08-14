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
const { SIGN_NOTES } = require(path.join(ROOT, 'type', 'js', 'sign-notes.js'));

const OUT = path.join(ROOT, 'data', 'ink-index.json');

/**
 * The individual-sign index: every unique sign that appears in an entry's
 * per-sign provenance, with its attested name and value, the script it
 * belongs to, and the entries that use it. Sign names come from the
 * medieval sign lists and rune poems via the curated provenance — never
 * from modern "rune meaning" tables.
 */
function buildSignIndex(entries) {
  const byGlyph = new Map();
  // Provenance notes that carry no information standalone ("Same", "—", …)
  // count as missing so the curated registry can fill them.
  const junk = (n) => !n || /^(same|—|-)$/i.test(String(n).trim());
  for (const e of entries) {
    for (const s of e.signs) {
      // Letters/signs only — synthesis can surface spaces or parentheses
      // from mixed displays like "단군 (檀君)".
      if (!s.sign || !/[a-zA-Z\u0080-\u{10FFFF}]/u.test(s.sign)) continue;
      const reg = SIGN_NOTES[s.sign] || null;
      const provenanceNote = junk(s.note) ? null : s.note;
      const rec = byGlyph.get(s.sign) || {
        sign: s.sign,
        name: s.name || reg?.name || null,
        value: s.value || reg?.value || null,
        note: provenanceNote || reg?.note || null,
        script: e.name || null,
        entries: [],
      };
      if (!rec.entries.includes(e.id)) rec.entries.push(e.id);
      if (!rec.name && (s.name || reg?.name)) rec.name = s.name || reg?.name;
      if (!rec.value && (s.value || reg?.value)) rec.value = s.value || reg?.value;
      if (junk(rec.note) && (provenanceNote || reg?.note)) rec.note = provenanceNote || reg?.note;
      byGlyph.set(s.sign, rec);
    }
  }
  return [...byGlyph.values()].sort((a, b) =>
    String(a.script || '').localeCompare(String(b.script || ''))
  );
}

function main() {
  const entries = [];
  for (const e of LEXICON) {
    if (!hasOriginalScript(e)) continue;
    const script = getOriginalScript(e);
    if (!script || script === '—') continue;
    const rich = getRichProvenance(e) || {};
    const pron = derivePronunciation(e) || {};
    const meaning = String(e.meaning || '').split(/[;.]/)[0].trim();
    entries.push({
      id: e.id,
      u: e.unicode,
      a: e.ascii,
      p: e.pantheon,
      m: meaning.length <= 110 ? meaning : `${meaning.slice(0, 107).trimEnd()}…`,
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
    signs: buildSignIndex(entries),
  };

  fs.writeFileSync(OUT, `${JSON.stringify(index)}\n`);
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(
    `Ink index: ${entries.length} attested forms, ${INK_MYTHS.length} myths → data/ink-index.json (${kb} KB)`
  );
}

main();
