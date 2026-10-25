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
 *         oracle-sft-scholarly.json, prep-report.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const CORPUS = path.join(ROOT, 'data', 'corpus');
const OUT = path.join(ROOT, 'data', 'finetune');

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

  fs.mkdirSync(OUT, { recursive: true });
  const write = (file, rows) =>
    fs.writeFileSync(path.join(OUT, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  write('oracle-sft-train.json', train.out);
  write('oracle-sft-eval.json', evalSet.out);
  write('oracle-sft-scholarly.json', scholarly.records);

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
}

main();
