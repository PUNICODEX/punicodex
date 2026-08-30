#!/usr/bin/env node
/**
 * PuniCodex — Scholarly Edition content generator
 *
 * Synthesizes the canonical per-temple scholarly content files
 * (`platform/scholars/content/{id}.json`) for every built flagship temple from
 * the project's canonical data:
 *   - scripts/lore-catalog.json
 *   - type/js/lexicon.js
 *   - js/archetypes-v2.js
 *   - type/js/original-scripts.js
 *   - type/js/source-catalog.js
 *   - platform/api/similarities.json
 *   - platform/db/owned-domains.json
 *
 * Fill-only-missing: a section that already exists with a non-empty body is
 * never overwritten, so hand-authored (bespoke) revisions survive
 * regeneration. Output is deterministic — no timestamps, no randomness — so a
 * complete content set regenerates byte-identically and passes the CI
 * divergence gate.
 *
 * Usage: node scripts/generate-scholars-content.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'platform', 'scholars', 'content');

const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const LORE = require('../scripts/lore-catalog.json');
const { SOURCE_CATALOG } = require('../type/js/source-catalog.js');
const SIMILARITIES = require('../platform/api/similarities.json');
const OWNED_DOMAINS = require('../platform/db/owned-domains.json');
const {
  getOriginalScript,
  getOriginalScriptLabel,
  getNoScriptNote,
  getRichProvenance,
  getScriptName,
} = require('../type/js/original-scripts.js');
const { applyCanaryWatermark, shouldWatermark } = require('./lib/canary.js');

const CONTENT_VERSION = 1;

// Meta sections (edit-history, attribution) are runtime/DB-driven and are
// never generated. Pantheon-kit sections (homeric-hymns, poetic-edda, ...)
// are authored in a later bespoke pass and are left absent here.
const GENERATED_SECTION_KEYS = [
  'overview',
  'the-name',
  'pronunciation',
  'original-script',
  'domains',
  'symbols',
  'mythology',
  'syncretism',
  'cultural-legacy',
  'archaeology',
  'scholarly-sources',
  'meditation',
];

const PANTHEON_LABELS = {
  greek: 'Greek',
  'greek-location': 'Greek',
  japanese: 'Japanese',
  norse: 'Norse',
  egyptian: 'Egyptian',
  sanskrit: 'Sanskrit',
  canaanite: 'Canaanite',
  mesopotamian: 'Mesopotamian',
  phoenician: 'Phoenician',
  incan: 'Incan',
  zoroastrian: 'Zoroastrian',
  nahuatl: 'Nahuatl',
  chinese: 'Chinese',
  taoist: 'Daoist',
  buddhist: 'Buddhist',
  slavic: 'Slavic',
  celtic: 'Celtic',
  polynesian: 'Polynesian',
  baltic: 'Baltic',
  yoruba: 'Yoruba',
};

const VARIANT_TYPE_LABELS = {
  owned: 'owned form',
  ideal: 'ideal form',
  'macron-only': 'macron-only form',
  ascii: 'ASCII form',
  'alt-stress': 'alternate stress, scholarly variant',
  alt: 'scholarly variant',
};

const BUILT_IDS = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));
const OWNED_SET = new Set(OWNED_DOMAINS.map((d) => d.toLowerCase().normalize('NFC')));

// ─────────────────────────────────────────────────────────────
// HTML → Markdown (lore-catalog bodies are stored as HTML fragments)
// ─────────────────────────────────────────────────────────────

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity] !== undefined ? NAMED_ENTITIES[entity] : match;
  });
}

function htmlToMarkdown(html) {
  if (html === null || html === undefined) return '';
  let text = String(html);
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<\/p>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<(strong|b)>/gi, '**');
  text = text.replace(/<\/(strong|b)>/gi, '**');
  text = text.replace(/<(em|i)>/gi, '*');
  text = text.replace(/<\/(em|i)>/gi, '*');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\*\*\s*\*\*/g, '');
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function oneLine(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function lowerFirst(text) {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// ─────────────────────────────────────────────────────────────
// Sources and citations
// ─────────────────────────────────────────────────────────────

function formatYear(year) {
  const s = String(year).trim();
  if (/^-\d+/.test(s)) return `${s.slice(1)} BCE`;
  return s;
}

function citationFor(rawName, url) {
  // Provenance sources may be objects ({title}, {name}, {citation}) rather than strings.
  let raw = rawName;
  if (raw && typeof raw === 'object') {
    if (!url && typeof raw.url === 'string') url = raw.url;
    raw = raw.name || raw.citation || raw.title || '';
  }
  const name = oneLine(htmlToMarkdown(String(raw))).replace(/\*/g, '').trim();
  if (!name) return { citation: 'PuniCodex original-script provenance record.' };
  const catalog = SOURCE_CATALOG[name];
  if (catalog) {
    let citation = catalog.full;
    if (catalog.edition) citation += `, ${catalog.edition}`;
    if (catalog.year) citation += `, ${formatYear(catalog.year)}`;
    citation += '.';
    const result = { citation };
    const link = catalog.url || url;
    if (link) result.url = link;
    return result;
  }
  const result = { citation: name.endsWith('.') ? name : `${name}.` };
  if (url) result.url = url;
  return result;
}

function buildSourcePool(loreEntry) {
  const pool = [];
  const seen = new Set();
  for (const raw of loreEntry.sources || []) {
    const name = typeof raw === 'string' ? raw : raw && raw.name;
    if (!name) continue;
    const url = typeof raw === 'object' && raw ? raw.url : undefined;
    const source = citationFor(name, url);
    if (seen.has(source.citation)) continue;
    seen.add(source.citation);
    pool.push(source);
  }
  return pool;
}

function pickSource(pool, index) {
  return pool[Math.min(index, pool.length - 1)];
}

// Per-section citation tracker: `cite(source)` returns the [^n] marker and
// keeps the section's sources array aligned with the marker numbering.
function createCiter() {
  const sources = [];
  const cite = (source) => {
    if (!source || typeof source.citation !== 'string') return '';
    const existing = sources.findIndex((s) => s.citation === source.citation);
    if (existing !== -1) return `[^${existing + 1}]`;
    sources.push(source);
    return `[^${sources.length}]`;
  };
  return { cite, sources };
}

// ─────────────────────────────────────────────────────────────
// Crosslinks ([[entry-id|Display Text]])
// ─────────────────────────────────────────────────────────────

function similarityTargets(entryId) {
  const scored = new Map();
  for (const edge of SIMILARITIES.edges || []) {
    let target = null;
    if (edge.source === entryId) target = edge.target;
    else if (edge.bidirectional && edge.target === entryId) target = edge.source;
    if (!target || target === entryId) continue;
    if (!BUILT_IDS.has(target) || !LEXICON_BY_ID.has(target)) continue;
    const current = scored.get(target);
    if (!current || (edge.strength || 0) > current.strength) {
      scored.set(target, { strength: edge.strength || 0, relationship: edge.relationship || null });
    }
  }
  return [...scored.entries()]
    .sort((a, b) => b[1].strength - a[1].strength || a[0].localeCompare(b[0]))
    .map(([id, meta]) => ({ id, relationship: meta.relationship }));
}

function pantheonSiblings(entry) {
  return LEXICON.filter(
    (x) => x.pantheon === entry.pantheon && x.id !== entry.id && BUILT_IDS.has(x.id)
  )
    .map((x) => x.id)
    .sort()
    .map((id) => ({ id, relationship: null }));
}

function domainKin(entry) {
  const keyword = (entry.domain || '').split(',')[0].trim().toLowerCase();
  if (!keyword) return [];
  return LEXICON.filter(
    (x) =>
      x.id !== entry.id &&
      BUILT_IDS.has(x.id) &&
      (x.domain || '').toLowerCase().includes(keyword)
  )
    .map((x) => x.id)
    .sort()
    .map((id) => ({ id, relationship: null }));
}

function crosslinkTargets(entry) {
  const fromGraph = similarityTargets(entry.id);
  if (fromGraph.length >= 2) return { targets: fromGraph.slice(0, 6), fromGraph: true };
  const merged = [...fromGraph];
  for (const candidate of [...pantheonSiblings(entry), ...domainKin(entry)]) {
    if (merged.length >= 6) break;
    if (!merged.some((t) => t.id === candidate.id)) merged.push(candidate);
  }
  return { targets: merged.slice(0, 6), fromGraph: false };
}

function unicodeName(id) {
  const entry = LEXICON_BY_ID.get(id);
  return entry ? entry.unicode : id;
}

function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// ─────────────────────────────────────────────────────────────
// Shared context
// ─────────────────────────────────────────────────────────────

function traditionLabel(entry) {
  return PANTHEON_LABELS[entry.pantheon] || entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
}

function tierSentence(tier, entry) {
  if (tier === 'dual-tier') {
    return 'The original carries both stress and vowel length and admits multiple historically valid spellings, so the temple presents both forms of the pair as a dual-tier restoration.';
  }
  const isGreek =
    entry && (entry.pantheon === 'greek' || entry.pantheon === 'greek-location');
  if (tier === 'tier-1') {
    return isGreek
      ? 'The original carries both stress and vowel length, and exactly one historically valid Unicode restoration exists, which places the name in Tier 1.'
      : 'The restoration preserves at least one distinctive feature — a diacritic or a distinctive letter — that the ASCII form loses, and exactly one historically valid Unicode restoration exists, which places the name in Tier 1.';
  }
  return isGreek
    ? 'The original preserves one prosodic feature — stress or vowel length — rather than both, which places the name in Tier 2.'
    : 'The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.';
}

function templeUrl(archetype) {
  if (archetype.domainPunycode) return `https://${archetype.domainPunycode}`;
  return `https://punicodex.com/${archetype.id}/`;
}

function buildContext(archetype) {
  const entry = LEXICON_BY_ID.get(archetype.id);
  const lore = LORE[archetype.id] || {};
  const pool = buildSourcePool(lore);
  const { targets, fromGraph } = crosslinkTargets(entry);
  return {
    archetype,
    entry,
    lore,
    pool,
    crosslinks: targets,
    crosslinksFromGraph: fromGraph,
    tradition: traditionLabel(entry),
    originalScript: getOriginalScript(entry),
    scriptLabel: getOriginalScriptLabel(entry),
    scriptName: getScriptName(entry),
    richProvenance: getRichProvenance(entry),
    noScriptNote: getNoScriptNote(entry),
  };
}

// ─────────────────────────────────────────────────────────────
// Section builders
// ─────────────────────────────────────────────────────────────

function buildOverview(ctx) {
  const { archetype, entry, lore, pool, tradition } = ctx;
  const { cite, sources } = createCiter();
  const paragraphs = [];

  const tagline = archetype.tagline ? ` — ${archetype.tagline} —` : '';
  paragraphs.push(
    `**${entry.unicode}** (*${entry.ascii}*)${tagline} belongs to the ${tradition} tradition, where it is catalogued under the domain "${entry.domain}". The name means "${entry.meaning}"${cite(pickSource(pool, 0))}.`
  );

  if (lore.domains && lore.domains.lead) {
    paragraphs.push(`${htmlToMarkdown(lore.domains.lead)}${cite(pickSource(pool, 1))}`);
  }

  const domainLink = archetype.domainUnicode
    ? `[${archetype.domainUnicode}](${templeUrl(archetype)})`
    : `[its temple](${templeUrl(archetype)})`;
  paragraphs.push(
    `PuniCodex restores the name as **${entry.unicode}** and serves its temple at ${domainLink}. ${tierSentence(archetype.tier, entry)} The plain ASCII form *${entry.ascii}* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete${cite(pickSource(pool, 2))}.`
  );

  return {
    body: paragraphs.join('\n\n'),
    sources,
    generatedFrom: ['lore:domains', 'lexicon:meaning', 'archetype:tier'],
    bespoke: false,
  };
}

function buildTheName(ctx) {
  const { archetype, entry, pool } = ctx;
  const { cite, sources } = createCiter();
  const generatedFrom = ['lexicon:greek', 'lexicon:meaning', 'lexicon:breakdown', 'archetype:tier'];
  const parts = [];

  if (ctx.originalScript && ctx.scriptLabel === 'Original Script') {
    parts.push(
      `The name is attested in ${ctx.scriptName} as **${ctx.originalScript}**. Etymologically it means "${entry.meaning}"${cite(pickSource(pool, 0))}.`
    );
  } else {
    const ATTESTED_FALLBACK = {
      roman:
        'The name is attested in the Latin record — inscriptions and literature are the native sources for Roman gods; the vowel quantities shown are editorial (L&S convention)',
      nahuatl:
        'The name is attested in the colonial alphabetic corpus and in logographic writing in the codices; the restoration uses the normalized scholarly orthography',
      chinese:
        'The name is attested in the character record; the restoration normalizes the scholarly romanization (pinyin with tone marks)',
      taoist:
        'The name is attested in the character record; the restoration normalizes the scholarly romanization (pinyin with tone marks)',
      buddhist:
        'The name is attested in the Indic manuscript traditions; the restoration normalizes the scholarly IAST romanization',
      sanskrit:
        'The name is attested in the Devanagari record; the restoration normalizes the scholarly IAST romanization',
      yoruba:
        'The name is attested in modern standard Yoruba orthography; tone marks are fully written in dictionaries and optional in everyday writing',
      zoroastrian: 'The name is attested in the Avestan corpus',
      polynesian:
        'The name is attested in modern Polynesian orthographies; macron usage follows each tradition’s reference dictionaries',
    };
    const fallback = ATTESTED_FALLBACK[entry.pantheon];
    if (fallback) {
      parts.push(`${fallback}. Etymologically the name means "${entry.meaning}"${cite(pickSource(pool, 0))}.`);
    } else {
      parts.push(
        `No indigenous written attestation survives for this name; **${entry.unicode}** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "${entry.meaning}"${cite(pickSource(pool, 0))}.`
      );
    }
  }

  if (entry.etymology) {
    generatedFrom.push('lexicon:etymology');
    const ety = entry.etymology;
    const sentences = [];
    if (ety.protoForm) {
      const protoForm = String(ety.protoForm).replace(/^\*+|\*+$/g, '');
      sentences.push(
        `The reconstructed proto-form is *${protoForm}* (${ety.protoLanguage}, "${ety.protoGloss}").`
      );
    }
    if (ety.derivation) sentences.push(ety.derivation);
    parts.push(sentences.join(' '));
    if (Array.isArray(ety.cognates) && ety.cognates.length > 0) {
      parts.push(
        ['Cognate forms across related languages:', '']
          .concat(
            ety.cognates.map(
              (c) => `- **${c.form}** (${c.language})${c.note ? ` — ${c.note}` : ''}`
            )
          )
          .join('\n')
      );
    }
  }

  const hasStress = entry.breakdown.some((b) => b.type === 'stress' || b.type === 'dual');
  const hasLength = entry.breakdown.some((b) => b.type === 'length' || b.type === 'dual');
  let featureSentence;
  if (hasStress && hasLength) {
    featureSentence = 'both the stress accent and the vowel length of the original';
  } else if (hasStress) {
    featureSentence = 'the stress accent of the original';
  } else if (hasLength) {
    featureSentence = 'the vowel length of the original';
  } else {
    featureSentence = 'the full diacritic detail of the scholarly transliteration';
  }
  parts.push(
    `The ASCII form *${entry.ascii}* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **${entry.unicode}** recovers ${featureSentence} directly in the address bar. ${tierSentence(archetype.tier, entry)}`
  );

  parts.push(
    ['The letter-by-letter transformation runs:', '']
      .concat(
        entry.breakdown.map(
          (b) => `- **${b.char}** → **${b.to || '—'}** — ${b.note || b.type}`
        )
      )
      .join('\n')
  );

  if (Array.isArray(entry.variants) && entry.variants.length > 0) {
    generatedFrom.push('lexicon:variants');
    parts.push(
      ['Attested and derived spellings of the name:', '']
        .concat(
          entry.variants.map(
            (v) =>
              `- **${v.unicode}** — ${VARIANT_TYPE_LABELS[v.type] || v.type}${v.note ? `: ${v.note}` : ''}`
          )
        )
        .join('\n')
    );
  }

  if (archetype.domainUnicode) {
    const owned = OWNED_SET.has(archetype.domainUnicode.toLowerCase().normalize('NFC'));
    parts.push(
      owned
        ? `The project holds the domain **${archetype.domainUnicode}** (${archetype.domainPunycode || archetype.domainUnicode}) as the canonical home of this name${cite(pickSource(pool, 1))}.`
        : `The canonical temple for this name is served at **${archetype.domainUnicode}**${cite(pickSource(pool, 1))}.`
    );
  }

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom,
    bespoke: false,
  };
}

function buildPronunciation(ctx) {
  const { lore, pool } = ctx;
  const pron = lore.pronunciation || {};
  const { cite, sources } = createCiter();
  const parts = [];

  parts.push(
    `The reconstructed pronunciation of the name is **${pron.ipa}** — ${pron.ipaLabel}.${cite(pickSource(pool, 0))}`
  );

  if (Array.isArray(pron.phonemes) && pron.phonemes.length > 0) {
    parts.push(
      ['Phoneme by phoneme:', '']
        .concat(pron.phonemes.map((p) => `- **${p.symbol}** — ${htmlToMarkdown(p.desc)}`))
        .join('\n')
    );
  }

  if (pron.approximation) {
    parts.push(
      `For the modern speaker, the closest approximation is: ${htmlToMarkdown(pron.approximation)}`
    );
  }

  if (Array.isArray(pron.kin) && pron.kin.length > 0) {
    parts.push(
      ['Kindred and historical forms of the name:', '']
        .concat(pron.kin.map((k) => `- **${k.label}** — ${htmlToMarkdown(k.form)}`))
        .join('\n')
    );
  }

  if (pron.note) parts.push(htmlToMarkdown(pron.note));

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom: ['lore:pronunciation'],
    bespoke: false,
  };
}

function buildOriginalScript(ctx) {
  const { entry, lore, richProvenance } = ctx;
  const { cite, sources } = createCiter();
  const generatedFrom = [];
  const parts = [];

  if (richProvenance) {
    generatedFrom.push('original-scripts:provenance');
    const meta = [];
    if (richProvenance.scriptFamily) meta.push(richProvenance.scriptFamily);
    if (richProvenance.timePeriod) meta.push(`attested ${richProvenance.timePeriod}`);
    if (richProvenance.region) meta.push(`in ${richProvenance.region}`);
    const metaSentence = meta.length > 0 ? ` — ${meta.join(', ')}` : '';
    const direction = richProvenance.writingDirection
      ? ` The script is written ${richProvenance.writingDirection}.`
      : '';
    parts.push(
      `The name is preserved in ${richProvenance.scriptName} as **${richProvenance.scriptSpecimen}**${metaSentence}.${direction}`
    );
    if (richProvenance.transliteration) {
      const scheme = richProvenance.transliterationScheme
        ? ` (${richProvenance.transliterationScheme})`
        : '';
      const reading = richProvenance.normalizedReading
        ? `, giving the normalized reading ${richProvenance.normalizedReading}`
        : '';
      parts.push(`The scholarly transliteration is *${richProvenance.transliteration}*${scheme}${reading}.`);
    }
    if (Array.isArray(richProvenance.steps) && richProvenance.steps.length > 0) {
      parts.push(
        ['The rendering proceeds step by step:', '']
          .concat(richProvenance.steps.map((s) => `- ${s}`))
          .join('\n')
      );
    }
    for (const name of richProvenance.sources || []) {
      cite(citationFor(name));
    }
  } else if (ctx.originalScript) {
    generatedFrom.push('original-scripts:mapping');
    const hasStress = entry.breakdown.some((b) => b.type === 'stress' || b.type === 'dual');
    const hasLength = entry.breakdown.some((b) => b.type === 'length' || b.type === 'dual');
    const preserved =
      hasStress && hasLength
        ? 'both its pitch accent and its vowel quantity'
        : hasStress
          ? 'its pitch accent'
          : hasLength
            ? 'its vowel quantity'
            : 'its full diacritic detail';
    parts.push(
      `The name is written in ${ctx.scriptName} as **${ctx.originalScript}**. This ${ctx.scriptLabel.toLowerCase()} is the form against which the ASCII fallback *${entry.ascii}* and the PuniCodex restoration **${entry.unicode}** are measured: the restoration preserves ${preserved} of the written form, so that a reader typing the modern address still speaks the ancient name.`
    );
  } else {
    generatedFrom.push('original-scripts:no-script-note');
    parts.push(ctx.noScriptNote);
    parts.push(
      `The form **${entry.unicode}** is therefore a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.`
    );
  }

  if (lore.originalScriptNote) {
    generatedFrom.push('lore:originalScriptNote');
    parts.push(htmlToMarkdown(lore.originalScriptNote));
  }

  if (sources.length === 0) {
    parts[0] = `${parts[0]}${cite(pickSource(ctx.pool, 0))}`;
  } else {
    // Attach the first provenance citation to the opening paragraph.
    parts[0] = `${parts[0]}[^1]`;
  }

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom,
    bespoke: false,
  };
}

function buildDomains(ctx) {
  const { lore, pool } = ctx;
  const domains = lore.domains || {};
  const { cite, sources } = createCiter();
  const parts = [];

  if (domains.lead) parts.push(`${htmlToMarkdown(domains.lead)}${cite(pickSource(pool, 1))}`);

  for (const card of domains.cards || []) {
    parts.push(`### ${htmlToMarkdown(card.name)}\n\n${htmlToMarkdown(card.desc)}`);
  }

  if (sources.length === 0) cite(pickSource(pool, 0));

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom: ['lore:domains'],
    bespoke: false,
  };
}

function buildSymbols(ctx) {
  const { entry, lore, pool } = ctx;
  const { cite, sources } = createCiter();
  const items = (lore.symbols || []).map(
    (s) => `- **${htmlToMarkdown(s.name)}** — ${htmlToMarkdown(s.meaning)}`
  );
  const body = [
    `The iconography associated with ${entry.unicode} concentrates in a small set of recurring attributes, each a compressed statement about the name:${cite(pickSource(pool, 0))}`,
    '',
    ...items,
  ].join('\n');
  return {
    body,
    sources,
    generatedFrom: ['lore:symbols'],
    bespoke: false,
  };
}

function buildMythology(ctx) {
  const { lore, pool } = ctx;
  const mythology = lore.mythology || {};
  const { cite, sources } = createCiter();
  const parts = [];

  if (mythology.lead) parts.push(`${htmlToMarkdown(mythology.lead)}${cite(pickSource(pool, 1))}`);

  const myths = mythology.myths || [];
  myths.forEach((myth, index) => {
    const title = htmlToMarkdown(myth.title);
    const tag = htmlToMarkdown(myth.tag);
    const heading = tag ? `### ${title} (${tag})` : `### ${title}`;
    let text = htmlToMarkdown(myth.text);
    if (index === 0 && sources.length < 3) text = `${text}${cite(pickSource(pool, 2))}`;
    parts.push(`${heading}\n\n${text}`);
  });

  if (sources.length === 0) cite(pickSource(pool, 0));

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom: ['lore:mythology'],
    bespoke: false,
  };
}

function buildSyncretism(ctx) {
  const { entry, lore, pool, crosslinks, crosslinksFromGraph, tradition } = ctx;
  const { cite, sources } = createCiter();
  const parts = [];

  if (lore.syncretism) {
    parts.push(`${htmlToMarkdown(lore.syncretism)}${cite(pickSource(pool, 0))}`);
  }

  if (crosslinks.length > 0) {
    let sentence;
    if (crosslinksFromGraph) {
      const relationships = new Set(
        crosslinks.map((t) => t.relationship).filter((r) => typeof r === 'string' && r)
      );
      const items = crosslinks.map(
        (t) =>
          `[[${t.id}|${unicodeName(t.id)}]]` +
          (relationships.size > 1 && t.relationship ? ` (${lowerFirst(t.relationship)})` : '')
      );
      sentence = `Kindred figures in the PuniCodex cross-tradition index include ${joinList(items)}`;
      if (relationships.size === 1) {
        sentence += `, each linked through ${lowerFirst([...relationships][0])}.`;
      } else {
        sentence += '.';
      }
    } else {
      const items = crosslinks.map((t) => `[[${t.id}|${unicodeName(t.id)}]]`);
      sentence = `Within the ${tradition} tradition, closely related names in the corpus include ${joinList(items)}.`;
    }
    parts.push(sentence);
  }

  if (sources.length === 0) cite(pickSource(pool, 0));

  return {
    body: parts.join('\n\n'),
    sources,
    generatedFrom: crosslinksFromGraph
      ? ['lore:syncretism', 'similarities:edges']
      : ['lore:syncretism', 'lexicon:pantheon'],
    bespoke: false,
  };
}

function buildCulturalLegacy(ctx) {
  const { lore, pool } = ctx;
  const { cite, sources } = createCiter();
  const body = `${htmlToMarkdown(lore.culturalLegacy || '')}${cite(pickSource(pool, 0))}`;
  return {
    body,
    sources,
    generatedFrom: ['lore:culturalLegacy'],
    bespoke: false,
  };
}

function buildArchaeology(ctx) {
  const { entry, lore, pool, tradition } = ctx;
  const { cite, sources } = createCiter();
  const generatedFrom = [];
  let body;

  if (lore.archaeology) {
    generatedFrom.push('lore:archaeology');
    const pausanias = pool.find((s) => s.citation.includes('Pausanias'));
    const text = htmlToMarkdown(lore.archaeology);
    if (text.length < 300) {
      body = [
        `The material record for ${entry.unicode} survives in a small number of securely identified remains, catalogued below; the corpus is thin but unambiguous, and each site is tied to the name by ancient testimony${cite(pausanias || pickSource(pool, 0))}.`,
        text,
      ].join('\n\n');
    } else {
      body = `${text}${cite(pausanias || pickSource(pool, 0))}`;
    }
  } else {
    generatedFrom.push('lexicon:domain', 'lexicon:meaning');
    const specimen = ctx.originalScript || entry.unicode;
    const symbolNames = (lore.symbols || [])
      .slice(0, 2)
      .map((s) => s.name.toLowerCase());
    const attributes =
      symbolNames.length > 0 ? ` and iconography matching its traditional attributes (${joinList(symbolNames)})` : '';
    const keyword = (entry.domain || '').split(',')[0].trim().toLowerCase();
    body = [
      `No monument, inscription, or artifact in the current PuniCodex corpus is yet assigned to ${entry.unicode} with certainty. That absence should be read honestly: for a ${tradition} name of this type the material record is expected to be thin, and the primary evidence remains the textual testimony gathered in the Scholarly Sources section${cite(pickSource(pool, 0))}.`,
      `Were such evidence to surface, it would take recognizable forms: votive or dedicatory inscriptions naming ${specimen}, sanctuary or cult remains tied to ${keyword}${attributes}. Each candidate would be weighed against the reconstructed form of the name before entering the scholarly record.`,
    ].join('\n\n');
  }

  return { body, sources, generatedFrom, bespoke: false };
}

function buildScholarlySources(ctx) {
  const { entry, pool } = ctx;
  const { cite, sources } = createCiter();
  const lines = pool.map((source) => {
    const marker = cite(source);
    const link = source.url ? ` [Full text](${source.url})` : '';
    return `- ${marker} ${source.citation}${link}`;
  });
  const body = [
    `The account of ${entry.unicode} given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the literary and religious texts supply the narrative evidence.`,
    '',
    ...lines,
  ].join('\n');
  return {
    body,
    sources,
    generatedFrom: ['lore:sources', 'source-catalog'],
    bespoke: false,
  };
}

function buildMeditation(ctx) {
  const { archetype, entry, lore, pool } = ctx;
  const { cite, sources } = createCiter();
  const generatedFrom = [];
  let body;

  if (lore.extendedMeditation) {
    generatedFrom.push('lore:extendedMeditation');
    body = `${htmlToMarkdown(lore.extendedMeditation)}${cite(pickSource(pool, 0))}`;
  } else {
    generatedFrom.push('lexicon:meaning', 'archetype:tagline');
    const tagline = archetype.tagline
      ? `The tradition remembers the name as ${lowerFirst(archetype.tagline)}. `
      : '';
    body = [
      `To contemplate ${entry.unicode} is to hold the idea of ${lowerFirst(entry.domain)} in the mind and to ask what of it endures. The name means "${entry.meaning}"${cite(pickSource(pool, 0))} — and a name that carries its meaning so openly invites meditation rather than mere recollection. ${tagline}`.trim(),
      `Sit with the restored form — ${entry.unicode} — and the diacritics themselves become the practice: each mark is a small act of attention, a refusal to let the plain ASCII form *${entry.ascii}* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.`,
    ].join('\n\n');
  }

  return { body, sources, generatedFrom, bespoke: false };
}

const SECTION_BUILDERS = {
  overview: buildOverview,
  'the-name': buildTheName,
  pronunciation: buildPronunciation,
  'original-script': buildOriginalScript,
  domains: buildDomains,
  symbols: buildSymbols,
  mythology: buildMythology,
  syncretism: buildSyncretism,
  'cultural-legacy': buildCulturalLegacy,
  archaeology: buildArchaeology,
  'scholarly-sources': buildScholarlySources,
  meditation: buildMeditation,
};

module.exports = {
  buildContext,
  buildSourcePool,
  citationFor,
  pickSource,
  createCiter,
  htmlToMarkdown,
  lowerFirst,
  joinList,
  unicodeName,
  crosslinkTargets,
  traditionLabel,
  tierSentence,
  templeUrl,
  GENERATED_SECTION_KEYS,
  SECTION_BUILDERS,
  CONTENT_VERSION,
  PANTHEON_LABELS,
  VARIANT_TYPE_LABELS,
};

// ─────────────────────────────────────────────────────────────
// Content file assembly (fill-only-missing)
// ─────────────────────────────────────────────────────────────

function loadExistingContent(entryId) {
  const file = path.join(CONTENT_DIR, `${entryId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function buildContentFile(archetype, stats) {
  const ctx = buildContext(archetype);
  const sections = {};

  const existing = loadExistingContent(archetype.id);
  if (existing && existing.sections && typeof existing.sections === 'object') {
    for (const [key, value] of Object.entries(existing.sections)) {
      if (value && typeof value.body === 'string' && value.body.trim() !== '') {
        sections[key] = value;
        stats.sectionsPreserved += 1;
      }
    }
  }

  for (const key of GENERATED_SECTION_KEYS) {
    if (sections[key]) continue;
    sections[key] = SECTION_BUILDERS[key](ctx);
    stats.sectionsGenerated[key] = (stats.sectionsGenerated[key] || 0) + 1;
  }

  for (const [key, section] of Object.entries(sections)) {
    if (shouldWatermark(section.body)) {
      section.body = applyCanaryWatermark(section.body);
    }
    const len = section.body.length;
    const agg = stats.sectionLengths[key] || { min: Infinity, total: 0, count: 0 };
    agg.min = Math.min(agg.min, len);
    agg.total += len;
    agg.count += 1;
    stats.sectionLengths[key] = agg;
  }

  return { entryId: archetype.id, contentVersion: CONTENT_VERSION, sections };
}

function main() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const built = ARCHETYPES.filter((a) => a.built);
  const stats = {
    sectionsPreserved: 0,
    sectionsGenerated: {},
    sectionLengths: {},
  };
  let filesWritten = 0;
  let filesUnchanged = 0;

  for (const archetype of built) {
    const content = buildContentFile(archetype, stats);
    const file = path.join(CONTENT_DIR, `${archetype.id}.json`);
    const next = JSON.stringify(content, null, 2);
    const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (prev === next) {
      filesUnchanged += 1;
    } else {
      fs.writeFileSync(file, next);
      filesWritten += 1;
    }
  }

  console.log('Scholarly Edition content generation complete.');
  console.log(`  Files: ${filesWritten} written, ${filesUnchanged} unchanged (${built.length} total)`);
  console.log(`  Sections preserved (existing, non-empty): ${stats.sectionsPreserved}`);
  console.log('  Sections generated this run:');
  for (const key of GENERATED_SECTION_KEYS) {
    const count = stats.sectionsGenerated[key] || 0;
    const lengths = stats.sectionLengths[key];
    const avg = lengths && lengths.count ? Math.round(lengths.total / lengths.count) : 0;
    const min = lengths && lengths.count ? lengths.min : 0;
    console.log(`    ${key}: ${count} generated (avg ${avg} chars, min ${min})`);
  }
}

if (require.main === module) {
  main();
}
