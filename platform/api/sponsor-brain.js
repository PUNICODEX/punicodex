/**
 * PuniCodex — Sponsor Brain.
 *
 * The matching engine behind bespoke sponsor pitches: it connects a modern
 * business to the ancient world and ALWAYS finds the thread. Scoring and
 * explanation are separate concerns:
 *
 * SCORING (matchTemplesForBusiness) — every flagship temple is ranked for
 * every business on a multi-axis vector:
 *   1. NAMESAKE    — brand token or domain SLD is the temple's name
 *                    (Nike→Níkē, Hermès→Hermês, Mars→Mārs, ge.com→Gē)
 *   2. NAME-FUZZY  — brand token carries the temple's name within it
 *                    ("Athenian" → Athena), or vice versa
 *   3. INDUSTRY    — the business's industry holds a named seat in the
 *                    canonical 53-industry pattern map
 *   4. KEYWORD×SEAT    — brand keywords live in the temple's pattern seats
 *   5. KEYWORD×LORE    — brand keywords live in the temple's own mythology
 *   6. VALUES          — brand keywords are what the temple's NAME means
 *   7. ARCHETYPAL BASE — every flagship sits on twelve millennia of meaning;
 *                        this base guarantees universal coverage
 *
 * EXPLANATION (explainMatch) — converts the matched axes into sendable
 * copy. A temple with direct signals gets those reasons; a temple with none
 * still gets an honest composed reason from its tagline, lore, meaning and
 * domain. The only way to get zero reasons is to hand the brain an empty
 * business.
 *
 * Everything derives from canonical sources (lexicon, archetypes,
 * lore-catalog, industry-patterns.json) — regenerate those and every pitch
 * upgrades. Pure functions, no I/O beyond requires.
 */

const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');

let lexiconCache = null;
let archetypeCache = null;
let patternCache = null;
let loreCache = null;

function lexicon() {
  if (!lexiconCache) {
    const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
    lexiconCache = LEXICON || [];
  }
  return lexiconCache;
}

/** Deduplicated lexicon — each name appears once. */
let uniqueLexiconCache = null;
function uniqueLexicon() {
  if (!uniqueLexiconCache) {
    const seen = new Set();
    uniqueLexiconCache = lexicon().filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }
  return uniqueLexiconCache;
}

function archetypes() {
  if (!archetypeCache) {
    const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
    archetypeCache = ARCHETYPES || [];
  }
  return archetypeCache;
}

function archetypeById() {
  const map = new Map();
  for (const a of archetypes()) if (!map.has(a.id)) map.set(a.id, a);
  return map;
}

function patterns() {
  if (!patternCache) {
    try {
      patternCache = require(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'));
    } catch {
      patternCache = { byEntry: {} };
    }
  }
  return patternCache;
}

function loreCatalog() {
  if (!loreCache) {
    try {
      loreCache = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
    } catch {
      loreCache = {};
    }
  }
  return loreCache;
}

/** Strip diacritics + case + punctuation; collapse whitespace. */
function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const NAME_SUFFIXES = new Set([
  'inc',
  'incorporated',
  'ltd',
  'llc',
  'co',
  'company',
  'companies',
  'corp',
  'corporation',
  'group',
  'holdings',
  'holding',
  'gmbh',
  'ag',
  'sa',
  'plc',
  'pty',
  'bhd',
  'srl',
  'nv',
  'llp',
  'lp',
  'enterprise',
  'enterprises',
  'international',
  'industries',
  'industry',
  'the',
  'and',
  'of',
]);

const MEANING_STOPWORDS = new Set([
  'god',
  'goddess',
  'deity',
  'spirit',
  'of',
  'the',
  'and',
  'possibly',
  'probably',
  'unknown',
  'uncertain',
  'related',
  'from',
  'meaning',
]);

function nameTokens(businessName) {
  return normalize(businessName)
    .split(' ')
    .filter((t) => t.length >= 2 && !NAME_SUFFIXES.has(t));
}

function domainSld(domain) {
  const host = String(domain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  const sld = host.split('.')[0] || '';
  return sld.length >= 2 && !NAME_SUFFIXES.has(sld) ? sld : '';
}

/** temple id → normalized unicode, for namesake matching against brand tokens. */
function templeNameIndex() {
  const map = new Map();
  for (const e of uniqueLexicon()) {
    map.set(e.id, { entry: e, normalizedUnicode: normalize(e.unicode) });
  }
  return map;
}

function pantheonStats() {
  const lex = uniqueLexicon();
  return {
    temples: lex.length,
    flagships: new Set(archetypes().map((a) => a.id)).size,
    pantheons: new Set(lex.map((e) => e.pantheon).filter(Boolean)).size,
  };
}

/** Substantive meaning tokens, or [] for etymology-unknown entries. */
function meaningTokens(entry) {
  const raw = String(entry?.meaning || '').toLowerCase();
  if (!raw || raw.startsWith('unknown') || raw.startsWith('uncertain')) return [];
  return normalize(raw)
    .split(' ')
    .filter((t) => t.length >= 3 && !MEANING_STOPWORDS.has(t));
}

function loreText(entryId) {
  const lore = loreCatalog()[entryId] || {};
  return normalize(
    [lore.mythology?.lead, lore.archaeology, lore.syncretism, lore.culturalLegacy]
      .filter(Boolean)
      .join(' ')
  );
}

/** First sentence-ish slice of raw lore, for composed copy. */
function firstLoreSentence(entryId, maxLen = 220) {
  const lore = loreCatalog()[entryId] || {};
  const lead = lore.mythology?.lead || lore.culturalLegacy || '';
  const clean = String(lead)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  const cut = clean.match(/^(.{20,220}?[.!?])(\s|$)/);
  const sentence = cut ? cut[1] : clean.slice(0, maxLen).trim();
  return sentence.length <= maxLen + 40 ? sentence : `${clean.slice(0, maxLen).trim()}…`;
}

/** The temple's real Unicode address when known (archetypes carry it);
 * the lexicon `domain` field is a keyword descriptor on many entries, so it
 * is only a fallback — and reasons must not present keywords as an address. */
function templeAddress(entry) {
  const arch = archetypeById().get(entry.id);
  return arch?.domainUnicode || entry.domain || '';
}

function addressClause(entry) {
  const address = templeAddress(entry);
  return /\./.test(address)
    ? `, kept at ${address} by a university-edited scholarly edition`
    : `, kept by a university-edited scholarly edition`;
}

/* ── Explanation composer ─────────────────────────────────────────────── */

function namesakeReason(entry, nameTokenMatch, sld) {
  return nameTokenMatch
    ? {
        type: 'namesake',
        lead: `Your name is already a name of power.`,
        why: `${entry.unicode} is one of the ${pantheonStats().temples} restored names of the Unicode Pantheon — and it is, letter for letter, yours. You have spent decades building meaning into that word; the temple keeps the original it descends from, at its true Unicode domain (${templeAddress(entry)}). Alignment with your own namesake is not advertising; it is inheritance.`,
      }
    : {
        type: 'namesake',
        lead: `Your address is the temple's name.`,
        why: `${sld}.com — the word your customers already type — is the unaccented descendant of ${entry.unicode}. The temple keeps the restored original, at its true Unicode address: ${templeAddress(entry)}.`,
      };
}

function industryReason(entry, seatName, businessName) {
  return {
    type: 'industry',
    lead: `Your industry holds a named seat here.`,
    why: `The temple's Industry Patterns map — the same structured data consumed by researchers and our public API — names ${seatName} among its aligned industries. ${businessName} is not adjacent to this archetype; it practises it.`,
  };
}

function keywordReason(hitKeywords, loreHits) {
  return {
    type: 'keyword',
    lead: `Your language is already the temple's language.`,
    why:
      `${hitKeywords.map((k) => `“${k}”`).join(', ')} — the vocabulary your brand lives in — appears in this temple's pattern map` +
      (loreHits.length
        ? `, and in the temple's own mythology. This is not an industry coincidence; it is the archetype your brand descends from.`
        : `.`),
  };
}

function valuesReason(entry, hitValues) {
  return {
    type: 'values',
    lead: `Your brand sells what this temple IS.`,
    why: `${entry.unicode} means ${String(entry.meaning).toLowerCase()} — and ${hitValues
      .map((k) => `“${k}”`)
      .join(
        ', '
      )} is the vocabulary you trade in. Most brands borrow archetypal language; a frame inside this temple verifies it.`,
  };
}

/**
 * The composed, always-available explanation for a flagship: tagline + lore +
 * domain. Honest — every claim is canonical data — and it reads bespoke
 * because it is built from the temple's own voice, not a generic template.
 */
function archetypalReason(entry, businessName, industry) {
  const arch = archetypeById().get(entry.id);
  const tagline = arch?.tagline ? ` — ${arch.tagline}` : '';
  const meaning =
    entry.meaning && !/^(unknown|uncertain)/i.test(entry.meaning)
      ? ` The name itself means ${String(entry.meaning).toLowerCase()}.`
      : '';
  const market = industry ? ` in ${industry}` : '';
  return {
    type: 'archetypal',
    lead: `The archetype your customers already believe in.`,
    why:
      `${entry.unicode}${tagline}.${meaning} Every brand${market} trades on an ` +
      `archetype — victory, beauty, craft, protection; the oldest persuasion there is. This temple is the original those words point back to` +
      addressClause(entry) +
      `. A frame here does not claim the story; it is verified by it.`,
  };
}

/* ── Scoring ──────────────────────────────────────────────────────────── */

/**
 * Match a business to temples. Every flagship is ranked (archetypal base);
 * base temples appear when a direct signal fires. Sorted by score desc.
 */
function matchTemplesForBusiness(business, limit = 5) {
  const biz = business || {};
  const businessName = String(biz.businessName || '').trim();
  const tokens = nameTokens(businessName);
  const sld = domainSld(biz.domain);
  const industryNorm = normalize(biz.industry);
  const keywords = (Array.isArray(biz.keywords) ? biz.keywords : [])
    .map(normalize)
    .filter((k) => k.length >= 3);
  const nameIndex = templeNameIndex();
  const byEntry = patterns().byEntry || {};
  const flagshipIds = new Set(archetypes().map((a) => a.id));

  const scored = [];
  for (const entry of uniqueLexicon()) {
    const axes = {};
    const reasons = [];
    let score = 0;
    let namesake = false;

    // 1 — NAMESAKE
    const t = nameIndex.get(entry.id);
    const nameTokenMatch =
      tokens.includes(entry.id) || Boolean(t && tokens.includes(t.normalizedUnicode));
    const sldMatch = sld === entry.id;
    if (nameTokenMatch || sldMatch) {
      score += nameTokenMatch ? (sldMatch ? 120 : 100) : 110;
      namesake = true;
      axes.namesake = true;
      reasons.push(namesakeReason(entry, nameTokenMatch, sld));
    }

    // 2 — NAME-FUZZY: brand token carries the temple's name (or vice versa);
    // the CONTAINED side must be at least 4 chars or every short name
    // matches inside every long one ("athenian" contains "he").
    if (!namesake) {
      const fuzzy = tokens.find(
        (tok) =>
          tok !== sld &&
          ((tok.length >= 4 && entry.id.length >= 4 && tok.includes(entry.id)) ||
            (entry.id.length >= 4 && tok.length >= 4 && entry.id.includes(tok)) ||
            (t &&
              t.normalizedUnicode.length >= 4 &&
              tok.length >= 4 &&
              tok.includes(t.normalizedUnicode)))
      );
      if (fuzzy) {
        score += 25;
        axes.nameFuzzy = true;
        reasons.push({
          type: 'name-fuzzy',
          lead: `Your name carries the temple's name within it.`,
          why: `“${fuzzy}” descends from ${entry.unicode} — the temple keeps the original your word points back to, at ${templeAddress(entry)}.`,
        });
      }
    }

    const seats = byEntry[entry.id] || [];
    const seatNames = seats.map((s) => ({ raw: s.name, norm: normalize(s.name) }));

    // 3 — INDUSTRY SEAT
    let industryHit = null;
    if (industryNorm) {
      industryHit =
        seatNames.find((s) => s.norm === industryNorm) ||
        seatNames.find((s) => s.norm.includes(industryNorm) || industryNorm.includes(s.norm));
    }
    if (!industryHit && biz.industrySeat) {
      const seatNorm = normalize(biz.industrySeat);
      industryHit =
        seatNames.find((s) => s.norm === seatNorm) ||
        (nameIndex.has(biz.industrySeat) && entry.id === biz.industrySeat
          ? { raw: seats[0]?.name || biz.industrySeat, norm: seatNorm }
          : null);
    }
    if (industryHit) {
      score += 45;
      axes.industry = true;
      reasons.push(industryReason(entry, industryHit.raw, businessName || 'Your brand'));
    }

    // 4 — KEYWORD × SEAT
    const hitKeywords = keywords.filter((kw) =>
      seatNames.some((s) => s.norm.includes(kw) || kw.includes(s.norm))
    );
    if (hitKeywords.length) score += Math.min(36, hitKeywords.length * 12);

    // 5 — KEYWORD × LORE (mythology text — the archetype-over-coincidence axis)
    const loreNorm = loreText(entry.id);
    const loreHits = keywords.filter((kw) => loreNorm && loreNorm.includes(kw));
    if (loreHits.length) score += Math.min(30, loreHits.length * 15);
    if (hitKeywords.length) {
      axes.keyword = true;
      reasons.push(keywordReason(hitKeywords, loreHits));
    }

    // 6 — VALUES: brand keywords are what the temple's name means
    if (!namesake) {
      const mTokens = meaningTokens(entry);
      const hitValues = keywords.filter((kw) => mTokens.includes(kw));
      if (hitValues.length) {
        score += 20;
        axes.values = true;
        reasons.push(valuesReason(entry, hitValues));
      }
    }

    // 7 — ARCHETYPAL BASE: universal coverage over the monetizable inventory.
    const flagship = flagshipIds.has(entry.id);
    if (flagship) {
      score += 5;
      axes.archetypal = true;
    } else if (score === 0) {
      continue; // base temples enter the ranking only on a direct signal
    }
    if (flagship && score > 5) score += 10; // flagship preference on real ties

    scored.push({
      slug: entry.id,
      unicode: entry.unicode,
      score,
      namesake,
      flagship,
      axes,
      reasons: reasons.slice(0, 3),
      // composed fallback — appended by explainMatch/explain hooks when empty
      ...(flagship && reasons.length === 0
        ? { composed: archetypalReason(entry, businessName, biz.industry) }
        : {}),
    });
  }

  scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return scored.slice(0, Math.max(1, limit));
}

/* ── Explanation ──────────────────────────────────────────────────────── */

/**
 * The brain's explanation for ONE temple (usually the prospect's paired
 * temple). NEVER returns zero reasons for a real business: direct signals
 * when they exist, the composed archetypal case when they do not. `strength`
 * tells the caller how hard to lean on it: 'namesake' | 'direct' | 'archetypal'.
 */
function explainMatch(business, templeSlug) {
  const biz = business || {};
  const businessName = String(biz.businessName || '').trim();
  const hasInput = Boolean(
    businessName || normalize(biz.domain) || normalize(biz.industry) || biz.keywords?.length
  );
  // A literally empty business gets nothing — this is the ONLY zero.
  if (!hasInput) return { reasons: [], namesake: false, strength: 'none', bestMatch: null };

  const matches = matchTemplesForBusiness(biz, 2000);
  const hit = matches.find((m) => m.slug === templeSlug);

  if (!hit) {
    // Base temple (no archetypal base) with no direct signal: compose from
    // canonical data — the brain still finds the thread.
    const entry = uniqueLexicon().find((e) => e.id === templeSlug);
    if (!entry) return { reasons: [], namesake: false, strength: 'none', bestMatch: null };
    return {
      reasons: [archetypalReason(entry, businessName, biz.industry)],
      namesake: false,
      strength: 'archetypal',
      bestMatch: bestMatchShape(matches[0]),
    };
  }

  const direct = Object.keys(hit.axes).some((k) => k !== 'archetypal');
  const reasons = [...hit.reasons];
  if (reasons.length === 0 && hit.composed) reasons.push(hit.composed);
  const strength = hit.axes.namesake ? 'namesake' : direct ? 'direct' : 'archetypal';
  return {
    reasons,
    namesake: hit.namesake,
    strength,
    bestMatch: bestMatchShape(matches[0]),
  };
}

function bestMatchShape(best) {
  if (!best) return null;
  return {
    slug: best.slug,
    unicode: best.unicode,
    score: best.score,
    strength: best.axes.namesake
      ? 'namesake'
      : Object.keys(best.axes).some((k) => k !== 'archetypal')
        ? 'direct'
        : 'archetypal',
  };
}

module.exports = {
  matchTemplesForBusiness,
  explainMatch,
  normalize,
  nameTokens,
  domainSld,
  pantheonStats,
};
