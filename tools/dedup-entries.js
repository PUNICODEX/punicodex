/**
 * One-off: remove 5 stale duplicate lexicon entries (Latinized / alternate-
 * transliteration duplicates of canonical flagship temples) and register
 * their forms as sourced `alt` variants on the canonical entries.
 *
 *   REMOVE             CANONICAL
 *   achilles  (Achillēs)  -> achilleus (Achilleús)
 *   khaos     (Khaos)     -> chaos (Cháos)
 *   delphi    (Delphí)    -> delphoi (Delphoí)
 *   europa    (Eurōpē)    -> europe (Eurṓpē)
 *   pegasus   (Pégasos)   -> pegasos (Pḗgasos)
 */
const fs = require('node:fs');
const path = require('node:path');

const LEXICON = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

const REMOVALS = [
  {
    id: 'achilles',
    canonical: 'achilleus',
    variant: {
      unicode: 'Achillēs',
      type: 'alt',
      note: 'Latinized form (English Achilles); the temple uses the Greek Achilleús.',
      sources: ['LSJ'],
    },
  },
  {
    id: 'khaos',
    canonical: 'chaos',
    variant: {
      unicode: 'Khaos',
      type: 'alt',
      note: 'Transliterated form (kh for χ); the temple uses the Latinized Cháos.',
      sources: ['LSJ'],
    },
  },
  {
    id: 'delphi',
    canonical: 'delphoi',
    variant: {
      unicode: 'Delphí',
      type: 'alt',
      note: 'Alternate English accentuation of Δελφοί; the temple uses Delphoí.',
      sources: ['Barrington'],
    },
  },
  {
    id: 'europa',
    canonical: 'europe',
    variant: {
      unicode: 'Eurōpē',
      type: 'alt',
      note: 'Latin form Eurōpa; the temple uses the Greek Eurṓpē.',
      sources: ['Lewis & Short'],
    },
  },
  {
    id: 'pegasus',
    canonical: 'pegasos',
    variant: {
      unicode: 'Pégasos',
      type: 'alt',
      note: 'Latinized form Pegasus; the temple uses the Greek Pḗgasos.',
      sources: ['LSJ'],
    },
  },
];

let text = fs.readFileSync(LEXICON, 'utf8');

function removeEntry(id) {
  const idAnchor = `"id": "${id}",`;
  const idIdx = text.indexOf(idAnchor);
  if (idIdx === -1) throw new Error(`entry not found: ${id}`);
  // Entry object starts at the "  {" line preceding the id.
  const start = text.lastIndexOf('\n  {', idIdx);
  if (start === -1) throw new Error(`entry start not found: ${id}`);
  // Entry object ends at the first "\n  }" after the id (then optional comma).
  const endMarker = '\n  }';
  const end = text.indexOf(endMarker, idIdx);
  if (end === -1) throw new Error(`entry end not found: ${id}`);
  let stop = end + endMarker.length;
  // Swallow a following comma and newline.
  if (text[stop] === ',') stop += 1;
  if (text[stop] === '\n') stop += 1;
  text = text.slice(0, start + 1) + text.slice(stop);
  console.log(`removed ${id}`);
}

function addVariant(canonicalId, variant) {
  const idAnchor = `"id": "${canonicalId}",`;
  const idIdx = text.indexOf(idAnchor);
  if (idIdx === -1) throw new Error(`canonical entry not found: ${canonicalId}`);
  const endMarker = '\n    }';
  const end = text.indexOf(endMarker, idIdx);
  const block = text.slice(idIdx, end);
  const variantJson = `,\n      ${JSON.stringify(variant, null, 2).replace(/\n/g, '\n      ')}`;
  if (/"variants": \[/.test(block)) {
    // Append to the existing variants array (close bracket is the last "]").
    const closeIdx = block.lastIndexOf(']');
    const insertion = `${block.slice(0, closeIdx).replace(/\s+$/, '')}${variantJson}\n    ${block.slice(closeIdx)}`;
    text = text.slice(0, idIdx) + insertion + text.slice(end);
  } else {
    // Insert a variants array right after the id line.
    const insertion = `${idAnchor}\n    "variants": [${variantJson}\n    ]`;
    text = text.slice(0, idIdx) + insertion + text.slice(idIdx + idAnchor.length);
  }
  console.log(`variant added to ${canonicalId}: ${variant.unicode}`);
}

for (const { id, canonical, variant } of REMOVALS) {
  removeEntry(id);
  addVariant(canonical, variant);
}

fs.writeFileSync(LEXICON, text);

// Verify with the parsed module.
delete require.cache[require.resolve(LEXICON)];
const { LEXICON: entries } = require(LEXICON);
console.log('entries now:', entries.length);
for (const { id, canonical, variant } of REMOVALS) {
  if (entries.find((e) => e.id === id)) throw new Error(`${id} still present`);
  const c = entries.find((e) => e.id === canonical);
  if (!c || !c.variants || !c.variants.some((v) => v.unicode === variant.unicode)) {
    throw new Error(`variant missing on ${canonical}`);
  }
}
console.log('verified: 5 duplicates removed, variants registered');
