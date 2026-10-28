/**
 * PuniCodex — Sponsor Brain.
 *
 * The cross-pattern engine behind bespoke sponsor pitches. It connects a
 * modern business to the ancient world along three axes and explains every
 * match in words a founder can send:
 *
 *   1. NAMESAKE — the business's name (or domain) IS a temple's name
 *      (Nike→Níkē, Hermès→Hermês, Mars→Mārs, ge.com→Gē). Strongest signal.
 *   2. INDUSTRY SEAT — the business's industry holds a named seat in the
 *      temple's Industry Patterns map (the canonical 53-industry, 700+-term
 *      structure researchers and the API consume).
 *   3. KEYWORD — free-text brand keywords overlap the temple's pattern seats
 *      or the lexicon's meaning field.
 *
 * Everything is derived from canonical sources (lexicon, archetypes,
 * industry-patterns.json), so a regeneration of those data upgrades every
 * pitch. Pure functions, no I/O beyond requires.
 */

const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..');

let lexiconCache = null;
let archetypeCache = null;
let patternCache = null;

function lexicon() {
  if (!lexiconCache) {
    const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
    lexiconCache = LEXICON || [];
  }
  return lexiconCache;
}

function archetypes() {
  if (!archetypeCache) {
    const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
    archetypeCache = ARCHETYPES || [];
  }
  return archetypeCache;
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

/** Deduplicated lexicon — dual-tier names appear once per tier row; the
 * brain reasons about unique temples. */
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

let loreCache = null;
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

/** temple id → normalized unicode, for namesake matching against brand tokens. */
function templeNameIndex() {
  const map = new Map();
  for (const e of lexicon()) {
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

/**
 * Match a business to temples.
 *
 * @param {object} business
 * @param {string} business.businessName
 * @param {string} [business.domain]
 * @param {string} [business.industry]     — human industry label (e.g. 'Wine, Brewing & Hospitality')
 * @param {string} [business.industrySeat] — seat name or entry id from the scout
 * @param {Array<string>} [business.keywords]
 * @param {number} [limit]
 * @returns {Array<{slug, unicode, score, namesake, flagship, reasons: Array<{type, lead, why}>}>}
 */
function matchTemplesForBusiness(business, limit = 5) {
  const biz = business || {};
  const tokens = nameTokens(biz.businessName);
  const sld = domainSld(biz.domain);
  const tokenSet = new Set([...tokens, ...(sld ? [sld] : [])]);
  const industryNorm = normalize(biz.industry);
  const keywords = (Array.isArray(biz.keywords) ? biz.keywords : []).map(normalize).filter(Boolean);
  const nameIndex = templeNameIndex();
  const byEntry = patterns().byEntry || {};
  const flagshipIds = new Set(archetypes().map((a) => a.id));

  const scored = [];
  for (const entry of uniqueLexicon()) {
    let score = 0;
    const reasons = [];
    let namesake = false;

    // 1 — NAMESAKE (brand token or domain SLD is the temple's name)
    const t = nameIndex.get(entry.id);
    const nameTokenMatch =
      tokens.includes(entry.id) || Boolean(t && tokens.includes(t.normalizedUnicode));
    const sldMatch = sld === entry.id;
    if (nameTokenMatch || sldMatch) {
      score += nameTokenMatch ? (sldMatch ? 120 : 100) : 110;
      namesake = true;
      reasons.push(
        nameTokenMatch
          ? {
              type: 'namesake',
              lead: `Your name is already a name of power.`,
              why: `${entry.unicode} is one of the ${pantheonStats().temples} restored names of the Unicode Pantheon — and it is, letter for letter, yours. You have spent decades building meaning into that word; the temple keeps the original it descends from, at its true Unicode domain (${entry.domain}). Alignment with your own namesake is not advertising; it is inheritance.`,
            }
          : {
              type: 'namesake',
              lead: `Your address is the temple's name.`,
              why: `${entry.domain} — the word your customers already type — is the restored Unicode form of ${entry.unicode}. The temple keeps the mythological original of your own domain, at its true accented address.`,
            }
      );
    }

    // 2 — INDUSTRY SEAT
    const seats = byEntry[entry.id] || [];
    const seatNames = seats.map((s) => ({ raw: s.name, norm: normalize(s.name) }));
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
      reasons.push({
        type: 'industry',
        lead: `Your industry holds a named seat here.`,
        why: `The temple's Industry Patterns map — the same structured data consumed by researchers and our public API — names ${industryHit.raw} among its aligned industries. ${biz.businessName || 'Your brand'} is not adjacent to this archetype; it practises it.`,
      });
    }

    // 3 — KEYWORD OVERLAP
    const hitKeywords = keywords.filter((kw) => {
      if (!kw || kw.length < 3) return false;
      if (seatNames.some((s) => s.norm.includes(kw) || kw.includes(s.norm))) return true;
      const meaning = normalize(entry.meaning);
      return meaning && meaning.split(' ').includes(kw);
    });
    if (hitKeywords.length) {
      score += Math.min(36, hitKeywords.length * 12);
    }

    // 4 — LORE: the keyword lives in the temple's own mythology text (the
    //    "strings representing each temple"). This is what separates the true
    //    archetype from an industry coincidence — Dionysos from a brewery
    //    that merely lists wine.
    const loreNorm = normalize(
      (() => {
        const lore = loreCatalog()[entry.id] || {};
        return [lore.mythology?.lead, lore.archaeology, lore.syncretism, lore.culturalLegacy]
          .filter(Boolean)
          .join(' ');
      })()
    );
    const loreHits = hitKeywords.filter((kw) => loreNorm && loreNorm.includes(kw));
    if (loreHits.length) {
      score += Math.min(30, loreHits.length * 15);
    }
    if (hitKeywords.length) {
      reasons.push({
        type: 'keyword',
        lead: `Your language is already the temple's language.`,
        why:
          `${hitKeywords.map((k) => `“${k}”`).join(', ')} — the words your brand lives in — appear in this temple's pattern map` +
          (loreHits.length
            ? `, and in the temple's own mythology. This is not an industry coincidence; it is the archetype your brand descends from.`
            : `.`),
      });
    }

    // Flagships are where the inventory lives; prefer them on ties.
    const flagship = flagshipIds.has(entry.id);
    if (flagship) score += 10;

    if (score > 0) {
      scored.push({
        slug: entry.id,
        unicode: entry.unicode,
        score,
        namesake,
        flagship,
        reasons: reasons.slice(0, 3),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return scored.slice(0, Math.max(1, limit));
}

/**
 * The brain's explanation for ONE specific temple (the prospect's paired
 * temple) — what the sender passes into the pitch email. Returns null-shaped
 * { reasons: [], namesake: false } when nothing matches, so callers can fall
 * back to the generic resonance bullets.
 */
function explainMatch(business, templeSlug) {
  const matches = matchTemplesForBusiness(business, 980);
  const hit = matches.find((m) => m.slug === templeSlug);
  return {
    reasons: hit ? hit.reasons : [],
    namesake: Boolean(hit && hit.namesake),
    bestMatch: matches[0]
      ? { slug: matches[0].slug, unicode: matches[0].unicode, score: matches[0].score }
      : null,
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
