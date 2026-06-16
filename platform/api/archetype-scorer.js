/**
 * Archetype Scorer — measures how well a tenant's content aligns with the
 * mythological archetype of its PUNYCODEX domain name.
 *
 * Signals:
 *   - Semantic overlap between site corpus and entry meaning/etymology.
 *   - Keyword intersection on meaning, etymology, and pantheon archetype terms.
 *   - Tenant category match against the entry's expected business domains.
 *
 * Outputs:
 *   - archetype_score: 0.0–1.0 overall alignment.
 *   - archetype_signals: structured evidence for transparency.
 */

const { embedText, embedSite, cosineSimilarity } = require('./embeddings');

// Pantheon-specific archetype keyword taxonomies.
const ARCHETYPE_TAXONOMY = {
  greek: {
    zeus: ['sky', 'lightning', 'king', 'authority', 'law', 'order', 'power', 'sovereign'],
    hera: ['marriage', 'queen', 'family', 'women', 'royalty', 'peacock'],
    poseidon: ['sea', 'ocean', 'water', 'earthquake', 'horses', 'maritime', 'sailing'],
    hades: ['underworld', 'death', 'wealth', 'shadow', 'afterlife', 'soul'],
    athena: ['wisdom', 'war', 'strategy', 'craft', 'owl', 'knowledge', 'defense'],
    apollo: ['sun', 'music', 'prophecy', 'healing', 'art', 'archery', 'light'],
    artemis: ['hunt', 'moon', 'wilderness', 'animals', 'virginity', 'nature'],
    ares: ['war', 'battle', 'violence', 'courage', 'strength', 'conflict'],
    aphrodite: ['love', 'beauty', 'desire', 'pleasure', 'romance', 'dove'],
    hermes: ['messenger', 'commerce', 'travel', 'speed', 'thieves', 'communication', 'logistics'],
    dionysos: ['wine', 'ecstasy', 'theater', 'fertility', 'revelry', 'celebration'],
    demeter: ['harvest', 'grain', 'agriculture', 'fertility', 'earth', 'seasons'],
    hephaistos: ['fire', 'forge', 'craftsmen', 'volcano', 'engineering', 'metalwork'],
    hestia: ['hearth', 'home', 'family', 'fire', 'domestic', 'warmth'],
    persephone: ['spring', 'underworld', 'seasons', 'death', 'rebirth', 'flowers'],
    hekate: ['magic', 'witchcraft', 'crossroads', 'night', 'moon', 'ghosts', 'security'],
    nike: ['victory', 'win', 'success', 'athletics', 'competition'],
  },
  norse: {
    odinn: ['wisdom', 'war', 'poetry', 'death', 'rune', 'raven', 'knowledge'],
    thor: ['thunder', 'lightning', 'strength', 'protection', 'hammer', 'storm'],
    freyja: ['love', 'fertility', 'war', 'magic', 'cats', 'beauty'],
    freyr: ['fertility', 'sun', 'rain', 'prosperity', 'peace', 'harvest'],
    loki: ['trickster', 'mischief', 'fire', 'shape', 'chaos'],
    tyr: ['war', 'law', 'justice', 'honor', 'sacrifice'],
    baldr: ['light', 'beauty', 'purity', 'innocence'],
  },
  egyptian: {
    ra: ['sun', 'creation', 'light', 'king', 'falcon'],
    osiris: ['afterlife', 'death', 'resurrection', 'fertility', 'underworld'],
    isis: ['magic', 'motherhood', 'healing', 'wisdom', 'throne'],
    horus: ['sky', 'kingship', 'falcon', 'protection', 'war'],
    anubis: ['death', 'mummification', 'afterlife', 'jackal'],
    thoth: ['wisdom', 'writing', 'moon', 'magic', 'knowledge'],
    seth: ['chaos', 'storm', 'desert', 'violence'],
  },
  japanese: {
    amaterasu: ['sun', 'light', 'heaven', 'emperor', 'radiance'],
    susanoo: ['storm', 'sea', 'chaos', 'sword'],
    tsukuyomi: ['moon', 'night', 'time'],
    inari: ['rice', 'fertility', 'fox', 'agriculture', 'prosperity'],
  },
  sanskrit: {
    shiva: ['destruction', 'transformation', 'meditation', 'dance', 'ascetic'],
    vishnu: ['preservation', 'protection', 'order', 'lotus', 'sustainer'],
    brahma: ['creation', 'knowledge', 'vedas', 'creator'],
    ganesha: ['wisdom', 'remover', 'obstacles', 'beginnings', 'elephant'],
    kali: ['time', 'destruction', 'power', 'darkness', 'transformation'],
    krishna: ['love', 'divine', 'cowherd', 'flute', 'joy'],
    lakshmi: ['wealth', 'prosperity', 'fortune', 'lotus'],
    saraswati: ['knowledge', 'music', 'arts', 'wisdom', 'learning'],
  },
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'of',
  'to',
  'in',
  'for',
  'on',
  'with',
  'as',
  'by',
  'from',
  'at',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'they',
  'them',
  'their',
  'we',
  'us',
  'our',
  'you',
  'your',
  'i',
  'me',
  'my',
  'he',
  'him',
  'his',
  'she',
  'her',
  's',
  't',
]);

function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function tokenize(text) {
  if (!text) return [];
  return text
    .split(/\W+/)
    .map(normalizeWord)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function buildEntryCorpus(entry) {
  const parts = [
    entry.meaning || '',
    entry.etymology?.protoForm || '',
    entry.etymology?.protoGloss || '',
    entry.etymology?.derivation || '',
    Array.isArray(entry.sources) ? entry.sources.join(' ') : '',
  ];

  // Add pantheon-specific archetype terms for this entry if available.
  const pantheonTax = ARCHETYPE_TAXONOMY[entry.pantheon];
  if (pantheonTax) {
    const terms = pantheonTax[entry.id] || pantheonTax[entry.ascii] || [];
    parts.push(...terms);
  }

  return parts.filter(Boolean).join(' ');
}

function keywordOverlap(siteCorpus, entryCorpus) {
  const siteTokens = new Set(tokenize(siteCorpus));
  const entryTokens = tokenize(entryCorpus);
  if (entryTokens.length === 0) return { score: 0, matched: [] };

  const matched = [];
  for (const t of entryTokens) {
    if (siteTokens.has(t)) matched.push(t);
  }
  return {
    score: Math.min(1, matched.length / Math.max(3, entryTokens.length * 0.3)),
    matched,
  };
}

function categoryMatch(site, entry) {
  const category = (site.tenant_category || '').toLowerCase();
  const meaning = (entry.meaning || '').toLowerCase();

  const categoryConcepts = {
    technology: ['tech', 'software', 'ai', 'data', 'cloud', 'compute', 'digital'],
    telecommunications: ['comm', 'phone', 'network', 'wireless', 'signal', 'messenger'],
    logistics: ['ship', 'delivery', 'transport', 'cargo', 'courier', 'freight'],
    security: ['security', 'defense', 'protect', 'guard', 'safe'],
    finance: ['finance', 'wealth', 'money', 'invest', 'bank', 'fund'],
    health: ['health', 'heal', 'medical', 'wellness', 'care'],
    maritime: ['marine', 'ocean', 'sea', 'ship', 'nautical', 'sail'],
    agriculture: ['farm', 'agri', 'crop', 'harvest', 'food', 'grain'],
    arts: ['art', 'music', 'creative', 'design', 'media'],
    education: ['edu', 'learn', 'knowledge', 'wisdom', 'school'],
    hospitality: ['hotel', 'travel', 'tour', 'stay', 'host'],
    energy: ['energy', 'power', 'electric', 'solar', 'storm'],
  };

  let score = 0;
  for (const [concept, keywords] of Object.entries(categoryConcepts)) {
    if (category.includes(concept) || keywords.some((k) => meaning.includes(k))) {
      score = Math.max(score, 0.3);
    }
  }

  // Boost if category words appear in the entry meaning directly.
  const catTokens = tokenize(category);
  const meaningTokens = new Set(tokenize(meaning));
  const overlap = catTokens.filter((t) => meaningTokens.has(t)).length;
  if (catTokens.length > 0) {
    score = Math.max(score, (overlap / catTokens.length) * 0.7);
  }

  return Math.min(1, score);
}

async function scoreArchetype(site, entry) {
  const siteText = [
    site.title || '',
    site.description || '',
    site.h1 || '',
    site.first_p || '',
    site.og_description || '',
    site.twitter_description || '',
    site.meta_keywords || '',
    site.tenant_name || '',
    site.tenant_category || '',
  ]
    .filter(Boolean)
    .join(' ');

  const entryText = buildEntryCorpus(entry);

  // 1. Semantic similarity via embeddings.
  let semanticScore = 0;
  try {
    const [siteVec, entryVec] = await Promise.all([embedSite(site), embedText(entryText)]);
    if (siteVec && entryVec) {
      semanticScore = Math.max(0, cosineSimilarity(siteVec, entryVec));
    }
  } catch (err) {
    // Embeddings may fail during cold start; fall back to keyword-only.
    console.error('[archetype] Embedding similarity failed:', err.message);
  }

  // 2. Keyword overlap.
  const { score: keywordScore, matched } = keywordOverlap(siteText, entryText);

  // 3. Tenant category alignment.
  const catScore = categoryMatch(site, entry);

  // Combine: semantic is the strongest signal, keyword supports it, category
  // provides a business-ontology boost.
  const combined = semanticScore * 0.55 + keywordScore * 0.3 + catScore * 0.15;

  return {
    archetype_score: parseFloat(Math.min(1, combined).toFixed(4)),
    archetype_signals: JSON.stringify({
      semanticSimilarity: parseFloat(semanticScore.toFixed(4)),
      meaningOverlap: parseFloat(keywordScore.toFixed(4)),
      categoryMatch: parseFloat(catScore.toFixed(4)),
      matchedConcepts: matched.slice(0, 20),
      modelVersion: 'v1',
    }),
    archetype_version: 'v1',
  };
}

module.exports = { scoreArchetype, ARCHETYPE_TAXONOMY };
