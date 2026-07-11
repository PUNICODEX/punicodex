#!/usr/bin/env node
/**
 * PÚNYCODEX — Model Corpus Exporter
 *
 * Builds a unified, model-training-ready dataset from every canonical source
 * in the flywheel. Outputs are written to data/corpus/:
 *
 *   - entries.jsonl        : one rich record per lexicon entry
 *   - manifest.json        : corpus metadata, counts, canonical source hashes
 *
 * The exporter is idempotent and is wired into `npm run generate`.
 *
 * Run: node scripts/export-model-corpus.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { domainToASCII } = require('node:url');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'corpus');

const {
  getOriginalScript,
  getProvenance,
  getScriptName,
  getOriginalScriptLabel,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const { SOURCE_CATALOG } = require(path.join(ROOT, 'type', 'js', 'source-catalog.js'));
const { getGlyphAtlas } = require(path.join(ROOT, 'type', 'js', 'glyph-atlas.js'));
const { getPronunciation } = require(path.join(ROOT, 'type', 'js', 'pronunciation-atlas.js'));

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadArchetypes() {
  const archPath = path.join(ROOT, 'js', 'archetypes-v2.js');
  const code = fs.readFileSync(archPath, 'utf8').replace('const ARCHETYPES', 'var ARCHETYPES');
  return new Function(`${code}; return ARCHETYPES;`)();
}

function loadLoreCatalog() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'lore-catalog.json'), 'utf8'));
}

function loadAvailability() {
  const p = path.join(ROOT, 'data', 'domain-availability.json');
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadOwnedDomains() {
  const p = path.join(ROOT, 'platform', 'db', 'owned-domains.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadDataVersion() {
  const p = path.join(ROOT, 'data-version.json');
  if (!fs.existsSync(p)) return { version: 'unknown' };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadSafetyExamples() {
  const p = path.join(ROOT, 'data', 'corpus', 'safety-examples.jsonl');
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadJsonlCounts(fileName) {
  const p = path.join(ROOT, 'data', 'corpus', fileName);
  if (!fs.existsSync(p)) return { count: 0, byTask: {} };
  const text = fs.readFileSync(p, 'utf8');
  const examples = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }
  return { count: examples.length, byTask };
}

function hashFile(rel) {
  const full = path.join(ROOT, rel);
  const content = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function toPunycode(unicodeDomain) {
  try {
    return domainToASCII(unicodeDomain.toLowerCase());
  } catch {
    return null;
  }
}

function resolveSources(sourceKeys) {
  if (!sourceKeys) return [];
  return sourceKeys.map((key) => {
    const src = SOURCE_CATALOG[key];
    if (!src) return { key, full: key };
    return {
      key,
      full: src.full || key,
      scope: src.scope || '',
      year: src.year || '',
      edition: src.edition || '',
      url: src.url || '',
    };
  });
}

function buildOriginalScriptBlock(entry) {
  const specimen = getOriginalScript(entry);
  const label = getOriginalScriptLabel(entry);
  const scriptName = getScriptName(entry);
  const provenance = getProvenance(entry);
  const glyph = getGlyphAtlas(entry.id);

  if (!specimen || specimen === '—') {
    return {
      label,
      scriptName,
      specimen: null,
      codePoints: [],
      transliteration: entry.unicode,
      provenanceSteps: [],
      provenanceSources: [],
      family: glyph?.family || '',
      writingDirection: glyph?.writingDirection || '',
      timePeriod: glyph?.timePeriod || '',
      region: glyph?.region || '',
    };
  }

  return {
    label,
    scriptName,
    specimen,
    codePoints: glyph?.codePoints || [],
    transliteration: provenance?.transliteration || entry.unicode,
    provenanceSteps: provenance?.steps || [],
    provenanceSources: resolveSources(provenance?.sources || []),
    family: glyph?.family || '',
    writingDirection: glyph?.writingDirection || '',
    timePeriod: glyph?.timePeriod || '',
    region: glyph?.region || '',
  };
}

function buildPronunciationBlock(entry) {
  const pron = getPronunciation(entry.id);
  if (!pron) return null;
  return {
    ipa: pron.ipa,
    ipaLabel: pron.ipaLabel,
    phonemes: pron.phonemes || [],
    approximation: pron.approximation,
    dialect: pron.dialect,
    confidence: pron.confidence,
    audioPath: pron.audioPath,
    note: pron.note,
  };
}

function buildLoreBlock(entry, loreCatalog) {
  const lore = loreCatalog[entry.id];
  if (!lore) return null;
  return {
    domainsTitle: lore.domains?.title || '',
    domainsSubtitle: lore.domains?.subtitle || '',
    domainsLead: lore.domains?.lead || '',
    domainsCards: lore.domains?.cards || [],
    symbols: lore.symbols || [],
    mythologyLead: lore.mythology?.lead || '',
    mythologyMyths: lore.mythology?.myths || [],
    syncretism: lore.syncretism || '',
    culturalLegacy: lore.culturalLegacy || '',
    extendedMeditation: lore.extendedMeditation || '',
    originalScriptNote: lore.originalScriptNote || '',
    sources: (lore.sources || []).map((s) => (typeof s === 'string' ? s : s.name)),
  };
}

function buildEntryRecord(entry, context) {
  const {
    availabilityMap,
    ownedPunySet,
    ownedDomains,
    archetypeMap,
    loreCatalog,
    lexiconById,
    version,
    generatedAt,
  } = context;

  const unicodeDomain = `${entry.unicode.toLowerCase()}.com`;
  const punycodeDomain = toPunycode(unicodeDomain);

  const availability = availabilityMap[punycodeDomain] || availabilityMap[entry.ascii] || null;

  const ownedMatches = ownedDomains
    .map((d) => ({ unicode: d, punycode: toPunycode(d) }))
    .filter((d) => d.punycode === punycodeDomain || (d.unicode || '').toLowerCase() === unicodeDomain);
  const isOwned = ownedMatches.length > 0 || ownedPunySet.has(punycodeDomain);

  const archetype = archetypeMap[entry.id] || null;

  const related = context.lexicon
    .filter((e) => e.pantheon === entry.pantheon && e.id !== entry.id)
    .sort((a, b) => a.unicode.localeCompare(b.unicode))
    .slice(0, 12)
    .map((e) => ({ id: e.id, ascii: e.ascii, unicode: e.unicode, tierLabel: e.tierLabel }));

  return {
    id: entry.id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    greek: entry.greek,
    pantheon: entry.pantheon,
    tier: entry.tier,
    tierLabel: entry.tierLabel,
    domain: entry.domain,
    meaning: entry.meaning,
    accuracyNote: entry.accuracyNote || '',

    originalScript: buildOriginalScriptBlock(entry),
    pronunciation: buildPronunciationBlock(entry),
    etymology: entry.etymology || null,
    variants: entry.variants || [],
    breakdown: entry.breakdown || [],
    lore: buildLoreBlock(entry, loreCatalog),

    sources: resolveSources(entry.sources || []),

    unicodeDomain,
    punycodeDomain,
    availability: availability
      ? {
          domain: availability.domain || punycodeDomain,
          status: availability.status || 'unknown',
          details: availability.details || '',
          httpStatus: availability.httpStatus || null,
        }
      : null,

    ownership: {
      isOwned,
      ownedDomains: ownedMatches,
    },

    flagship: archetype
      ? {
          isFlagship: true,
          rentalTier: archetype.rentalTier || '',
          mascotPath: archetype.mascotPath || '',
          logomarkPath: archetype.logomarkPath || '',
          colors: archetype.colors || {},
        }
      : { isFlagship: false },

    related,

    metadata: {
      generatedAt,
      dataVersion: version,
    },
  };
}

function writeJsonl(records, filePath) {
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function main() {
  const lexicon = loadLexicon();
  const archetypes = loadArchetypes();
  const loreCatalog = loadLoreCatalog();
  const availability = loadAvailability();
  const ownedDomains = loadOwnedDomains();
  const dataVersion = loadDataVersion();

  const archetypeMap = Object.fromEntries(archetypes.map((a) => [a.id, a]));
  const lexiconById = Object.fromEntries(lexicon.map((e) => [e.id, e]));

  // Availability map by punycode domain
  const availabilityMap = {};
  for (const [key, value] of Object.entries(availability)) {
    if (value && typeof value === 'object') {
      availabilityMap[value.domain || key] = value;
    }
  }

  // Owned-domain punycode set for fast lookup
  const ownedPunySet = new Set(ownedDomains.map(toPunycode).filter(Boolean));

  const generatedAt = dataVersion.releasedAt || new Date().toISOString();

  const context = {
    lexicon,
    availabilityMap,
    ownedPunySet,
    ownedDomains,
    archetypeMap,
    loreCatalog,
    lexiconById,
    version: dataVersion.version,
    generatedAt,
  };

  const records = lexicon.map((entry) => buildEntryRecord(entry, context));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeJsonl(records, path.join(OUT_DIR, 'entries.jsonl'));

  const canonicalFiles = {
    lexicon: 'type/js/lexicon.js',
    originalScripts: 'type/js/original-scripts.js',
    sourceCatalog: 'type/js/source-catalog.js',
    pronunciationAtlas: 'type/js/pronunciation-atlas.js',
    glyphAtlas: 'type/js/glyph-atlas.js',
    archetypes: 'js/archetypes-v2.js',
    ownedDomains: 'platform/db/owned-domains.json',
    loreCatalog: 'scripts/lore-catalog.json',
  };

  const safetyExamples = loadSafetyExamples();
  const safetyByTask = {};
  for (const ex of safetyExamples) {
    safetyByTask[ex.task] = (safetyByTask[ex.task] || 0) + 1;
  }

  const dialogue = loadJsonlCounts('dialogue-examples.jsonl');
  const toolUse = loadJsonlCounts('tool-use-examples.jsonl');
  const multimodal = loadJsonlCounts('multimodal-examples.jsonl');
  const preference = loadJsonlCounts('preference-examples.jsonl');
  const reasoning = loadJsonlCounts('reasoning-examples.jsonl');
  const benchmark = loadJsonlCounts('benchmark.jsonl');
  const mythologySynthesis = loadJsonlCounts('mythology-synthesis.jsonl');
  const oracle = loadJsonlCounts('oracle-examples.jsonl');
  const symbolic = loadJsonlCounts('symbolic-correspondences.jsonl');
  const scientific = loadJsonlCounts('scientific-analogies.jsonl');
  const instructions = loadJsonlCounts('instructions.jsonl');
  const chatTrain = loadJsonlCounts('chat-train.jsonl');
  const chatEval = loadJsonlCounts('chat-eval.jsonl');
  function loadPretrainManifest() {
    const p = path.join(ROOT, 'data', 'corpus', 'pretrain-manifest.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const pretrainManifest = loadPretrainManifest();

  const manifest = {
    version: dataVersion.version,
    generatedAt,
    counts: {
      entries: records.length,
      withOriginalScript: records.filter((r) => r.originalScript.specimen).length,
      withPronunciation: records.filter((r) => r.pronunciation?.ipa).length,
      withLore: records.filter((r) => r.lore).length,
      withEtymology: records.filter((r) => r.etymology).length,
      flagships: records.filter((r) => r.flagship.isFlagship).length,
      owned: records.filter((r) => r.ownership.isOwned).length,
      instructions: instructions.count,
      instructionsByTask: instructions.byTask,
      safetyExamples: safetyExamples.length,
      safetyByTask,
      dialogueExamples: dialogue.count,
      dialogueByTask: dialogue.byTask,
      toolUseExamples: toolUse.count,
      toolUseByTask: toolUse.byTask,
      multimodalExamples: multimodal.count,
      multimodalByTask: multimodal.byTask,
      preferenceExamples: preference.count,
      preferenceByTask: preference.byTask,
      reasoningExamples: reasoning.count,
      reasoningByTask: reasoning.byTask,
      benchmarkExamples: benchmark.count,
      benchmarkByTask: benchmark.byTask,
      mythologySynthesisExamples: mythologySynthesis.count,
      mythologySynthesisByTask: mythologySynthesis.byTask,
      oracleExamples: oracle.count,
      oracleByTask: oracle.byTask,
      symbolicCorrespondenceExamples: symbolic.count,
      symbolicCorrespondenceByTask: symbolic.byTask,
      scientificAnalogyExamples: scientific.count,
      scientificAnalogyByTask: scientific.byTask,
      chatTrainExamples: chatTrain.count,
      chatTrainByTask: chatTrain.byTask,
      chatEvalExamples: chatEval.count,
      chatEvalByTask: chatEval.byTask,
      pretrainDocuments: pretrainManifest ? pretrainManifest.counts.totalDocuments : 0,
      pretrainDocumentsBySource: pretrainManifest ? pretrainManifest.counts.bySource : {},
      pretrainValidationDocuments: pretrainManifest ? pretrainManifest.counts.validationDocuments : 0,
      pretrainTokens: pretrainManifest ? pretrainManifest.counts.totalTokens : 0,
    },
    canonicalSources: canonicalFiles,
    canonicalHashes: Object.fromEntries(
      Object.entries(canonicalFiles).map(([key, rel]) => [key, hashFile(rel)]),
    ),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`✓ Exported ${records.length} entries to ${OUT_DIR}`);
  console.log(`  entries.jsonl: ${(fs.statSync(path.join(OUT_DIR, 'entries.jsonl')).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  manifest: ${JSON.stringify(manifest.counts, null, 2)}`);
}

main();
