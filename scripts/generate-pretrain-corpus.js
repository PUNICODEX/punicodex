#!/usr/bin/env node
/**
 * PÚNYCODEX — Continual Pretraining Corpus (Phase 15)
 *
 * Builds a raw-text scholarly corpus for domain-adapting a base model before
 * supervised fine-tuning. Sources include structured entry records, flagship
 * lore, original-script provenance, pronunciation notes, source catalog,
 * mythology synthesis, oracle reflections, symbolic correspondences, and
 * scientific analogies.
 *
 * Outputs:
 *   - data/corpus/pretrain.jsonl
 *   - data/corpus/pretrain-validation.jsonl
 *   - data/corpus/huggingface/train.jsonl
 *   - data/corpus/huggingface/validation.jsonl
 *   - data/corpus/pretrain-manifest.json
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const CORPUS_DIR = path.join(ROOT, 'data', 'corpus');
const HF_DIR = path.join(CORPUS_DIR, 'huggingface');
const OUT_TRAIN = path.join(CORPUS_DIR, 'pretrain.jsonl');
const OUT_VAL = path.join(CORPUS_DIR, 'pretrain-validation.jsonl');
const OUT_HF_TRAIN = path.join(HF_DIR, 'train.jsonl');
const OUT_HF_VAL = path.join(HF_DIR, 'validation.jsonl');
const OUT_MANIFEST = path.join(CORPUS_DIR, 'pretrain-manifest.json');

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) return [];
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`Invalid JSON on line ${idx + 1} of ${filePath}: ${err.message}`);
      }
    });
}

function loadJsObject(filePath, varName) {
  const code = fs.readFileSync(filePath, 'utf8').replace(`const ${varName}`, `var ${varName}`);
  return new Function(`${code}; return ${varName};`)();
}

function requireModule(filePath) {
  return require(filePath);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function hashBucket(id, buckets = 100) {
  const hex = crypto.createHash('sha256').update(String(id)).digest('hex');
  return Number.parseInt(hex.slice(0, 8), 16) % buckets;
}

function approxTokens(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function makeDoc({ id, source, entryId, title, text }) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return {
    id,
    source,
    entryId: entryId || null,
    title: title || '',
    text: clean,
    tokens: approxTokens(clean),
  };
}

function* entryDocs(records) {
  for (const r of records) {
    const parts = [];
    parts.push(`Name: ${r.unicode} (${r.ascii})`);
    if (r.greek) parts.push(`Greek / original script form: ${r.greek}`);
    parts.push(`Pantheon: ${r.pantheon}`);
    parts.push(`Tier: ${r.tierLabel}`);
    parts.push(`Meaning: ${r.meaning}`);
    if (r.etymology) {
      parts.push(`Etymology: ${r.etymology.proto || ''} ${r.etymology.note || ''}`.trim());
      if (r.etymology.cognates?.length) {
        parts.push(`Cognates: ${r.etymology.cognates.map((c) => `${c.form} (${c.language})`).join('; ')}`);
      }
    }
    if (r.originalScript?.specimen) {
      parts.push(`Original script (${r.originalScript.scriptName}): ${r.originalScript.specimen}`);
      parts.push(`Transliteration: ${r.originalScript.transliteration}`);
      if (r.originalScript.provenanceSteps?.length) {
        parts.push(`Provenance: ${r.originalScript.provenanceSteps.join(' ')}`);
      }
    }
    if (r.pronunciation?.ipa) {
      parts.push(`Pronunciation: ${r.pronunciation.ipa} — ${r.pronunciation.approximation || ''}`);
      if (r.pronunciation.phonemes?.length) {
        parts.push(
          `Phonemes: ${r.pronunciation.phonemes.map((p) => `${p.symbol}: ${p.desc}`).join(' ')}`
        );
      }
      if (r.pronunciation.note) parts.push(`Pronunciation note: ${r.pronunciation.note}`);
    }
    if (r.variants?.length) {
      parts.push(
        `Variants: ${r.variants.map((v) => `${v.type}: ${v.unicode || v.value}`).join('; ')}`
      );
    }
    if (r.breakdown?.length) {
      parts.push(
        `Character breakdown: ${r.breakdown.map((b) => `${b.char} (${b.name})`).join(', ')}`
      );
    }
    if (r.sources?.length) {
      parts.push(`Sources: ${r.sources.map((s) => s.full || s.key).join('; ')}`);
    }
    yield makeDoc({
      id: `entry-${r.id}`,
      source: 'entries.jsonl',
      entryId: r.id,
      title: r.unicode,
      text: parts.join('\n'),
    });
  }
}

function* loreDocs(loreCatalog) {
  for (const [entryId, lore] of Object.entries(loreCatalog)) {
    const parts = [];
    if (lore.domains) {
      parts.push(`${lore.domains.title}: ${lore.domains.subtitle}`);
      parts.push(stripHtml(lore.domains.lead));
      for (const card of lore.domains.cards || []) {
        parts.push(`${card.name}: ${stripHtml(card.desc)}`);
      }
    }
    if (lore.symbols?.length) {
      parts.push(`Symbols: ${lore.symbols.map((s) => `${s.name} — ${s.meaning}`).join('; ')}`);
    }
    if (lore.mythology) {
      parts.push(stripHtml(lore.mythology.lead));
      for (const myth of lore.mythology.myths || []) {
        parts.push(`${myth.tag}: ${myth.title}`);
        parts.push(stripHtml(myth.text));
      }
    }
    if (lore.syncretism) parts.push(`Syncretism: ${stripHtml(lore.syncretism)}`);
    if (lore.culturalLegacy) parts.push(`Cultural legacy: ${stripHtml(lore.culturalLegacy)}`);
    if (lore.extendedMeditation) parts.push(`Extended meditation: ${stripHtml(lore.extendedMeditation)}`);
    if (lore.originalScriptNote) parts.push(`Original script note: ${stripHtml(lore.originalScriptNote)}`);

    const text = parts.join('\n');
    if (text.length < 40) continue;
    yield makeDoc({ id: `lore-${entryId}`, source: 'lore-catalog.json', entryId, title: lore.domains?.title || entryId, text });
  }
}

function* sourceCatalogDocs(sourceCatalog) {
  for (const [key, src] of Object.entries(sourceCatalog)) {
    const text = [
      `Source code: ${key}`,
      `Full title: ${src.full || ''}`,
      `Scope: ${src.scope || ''}`,
      `Year: ${src.year || ''}`,
      `Edition: ${src.edition || ''}`,
      src.url ? `URL: ${src.url}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    yield makeDoc({ id: `source-${key}`, source: 'source-catalog.js', title: src.full || key, text });
  }
}

function* originalScriptDocs(originalScripts, lexiconById) {
  for (const [entryId, data] of Object.entries(originalScripts)) {
    if (!data.provenance) continue;
    const entry = lexiconById[entryId];
    const parts = [
      `Original script for ${entry ? entry.unicode : entryId}: ${data.originalScript || ''}`,
      `Script: ${data.scriptName || ''}`,
      `Transliteration: ${data.provenance.transliteration || ''}`,
      `Steps: ${(data.provenance.steps || []).join(' ')}`,
      `Sources: ${(data.provenance.sources || []).join(', ')}`,
    ];
    yield makeDoc({
      id: `provenance-${entryId}`,
      source: 'original-scripts.js',
      entryId,
      title: `Original script provenance: ${entry ? entry.unicode : entryId}`,
      text: parts.filter(Boolean).join('\n'),
    });
  }
}

function* pronunciationDocs(pronunciationAtlas, lexiconById) {
  for (const [entryId, pron] of Object.entries(pronunciationAtlas)) {
    if (!pron) continue;
    const entry = lexiconById[entryId];
    const parts = [
      `Pronunciation of ${entry ? entry.unicode : entryId}: ${pron.ipa || ''}`,
      `Label: ${pron.ipaLabel || ''}`,
      `Approximation: ${pron.approximation || ''}`,
      `Dialect: ${pron.dialect || ''}`,
      `Confidence: ${pron.confidence || ''}`,
    ];
    if (pron.phonemes?.length) {
      parts.push(`Phonemes: ${pron.phonemes.map((p) => `${p.symbol}: ${p.desc}`).join(' ')}`);
    }
    if (pron.note) parts.push(`Note: ${pron.note}`);
    yield makeDoc({
      id: `pronunciation-${entryId}`,
      source: 'pronunciation-atlas.js',
      entryId,
      title: `Pronunciation: ${entry ? entry.unicode : entryId}`,
      text: parts.filter(Boolean).join('\n'),
    });
  }
}

function* jsonlOutputDocs(fileName, sourceLabel, entryField = 'entryId', textField = 'output') {
  const examples = readJsonl(path.join(CORPUS_DIR, fileName));
  for (const ex of examples) {
    const text = ex[textField] || ex.answer || ex.response || '';
    if (!text || text.length < 20) continue;
    yield makeDoc({
      id: `${sourceLabel}-${ex.id}`,
      source: fileName,
      entryId: ex[entryField] || null,
      title: `${sourceLabel}: ${ex.task}`,
      text,
    });
  }
}

function main() {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });
  fs.mkdirSync(HF_DIR, { recursive: true });

  const entries = readJsonl(path.join(CORPUS_DIR, 'entries.jsonl'));
  const lexiconById = Object.fromEntries(entries.map((e) => [e.id, e]));
  const loreCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'lore-catalog.json'), 'utf8'));
  const sourceCatalog = requireModule(path.join(ROOT, 'type', 'js', 'source-catalog.js')).SOURCE_CATALOG;
  const originalScripts = requireModule(path.join(ROOT, 'type', 'js', 'original-scripts.js')).ORIGINAL_SCRIPTS;
  const pronunciationAtlas = requireModule(path.join(ROOT, 'type', 'js', 'pronunciation-atlas.js')).PRONUNCIATION_ATLAS;

  const docs = [
    ...entryDocs(entries),
    ...loreDocs(loreCatalog),
    ...sourceCatalogDocs(sourceCatalog),
    ...originalScriptDocs(originalScripts, lexiconById),
    ...pronunciationDocs(pronunciationAtlas, lexiconById),
    ...jsonlOutputDocs('mythology-synthesis.jsonl', 'mythology'),
    ...jsonlOutputDocs('oracle-examples.jsonl', 'oracle'),
    ...jsonlOutputDocs('symbolic-correspondences.jsonl', 'symbolic'),
    ...jsonlOutputDocs('scientific-analogies.jsonl', 'science'),
  ];

  const train = [];
  const validation = [];
  for (const doc of docs) {
    if (hashBucket(doc.id, 100) < 95) train.push(doc);
    else validation.push(doc);
  }

  function writeJsonl(records, filePath) {
    const lines = records.map((r) => JSON.stringify(r));
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
  }

  writeJsonl(train, OUT_TRAIN);
  writeJsonl(validation, OUT_VAL);
  writeJsonl(train.map((d) => ({ text: d.text })), OUT_HF_TRAIN);
  writeJsonl(validation.map((d) => ({ text: d.text })), OUT_HF_VAL);

  const bySource = {};
  let totalTokens = 0;
  for (const doc of docs) {
    bySource[doc.source] = (bySource[doc.source] || 0) + 1;
    totalTokens += doc.tokens;
  }

  const dataVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-version.json'), 'utf8'));
  const manifest = {
    version: dataVersion.version || 'unknown',
    generatedAt: dataVersion.releasedAt || new Date().toISOString(),
    counts: {
      totalDocuments: docs.length,
      trainDocuments: train.length,
      validationDocuments: validation.length,
      totalTokens,
      trainTokens: train.reduce((sum, d) => sum + d.tokens, 0),
      validationTokens: validation.reduce((sum, d) => sum + d.tokens, 0),
      bySource,
    },
    split: {
      method: 'deterministic_sha256_hash',
      trainBucketRange: '0-94',
      validationBucketRange: '95-99',
    },
  };
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`✓ Pretraining corpus generated`);
  console.log(`  documents: ${docs.length.toLocaleString()}`);
  console.log(`  train:     ${train.length.toLocaleString()}`);
  console.log(`  validation:${validation.length.toLocaleString()}`);
  console.log(`  tokens:    ${totalTokens.toLocaleString()}`);
  console.log(`  sources:   ${Object.keys(bySource).length}`);
}

main();
