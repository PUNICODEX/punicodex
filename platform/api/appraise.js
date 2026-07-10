/**
 * PÚNYCODEX — Unicode Domain Appraisal Engine
 *
 * The first appraisal model built specifically for Unicode / IDN domain names.
 * It uses the plain-ASCII equivalent as a control value, then layers a
 * transparent Unicode premium on top. The premium is derived from the
 * PÚNYCODEX flywheel data (tier, canonical form, original script, sources,
 * lore, availability, indexed sites, and safety signals) so every valuation
 * is explainable, self-validating, and protective.
 *
 * Model design principles
 *   1. ASCII control first. The ASCII wholesale value anchors the appraisal.
 *   2. Unicode is a thin market. Default liquidity discount is ~90%.
 *   3. Significance earns back the discount. A canonical, tier-1, culturally
 *      important name can recover most or all of the ASCII control value.
 *   4. Safety overrides everything. Spoofs, homographs, and unsafe patterns
 *      are valued at registration fee only and marked "avoid".
 *   5. Original script is secondary. A non-Latin original-script form is
 *      capped at 50% of the value of the primary transliteration.
 *   6. TLD reality matters. IDN-friendly TLDs (.com, .net, .org) get the
 *      full model; non-IDN TLDs get a steep liquidity penalty.
 */

'use strict';

const { domainToASCII } = require('node:url');
const { parseDomain } = require('./domain-parser');
const { classifyDomain } = require('./authenticity-service');
const { lookupBrand } = require('./brand-shield');
const namesService = require('./names-service');
const { getVersion } = require('./version-service');
const { getDb } = require('../db/connection');
const { ARCHETYPES } = require('../../js/archetypes-v2.js');
const { LEXICON } = require('../../type/js/lexicon.js');
const { getOriginalScript } = require('../../type/js/original-scripts.js');

const MODEL_VERSION = 'appraise-1.0.0';
const DATA_VERSION = getVersion().version || 'unknown';
const BASE_REFERENCE_VALUE = 50_000; // USD for a perfect ASCII .com one-word 4-5 letter name
const REGISTRATION_FEE_USD = 12;
const MAX_BATCH_SIZE = 100;

// Aftermarket scarcity floors for clean ASCII .com names. These reflect the
// hard supply constraint of short domains and current wholesale/retail reality.
// 1L .com domains are effectively unavailable; 2L .com domains have a 300K–500K
// wholesale floor; 3L–6L follow the downward-sloping aftermarket curve.
const SCARCITY_FLOORS_USD = {
  com: {
    1: 10_000_000,
    2: 450_000,
    3: 35_000,
    4: 10_000,
    5: 3_000,
    6: 1_000,
  },
};

const TWO_L_VOWELS = new Set('aeiou');
const TWO_L_COMMON_ENDS = new Set('rstln');

// Premium bigrams: common acronyms, high-frequency abbreviations, and culturally
// significant short forms that trade above the generic 2L .com floor.
const PREMIUM_BIGRAMS = new Set([
  'ai',
  'ar',
  'as',
  'at',
  'be',
  'by',
  'cd',
  'co',
  'do',
  'ea',
  'et',
  'ev',
  'go',
  'he',
  'hr',
  'if',
  'in',
  'io',
  'is',
  'it',
  'iv',
  'me',
  'my',
  'no',
  'of',
  'om',
  'on',
  'or',
  'os',
  'ox',
  'pc',
  'pr',
  'ra',
  're',
  'so',
  'ta',
  'to',
  'tv',
  'up',
  'us',
  'vr',
  'we',
]);

// Tenant / ad-revenue assumptions. A flagship temple page can lease ad slots;
// the appraisal capitalizes a conservative stream of that income.
const DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS = 515_000; // ≈ full slot bundle
const TENANT_REVENUE_MONTHS = 12; // capitalize one year of bookings
const TENANT_OCCUPANCY_DEFAULT = 0.5;
const TENANT_OCCUPANCY_BRAND = 0.75;
const BRAND_TENANT_MULTIPLIER = 1.5;

// Global brands whose exact ASCII .com is effectively priceless and whose
// canonical Unicode transliterations in PÚNYCODEX command a scarcity premium.
// Values are wholesale scarcity floors, not market comps.
const BRAND_SCARCITY_OVERRIDES = {
  nike: { tier: 'mega', asciiValue: 2_000_000, canonicalShare: 0.35 },
  hermes: { tier: 'mega', asciiValue: 2_000_000, canonicalShare: 0.35 },
  ea: { tier: 'mega', asciiValue: 1_500_000, canonicalShare: 0.3 },
  apple: { tier: 'mega', asciiValue: 3_000_000, canonicalShare: 0.3 },
  google: { tier: 'mega', asciiValue: 2_500_000, canonicalShare: 0.3 },
  amazon: { tier: 'mega', asciiValue: 2_500_000, canonicalShare: 0.3 },
  microsoft: { tier: 'mega', asciiValue: 2_000_000, canonicalShare: 0.25 },
  meta: { tier: 'mega', asciiValue: 1_500_000, canonicalShare: 0.25 },
  tesla: { tier: 'mega', asciiValue: 1_500_000, canonicalShare: 0.3 },
  netflix: { tier: 'mega', asciiValue: 1_500_000, canonicalShare: 0.3 },
  paypal: { tier: 'major', asciiValue: 800_000, canonicalShare: 0.25 },
  gaia: { tier: 'major', asciiValue: 1_500_000, canonicalShare: 0.25 },
};

// Verified aftermarket comparables for specific names. When a name has a
// marketplace comp, it overrides the formula-driven ASCII control value.
// Sources: domain broker reports, auction results, wholesale listings.
const MARKET_COMP_OVERRIDES = {
  om: { auction: 451_000, marketplace: 3_680_000, brokerage: 6_370_000 },
};

// TLD liquidity table. Supports IDN registration is a hard gate for Unicode value.
const TLD_LIQUIDITY = {
  com: { score: 1.0, supportsIdn: true, maxValue: 10_000_000 },
  net: { score: 0.28, supportsIdn: true, maxValue: 100_000 },
  org: { score: 0.22, supportsIdn: true, maxValue: 80_000 },
  info: { score: 0.12, supportsIdn: true, maxValue: 40_000 },
  biz: { score: 0.1, supportsIdn: true, maxValue: 35_000 },
  // Popular non-IDN generics and ccTLDs
  io: { score: 0.18, supportsIdn: false, maxValue: 60_000 },
  app: { score: 0.15, supportsIdn: false, maxValue: 50_000 },
  dev: { score: 0.12, supportsIdn: false, maxValue: 40_000 },
  ai: { score: 0.14, supportsIdn: false, maxValue: 45_000 },
  co: { score: 0.16, supportsIdn: false, maxValue: 50_000 },
  me: { score: 0.1, supportsIdn: false, maxValue: 30_000 },
  de: { score: 0.05, supportsIdn: false, maxValue: 15_000 },
  fr: { score: 0.05, supportsIdn: false, maxValue: 15_000 },
  jp: { score: 0.06, supportsIdn: false, maxValue: 20_000 },
  eu: { score: 0.04, supportsIdn: false, maxValue: 12_000 },
  uk: { score: 0.06, supportsIdn: false, maxValue: 20_000 },
  us: { score: 0.06, supportsIdn: false, maxValue: 20_000 },
  cn: { score: 0.08, supportsIdn: true, maxValue: 25_000 },
  ru: { score: 0.06, supportsIdn: true, maxValue: 18_000 },
  default: { score: 0.08, supportsIdn: false, maxValue: 20_000 },
};

const PANTHEON_WEIGHTS = {
  greek: 1.0,
  'greek-location': 0.85,
  norse: 0.95,
  egyptian: 0.9,
  sanskrit: 0.85,
  japanese: 0.8,
  chinese: 0.8,
  mesopotamian: 0.75,
  celtic: 0.65,
  slavic: 0.6,
  nahuatl: 0.55,
  polynesian: 0.55,
  yoruba: 0.55,
  zoroastrian: 0.6,
  incan: 0.5,
  buddhist: 0.7,
  taoist: 0.65,
  korean: 0.5,
  canaanite: 0.55,
  phoenician: 0.55,
  hittite: 0.55,
};

const TIER_BOOST = {
  dual: 1.5,
  1: 1.0,
  2: 0.5,
  none: 0,
};

const FORM_BOOST = {
  owned: 2.5,
  ideal: 2.0,
  variant: 1.5,
  'original-script': 1.0,
  ascii: 0,
  folded: 0.2,
  unknown: -0.5,
};

const BASE_UNICODE_RATE = 0.1;
const MAX_UNICODE_RATE = 0.65;

// Build a lookup of owned/registrable domains per flagship archetype.
const ownedDomainsById = new Map(
  ARCHETYPES.map((a) => {
    const domains = [a.domainUnicode, a.domainPunycode, ...(a.domainAlt || [])].filter(Boolean);
    const registrable = new Set(domains.map((d) => parseDomain(d).domain).filter(Boolean));
    return [a.id, registrable];
  })
);

// Map real original scripts (Greek, Cuneiform, Runes, Devanagari, etc.) to lexicon ids
// so that a domain in the indigenous script can still be appraised correctly.
const originalScriptToId = new Map();
for (const entry of LEXICON) {
  const script = getOriginalScript(entry);
  if (script && script !== '—') {
    originalScriptToId.set(normalizeLabel(script), entry.id);
  }
}

function isAsciiOnly(str) {
  return ![...String(str)].some((ch) => ch.codePointAt(0) > 127);
}

function normalizeLabel(str) {
  return String(str || '')
    .normalize('NFC')
    .toLowerCase()
    .trim();
}

function getTldInfo(tld) {
  const key = String(tld || '').toLowerCase();
  return TLD_LIQUIDITY[key] || TLD_LIQUIDITY.default;
}

function computePunycodeLabel(label) {
  if (!label) return null;
  try {
    const ascii = domainToASCII(label.toLowerCase());
    return ascii !== label.toLowerCase() ? ascii : null;
  } catch (_e) {
    return null;
  }
}

function lengthFactor(length) {
  if (length <= 3) return 1.0;
  if (length <= 4) return 0.9;
  if (length <= 5) return 0.8;
  if (length <= 6) return 0.65;
  if (length <= 8) return 0.5;
  if (length <= 10) return 0.35;
  if (length <= 15) return 0.22;
  return 0.1;
}

function lexicalQualityFactor(name) {
  const lower = name.toLowerCase();
  let factor = 1.0;
  if (lower.startsWith('-') || lower.endsWith('-')) factor *= 0.35;
  else if (lower.includes('-')) factor *= 0.65;
  if (/^\d/.test(lower)) factor *= 0.55;
  if (/\d/.test(lower)) factor *= 0.85;
  if (/[^a-z0-9-]/.test(lower)) factor *= 0.75;
  return factor;
}

function brandRiskFactor(name, options = {}) {
  const brand = lookupBrand(name, options);
  if (!brand) return { factor: 1.0, brand: null };
  const matchType = brand.matchType || brand.type || 'visual';
  if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain') {
    return { factor: 0.12, brand };
  }
  return { factor: 0.45, brand };
}

// Quality scoring for two-letter .com pairs. 676 combinations exist; some
// letter patterns (vowels, common endings, repeated letters) trade at a premium.
function twoLetterQualityScore(name) {
  const [a, b] = [...String(name || '').toLowerCase()];
  if (!a || !b) return { score: 1.0, label: 'standard' };

  const hasVowel = TWO_L_VOWELS.has(a) || TWO_L_VOWELS.has(b);
  const commonEnd = TWO_L_COMMON_ENDS.has(b);
  const repeated = a === b;

  if (repeated) return { score: 1.5, label: 'repeated-letter' };
  if (hasVowel && commonEnd) return { score: 1.35, label: 'vowel+common-end' };
  if (hasVowel) return { score: 1.2, label: 'vowel-adjacent' };
  if (commonEnd) return { score: 1.1, label: 'common-end' };
  return { score: 0.9, label: 'consonant-pair' };
}

// Aftermarket scarcity floor for short ASCII .com names. The base formula
// undervalues truly scarce names (1-5 letter dictionary words, etc.), so this
// floor applies to *all* clean .com names of 1-6 characters, not just names
// already present in the PÚNYCODEX lexicon.
function intrinsicAsciiFloor(name, tld) {
  if (tld !== 'com') return 0;
  const len = [...String(name || '')].length;
  const base = SCARCITY_FLOORS_USD.com[len];
  if (!base) return 0;

  if (len === 2) {
    const quality = twoLetterQualityScore(name);
    return Math.round(base * quality.score);
  }
  return base;
}

// Short .com names (1-3 characters) carry scarcity and acronym premiums that
// the base length factor alone does not capture. This multiplier is applied to
// the formula-driven ASCII value before the scarcity floor is enforced, so
// premium pairs like RA.com rise above the generic 2L floor.
function shortNamePremiumMultiplier(label, tld, entry) {
  if (tld !== 'com') return { multiplier: 1.0, note: null, pattern: null };
  const clean = String(label || '').toLowerCase();
  const len = [...clean].length;

  if (len === 1) {
    return { multiplier: 5.0, note: '1L .com extreme scarcity', pattern: '1L' };
  }

  if (len === 2) {
    const quality = twoLetterQualityScore(clean);
    const bigramBoost = PREMIUM_BIGRAMS.has(clean) ? 1.5 : 1.0;
    const meaningBoost = entry ? 1.3 : 1.0;
    const multiplier = Math.min(4.0, Math.max(0.8, quality.score * bigramBoost * meaningBoost));
    return {
      multiplier,
      note: `2L .com scarcity (${quality.label})`,
      pattern: '2L',
    };
  }

  if (len === 3) {
    return { multiplier: 1.2, note: '3L .com scarcity', pattern: '3L' };
  }

  return { multiplier: 1.0, note: null, pattern: null };
}

function isFlagshipLexiconEntry(entry) {
  return Boolean(entry && (entry.hasFlagship || entry.hasAdSite));
}

function asciiSignificanceFactor(entry) {
  if (!entry) return 1.0;

  let factor = 1.0;
  // Base premium for being a curated, culturally significant canonical name.
  factor += 2.0;

  if (entry.tier === 'dual') factor += 1.5;
  else if (entry.tier === '1') factor += 1.0;
  else if (entry.tier === '2') factor += 0.5;

  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  factor += Math.min(sources.length * 0.15, 0.75);

  if (isFlagshipLexiconEntry(entry)) factor += 1.0;
  if (entry.lore) factor += 0.5;
  if (entry.site) factor += 0.25;

  const pantheonWeight = PANTHEON_WEIGHTS[entry.pantheon] || 0.5;
  factor += pantheonWeight * 0.75;

  return factor;
}

// Short, culturally famous names (Zeus, Thor, Ra, etc.) trade far above the
// baseline formula. This multiplier is applied to the formulaic ASCII value.
function asciiFameMultiplier(entry, len) {
  if (!entry || !isFlagshipLexiconEntry(entry)) return 1.0;

  let score = 0;
  const pantheonWeight = PANTHEON_WEIGHTS[entry.pantheon] || 0.5;
  if (pantheonWeight >= 0.8) score += 1.0;

  if (entry.tier === 'dual' || entry.tier === '1') score += 1.5;
  else if (entry.tier === '2') score += 0.5;

  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  if (sources.length >= 3) score += 1.0;
  else if (sources.length >= 2) score += 0.5;

  if (len <= 4) score += 1.0;
  else if (len <= 5) score += 0.5;

  if (entry.lore) score += 0.5;
  if (entry.site) score += 0.25;

  if (score >= 5.0) return 3.0;
  if (score >= 4.0) return 2.5;
  if (score >= 3.0) return 1.75;
  if (score >= 2.0) return 1.25;
  return 1.0;
}

function getAsciiLiveBoost(domain) {
  try {
    const db = getDb();
    if (!db) return { multiplier: 1.0, row: null };
    const row = db
      .prepare(
        'SELECT status, authority_score FROM indexed_sites WHERE (domain = ? OR punycode = ?) LIMIT 1'
      )
      .get(domain, domain);
    if (row?.status !== 'active') return { multiplier: 1.0, row };
    const authority = Number(row.authority_score || 0);
    const multiplier = 1.0 + Math.min(0.5 + authority / 200, 0.75);
    return { multiplier, row };
  } catch (_e) {
    return { multiplier: 1.0, row: null };
  }
}

function asciiDevelopedComMultiplier(name, tld, entry) {
  if (tld !== 'com' || !entry) return 1.0;
  const cleanName = normalizeLabel(name);
  if (cleanName !== normalizeLabel(entry.ascii)) return 1.0;
  if (!isFlagshipLexiconEntry(entry)) return 1.0;
  return 1.3;
}

function estimateAsciiValue(name, tld, entry = null, domain = null) {
  const info = getTldInfo(tld);
  const cleanName = String(name || '').toLowerCase();
  const len = [...cleanName].length;

  const lenFactor = lengthFactor(len);
  const qualityFactor = lexicalQualityFactor(cleanName);
  const significanceFactor = asciiSignificanceFactor(entry);
  const fameMultiplier = asciiFameMultiplier(entry, len);
  const { factor: brandFactor, brand } = brandRiskFactor(cleanName);
  const developedMultiplier = asciiDevelopedComMultiplier(name, tld, entry);
  const liveBoost = domain ? getAsciiLiveBoost(domain) : { multiplier: 1.0, row: null };
  const shortPremium = shortNamePremiumMultiplier(cleanName, tld, entry);

  let value =
    BASE_REFERENCE_VALUE *
    lenFactor *
    info.score *
    qualityFactor *
    significanceFactor *
    fameMultiplier *
    brandFactor *
    developedMultiplier *
    liveBoost.multiplier *
    shortPremium.multiplier;

  // True aftermarket scarcity for short ASCII .com names.
  const scarcityFloor = intrinsicAsciiFloor(cleanName, tld);
  value = Math.max(value, scarcityFloor);

  // Verified market comparables override the formula for specific names.
  const marketComp = MARKET_COMP_OVERRIDES[cleanName];
  let appliedMarketComp = null;
  if (marketComp && tld === 'com') {
    value = marketComp.marketplace;
    appliedMarketComp = marketComp;
  }

  value = Math.max(value, REGISTRATION_FEE_USD);
  if (!appliedMarketComp) {
    value = Math.min(value, info.maxValue);
  }

  const factors = [
    { name: 'length', impact: lenFactor, note: `${len} chars` },
    {
      name: 'tldLiquidity',
      impact: info.score,
      note: `.${tld || 'unknown'} ${info.supportsIdn ? 'IDN' : 'non-IDN'}`,
    },
    {
      name: 'lexicalQuality',
      impact: qualityFactor,
      note: cleanName.includes('-') ? 'contains hyphen' : 'clean',
    },
    {
      name: 'significance',
      impact: significanceFactor,
      note: entry ? 'canonically significant name' : 'not in lexicon',
    },
    {
      name: 'fame',
      impact: fameMultiplier,
      note: fameMultiplier > 1 ? 'globally recognizable canonical name' : 'standard',
    },
    {
      name: 'brandRisk',
      impact: brandFactor,
      note: brand ? `brand proximity: ${brand.id || brand.name}` : 'none detected',
    },
  ];

  if (developedMultiplier > 1.0) {
    factors.push({
      name: 'developedCom',
      impact: developedMultiplier,
      note: 'canonical ASCII .com of a flagship name',
    });
  }

  if (liveBoost.multiplier > 1.0) {
    factors.push({
      name: 'liveSite',
      impact: liveBoost.multiplier,
      note: 'active indexed site on the ASCII domain',
    });
  }

  if (shortPremium.multiplier !== 1.0) {
    factors.push({
      name: 'shortNameScarcity',
      impact: shortPremium.multiplier,
      note: shortPremium.note,
    });
  }

  if (appliedMarketComp) {
    factors.push({
      name: 'marketComp',
      impact: 1,
      note: `marketplace comparable: $${appliedMarketComp.marketplace.toLocaleString()}`,
    });
  } else if (scarcityFloor > 0) {
    factors.push({
      name: 'intrinsicScarcityFloor',
      impact: scarcityFloor / value,
      note: `short ASCII .com scarcity floor: $${scarcityFloor.toLocaleString()}`,
    });
  }

  return { value, brand, tldInfo: info, factors, marketComp: appliedMarketComp };
}

function loadEntry(id) {
  if (!id) return null;
  try {
    return namesService.getName(id) || null;
  } catch (_e) {
    return null;
  }
}

function classifyForm(label, entry, parsed) {
  if (!entry) return { form: 'unknown', variant: null };
  const lower = normalizeLabel(label);

  // Owned flagship domains take precedence over canonical-form classification.
  const ownedSet = ownedDomainsById.get(entry.id);
  if (ownedSet && parsed.domain && ownedSet.has(parsed.domain)) {
    return { form: 'owned', variant: null };
  }

  if (normalizeLabel(entry.unicode) === lower) {
    return { form: 'ideal', variant: null };
  }
  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  const variant = variants.find(
    (v) => v && typeof v.unicode === 'string' && normalizeLabel(v.unicode) === lower
  );
  if (variant) {
    return { form: 'variant', variant };
  }
  if (normalizeLabel(entry.ascii) === lower) {
    return { form: 'ascii', variant: null };
  }

  // Original script match (non-Latin or Greek)
  const originalScript = entry.originalScript?.script;
  if (originalScript && originalScript !== '—' && normalizeLabel(originalScript) === lower) {
    return { form: 'original-script', variant: null };
  }

  return { form: 'unknown', variant: null };
}

function getNameProfile(domain) {
  const parsed = parseDomain(domain);
  const rawLabel = parsed.decodedLabels[0] || parsed.hostname || '';
  const punycodeLabel = parsed.labels[0] || parsed.hostname || '';
  const hasUnicode = !isAsciiOnly(rawLabel) || parsed.isPunycode;

  const classification = classifyDomain(domain);
  const match = classification?.canonicalMatch;
  let entryId = match && match.type === 'lexicon' ? match.id : null;

  // Fallback: the label may be the indigenous original script (Greek, Cuneiform,
  // Runes, etc.) which the authenticity classifier treats as mixed-script.
  if (!entryId && originalScriptToId.has(normalizeLabel(rawLabel))) {
    entryId = originalScriptToId.get(normalizeLabel(rawLabel));
  }

  let entry = entryId ? loadEntry(entryId) : null;

  // The authenticity classifier may return a brand match for exact brand domains
  // (e.g., nike.com). For appraisal we still want the underlying lexicon entry
  // because it drives form classification and tenant-revenue potential.
  if (!entry) {
    const fallbackId = isAsciiOnly(rawLabel) ? rawLabel.toLowerCase() : punycodeLabel.toLowerCase();
    entry = loadEntry(fallbackId) || null;
  }

  const { form, variant } = classifyForm(rawLabel, entry, parsed);
  const asciiRoot = entry ? entry.ascii : isAsciiOnly(rawLabel) ? rawLabel : punycodeLabel;

  return {
    domain,
    parsed,
    label: rawLabel,
    punycodeLabel,
    asciiRoot,
    tld: parsed.etld,
    hasUnicode,
    classification,
    entry,
    entryId,
    form,
    variant,
  };
}

function isFlagshipEntry(entry) {
  return Boolean(entry && ownedDomainsById.has(entry.id));
}

function getBrandScarcity(profile) {
  const asciiRoot = String(profile.asciiRoot || profile.label || '').toLowerCase();
  if (!asciiRoot) return null;

  let brand = lookupBrand(asciiRoot, { domain: profile.domain });
  let synthetic = false;
  if (!brand && BRAND_SCARCITY_OVERRIDES[asciiRoot]) {
    synthetic = true;
    brand = {
      ascii: asciiRoot,
      name: asciiRoot,
      matchType: 'folded',
      identity: { priority: 95 },
    };
  }
  if (!brand) return null;

  const matchType = synthetic ? 'folded' : brand.matchType || 'visual';
  if (!['exact', 'folded', 'domain'].includes(matchType)) return null;

  const priority = brand.identity?.priority || 50;
  let tier = 'known';
  let asciiValue = 100_000;
  let canonicalShare = 0.15;

  if (priority >= 95) {
    tier = 'mega';
    asciiValue = 2_000_000;
    canonicalShare = 0.35;
  } else if (priority >= 85) {
    tier = 'major';
    asciiValue = 500_000;
    canonicalShare = 0.25;
  } else if (priority >= 60) {
    tier = 'known';
    asciiValue = 100_000;
    canonicalShare = 0.15;
  }

  const override = BRAND_SCARCITY_OVERRIDES[asciiRoot];
  if (override) {
    tier = override.tier || tier;
    asciiValue = override.asciiValue || asciiValue;
    canonicalShare = override.canonicalShare || canonicalShare;
  }

  return { brand, tier, asciiValue, canonicalShare };
}

function computeBrandScarcityValue(profile, scarcity) {
  if (!scarcity) return { exactValue: 0, canonicalValue: 0, isExact: false };

  const brandAscii = normalizeLabel(scarcity.brand.ascii || scarcity.brand.name || '');
  const label = normalizeLabel(profile.label);
  const isExact = label === brandAscii;

  if (isExact) {
    return { exactValue: scarcity.asciiValue, canonicalValue: 0, isExact: true };
  }

  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script'].includes(profile.form);
  if (recognizedForm) {
    return {
      exactValue: 0,
      canonicalValue: Math.round(scarcity.asciiValue * scarcity.canonicalShare),
      isExact: false,
    };
  }

  return { exactValue: 0, canonicalValue: 0, isExact: false };
}

function tenantRevenueValue(profile, brandScarcity, tldInfo) {
  const entry = profile.entry;
  if (!entry || !isFlagshipEntry(entry)) {
    return { value: 0, monthlyUsd: 0, occupancy: 0, brandMultiplier: 1, note: 'not a flagship' };
  }

  const siteSlug = entry.id;
  let monthlyCents = DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS;

  try {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT SUM(price_cents) as total FROM ad_slots WHERE site_slug = ? AND (is_bundle = 0 OR is_bundle IS NULL)'
      )
      .get(siteSlug);
    if (row && row.total > 0) {
      monthlyCents = Number(row.total);
    } else {
      monthlyCents = DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS;
    }
  } catch (_e) {
    // Database or table may not be available; use default inventory.
  }

  const monthlyUsd = monthlyCents / 100;
  const isBrand = Boolean(brandScarcity);
  const occupancy = isBrand ? TENANT_OCCUPANCY_BRAND : TENANT_OCCUPANCY_DEFAULT;
  const brandMultiplier = isBrand ? BRAND_TENANT_MULTIPLIER : 1.0;
  const tldMultiplier = tldInfo?.supportsIdn ? 1.0 : (tldInfo?.score ?? 0.08);
  const value = Math.round(
    monthlyUsd * TENANT_REVENUE_MONTHS * occupancy * brandMultiplier * tldMultiplier
  );

  return {
    value,
    monthlyUsd,
    occupancy,
    brandMultiplier,
    note: `${isBrand ? 'brand-aligned' : 'standard'} flagship ad inventory`,
  };
}

function computeSignificanceBoost(profile) {
  const { entry } = profile;
  if (!entry) return { boost: 0, components: [] };

  const components = [];
  let boost = 0;

  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  const sourceBoost = Math.min(sources.length * 0.05, 0.3);
  if (sourceBoost > 0) {
    boost += sourceBoost;
    components.push({
      name: 'scholarlySources',
      value: sourceBoost,
      note: `${sources.length} cited`,
    });
  }

  const loreBoost = entry.lore ? 0.3 : 0;
  if (loreBoost > 0) {
    boost += loreBoost;
    components.push({ name: 'loreCatalog', value: loreBoost, note: 'flagship lore present' });
  }

  const flagshipBoost = entry.hasFlagship ? 0.5 : 0;
  if (flagshipBoost > 0) {
    boost += flagshipBoost;
    components.push({
      name: 'flagshipPresence',
      value: flagshipBoost,
      note: 'flagship domain owned',
    });
  }

  const pantheonWeight = PANTHEON_WEIGHTS[entry.pantheon] || 0.5;
  const pantheonBoost = pantheonWeight * 0.2;
  boost += pantheonBoost;
  components.push({ name: 'pantheonReach', value: pantheonBoost, note: entry.pantheon });

  const meaningBoost = entry.meaning ? 0.1 : 0;
  if (meaningBoost > 0) {
    boost += meaningBoost;
    components.push({ name: 'meaning', value: meaningBoost, note: 'defined' });
  }

  const availability = entry.availability?.status;
  const availableBoost = availability === 'available' ? 0.1 : 0;
  if (availableBoost > 0) {
    boost += availableBoost;
    components.push({ name: 'availability', value: availableBoost, note: 'available' });
  }

  const liveBoost = entry.site ? 0.2 : 0;
  if (liveBoost > 0) {
    boost += liveBoost;
    components.push({ name: 'liveSite', value: liveBoost, note: 'indexed site' });
  }

  return { boost, components };
}

function computeUnicodePremium(profile, _asciiValue, brandScarcity) {
  const factors = [];

  if (!profile.hasUnicode) {
    factors.push({
      name: 'asciiOnly',
      impact: 1.0,
      note: 'No Unicode characters; ASCII control value stands.',
    });
    return {
      baseRate: 1.0,
      boost: 0,
      effectiveRate: 1.0,
      multiplier: 1.0,
      discount: 0,
      factors,
    };
  }

  const info = getTldInfo(profile.tld);
  const safety = profile.classification || {};
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script'].includes(profile.form);
  const unsafeVerdicts = new Set([
    'homograph-spoof',
    'mixed-script-spoof',
    'lookalike-domain',
    'unsafe',
  ]);
  if (unsafeVerdicts.has(safety.verdict)) {
    // Listed canonical variants are legitimate, even if the authenticity service
    // flags them as lookalikes because the registrable domain is not in the
    // identity allow-list. Blocklist matches and true homographs still tank value.
    const overridable =
      recognizedForm &&
      (safety.verdict === 'lookalike-domain' || safety.verdict === 'mixed-script-spoof');
    if (!overridable) {
      factors.push({
        name: 'safetyPenalty',
        impact: 0,
        note: `${safety.verdict}: ${safety.reason}`,
      });
      return {
        baseRate: 0,
        boost: 0,
        effectiveRate: 0,
        multiplier: 0,
        discount: 1.0,
        factors,
        unsafe: true,
      };
    }
  }

  // Unicode domains start at 10% of the ASCII control value and earn percentage
  // boosts based on how canonical, well-attested, and significant the name is.
  let boost = 0;

  factors.push({
    name: 'unicodeBaseRate',
    impact: BASE_UNICODE_RATE,
    note: '10% of ASCII control value',
  });

  if (!info.supportsIdn) {
    boost -= 0.7;
    factors.push({
      name: 'tldIdnPenalty',
      impact: -0.7,
      note: 'TLD does not support IDN registrations',
    });
  }

  const formBoost = FORM_BOOST[profile.form] ?? FORM_BOOST.unknown;
  boost += formBoost;
  factors.push({
    name: 'canonicalForm',
    impact: formBoost,
    note: profile.form,
  });

  const tier = profile.entry?.tier || 'none';
  const tierBoost = TIER_BOOST[tier] ?? TIER_BOOST.none;
  boost += tierBoost;
  factors.push({
    name: 'tier',
    impact: tierBoost,
    note: profile.entry?.tierLabel || tier,
  });

  const { boost: sigBoost, components } = computeSignificanceBoost(profile);
  boost += sigBoost;
  for (const c of components) {
    factors.push({ name: c.name, impact: c.value, note: c.note });
  }

  if (brandScarcity && recognizedForm) {
    // Canonical transliterations of famous brands receive a proportional lift
    // based on the brand's canonical-share parameter.
    const brandBoost = brandScarcity.canonicalShare * 10;
    boost += brandBoost;
    factors.push({
      name: 'brandScarcity',
      impact: brandBoost,
      note: `canonical ${brandScarcity.brand.name || brandScarcity.brand.id}`,
    });
  }

  if (!recognizedForm && safety.tier === 'unknown') {
    boost -= 0.3;
    factors.push({
      name: 'unknownForm',
      impact: -0.3,
      note: 'not a recognized canonical form',
    });
  }

  if (!profile.entry) {
    const name = profile.asciiRoot;
    const len = [...name].length;
    if (len > 8) {
      const lenPenalty = -0.3;
      boost += lenPenalty;
      factors.push({ name: 'length', impact: lenPenalty, note: `${len} chars` });
    }
    const quality = lexicalQualityFactor(name);
    if (quality < 1.0) {
      const qualityPenalty = (1 - quality) * 0.5;
      boost += qualityPenalty;
      factors.push({ name: 'lexicalQuality', impact: qualityPenalty, note: 'noisy' });
    }
  }

  let effectiveRate = BASE_UNICODE_RATE * (1 + boost);

  // Original-script cap: worth at most 50% of the corresponding transliteration.
  if (profile.form === 'original-script' && profile.entry) {
    const transliterationBoost = boost - FORM_BOOST['original-script'] + FORM_BOOST.ideal;
    const transliterationRate = BASE_UNICODE_RATE * (1 + transliterationBoost);
    const capped = transliterationRate * 0.5;
    if (effectiveRate > capped) {
      effectiveRate = capped;
      factors.push({
        name: 'originalScriptCap',
        impact: effectiveRate,
        note: 'capped at 50% of primary transliteration value',
      });
    }
  }

  effectiveRate = Math.min(Math.max(effectiveRate, 0), MAX_UNICODE_RATE);

  return {
    baseRate: BASE_UNICODE_RATE,
    boost,
    effectiveRate,
    multiplier: Number(effectiveRate.toFixed(4)),
    discount: Number((1 - effectiveRate).toFixed(4)),
    factors,
  };
}

function trademarkFactor(profile, brandScarcity) {
  // Canonical transliterations of famous brand names are defensible and valuable,
  // not trademark risks. Only unknown or deceptive brand-like forms are suppressed.
  if (brandScarcity) {
    const brandAscii = normalizeLabel(brandScarcity.brand.ascii || brandScarcity.brand.name || '');
    const label = normalizeLabel(profile.label);
    const isExact = label === brandAscii;
    const recognizedForm = ['owned', 'ideal', 'variant', 'original-script'].includes(profile.form);
    if (isExact || recognizedForm) {
      return { factor: 1.0, brand: brandScarcity.brand, premium: true };
    }
  }

  const rawLabel = profile.label;
  const asciiRoot = profile.asciiRoot;
  const brandRaw = lookupBrand(rawLabel, { domain: profile.domain });
  if (brandRaw) {
    const matchType = brandRaw.matchType || 'visual';
    if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain')
      return { factor: 0.15, brand: brandRaw };
    return { factor: 0.5, brand: brandRaw };
  }
  const brandAscii = lookupBrand(asciiRoot, { domain: profile.domain });
  if (brandAscii) {
    const matchType = brandAscii.matchType || 'visual';
    if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain')
      return { factor: 0.15, brand: brandAscii };
    return { factor: 0.5, brand: brandAscii };
  }
  return { factor: 1.0, brand: null };
}

function liquidityRating(profile, finalValue) {
  const info = getTldInfo(profile.tld);
  if (!info.supportsIdn || !profile.hasUnicode) {
    return finalValue > 1000 ? 'medium' : 'low';
  }
  if (info.score >= 0.9 && (profile.form === 'owned' || profile.form === 'ideal')) return 'high';
  if (info.score >= 0.9 && profile.form === 'variant') return 'medium';
  return 'low';
}

function recommendation(profile, finalValue, unsafe) {
  if (unsafe) return 'avoid';
  if (finalValue <= REGISTRATION_FEE_USD * 2) return 'registration-fee-only';
  const status = profile.entry?.availability?.status;
  if (status === 'available') return 'acquire';
  if (profile.entry?.site) return 'watch';
  if (status === 'registered' || status === 'live') return 'watch';
  return 'watch';
}

function confidenceScore(profile) {
  if (!profile.entry) return 0.35;
  let score = 0.5;
  if (profile.entry.availability?.status) score += 0.15;
  if (profile.entry.tierExplanation) score += 0.15;
  if (profile.entry.hasFlagship) score += 0.1;
  if (profile.form !== 'unknown') score += 0.1;
  return Math.min(score, 0.98);
}

function appraise(domain) {
  const rawDomain = String(domain || '').trim();
  if (!rawDomain) {
    return {
      domain: rawDomain,
      error: 'DOMAIN_REQUIRED',
      message: 'A domain name is required.',
    };
  }

  const profile = getNameProfile(rawDomain);
  const info = getTldInfo(profile.tld);
  const ascii = estimateAsciiValue(profile.asciiRoot, profile.tld, profile.entry, rawDomain);

  const brandScarcity = getBrandScarcity(profile);
  const bs = computeBrandScarcityValue(profile, brandScarcity);
  const tm = trademarkFactor(profile, brandScarcity);

  // Tenant revenue only attaches to legitimate, safe forms. A false/unknown
  // Unicode form flagged as a lookalike should not inherit the income value
  // of the canonical landing page.
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script', 'ascii'].includes(
    profile.form
  );

  // ASCII control value anchors the appraisal. It is the maximum of the
  // formula-driven base, a verified market comparable, or the exact brand
  // scarcity floor when the root corresponds to a famous brand.
  // For canonical transliterations of a brand, the control is capped at the
  // exact ASCII brand value so the Unicode form never outranks the ASCII root.
  let asciiControlValue = ascii.value;
  if (brandScarcity) {
    if (bs.isExact || recognizedForm) {
      // Canonical (exact ASCII or recognized transliteration) brand forms anchor
      // to the brand's exact ASCII scarcity value. The Unicode premium is applied
      // on top of that control, so the Unicode name stays below the ASCII root.
      asciiControlValue = brandScarcity.asciiValue;
    } else {
      asciiControlValue = Math.max(ascii.value, brandScarcity.asciiValue * 0.1);
    }
  }
  asciiControlValue = Math.round(asciiControlValue);

  const premium = computeUnicodePremium(profile, asciiControlValue, brandScarcity);
  const unsafe = premium.unsafe === true;
  const tenant =
    !unsafe && recognizedForm
      ? tenantRevenueValue(profile, brandScarcity, info)
      : { value: 0, monthlyUsd: 0, occupancy: 0, brandMultiplier: 1, note: 'not eligible' };

  // Pure domain value: Unicode names start at 10% of the ASCII control and earn
  // percentage boosts for canonical form, tier, sources, brand scarcity, etc.
  // The Unicode name itself is never valued above the ASCII control of the root.
  let domainValue = profile.hasUnicode
    ? asciiControlValue * premium.effectiveRate * tm.factor
    : asciiControlValue * tm.factor;
  domainValue = Math.min(domainValue, asciiControlValue);
  domainValue = Math.max(domainValue, REGISTRATION_FEE_USD);

  // Total value includes separately reported tenant/ad revenue. That revenue is
  // a business opportunity tied to the page, not an intrinsic domain-name value.
  let totalValue = domainValue + tenant.value;
  totalValue = Math.max(totalValue, REGISTRATION_FEE_USD);

  // The domain value is already capped at the ASCII control. The total may
  // include tenant revenue, but we still keep a sanity ceiling derived from
  // brand scarcity or market comparables so the liquidity rating stays honest.
  const marketCompCap = ascii.marketComp ? ascii.marketComp.marketplace * 1.2 : 0;
  const brandCap = Math.max(
    domainValue + tenant.value,
    info.maxValue,
    marketCompCap,
    (brandScarcity ? brandScarcity.asciiValue : 0) * 1.5,
    tenant.value * 2
  );
  totalValue = Math.min(totalValue, brandCap);

  // The public-facing Unicode appraisal is the pure domain value.
  const unicodeValue = domainValue;

  const rounded = Math.round(unicodeValue);
  const confidence = confidenceScore(profile);
  const rec = recommendation(profile, rounded, unsafe);
  const rating = liquidityRating(profile, rounded);

  const scarcityFactor = bs.canonicalValue > 0 || bs.exactValue > 0 ? bs : null;

  const result = {
    domain: rawDomain,
    displayDomain: profile.parsed.decodedLabels.join('.') || rawDomain,
    punycode: computePunycodeLabel(profile.label),
    tld: profile.tld,
    label: profile.label,
    asciiRoot: profile.asciiRoot,
    hasUnicode: profile.hasUnicode,
    lexiconMatch: profile.entry
      ? {
          id: profile.entry.id,
          ascii: profile.entry.ascii,
          unicode: profile.entry.unicode,
          pantheon: profile.entry.pantheon,
          tier: profile.entry.tier,
          tierLabel: profile.entry.tierLabel,
          form: profile.form,
          variantType: profile.variant?.type || null,
        }
      : null,
    safety: {
      verdict: profile.classification?.verdict || 'unknown',
      tier: profile.classification?.tier || 'unknown',
      reason: profile.classification?.reason || null,
    },
    appraisal: {
      currency: 'USD',
      asciiControlValue,
      unicodeValue: rounded,
      totalValue: Math.round(totalValue),
      premiumMultiplier: Number(premium.multiplier.toFixed(4)),
      discount: Number(premium.discount.toFixed(4)),
      brandScarcityValue: bs.exactValue || bs.canonicalValue || 0,
      tenantRevenueValue: tenant.value,
      liquidityRating: rating,
      recommendation: rec,
      confidence: Number(confidence.toFixed(2)),
    },
    factors: {
      ascii: ascii.factors,
      unicode: premium.factors,
      unicodeSummary: profile.hasUnicode
        ? {
            baseRate: premium.baseRate,
            boost: premium.boost,
            effectiveRate: premium.effectiveRate,
          }
        : null,
      trademark: tm.brand
        ? {
            factor: tm.factor,
            name: tm.brand.name || tm.brand.id,
            matchType: tm.brand.matchType,
            premium: tm.premium || false,
          }
        : null,
      brandScarcity: scarcityFactor
        ? {
            tier: brandScarcity.tier,
            value: scarcityFactor.exactValue || scarcityFactor.canonicalValue,
            brand: brandScarcity.brand.name || brandScarcity.brand.id,
            note: scarcityFactor.isExact
              ? `exact ASCII brand scarcity (${brandScarcity.tier})`
              : `canonical transliteration of ${brandScarcity.brand.name}`,
          }
        : null,
      tenantRevenue:
        tenant.value > 0
          ? {
              value: tenant.value,
              monthlyUsd: tenant.monthlyUsd,
              occupancy: tenant.occupancy,
              brandMultiplier: tenant.brandMultiplier,
              note: tenant.note,
            }
          : null,
    },
    model: {
      version: MODEL_VERSION,
      dataVersion: DATA_VERSION,
    },
  };

  return result;
}

function appraiseBatch(domains) {
  const inputs = Array.isArray(domains) ? domains : [domains];
  const limited = inputs.slice(0, MAX_BATCH_SIZE);
  const results = limited.map((d) => appraise(d));
  return {
    count: results.length,
    requested: inputs.length,
    items: results,
  };
}

module.exports = {
  appraise,
  appraiseBatch,
  estimateAsciiValue,
  computeUnicodePremium,
  getTldInfo,
  MODEL_VERSION,
  MAX_BATCH_SIZE,
  REGISTRATION_FEE_USD,
};
