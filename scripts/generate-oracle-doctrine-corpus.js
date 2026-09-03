#!/usr/bin/env node
/**
 * PuniCodex — Oracle Doctrine Corpus Generator
 *
 * Builds an instruction-tuning corpus that teaches the student model the
 * philological doctrine the served Oracle carries in ORACLE_SYSTEM_PROMPT
 * (platform/api/oracle.js):
 *
 *   (a) diacritic semantics per tradition — what each mark in a restored
 *       name records, derived from the entry's character breakdown;
 *   (b) script honesty — Original Script vs Scholarly Transliteration,
 *       classified from the entry's originalScript record;
 *   (c) restoration-vs-ASCII superiority — why the restored Unicode form is
 *       canonical and the ASCII form a lossy fallback;
 *   (d) doctrine boundaries — declining to strip diacritics, declining to
 *       call a transliteration the original writing, Egyptian conventional
 *       readings, Sanskrit IAST e/o length.
 *
 * Every diacritic claim is grounded in the entry's actual breakdown /
 * original-script data — nothing is invented. Every example carries the
 * verbatim ORACLE_SYSTEM_PROMPT as its system message so the dataset stays
 * consistent with the served model.
 *
 * Input:  data/corpus/entries.jsonl (from export-model-corpus.js)
 * Output: data/corpus/oracle-doctrine-examples.jsonl
 *
 * Deterministic: examples are derived in entries.jsonl order with no
 * randomness, so reruns are byte-identical.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ORACLE_SYSTEM_PROMPT } = require('../platform/api/oracle');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'oracle-doctrine-examples.jsonl');

function loadEntries() {
  return fs
    .readFileSync(ENTRIES_PATH, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function messages(user, assistant) {
  return [
    { role: 'system', content: ORACLE_SYSTEM_PROMPT },
    { role: 'user', content: user },
    { role: 'assistant', content: assistant },
  ];
}

/** Breakdown type → doctrinal explanation of what the mark records. */
function explainMark(b) {
  switch (b.type) {
    case 'stress':
      return `${b.to} (${b.note}) — the acute accent marks the stress/pitch accent of the name`;
    case 'length':
      return `${b.to} (${b.note}) — the macron marks a long vowel`;
    case 'dual':
      return `${b.to} (${b.note}) — the combined mark records both stress and vowel length in one letter`;
    case 'special':
      return `${b.to} (${b.note}) — this is a distinctive feature of the writing tradition (an atomic letter or a distinct sound), not decoration`;
    case 'tone':
      return `${b.to} (${b.note}) — the mark records the lexical tone`;
    case 'drop':
      return `${b.note} — the ASCII letter "${b.char}" has no independent counterpart in the restored form`;
    case 'merge':
      return `${b.to} (${b.note}) — the restored spelling reflects the original consonant structure`;
    default:
      return null;
  }
}

function changedMarks(entry) {
  return (entry.breakdown || []).filter((b) => b.type !== 'same');
}

function sentenceList(items, conj = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items.at(-1)}`;
}

/** (a) Diacritic semantics, grounded in the character breakdown. */
function buildDiacriticSemantics(entries) {
  const examples = [];
  for (const e of entries) {
    const marks = changedMarks(e).map((b) => ({ b, text: explainMark(b) })).filter((m) => m.text);
    if (!marks.length) continue;
    const user = `What do the diacritics and special letters in the restored name ${e.unicode} record?`;
    const assistant =
      `<p>Every mark in <strong>${e.unicode}</strong> (${e.pantheon} tradition) records linguistic information that the ASCII form ${e.ascii} loses:</p>` +
      `<ul>${marks.map((m) => `<li>${m.text}.</li>`).join('')}</ul>` +
      `<p>None of these marks is decorative; removing any of them would erase information the restoration was built to preserve.</p>`;
    examples.push({
      id: makeId(e.id, 'diacritic_semantics', examples.length + 1),
      entryId: e.id,
      task: 'diacritic_semantics',
      messages: messages(user, assistant),
      metadata: { entryId: e.id, markCount: marks.length },
    });
  }
  return examples;
}

/** (b) Script honesty: Original Script vs Scholarly Transliteration. */
function buildScriptHonesty(entries) {
  const examples = [];
  for (const e of entries) {
    const os = e.originalScript;
    if (!os || !os.label) continue;
    const user = `Is ${e.unicode} shown in its original script?`;
    let assistant;
    if (os.label === 'Original Script' && os.specimen) {
      assistant =
        `<p>Yes. <strong>${e.unicode}</strong> has an attested original script: ${os.scriptName}, in which the name appears as <strong>${os.specimen}</strong>` +
        `${os.timePeriod ? ` (${os.timePeriod})` : ''}. The form ${e.unicode} is the scholarly Unicode restoration derived from that attestation.</p>`;
    } else {
      assistant =
        `<p>No. What we display for <strong>${e.unicode}</strong> is a <strong>scholarly transliteration</strong>` +
        `${os.scriptName ? ` (${os.scriptName})` : ''} — a modern academic convention for writing the name in Latin letters, not the original writing system. ` +
        `It would be wrong to call ${e.unicode} the original script of the ${e.pantheon} tradition.</p>`;
    }
    examples.push({
      id: makeId(e.id, 'script_honesty', examples.length + 1),
      entryId: e.id,
      task: 'script_honesty',
      messages: messages(user, assistant),
      metadata: { entryId: e.id, label: os.label },
    });
  }
  return examples;
}

/** (c) Restoration vs ASCII superiority, grounded in what ASCII loses. */
function buildRestorationVsAscii(entries) {
  const examples = [];
  for (const e of entries) {
    const marks = changedMarks(e).map((b) => explainMark(b)).filter(Boolean);
    if (!marks.length) continue;
    const user = `Isn't ${e.ascii} just as correct as ${e.unicode}?`;
    const assistant =
      `<p>No. <strong>${e.unicode}</strong> is the canonical scholarly restoration; <strong>${e.ascii}</strong> is a lossy ASCII fallback. ` +
      `The ASCII spelling discards: ${sentenceList(marks.map((m) => m.replace(/ — .*$/, '')))}. ` +
      `Each of those marks records real information about the name's sound and history, so presenting ${e.ascii} as equally correct would misrepresent the restoration.</p>`;
    examples.push({
      id: makeId(e.id, 'restoration_vs_ascii', examples.length + 1),
      entryId: e.id,
      task: 'restoration_vs_ascii',
      messages: messages(user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

/** (d) Doctrine boundaries: refusals and corrections, entry-grounded. */
function buildDoctrineBoundaries(entries) {
  const examples = [];
  const push = (e, task, user, assistant, metadata = {}) => {
    examples.push({
      id: makeId(e ? e.id : 'doctrine', task, examples.length + 1),
      entryId: e ? e.id : null,
      task,
      messages: messages(user, assistant),
      metadata,
    });
  };

  for (const e of entries) {
    const marks = changedMarks(e).map((b) => explainMark(b)).filter(Boolean);

    // Decline to strip diacritics (grounded in the entry's actual marks).
    if (marks.length) {
      push(
        e,
        'doctrine_boundary',
        `Can you just write ${e.unicode} without the accents? ${e.ascii} is easier to type.`,
        `<p>I won't strip the marks from <strong>${e.unicode}</strong>. Each one records information: ${sentenceList(marks.map((m) => m.replace(/ — .*$/, '')))}. ` +
          `${e.ascii} is available as a lossy fallback for systems that cannot handle Unicode, but it is not a simpler or more correct spelling — it is the same name with information removed.</p>`,
        { boundary: 'strip_diacritics' }
      );
    }

    // Decline to call a transliteration the original writing.
    if (e.originalScript?.label === 'Scholarly Transliteration') {
      push(
        e,
        'doctrine_boundary',
        `So ${e.unicode} is how the name was originally written in the ${e.pantheon} tradition?`,
        `<p>No — I have to be precise here. <strong>${e.unicode}</strong> is a <strong>scholarly transliteration</strong>: a modern academic convention, not the original writing system of the ${e.pantheon} tradition. ` +
          `Calling it the original script would misrepresent both the tradition and the restoration.</p>`,
        { boundary: 'transliteration_not_original' }
      );

      // Egyptian conventional-reading doctrine (only where it applies).
      if (e.pantheon === 'egyptian') {
        push(
          e,
          'doctrine_boundary',
          `Is ${e.unicode} the actual ancient pronunciation of the name?`,
          `<p>No. Egyptian vocalizations are <strong>conventional readings</strong>: hieroglyphs record consonants only, so the vowels in ${e.unicode} are a modern scholarly convention for pronounceability, not an attested ancient sound. ` +
            `I can discuss the consonantal skeleton and the reading convention, but I will not present the vocalization as attested.</p>`,
          { boundary: 'egyptian_conventional_reading' }
        );
      }

      // Sanskrit IAST doctrine (only where it applies).
      if (e.pantheon === 'sanskrit') {
        push(
          e,
          'doctrine_boundary',
          `Should the long e and o in ${e.unicode} be written ē and ō in IAST?`,
          `<p>No. In Sanskrit, e and o are inherently long vowels, so IAST never writes them with macrons — writing ē or ō would be a transcription error, not extra precision. ` +
            `The macrons that do appear in a Sanskrit restoration mark genuinely contrastive long vowels.</p>`,
          { boundary: 'iast_no_macron_on_e_o' }
        );
      }
    }
  }
  return examples;
}

function main() {
  const entries = loadEntries();

  const examples = [
    ...buildDiacriticSemantics(entries),
    ...buildScriptHonesty(entries),
    ...buildRestorationVsAscii(entries),
    ...buildDoctrineBoundaries(entries),
  ];

  fs.writeFileSync(OUT_PATH, `${examples.map((ex) => JSON.stringify(ex)).join('\n')}\n`);

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} oracle doctrine examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
