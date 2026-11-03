#!/usr/bin/env node
/**
 * Prepare PuniCodex Oracle SFT data for Axolotl (sharegpt format).
 *
 * Converts the generated chat splits (OpenAI messages JSONL) into Axolotl's
 * stable sharegpt JSON format, then appends a deep scholarly layer built
 * from the canonical temple content:
 *
 *   - platform/scholars/content/{id}.json  — university-grade scholarly
 *     sections per flagship (548 files)
 *   - scripts/lore-catalog.json            — the temple lore narratives
 *   - platform/blog/content/{id}.json      — the temple blog posts
 *
 * Long-form content is chunked into multi-turn "Continue." conversations
 * sized to fit the 4096-token training window. Zero-width characters
 * (U+200B–200D, FEFF) are stripped — the scholarly renderer leaves them
 * behind and they poison tokenization.
 *
 * Hard validations:
 *   - line counts must match data/corpus/manifest.json (chatTrainExamples /
 *     chatEvalExamples) — a mismatch means the corpus was hand-tampered or
 *     partially copied;
 *   - every training conversation must alternate user/assistant and end on
 *     assistant (records that don't are skipped and reported, never trained);
 *   - benchmark.jsonl / chat-eval content may never appear in the training
 *     file (exact-id intersection check).
 *
 * Output: data/finetune/oracle-sft-train.json, oracle-sft-eval.json,
 *         oracle-sft-scholarly.json, oracle-sft-drills.json,
 *         oracle-sft-variantsqa.json, oracle-sft-chatformat.json,
 *         oracle-sft-reflections.json, prep-report.json.
 *
 * oracle-sft-drills.json (Phase 2): exact-string punycode recall drills.
 * Source: platform/db/owned-domains.json (359 canonical domains), converted
 * with WHATWG domainToASCII and verified. (The lexicon's `domain` field is
 * the domain-of-influence gloss and its sparse legacy `domainPunycode` was
 * retired as a source — 8 of 10 values were corrupt encodings; the canonical
 * domain pairs live on the archetypes and are validated there.)
 * Pure-ASCII owned domains become "no encoding needed" trap pairs — a
 * documented Phase 1 failure was inventing punycode for plain ASCII names.
 * The dual-form names (apóllōn/apollōn, hekátē/hekate, níkē/nike, zeús) get
 * extra paraphrases: they carry the graded checks.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { domainToASCII } = require('node:url');

const ROOT = path.join(__dirname, '..');
const CORPUS = path.join(ROOT, 'data', 'corpus');
const OUT = path.join(ROOT, 'data', 'finetune');

const OWNED_DOMAINS = require(
  [
    path.join(ROOT, 'platform', 'db', 'owned-domains.json'),
    path.join(ROOT, 'data', 'corpus', 'owned-domains.json'),
  ].find((p) => fs.existsSync(p))
);

// The package ships scholars/lore/blog at these roots; inside the repo they
// live at their canonical paths. Use whichever exists.
const SCHOLARS_DIR = [
  path.join(ROOT, 'platform', 'scholars', 'content'),
  path.join(ROOT, 'scholars'),
].find((p) => fs.existsSync(p));
const LORE_FILE = [
  path.join(ROOT, 'scripts', 'lore-catalog.json'),
  path.join(ROOT, 'lore-catalog.json'),
].find((p) => fs.existsSync(p));
const BLOG_DIR = [
  path.join(ROOT, 'platform', 'blog', 'content'),
  path.join(ROOT, 'blog'),
].find((p) => fs.existsSync(p));

const ROLE_MAP = { system: 'system', user: 'human', assistant: 'gpt' };
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const CHUNK_MAX = 10000; // chars per assistant turn (~2.5k tokens — fits seq 4096)

function clean(text) {
  return String(text).replace(ZERO_WIDTH, '').trim();
}

function readJsonl(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch {
        throw new Error(`${path.basename(file)}:${i + 1} invalid JSON`);
      }
    });
}

function toSharegpt(record) {
  if (!Array.isArray(record.messages) || record.messages.length < 2) return null;
  const convo = [];
  for (const m of record.messages) {
    const from = ROLE_MAP[m.role];
    if (!from || typeof m.content !== 'string' || !m.content.trim()) return null;
    convo.push({ from, value: m.content });
  }
  if (convo[convo.length - 1].from !== 'gpt') return null;
  if (!convo.some((c) => c.from === 'human')) return null;
  return { conversations: convo };
}

function convert(name, srcFile, expectedCount, idBlocklist) {
  const records = readJsonl(srcFile);
  if (records.length !== expectedCount) {
    throw new Error(
      `${name}: ${records.length} records but manifest expects ${expectedCount} — ` +
        'corpus is stale or hand-edited; run npm run generate'
    );
  }
  const out = [];
  const skipped = [];
  const skippedByTask = {};
  const seenHashes = new Set();
  for (const rec of records) {
    if (idBlocklist && idBlocklist.has(rec.id)) {
      throw new Error(`${name}: record id "${rec.id}" is in the eval/benchmark blocklist — aborting`);
    }
    const sg = toSharegpt(rec);
    if (!sg) {
      skipped.push(rec.id);
      skippedByTask[rec.task || 'unknown'] = (skippedByTask[rec.task || 'unknown'] || 0) + 1;
      continue;
    }
    const h = crypto.createHash('sha1').update(JSON.stringify(sg)).digest('hex');
    if (seenHashes.has(h)) continue; // exact duplicate conversation
    seenHashes.add(h);
    out.push(sg);
  }
  return { out, skipped, skippedByTask };
}

// ── Scholarly layer ────────────────────────────────────────────────────────

function labelize(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function flatten(value, indent = 0) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return clean(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const flat = flatten(item, indent + 1);
        return flat ? `- ${flat.replace(/\n+/g, '\n  ')}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => {
        const flat = flatten(v, indent + 1);
        return flat ? `${labelize(k)}:\n${flat}` : '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function chunkText(text, maxChars = CHUNK_MAX) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if (current && (current.length + para.length + 2 > maxChars)) {
      chunks.push(current.trim());
      current = '';
    }
    if (para.length > maxChars) {
      // Oversized single paragraph: hard-split on sentence boundaries.
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      for (const s of sentences) {
        if (current.length + s.length + 1 > maxChars) {
          chunks.push(current.trim());
          current = '';
        }
        current += (current ? ' ' : '') + s;
      }
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function longformRecords(openingQuestion, text) {
  const chunks = chunkText(text);
  return chunks.map((chunk, i) => ({
    conversations: [
      { from: 'human', value: i === 0 ? openingQuestion : 'Continue.' },
      { from: 'gpt', value: chunk },
    ],
  }));
}

function extractName(body, entryId) {
  const bold = body.match(/\*\*([^*]+)\*\*/);
  return bold ? bold[1].trim() : entryId;
}

function buildScholarlyRecords() {
  const records = [];
  const report = { scholars: 0, lore: 0, blog: 0, entries: 0, skippedEmpty: 0 };

  if (SCHOLARS_DIR) {
    for (const file of fs.readdirSync(SCHOLARS_DIR).filter((f) => f.endsWith('.json'))) {
      const data = JSON.parse(fs.readFileSync(path.join(SCHOLARS_DIR, file), 'utf8'));
      const sections = data.sections || {};
      const parts = Object.entries(sections)
        .filter(([, s]) => s && typeof s.body === 'string' && s.body.trim())
        .map(([key, s]) => `## ${labelize(key)}\n\n${clean(s.body)}`);
      if (!parts.length) {
        report.skippedEmpty++;
        continue;
    }
      const text = parts.join('\n\n');
      const name = extractName(clean(sections.overview?.body || ''), data.entryId);
      const recs = longformRecords(
        `Give me the full scholarly account of ${name} — everything the temple's scholars have established.`,
        text
      );
      records.push(...recs);
      report.scholars += recs.length;
      report.entries++;
    }
  }

  if (LORE_FILE) {
    const lore = JSON.parse(fs.readFileSync(LORE_FILE, 'utf8'));
    for (const [entryId, sections] of Object.entries(lore)) {
      const text = flatten(sections);
      if (!text) {
        report.skippedEmpty++;
        continue;
      }
      const recs = longformRecords(
        `Tell me the complete lore of the temple of ${entryId}, as the temple tells it.`,
        text
      );
      records.push(...recs);
      report.lore += recs.length;
    }
  }

  if (BLOG_DIR) {
    for (const file of fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))) {
      const post = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8'));
      const body = clean(post.body || '');
      if (!body) {
        report.skippedEmpty++;
        continue;
      }
      const recs = longformRecords(
        `Read me the temple essay "${post.title}".`,
        body
      );
      records.push(...recs);
      report.blog += recs.length;
    }
  }

  return { records, report };
}

// ── Domain / punycode drills (Phase 2) ─────────────────────────────────────

const isPureAscii = (s) => /^[\x00-\x7F]+$/.test(s);

// Names carrying the graded smoke checks (dual forms + the canonical
// restoration) get extra paraphrase exposure per epoch.
const EMPHASIS_DOMAINS = [
  'apóllōn.com',
  'apollōn.com',
  'zeús.com',
  'hekátē.com',
  'hekate.com',
  'níkē.com',
  'nike.com',
];

function collectDomainPairs() {
  const pairs = new Map(); // unicode domain -> punycode (itself for ASCII)
  const mismatches = [];
  let asciiTraps = 0;
  for (const d of OWNED_DOMAINS) {
    if (pairs.has(d)) continue;
    if (isPureAscii(d)) {
      asciiTraps++;
      pairs.set(d, d);
      continue;
    }
    const ascii = domainToASCII(d);
    if (ascii && ascii !== d && ascii.startsWith('xn--')) pairs.set(d, ascii);
    else mismatches.push(d);
  }
  return { pairs, asciiTraps, mismatches };
}

function buildDrillRecords() {
  const { pairs, asciiTraps, mismatches } = collectDomainPairs();
  const records = [];
  const seen = new Set();
  const push = (question, answer) => {
    const rec = {
      conversations: [
        { from: 'human', value: clean(question) },
        { from: 'gpt', value: clean(answer) },
      ],
    };
    const h = crypto.createHash('sha1').update(JSON.stringify(rec)).digest('hex');
    if (seen.has(h)) return;
    seen.add(h);
    records.push(rec);
  };

  for (const [unicode, punycode] of pairs) {
    if (unicode === punycode) {
      // ASCII trap: plain names must NOT get an invented xn-- form.
      push(
        `What is the punycode form of ${unicode}?`,
        `${unicode} is pure ASCII — it needs no punycode encoding. ` +
          `DNS stores ${unicode} exactly as written.`
      );
      continue;
    }
    push(`What is the punycode form of ${unicode}?`, punycode);
    push(`How is ${unicode} encoded for DNS?`, punycode);
    push(`What name is encoded by ${punycode}?`, unicode);
  }

  // ASCII traps for the plain-ASCII forms of restored names (apollon.com,
  // zeus.com, athena.com, …) — Phase 1's base comparison showed models
  // inventing xn-- forms for plain ASCII names. Teach the boundary.
  for (const unicode of pairs.keys()) {
    if (isPureAscii(unicode)) continue;
    const ascii = unicode.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (ascii === unicode || !isPureAscii(ascii)) continue;
    push(
      `What is the punycode form of ${ascii}?`,
      `${ascii} is pure ASCII — it needs no punycode encoding. ` +
        `DNS stores ${ascii} exactly as written.`
    );
  }

  for (const name of EMPHASIS_DOMAINS) {
    const punycode = pairs.get(name);
    if (!punycode || punycode === name) continue;
    push(`Spell ${name} in punycode.`, punycode);
    push(
      `I am registering ${name}. What string does the registrar's DNS actually store?`,
      punycode
    );
    push(
      `What is the punycode form of ${name}, and do the diacritics survive the encoding?`,
      `${punycode} — the diacritics survive the encoding; that is the whole point of the restoration.`
    );
  }

  return {
    records,
    report: {
      total: records.length,
      domainPairs: pairs.size,
      asciiTraps,
      mismatches,
    },
  };
}

// ── Variants-frame QA (Phase 3) ────────────────────────────────────────────
// The tier system (Tier 1 / Tier 2 / dual) was retired in 2026-11; the
// A1/A2 smoke checks failed because v2 still asserted tier doctrine. These
// records teach the model to decline the tier frame and answer in variants
// terms, sourced from the canonical computed variants table (data/variants.json).

const VARIANTS_FILE = [
  path.join(ROOT, 'data', 'variants.json'),
  path.join(ROOT, 'data', 'corpus', 'variants.json'),
].find((p) => fs.existsSync(p));
const VARIANTS_EMPHASIS = ['apollon', 'athena', 'hekate', 'nike', 'zeus', 'hades', 'aphrodite', 'artemis', 'hera', 'poseidon', 'pandora', 'aither'];

function describeVariantFamily(v) {
  // Attested = backed by a named source OR a live registration (the rulebook's
  // definition); sources-null stacked ideals are listed separately, not counted.
  const attested = v.forms.filter(
    (f) => f.class === 'attested' && ((f.sources && f.sources.length) || f.owned)
  );
  const ideals = v.forms.filter((f) => f.class === 'attested' && !((f.sources && f.sources.length) || f.owned));
  const ownedForms = attested.filter((f) => f.owned).map((f) => f.form);
  const parts = [];
  if (attested.length > 1) {
    parts.push(
      `${v.canonical} has ${attested.length} attested forms — ` +
        attested.map((f) => f.form + (f.owned ? ' (owned)' : '')).join(' and ') +
        ' — each backed by a named source or a live registration.'
    );
  } else if (attested.length === 1) {
    parts.push(`${v.canonical} has exactly one attested form; every other spelling is a systematic derivation, labelled as such.`);
  }
  if (ideals.length) {
    parts.push(`The stacked ideal ${ideals.map((f) => f.form).join(', ')} is preserved in the lexicon as the philologically fullest form, impractical to type.`);
  }
  if (ownedForms.length > 1) parts.push(`${ownedForms.length} of the attested forms are live temples: ${ownedForms.join(' and ')}.`);
  parts.push('Ownership is an annotation on the family, never a criterion — knowledge of a spelling we do not own is published exactly the same as one we do.');
  return parts.join(' ');
}

function buildVariantsQARecords() {
  const records = [];
  const seen = new Set();
  const push = (question, answer) => {
    const rec = {
      conversations: [
        { from: 'human', value: clean(question) },
        { from: 'gpt', value: clean(answer) },
      ],
    };
    const h = crypto.createHash('sha1').update(JSON.stringify(rec)).digest('hex');
    if (seen.has(h)) return;
    seen.add(h);
    records.push(rec);
  };

  let table = null;
  try {
    table = JSON.parse(fs.readFileSync(VARIANTS_FILE, 'utf8')).entries || {};
  } catch {
    return { records, report: { skippedNoTable: true, written: 0 } };
  }

  const decline =
    'PuniCodex retired the tier system (Tier 1 / Tier 2 / dual) in November 2026 — preservation tiers are no longer how names are described. ' +
    'What matters is the attested spelling family. ';
  const genericDecline =
    'There is no such classification anymore — the tier system was retired in 2026-11 and survives only in archived documentation. ';

  const questionsFor = (unicode, domain) => [
    `Is ${domain || unicode + '.com'} a Tier 1 name?`,
    `What tier is ${unicode}?`,
    `Is ${unicode} Tier 1 or Tier 2?`,
    `Classify ${unicode} by preservation tier.`,
    `Which tier does ${unicode} belong to?`,
  ];

  let emphasisCount = 0;
  for (const id of VARIANTS_EMPHASIS) {
    const v = table[id];
    if (!v) continue;
    emphasisCount++;
    const qs = questionsFor(v.canonical, v.forms.find((f) => f.owned && f.punycode)?.form);
    const answer = decline + describeVariantFamily(v);
    push(qs[0], answer);
    push(qs[1], answer);
    push(qs[2], genericDecline + describeVariantFamily(v));
    push(qs[3], answer);
    push(qs[4], genericDecline + describeVariantFamily(v));
  }

  let generalCount = 0;
  for (const [id, v] of Object.entries(table)) {
    if (VARIANTS_EMPHASIS.includes(id)) continue;
    if (generalCount >= 400) break; // cap the long tail; emphasis forms carry the graded checks
    generalCount++;
    push(
      `What tier is ${v.canonical}?`,
      decline + describeVariantFamily(v)
    );
  }

  return {
    records,
    report: { emphasis: emphasisCount, general: generalCount, written: records.length },
  };
}

// ── Comparison + guardian chat-format QA (Phase 3) ─────────────────────────
// v2 chat regressions: temple-card answers crowd out multi-figure comparisons
// (Persephone vs Izanami) and step-by-step guardian answers (bank-email
// protocol). These records teach the balanced comparison layout and the
// numbered guardian protocol in the exact chat surface the product serves.

const SIMILARITIES_FILE = [
  path.join(ROOT, 'platform', 'api', 'similarities.json'),
  path.join(ROOT, 'data', 'corpus', 'similarities.json'),
].find((p) => fs.existsSync(p));

const GUARDIAN_SCENARIOS = [
  {
    q: 'I got an email from "punicodex-support.com" saying my temple domain expires today and I must pay $89 or lose it. Is it real?',
    threat: 'an urgency-and-fear renewal notice',
  },
  {
    q: 'A bank emailed me from "xn--aplln-1ta64d.com" asking me to confirm my card for a domain purchase. Can you check it?',
    threat: 'a punycode lookalike of a trusted name',
  },
  {
    q: 'Someone DMed me a link to claim a free Unicode domain at "púneodex.com" — it looks like PuniCodex. Should I click?',
    threat: 'a homograph spoof of the project itself',
  },
  {
    q: 'A lawyer emailed from "hermes-legal.com" saying my domain infringes a trademark and demanding transfer within 48 hours. What do I do?',
    threat: 'a trademark-pressure demand',
  },
  {
    q: 'My registrar (I think) sent "final notice: verify your apóllōn.com ownership or it is suspended." The link is apollon-verify.net. Real?',
    threat: 'a registrar-impersonation link',
  },
  {
    q: 'A marketplace buyer wants me to "verify ownership" of my domain by entering my registrar password on their escrow page. Safe?',
    threat: 'a credential-harvesting escrow page',
  },
];

function guardianAnswer(scenario) {
  return [
    'Do not act on the message itself — run the verification protocol first:',
    '',
    '1. **Read the domain character by character.** ' + scenario.threat + ' lives in small differences: a swapped letter, a dropped diacritic, an `xn--` prefix hiding a lookalike. Copy the domain out and inspect it — never judge by overall impression.',
    '2. **Decode any punycode.** If the label starts with `xn--`, decode it (PuniCodex `/api/v1/convert` or the type tool) and see what it actually spells. A punycode label that decodes to a lookalike of a trusted name is hostile by construction.',
    '3. **Check provenance against the real registrar of record.** Open your registrar the way you always do — type the address or use a bookmark. Compare the sender, the linked domain, and the real registrar. A mismatch ends the conversation: the message is fraudulent regardless of how official it looks.',
    '4. **Treat urgency as evidence.** Real registrars, banks, and courts do not threaten same-day loss or 48-hour transfer. Pressure to act before thinking is the single strongest fraud signal in the message.',
    '5. **Never enter credentials through a link someone sent you.** Ownership verification that requires your password on a third-party page is credential harvesting by definition.',
    '6. **Verify independently, then report.** If anything survives steps 1–4, confirm through the independent channel before paying, clicking, or replying. Then report the lookalike through PuniCodex `/authenticity/` so the confusable atlas learns it.',
    '',
    'Verdict on demand: if a message wants fast action plus secrets, it has already answered itself. Slow is safe.',
  ].join('\n');
}

function buildChatFormatRecords() {
  const records = [];
  const seen = new Set();
  const push = (question, answer) => {
    const rec = {
      conversations: [
        { from: 'human', value: clean(question) },
        { from: 'gpt', value: clean(answer) },
      ],
    };
    const h = crypto.createHash('sha1').update(JSON.stringify(rec)).digest('hex');
    if (seen.has(h)) return;
    seen.add(h);
    records.push(rec);
  };

  // Guardians: every scenario in two phrasings.
  for (const s of GUARDIAN_SCENARIOS) {
    push(s.q, guardianAnswer(s));
    push('Walk me through checking this message before I trust it: ' + s.q, guardianAnswer(s));
  }

  // Comparisons: balanced two-figure answers from the canonical similarities graph.
  let sim = null;
  try {
    sim = JSON.parse(fs.readFileSync(SIMILARITIES_FILE, 'utf8'));
  } catch {
    sim = null;
  }
  let comparisonCount = 0;
  if (sim && Array.isArray(sim.nodes) && Array.isArray(sim.edges)) {
    const nodeById = new Map(sim.nodes.map((n) => [n.id, n]));
    const used = new Set();
    for (const edge of sim.edges) {
      if (comparisonCount >= 320) break;
      if (!edge.bidirectional || edge.strength < 2 || !edge.note) continue;
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) continue;
      const key = [edge.source, edge.target].sort().join('|');
      if (used.has(key)) continue;
      used.add(key);
      comparisonCount++;
      const q = `Compare ${a.unicode} and ${b.unicode}.`;
      const answer = [
        `## ${a.unicode} — ${a.pantheonLabel}`,
        `Domain of influence: ${a.domain}.`,
        '',
        `## ${b.unicode} — ${b.pantheonLabel}`,
        `Domain of influence: ${b.domain}.`,
        '',
        '### The thread between them',
        edge.note,
        '',
        `They are kin across traditions rather than rivals within one: ${a.pantheonLabel.toLowerCase()} and ${b.pantheonLabel.toLowerCase()} systems solved a shared human question with the materials each had. Restorations: ${a.unicode} (${a.id}) and ${b.unicode} (${b.id}).`,
      ].join('\n');
      push(q, answer);
      push(`What do ${a.unicode} and ${b.unicode} have in common, and how do they differ?`, answer);
    }
  }

  return {
    records,
    report: { guardians: GUARDIAN_SCENARIOS.length * 2, comparisons: comparisonCount, written: records.length },
  };
}

// ── Modern reflections / ATLAS (Phase 3) ───────────────────────────────────
// The question-ladder names an "ATLAS" reflections dataset as the fix for
// thin modern-echo answers (Thursday's modern reflections et al.). Echoes:
// weekdays, months, planets, and the everyday-words canon — each answer runs
// the thread from the modern word back to the restored name.

const EVERYDAY_FILE = [
  path.join(ROOT, 'type', 'js', 'everyday-words.js'),
  path.join(ROOT, 'data', 'corpus', 'everyday-words.js'),
].find((p) => fs.existsSync(p));

const WEEKDAYS = [
  ['Sunday', 'Latin diēs Sōlis — the day of Sōl, the Roman sun god (Greek Hēlios)'],
  ['Monday', 'Old English Mōnandæġ — Mōna’s day, the Norse-Germanic moon god Máni (Greek Mēnē)'],
  ['Tuesday', 'Old English Tīwesdæġ — Tīw’s day, the Germanic Mars: Týr, the one-handed god of the thing (Norse Týr)'],
  ['Wednesday', 'Old English Wōdnesdæġ — Woden’s day, the Anglo-Saxon Óðinn (Norse Óðinn)'],
  ['Thursday', 'Old English Þūnresdæġ — Þunor’s day, the thunderer: Þórr (Thor)'],
  ['Friday', 'Old English Frīġedæġ — Frigg’s day, the Anglo-Saxon love-and-marriage goddess (Norse Frigg, beside Freyja)'],
  ['Saturday', 'Latin diēs Saturnī — Saturn’s day, the Roman face of Kronos, the youngest Titan'],
];

const MONTHS = [
  ['January', 'Iānus — the two-faced Roman god of thresholds and beginnings'],
  ['March', 'Mars — the Roman war god (Greek Árēs), opening the campaign season'],
  ['May', 'Maia — the eldest Pleiad, spring’s growth goddess (Greek Maîa)'],
  ['June', 'Iūnō — the Roman queen of the gods (Greek Hēra), patroness of marriage'],
  ['July', 'Iūlius — Caesar’s month, not a god: the human exception in the calendar'],
  ['August', 'Augustus — the emperor’s month, likewise human'],
];

const PLANETS = [
  ['Mercury', 'Hermês — the messenger’s speed names the fastest planet'],
  ['Venus', 'Aphrodítē — brightness itself, the morning and evening star the Greeks knew was one'],
  ['Mars', 'Árēs — blood-red in the telescope, blood-red in the Iliad'],
  ['Jupiter', 'Zeús — the sky father’s planet, largest of the classical five'],
  ['Saturn', 'Kronos — Zeus’s father, slowest of the wanderers, and his Roman face gave us Saturday'],
  ['Neptune', 'Poseidôn — the sea god, named when telescopes found the deep-blue giant'],
  ['Uranus', 'Ouranos — the sky itself, the primordial Greek name restored to the pantheon of planets'],
  ['Pluto', 'Hádēs — the unseen one; a planet named for the lord of the underworld, dark as his realm'],
];

function buildReflectionsRecords() {
  const records = [];
  const seen = new Set();
  const push = (question, answer) => {
    const rec = {
      conversations: [
        { from: 'human', value: clean(question) },
        { from: 'gpt', value: clean(answer) },
      ],
    };
    const h = crypto.createHash('sha1').update(JSON.stringify(rec)).digest('hex');
    if (seen.has(h)) return;
    seen.add(h);
    records.push(rec);
  };

  const echoAnswer = (modern, thread) =>
    `${modern} is a modern echo of the pantheon: ${thread}. The name lives in the calendar (or the sky, or the dictionary) exactly because the god’s name carried power for the people who carried the word — the restoration (${thread.split('—')[1] ? thread.split('—')[1].trim().split(/[ ,]/)[0] : thread}) is the same name with its marks recovered.`;

  for (const [day, thread] of WEEKDAYS) {
    push(`Where does ${day} get its name?`, echoAnswer(day, thread));
    push(`What god is ${day} named after?`, echoAnswer(day, thread));
  }
  for (const [month, thread] of MONTHS) {
    push(`Why is ${month} called ${month}?`, echoAnswer(month, thread));
  }
  for (const [planet, thread] of PLANETS) {
    push(`Which god is the planet ${planet} named after?`, echoAnswer(planet, thread));
    push(`Tell me about the name ${planet}.`, echoAnswer(planet, thread));
  }

  let words = [];
  try {
    const m = fs.readFileSync(EVERYDAY_FILE, 'utf8').match(/EVERYDAY_WORDS\s*=\s*(\[[\s\S]*?\]);/);
    if (m) words = Function(`return (${m[1]});`)();
  } catch {
    words = [];
  }
  for (const w of words.slice(0, 72)) {
    if (!w.word || !w.story) continue;
    push(
      `Does the word "${w.word}" really come from a god's name?`,
      `It does — ${w.story} (${w.origin || ''}). An ordinary English word carrying a divine name two or three thousand years deep: the myth did not end; it went lexical. The temple: /${w.entry}/.`
    );
  }

  return {
    records,
    report: { weekdays: WEEKDAYS.length, months: MONTHS.length, planets: PLANETS.length, words: records.length - (WEEKDAYS.length * 2 + MONTHS.length + PLANETS.length * 2), written: records.length },
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'manifest.json'), 'utf8'));
  const trainExpected = manifest.counts.chatTrainExamples;
  const evalExpected = manifest.counts.chatEvalExamples;

  const blocklist = new Set(readJsonl(path.join(CORPUS, 'chat-eval.jsonl')).map((r) => r.id));
  for (const r of readJsonl(path.join(CORPUS, 'benchmark.jsonl'))) blocklist.add(r.id);

  const train = convert('chat-train', path.join(CORPUS, 'chat-train.jsonl'), trainExpected, blocklist);
  const evalSet = convert('chat-eval', path.join(CORPUS, 'chat-eval.jsonl'), evalExpected, null);

  const scholarly = buildScholarlyRecords();
  const drills = buildDrillRecords();
  const variantsQA = buildVariantsQARecords();
  const chatFormat = buildChatFormatRecords();
  const reflections = buildReflectionsRecords();

  fs.mkdirSync(OUT, { recursive: true });
  const write = (file, rows) =>
    fs.writeFileSync(path.join(OUT, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  write('oracle-sft-train.json', train.out);
  write('oracle-sft-eval.json', evalSet.out);
  write('oracle-sft-scholarly.json', scholarly.records);
  write('oracle-sft-drills.json', drills.records);
  write('oracle-sft-variantsqa.json', variantsQA.records);
  write('oracle-sft-chatformat.json', chatFormat.records);
  write('oracle-sft-reflections.json', reflections.records);

  fs.writeFileSync(
    path.join(OUT, 'prep-report.json'),
    JSON.stringify(
      {
        corpusVersion: manifest.version,
        generatedAt: new Date().toISOString(),
        canonicalHashes: manifest.canonicalHashes,
        train: {
          expected: trainExpected,
          written: train.out.length,
          skipped: train.skipped.length,
          skippedByTask: train.skippedByTask,
        },
        eval: {
          expected: evalExpected,
          written: evalSet.out.length,
          skipped: evalSet.skipped.length,
          skippedByTask: evalSet.skippedByTask,
        },
        scholarly: {
          ...scholarly.report,
          written: scholarly.records.length,
          sources: {
            scholarsDir: SCHOLARS_DIR ? path.relative(ROOT, SCHOLARS_DIR) : null,
            loreFile: LORE_FILE ? path.relative(ROOT, LORE_FILE) : null,
            blogDir: BLOG_DIR ? path.relative(ROOT, BLOG_DIR) : null,
          },
        },
        drills: {
          written: drills.records.length,
          domainPairs: drills.report.domainPairs,
          asciiTraps: drills.report.asciiTraps,
          conversionMismatches: drills.report.mismatches,
        },
        variantsQA: variantsQA.report,
        chatFormat: chatFormat.report,
        reflections: reflections.report,
        blocklistSize: blocklist.size,
      },
      null,
      2
    )
  );
  console.log(`train:      ${train.out.length}/${trainExpected} written (${train.skipped.length} skipped)`);
  console.log(`eval:       ${evalSet.out.length}/${evalExpected} written (${evalSet.skipped.length} skipped)`);
  console.log(
    `scholarly:  ${scholarly.records.length} records ` +
      `(scholars ${scholarly.report.scholars}, lore ${scholarly.report.lore}, blog ${scholarly.report.blog}; ` +
      `${scholarly.report.skippedEmpty} empty sources skipped)`
  );
  console.log(`corpus version: ${manifest.version} → ${path.relative(ROOT, OUT)}/`);
  console.log(
    `drills:     ${drills.records.length} records ` +
      `(domains ${drills.report.domainPairs}, ASCII traps ${drills.report.asciiTraps}, ` +
      `conversion mismatches ${drills.report.mismatches.length})`
  );
  console.log(
    `variantsQA: ${variantsQA.records.length} records (emphasis ${variantsQA.report.emphasis}, general ${variantsQA.report.general})`
  );
  console.log(
    `chatFormat: ${chatFormat.records.length} records (guardians ${chatFormat.report.guardians}, comparisons ${chatFormat.report.comparisons})`
  );
  console.log(
    `reflections: ${reflections.records.length} records (weekdays ${reflections.report.weekdays}, months ${reflections.report.months}, planets ${reflections.report.planets}, words ${reflections.report.words})`
  );
}

if (require.main === module) main();

module.exports = { buildDrillRecords, buildVariantsQARecords, buildChatFormatRecords, buildReflectionsRecords };
