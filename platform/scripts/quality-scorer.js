/**
 * Quality & Spam Scorer
 * Analyzes crawled site metadata and assigns spam_score (0-1) and quality_score (0-1).
 */

const { computeContentQuality } = require('./content-quality');

const SPAM_KEYWORDS = [
  'casino', 'poker', 'betting', 'gambling', 'lottery', 'jackpot',
  'viagra', 'cialis', 'pharmacy', 'pills', 'meds', 'drugs',
  'porn', 'xxx', 'adult', 'escort', 'sex', 'nude',
  'loan', 'payday', 'credit', 'debt', 'mortgage',
  'weight loss', 'diet pill', 'fat burner', 'muscle',
  'free money', 'earn $', 'make $', 'work from home', 'mlm',
  'click here', 'limited time', 'act now', 'urgent', 'congratulations you won'
];

const PARKED_PATTERNS = [
  /this domain is for sale/i,
  /domain parking/i,
  /sedo\.com/i,
  /dan\.com/i,
  /afternic\.com/i,
  /buy this domain/i,
  /parked free/i,
  /coming soon/i,
  /under construction/i
];

function scoreQuality(site) {
  const reasons = [];
  let spamScore = 0;
  let qualityScore = 0.5; // Start neutral

  const text = [
    site.title || '',
    site.description || '',
    site.h1 || '',
    site.first_p || '',
    site.content_snippet || ''
  ].join(' ').toLowerCase();

  // ====== SPAM SIGNALS ======

  // 1. Spam keywords
  let spamKeywordCount = 0;
  for (const kw of SPAM_KEYWORDS) {
    if (text.includes(kw)) spamKeywordCount++;
  }
  if (spamKeywordCount > 0) {
    spamScore += Math.min(spamKeywordCount * 0.15, 0.6);
    reasons.push(`spam keywords (${spamKeywordCount})`);
  }

  // 2. Parked domain patterns
  for (const pattern of PARKED_PATTERNS) {
    if (pattern.test(text)) {
      spamScore += 0.5;
      reasons.push('parked domain');
      break;
    }
  }

  // 3. Very short content
  if (site.word_count < 50) {
    spamScore += 0.3;
    reasons.push('very short content');
  }

  // 4. No meaningful title
  if (!site.title || site.title.length < 5 || site.title === site.domain) {
    spamScore += 0.2;
    reasons.push('no meaningful title');
  }

  // 5. Excessive external links (link farm)
  if (site.external_links > 100 && site.internal_links < 5) {
    spamScore += 0.25;
    reasons.push('link farm pattern');
  }

  // 6. Content ratio too low (heavy ads/scripts)
  if (site.content_ratio < 0.02) {
    spamScore += 0.15;
    reasons.push('low content ratio');
  }

  // 7. No description or H1
  if (!site.description && !site.h1) {
    spamScore += 0.2;
    reasons.push('no description or heading');
  }

  // ====== QUALITY SIGNALS ======

  // 1. Good word count
  if (site.word_count >= 500) {
    qualityScore += 0.2;
  } else if (site.word_count >= 200) {
    qualityScore += 0.1;
  } else if (site.word_count < 50) {
    qualityScore -= 0.2;
  }

  // 2. Has structured data (JSON-LD)
  if (site.json_ld) {
    qualityScore += 0.1;
  }

  // 3. Has Open Graph
  if (site.og_title && site.og_description) {
    qualityScore += 0.1;
  }

  // 4. Has favicon
  if (site.favicon_path) {
    qualityScore += 0.05;
  }

  // 5. Good heading structure
  if (site.h1_count === 1 && site.h2_count >= 2) {
    qualityScore += 0.1;
  }

  // 6. Internal links (real site structure)
  if (site.internal_links >= 5) {
    qualityScore += 0.05;
  }

  // 7. Fast response time
  if (site.response_time_ms && site.response_time_ms < 1000) {
    qualityScore += 0.05;
  }

  // 8. Has canonical URL
  if (site.canonical_url) {
    qualityScore += 0.05;
  }

  // Content quality metrics (Phase 3)
  const contentQuality = computeContentQuality(site);

  // Blend readability into quality score
  qualityScore = qualityScore * 0.7 + contentQuality.readability_score * 0.3;

  // Clamp scores
  spamScore = Math.min(Math.max(spamScore, 0), 1);
  qualityScore = Math.min(Math.max(qualityScore, 0), 1);

  // If high spam, cap quality
  if (spamScore > 0.5) {
    qualityScore = Math.min(qualityScore, 0.3);
  }

  return {
    spamScore: parseFloat(spamScore.toFixed(3)),
    qualityScore: parseFloat(qualityScore.toFixed(3)),
    reasons: reasons.length > 0 ? reasons : ['passed all checks'],
    contentQuality
  };
}

module.exports = { scoreQuality };
