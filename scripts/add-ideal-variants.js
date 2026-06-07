/**
 * Add missing 'ideal' stacked-diacritic variants to lexicon entries.
 * Reads the lexicon as JS, modifies in memory, writes back.
 */

const fs = require('fs');
const path = require('path');

const LEXICON_PATH = path.join(__dirname, '..', 'mobile', 'shared', 'lexicon.js');
const source = fs.readFileSync(LEXICON_PATH, 'utf8');

// Extract the array portion
const arrayStart = source.indexOf('[');
const arrayEnd = source.lastIndexOf(']');
const header = source.slice(0, arrayStart);
const footer = source.slice(arrayEnd + 1);

// Parse the array
const arrayText = source.slice(arrayStart, arrayEnd + 1);
const LEXICON = eval(arrayText);

const ADDITIONS = [
  { id: 'demeter',     unicode: 'Dēmḗtēr',     note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'hera',        unicode: 'Hḗra',        note: 'Stacked acute+macron on epsilon (eta): philologically ideal' },
  { id: 'helios',      unicode: 'Hḗlios',      note: 'Stacked acute+macron on epsilon (eta): philologically ideal' },
  { id: 'selene',      unicode: 'Selḗnē',      note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'diomedes',    unicode: 'Diomḗdēs',    note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'philoctetes', unicode: 'Philoktḗtēs', note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'ganymede',    unicode: 'Ganymḗdēs',   note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'alcmene',     unicode: 'Alkmḗnē',     note: 'Stacked acute+macron on second epsilon (eta): philologically ideal' },
  { id: 'leto',        unicode: 'Letṓ',        note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'eos',         unicode: 'Ēṓs',         note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'telamon',     unicode: 'Telamṓn',     note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'calypso',     unicode: 'Kalypsṓ',     note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'europa',      unicode: 'Eurṓpē',      note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'pandora',     unicode: 'Pandṓra',     note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  { id: 'sarpedon',    unicode: 'Sarpēdṓn',    note: 'Stacked acute+macron on omicron (omega): philologically ideal' },
  // Eratō and Aléktō not in current lexicon (would need entries added first)

];

let changed = 0;

for (const { id, unicode, note } of ADDITIONS) {
  const entry = LEXICON.find(e => e.id === id);
  if (!entry) {
    console.warn(`Entry not found: ${id}`);
    continue;
  }

  if (!entry.variants) {
    entry.variants = [];
  }

  if (entry.variants.some(v => v.type === 'ideal')) {
    console.log(`SKIP ${id}: already has ideal variant`);
    continue;
  }

  entry.variants.unshift({ unicode, type: 'ideal', note });
  changed++;
  console.log(`ADDED ${id}: ${unicode}`);
}

// Serialize back preserving rough formatting
function stringifyLexicon(arr) {
  const lines = [];
  lines.push('[');
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];
    lines.push('  {');
    const keys = Object.keys(entry);
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      const val = entry[key];
      const isLastKey = j === keys.length - 1;
      const comma = isLastKey ? '' : ',';
      
      if (key === 'breakdown' || key === 'variants' || key === 'sources' || key === 'cognates') {
        lines.push(`    ${key}: ${stringifyArray(val, 4)}${comma}`);
      } else if (key === 'etymology') {
        lines.push(`    ${key}: ${stringifyObject(val, 4)}${comma}`);
      } else if (typeof val === 'string') {
        lines.push(`    ${key}: '${val.replace(/'/g, "\\'")}'${comma}`);
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        lines.push(`    ${key}: ${val}${comma}`);
      } else {
        lines.push(`    ${key}: ${JSON.stringify(val)}${comma}`);
      }
    }
    lines.push(`  }${i < arr.length - 1 ? ',' : ''}`);
  }
  lines.push(']');
  return lines.join('\n');
}

function stringifyArray(arr, indent) {
  if (!arr || arr.length === 0) return '[]';
  const spaces = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  const lines = [];
  lines.push('[');
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (typeof item === 'string') {
      lines.push(`${inner}'${item.replace(/'/g, "\\'")}'${i < arr.length - 1 ? ',' : ''}`);
    } else if (typeof item === 'object' && item !== null) {
      lines.push(`${inner}{`);
      const keys = Object.keys(item);
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        const v = item[k];
        const comma = j < keys.length - 1 ? ',' : '';
        if (typeof v === 'string') {
          lines.push(`${inner}  ${k}: '${v.replace(/'/g, "\\'")}'${comma}`);
        } else {
          lines.push(`${inner}  ${k}: ${JSON.stringify(v)}${comma}`);
        }
      }
      lines.push(`${inner}}${i < arr.length - 1 ? ',' : ''}`);
    } else {
      lines.push(`${inner}${JSON.stringify(item)}${i < arr.length - 1 ? ',' : ''}`);
    }
  }
  lines.push(`${spaces}]`);
  return lines.join('\n');
}

function stringifyObject(obj, indent) {
  if (!obj) return '{}';
  const spaces = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  const lines = [];
  lines.push('{');
  const keys = Object.keys(obj);
  for (let j = 0; j < keys.length; j++) {
    const k = keys[j];
    const v = obj[k];
    const comma = j < keys.length - 1 ? ',' : '';
    if (Array.isArray(v)) {
      lines.push(`${inner}${k}: ${stringifyArray(v, indent + 2)}${comma}`);
    } else if (typeof v === 'string') {
      lines.push(`${inner}${k}: '${v.replace(/'/g, "\\'")}'${comma}`);
    } else if (typeof v === 'object' && v !== null) {
      lines.push(`${inner}${k}: ${stringifyObject(v, indent + 2)}${comma}`);
    } else {
      lines.push(`${inner}${k}: ${JSON.stringify(v)}${comma}`);
    }
  }
  lines.push(`${spaces}}`);
  return lines.join('\n');
}

const output = header + stringifyLexicon(LEXICON) + footer;
fs.writeFileSync(LEXICON_PATH, output, 'utf8');
console.log(`\nDone. Added ${changed} ideal variants.`);
