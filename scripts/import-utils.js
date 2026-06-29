/**
 * PÚNYCODEX — Shared helpers for the authoritative import framework.
 *
 * These utilities know how to read and safely edit canonical source files
 * without destroying their existing formatting or line endings.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  lexicon: path.join(ROOT, 'type', 'js', 'lexicon.js'),
  originalScripts: path.join(ROOT, 'type', 'js', 'original-scripts.js'),
  sourceCatalog: path.join(ROOT, 'type', 'js', 'source-catalog.js'),
};

// ═════════════════════════════════════════════════════════════════════════════
// Generic JSON-string helpers
// ═════════════════════════════════════════════════════════════════════════════

function jsonString(v) {
  return JSON.stringify(v);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═════════════════════════════════════════════════════════════════════════════
// Lexicon editing
// ═════════════════════════════════════════════════════════════════════════════

function loadLexicon() {
  return fs.readFileSync(PATHS.lexicon, 'utf8');
}

function saveLexicon(src) {
  fs.writeFileSync(PATHS.lexicon, src, 'utf8');
}

function findLexiconEntryBlock(src, id) {
  const re = new RegExp(
    `(\\{\\s*\\r?\\n\\s*id:\\s*['"]${escapeRegExp(id)}['"][\\s\\S]*?\\r?\\n\\s*\\},?)`,
    'm'
  );
  const match = src.match(re);
  if (!match) return null;
  return { block: match[1], start: match.index, end: match.index + match[1].length };
}

function replaceLexiconEntryBlock(src, id, newBlock) {
  const found = findLexiconEntryBlock(src, id);
  if (!found) throw new Error(`Lexicon entry block for ${id} not found`);
  return src.slice(0, found.start) + newBlock + src.slice(found.end);
}

function setBlockProperty(block, key, value, afterKey) {
  const valueStr = typeof value === 'string' ? jsonString(value) : JSON.stringify(value);
  const existingRe = new RegExp(`^(\\s*)${escapeRegExp(key)}:\\s*[^\\r\\n]+,?[\\t ]*$`, 'm');

  if (existingRe.test(block)) {
    return block.replace(existingRe, `$1${key}: ${valueStr},`);
  }

  if (!afterKey) {
    throw new Error(`Could not find ${key} line and no afterKey provided`);
  }

  const afterRe = new RegExp(`^(\\s*)${escapeRegExp(afterKey)}:\\s*[^\\r\\n]+,?[\\t ]*$`, 'm');
  const afterMatch = block.match(afterRe);
  if (!afterMatch) throw new Error(`Could not find ${afterKey} line in block`);
  const indent = afterMatch[1];
  const line = `${indent}${key}: ${valueStr},`;
  const pos = afterMatch.index + afterMatch[0].length;
  return `${block.slice(0, pos)}\n${line}${block.slice(pos)}`;
}

function updateLexiconScalar(src, id, key, value, afterKey = 'id') {
  const found = findLexiconEntryBlock(src, id);
  if (!found) throw new Error(`Lexicon entry ${id} not found`);
  const newBlock = setBlockProperty(found.block, key, value, afterKey);
  return replaceLexiconEntryBlock(src, id, newBlock);
}

// ═════════════════════════════════════════════════════════════════════════════
// Source catalog editing
// ═════════════════════════════════════════════════════════════════════════════

function loadSourceCatalog() {
  return fs.readFileSync(PATHS.sourceCatalog, 'utf8');
}

function saveSourceCatalog(src) {
  fs.writeFileSync(PATHS.sourceCatalog, src, 'utf8');
}

function findSourceCatalogBlock(src, key) {
  const re = new RegExp(`^(\\s*)'${escapeRegExp(key)}':\\s*\\{[\\s\\S]*?\\r?\\n\\1\\},?`, 'm');
  const match = src.match(re);
  if (!match) return null;
  return { block: match[0], start: match.index, end: match.index + match[0].length };
}

function formatSourceEntry(key, value) {
  const lines = [`    '${key}': {`];
  const props = [
    ['full', value.full],
    ['scope', value.scope],
    ['year', value.year],
    ['edition', value.edition],
    ['url', value.url],
  ];
  for (const [propKey, propVal] of props) {
    if (propVal === undefined || propVal === null) continue;
    lines.push(`        ${propKey}: ${jsonString(propVal)},`);
  }
  // Remove trailing comma from last property line to keep diffs minimal
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push('    },');
  return lines.join('\n');
}

function updateSourceCatalog(src, key, value) {
  const found = findSourceCatalogBlock(src, key);
  if (found) {
    return src.slice(0, found.start) + formatSourceEntry(key, value) + src.slice(found.end);
  }
  // Insert before the closing `};`
  const closeMatch = src.match(/(\n\s*\};\s*)$/);
  if (!closeMatch) throw new Error('Could not find SOURCE_CATALOG object close');
  const insertAt = closeMatch.index;
  return `${src.slice(0, insertAt)}\n${formatSourceEntry(key, value)}${src.slice(insertAt)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Original scripts editing
// ═════════════════════════════════════════════════════════════════════════════

function loadOriginalScripts() {
  return fs.readFileSync(PATHS.originalScripts, 'utf8');
}

function saveOriginalScripts(src) {
  fs.writeFileSync(PATHS.originalScripts, src, 'utf8');
}

function findOriginalScriptBlock(src, id) {
  const re = new RegExp(`^(\\s*)${escapeRegExp(id)}:\\s*\\{[\\s\\S]*?\\r?\\n\\1\\},?`, 'm');
  const match = src.match(re);
  if (!match) return null;
  return { block: match[0], start: match.index, end: match.index + match[0].length };
}

function formatProvenanceSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return '';
  const lines = steps.map((s) => `        ${jsonString(s)},`);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  return `      steps: [\n${lines.join('\n')}\n      ],`;
}

function formatProvenanceSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const lines = sources.map((s) => `        ${jsonString(s)},`);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  return `      sources: [\n${lines.join('\n')}\n      ],`;
}

function formatOriginalScriptEntry(id, value) {
  const prov = value.provenance || {};
  const parts = [
    `  ${id}: {`,
    `    originalScript: ${jsonString(value.originalScript || '')},`,
    `    scriptName: ${jsonString(value.scriptName || '')},`,
    `    provenance: {`,
    `      original: ${jsonString(prov.original || value.originalScript || '')},`,
    `      transliteration: ${jsonString(prov.transliteration || '')},`,
  ];

  const stepsBlock = formatProvenanceSteps(prov.steps);
  if (stepsBlock) parts.push(stepsBlock);

  const sourcesBlock = formatProvenanceSources(prov.sources);
  if (sourcesBlock) parts.push(sourcesBlock);

  parts.push('    },');
  parts.push('  },');
  return parts.join('\n');
}

function updateOriginalScript(src, id, value) {
  const found = findOriginalScriptBlock(src, id);
  if (found) {
    return src.slice(0, found.start) + formatOriginalScriptEntry(id, value) + src.slice(found.end);
  }
  const closeMatch = src.match(/(\n\s*\};\s*)$/);
  if (!closeMatch) throw new Error('Could not find ORIGINAL_SCRIPTS object close');
  const insertAt = closeMatch.index;
  return `${src.slice(0, insertAt)}\n${formatOriginalScriptEntry(id, value)}${src.slice(insertAt)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  ROOT,
  PATHS,
  jsonString,
  escapeRegExp,
  loadLexicon,
  saveLexicon,
  findLexiconEntryBlock,
  replaceLexiconEntryBlock,
  setBlockProperty,
  updateLexiconScalar,
  loadSourceCatalog,
  saveSourceCatalog,
  findSourceCatalogBlock,
  formatSourceEntry,
  updateSourceCatalog,
  loadOriginalScripts,
  saveOriginalScripts,
  findOriginalScriptBlock,
  formatOriginalScriptEntry,
  updateOriginalScript,
};
