/**
 * PÚNYCODEX — Scholarly Edition Edit Quality Gates
 *
 * Scores and validates proposed section edits before they enter the review queue.
 * No external dependencies.
 */

const MIN_SCORE = 30;

const SOURCE_QUALITY_KEYWORDS = [
  // General scholarly markers
  'doi',
  'jstor',
  'cambridge',
  'oxford',
  'university press',
  'brill',
  'de gruyter',
  'springer',
  'academia.edu',
  'researchgate',
  // Classical / philological authorities
  'lsj',
  'liddell',
  'scott',
  'jones',
  'beekes',
  'chantraine',
  'frisk',
  'walde',
  'pokorny',
  'lewis and short',
  'perseus',
  'thesaurus linguae graecae',
  'tlg',
  'phi',
  'papyri',
  // Primary sources
  'hesiod',
  'homer',
  'iliad',
  'odyssey',
  'theogony',
  'works and days',
  'hymn',
  'pindar',
  'aeschylus',
  'sophocles',
  'euripides',
  'aristophanes',
  'plato',
  'aristotle',
  'herodotus',
  'thucydides',
  'xenophon',
  'plutarch',
  'pausanias',
  'ovid',
  'virgil',
  'aeneid',
  'metamorphoses',
  'fasti',
  'snorri',
  'prose edda',
  'poetic edda',
  'eddic',
  'saga',
  'rigveda',
  'atharvaveda',
  'upanishad',
  'mahabharata',
  'ramayana',
  'purana',
];

const REQUIRED_SECTION_PATTERNS = [
  /^#{1,3}\s/m, // markdown heading
  /^\[?\d+\]?\.?\s/m, // numbered list
  /\n\n[A-Z][A-Za-z\s]{2,40}\n[-=]{3,}/, // underline heading
  /\b(overview|introduction|summary|etymology|attestation|sources|references|citations|bibliography|discussion|analysis|notes)\b/gi,
];

function normalizeSource(source) {
  if (typeof source === 'string') return source.toLowerCase();
  if (source && typeof source.citation === 'string') return source.citation.toLowerCase();
  if (source && typeof source.title === 'string') return source.title.toLowerCase();
  return '';
}

function countQualityMatches(sources) {
  let matches = 0;
  for (const source of sources) {
    const text = normalizeSource(source);
    for (const keyword of SOURCE_QUALITY_KEYWORDS) {
      if (text.includes(keyword)) {
        matches += 1;
        break;
      }
    }
  }
  return matches;
}

function hasRequiredSections(body) {
  const text = String(body);
  return REQUIRED_SECTION_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreLength(body) {
  const length = String(body).trim().length;
  if (length >= 500) return 40;
  if (length >= 200) return 30;
  if (length >= 50) return 15;
  if (length >= 20) return 5;
  return 0;
}

function scoreCitations(sources) {
  const count = Array.isArray(sources) ? sources.length : 0;
  if (count >= 3) return 35;
  if (count === 2) return 25;
  if (count === 1) return 15;
  return 0;
}

function scoreSourceQuality(sources) {
  const matches = countQualityMatches(sources);
  return Math.min(matches * 4, 20);
}

function scoreSections(body) {
  return hasRequiredSections(body) ? 10 : 0;
}

/**
 * Score a proposed edit on a 0-100 scale.
 * @param {Object} params
 * @param {string} params.body
 * @param {Array} params.sources
 * @returns {number}
 */
function scoreEdit({ body = '', sources = [] } = {}) {
  const lengthScore = scoreLength(body);
  const citationScore = scoreCitations(sources);
  const qualityScore = scoreSourceQuality(sources);
  const sectionScore = scoreSections(body);
  return Math.min(100, lengthScore + citationScore + qualityScore + sectionScore);
}

function buildQualityReason({ body = '', sources = [] } = {}, score) {
  const reasons = [];
  const length = String(body).trim().length;

  if (length >= 500) reasons.push('substantial prose');
  else if (length >= 200) reasons.push('moderate length');
  else if (length >= 50) reasons.push('short but substantive');
  else if (length >= 20) reasons.push('very brief');

  const sourceCount = Array.isArray(sources) ? sources.length : 0;
  if (sourceCount >= 3) reasons.push('well-cited');
  else if (sourceCount === 2) reasons.push('two sources');
  else if (sourceCount === 1) reasons.push('one source');
  else reasons.push('uncited');

  const qualityMatches = countQualityMatches(sources);
  if (qualityMatches > 0) reasons.push('authoritative source markers');

  if (hasRequiredSections(body)) reasons.push('structured sections');

  return `Score ${score}/100 — ${reasons.join(', ')}`;
}

/**
 * Validate a proposed edit.
 * @param {Object} params
 * @param {string} params.body
 * @param {Array} params.sources
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateEdit({ body = '', sources = [] } = {}) {
  const errors = [];
  const warnings = [];

  const trimmedBody = String(body).trim();
  const sourceArray = Array.isArray(sources) ? sources : [];

  if (trimmedBody.length === 0) {
    errors.push('Body is required.');
  } else if (trimmedBody.length < 20) {
    errors.push('Body must be at least 20 characters.');
  }

  if (sourceArray.length === 0) {
    errors.push('At least one source is required.');
  }

  for (const source of sourceArray) {
    const hasCitation =
      source && typeof source.citation === 'string' && source.citation.trim().length > 0;
    const hasTitle = source && typeof source.title === 'string' && source.title.trim().length > 0;
    const hasUrl = source && typeof source.url === 'string' && source.url.trim().length > 0;
    if (!hasCitation && !hasTitle && !hasUrl) {
      errors.push('Every source must have a citation, title, or URL.');
      break;
    }
  }

  if (trimmedBody.length > 0 && trimmedBody.length < 100) {
    warnings.push('Body is very short; consider expanding the discussion.');
  }

  if (sourceArray.length === 1) {
    warnings.push('Only one source cited; additional citations strengthen the edit.');
  } else if (sourceArray.length === 0) {
    warnings.push('No sources cited.');
  }

  const hasQualitySource = countQualityMatches(sourceArray) > 0;
  if (!hasQualitySource) {
    warnings.push(
      'No authoritative source markers detected (DOI, academic press, canonical edition, etc.).'
    );
  }

  if (!hasRequiredSections(trimmedBody)) {
    warnings.push(
      'No clear section structure detected; consider using headings or labeled paragraphs.'
    );
  }

  const hasDoiOrUrl = sourceArray.some(
    (s) =>
      (s && typeof s.url === 'string' && s.url.trim().length > 0) ||
      (typeof s === 'string' && /https?:\/\//.test(s)) ||
      (s && typeof s.citation === 'string' && /doi|https?:\/\//i.test(s.citation))
  );
  if (!hasDoiOrUrl) {
    warnings.push('No source URL or DOI provided; verifiable links help reviewers.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = {
  MIN_SCORE,
  scoreEdit,
  validateEdit,
  buildQualityReason,
};
