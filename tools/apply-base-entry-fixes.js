/**
 * Applies the swarm-reviewed base-entry meaning fixes to type/js/lexicon.js.
 * Assertion-based: each entry's current meaning must match the reviewed
 * `current` string exactly; entries already carrying the proposed text are
 * treated as applied (idempotent).
 */
const fs = require('node:fs');
const path = require('node:path');

const LEXICON = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const DIR = path.join(__dirname, '..', 'session-debug', 'base-entry-fixes');

const files = fs
  .readdirSync(DIR)
  .filter((f) => /^batch-\d-reviewed\.json$/.test(f))
  .sort();

let text = fs.readFileSync(LEXICON, 'utf8');
let applied = 0;
let alreadyApplied = 0;
let keeps = 0;
const problems = [];

for (const file of files) {
  const verdicts = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  for (const v of verdicts) {
    if (v.action === 'keep') {
      keeps++;
      continue;
    }
    if (v.action !== 'fix' || !v.proposed) {
      problems.push(`${file}: ${v.id}: malformed verdict`);
      continue;
    }
    const idAnchor = `"id": "${v.id}",`;
    const idIdx = text.indexOf(idAnchor);
    if (idIdx === -1) {
      problems.push(`${v.id}: id not found`);
      continue;
    }
    const windowText = text.slice(idIdx, idIdx + 4000);
    const meaningRe = /"meaning": "((?:[^"\\]|\\.)*)"/;
    const m = windowText.match(meaningRe);
    if (!m) {
      problems.push(`${v.id}: no meaning field near id`);
      continue;
    }
    const currentJson = m[1];
    let currentPlain;
    let proposedJson;
    try {
      currentPlain = JSON.parse(`"${currentJson}"`);
      proposedJson = JSON.stringify(v.proposed).slice(1, -1);
    } catch (e) {
      problems.push(`${v.id}: JSON escape issue: ${e.message}`);
      continue;
    }
    if (currentPlain === v.proposed) {
      alreadyApplied++;
      continue;
    }
    if (currentPlain !== v.current) {
      problems.push(
        `${v.id}: current mismatch —\n  lexicon: ${JSON.stringify(currentPlain).slice(0, 120)}\n  review:  ${JSON.stringify(v.current).slice(0, 120)}`
      );
      continue;
    }
    text = `${text.slice(0, idIdx + m.index)}${windowText
      .slice(m.index)
      .replace(meaningRe, `"meaning": "${proposedJson}"`)}${text.slice(idIdx + 4000)}`;
    applied++;
  }
}

console.log(`applied: ${applied}, already applied: ${alreadyApplied}, keeps: ${keeps}`);
if (problems.length) {
  console.log(`problems (${problems.length}):`);
  problems.forEach((p) => console.log(' ', p));
}
if (applied > 0) fs.writeFileSync(LEXICON, text);

// Verify with the parsed module.
if (applied > 0) {
  delete require.cache[require.resolve(LEXICON)];
  const { LEXICON: entries } = require(LEXICON);
  let bad = 0;
  for (const file of files) {
    for (const v of JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'))) {
      if (v.action !== 'fix') continue;
      const e = entries.find((x) => x.id === v.id);
      if (!e || e.meaning !== v.proposed) {
        bad++;
        console.log(`VERIFY FAIL: ${v.id}`);
      }
    }
  }
  console.log(bad === 0 ? 'verified: all fixes live in the lexicon' : `${bad} verify failures`);
}
