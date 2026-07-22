/**
 * Wikidata sameAs links for JSON-LD. Reads the newest wikidata staging
 * batch from data/authoritative/staging/suggestions/wikidata/ and maps each
 * entry id to its Wikidata page URL (from the suggestion provenance).
 * Cached per process; returns null when no link exists.
 */

const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '..', 'data', 'authoritative', 'staging', 'suggestions', 'wikidata');

let cache = null;

function loadLinks() {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(DIR)) return cache;
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (files.length === 0) return cache;
  // Newest batch wins; earlier entries fill gaps.
  for (const file of files) {
    try {
      const batch = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
      for (const s of batch.suggestions || []) {
        const url = s?.provenance?.url;
        const recordId = s?.provenance?.recordId;
        if (!s.id || !url || !/^Q\d+$/.test(recordId || '')) continue;
        // Entity-type guard: name/vessel/etc. entities are not the deity —
        // a wrong sameAs is worse than none. Require a mythology signal in
        // the Wikidata description and decent confidence.
        const value = String(s.value || '');
        if (/family name|given name|surname|personal name|vessel|ship/i.test(value)) {
          continue;
        }
        if (
          !/myth|god|goddess|deit|divin|hero|legend|spirit|demon|angel|titan|nymph|serpent|dragon|primordial|underworld/i.test(
            value
          )
        ) {
          continue;
        }
        if (typeof s.confidence === 'number' && s.confidence < 0.7) continue;
        if (!cache.has(s.id)) cache.set(s.id, url);
      }
    } catch {
      // Skip unparseable batch files; links are an enhancement, not a failure.
    }
  }
  return cache;
}

function wikidataUrlFor(id) {
  return loadLinks().get(id) || null;
}

module.exports = { wikidataUrlFor };
