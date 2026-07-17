/**
 * PuniCodex — Student Creative Marketplace automated moderation
 *
 * Scans asset metadata for trademark keywords, high-risk association language,
 * and content-policy violations. This is a first-pass filter; human reviewers
 * make the final decision.
 */

const fs = require('node:fs');
const path = require('node:path');

// Blocklist: modern trademark holders and associated high-risk terms.
// Keep this list conservative. The goal is to prevent student submissions that
// allude to, incorporate, or imitate modern brand identity.
const TRADEMARK_BLOCKLIST = [
  'swoosh',
  'just do it',
  'nike inc',
  'nikecom',
  'nike.com',
  'hermès',
  'hermes international',
  'hermes.com',
  'birkin',
  'kelly',
  'chanel',
  'gucci',
  'louis vuitton',
  'lv',
  'prada',
  'adidas',
  'puma',
  'reebok',
  'under armour',
  'asics',
  'new balance',
  'converse',
  'vans',
  'supreme',
  'lululemon',
  'patagonia',
  'the north face',
  'north face',
  'carhartt',
  'dickies',
  'ray-ban',
  'rayban',
  'oakley',
  'rolex',
  'omega',
  'cartier',
  'tiffany',
  'bulgari',
  'van cleef',
  'swarovski',
  'pandora',
  'apple',
  'iphone',
  'ipad',
  'macbook',
  'airpods',
  'samsung',
  'galaxy',
  'sony',
  'playstation',
  'xbox',
  'nintendo',
  'coca-cola',
  'coca cola',
  'coke',
  'pepsi',
  'mcdonald',
  'starbucks',
  'amazon',
  'google',
  'youtube',
  'facebook',
  'instagram',
  'twitter',
  'x.com',
  'tiktok',
  'netflix',
  'disney',
  'marvel',
  'dc comics',
  'warner',
  'lego',
  'barbie',
  'pokemon',
  'hello kitty',
  'versace',
  'burberry',
  'fendi',
  'balenciaga',
  'dior',
  'ysl',
  'saint laurent',
  'givenchy',
  'armani',
  'ralph lauren',
  'tommy hilfiger',
  'calvin klein',
  'victoria secret',
  'hugo boss',
  'lacoste',
  'timberland',
  'dr martens',
  'birkenstock',
  'crocs',
  'ugg',
  'moncler',
  'canada goose',
  'stone island',
  'off-white',
  'off white',
  'bape',
  'stüssy',
  'stussy',
  'palace',
  'kith',
  'undefeated',
  'assc',
  'antisocial social club',
];

// Language that implies endorsement, association, or brand commissioning.
const ASSOCIATION_BLOCKLIST = [
  'endorsement',
  'endorsed by',
  'official',
  'officially licensed',
  'in collaboration with',
  'collaboration with',
  'commissioned by',
  'brand kit',
  'brand alignment',
  'brand identity',
  'corporate identity',
  'trademark',
  'registered trademark',
  'logo for',
  'logomark for',
  'made for',
  'designed for',
  'on behalf of',
  'sponsored by',
  'paid promotion',
];

// Content-policy blocklist (slurs, hate symbols, explicit content keywords).
// This is intentionally a small starter set; expand as needed.
const CONTENT_POLICY_BLOCKLIST = [
  'nazi',
  'swastika',
  'kkk',
  'white power',
  'heil',
  'isis',
  'al-qaeda',
  'terrorist',
  'child exploitation',
  'csam',
  'revenge porn',
  'bestiality',
  'necrophilia',
];

const ALL_PATTERNS = [
  { source: 'trademark', terms: TRADEMARK_BLOCKLIST },
  { source: 'association', terms: ASSOCIATION_BLOCKLIST },
  { source: 'content_policy', terms: CONTENT_POLICY_BLOCKLIST },
];

function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text, terms) {
  const normalized = normalizeText(text);
  const matches = [];
  for (const term of terms) {
    const lowerTerm = term.toLowerCase();
    if (lowerTerm.includes(' ')) {
      // Multi-word phrase: substring match.
      if (normalized.includes(lowerTerm)) {
        matches.push(term);
      }
      continue;
    }
    // Single-word term: require word boundaries to avoid matching
    // mythological names like "Níkē" or "Anankē" when blocking "nike".
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(lowerTerm)}([^a-z0-9]|$)`, 'i');
    if (pattern.test(normalized)) {
      matches.push(term);
    }
  }
  return matches;
}

function moderateText({ title, description, tags = [] }) {
  const combinedText = [title, description, ...tags].join(' ');
  const findings = [];

  for (const { source, terms } of ALL_PATTERNS) {
    const matches = findMatches(combinedText, terms);
    if (matches.length > 0) {
      findings.push({ source, matches });
    }
  }

  const rejected = findings.length > 0;
  return {
    allowed: !rejected,
    rejected,
    findings,
    reviewedAt: new Date().toISOString(),
  };
}

function moderateAsset(asset) {
  return moderateText({
    title: asset.title,
    description: asset.description,
    tags: asset.tags || [],
  });
}

function loadCustomBlocklist() {
  const customPath = path.join(__dirname, '..', 'config', 'creative-blocklist.json');
  if (!fs.existsSync(customPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(customPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const customBlocklist = loadCustomBlocklist();
if (customBlocklist.length > 0) {
  ALL_PATTERNS.push({ source: 'custom', terms: customBlocklist });
}

module.exports = {
  moderateText,
  moderateAsset,
  TRADEMARK_BLOCKLIST,
  ASSOCIATION_BLOCKLIST,
  CONTENT_POLICY_BLOCKLIST,
};
