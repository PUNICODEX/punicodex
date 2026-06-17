/**
 * Ask the Oracle — conversational RAG-style Q&A over the PUNYCODEX knowledge base.
 *
 * Phase 2: Full-knowledge retrieval using FTS5, semantic vectors, lore,
 * breakdowns, variants, original scripts, availability, and live sites.
 * Optional LLM generation when ORACLE_LLM_API_KEY + ORACLE_LLM_MODEL are set.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { searchKeywords } = require('./keyword-extractor');
const { getEntryContext } = require('./oracle-context');
const { embedText } = require('./embeddings');

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
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
  'shall',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'he',
  'she',
  'we',
  'they',
  'you',
  'i',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'our',
  'their',
  'his',
  'am',
  'so',
  'if',
  'out',
  'up',
  'down',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'now',
  'also',
  'get',
  'got',
  'go',
  'going',
  'came',
  'come',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'among',
  'until',
  'while',
  'because',
  'against',
  'off',
  'on',
  'onto',
  'upon',
  'within',
  'without',
  'per',
  'via',
  'like',
  'regarding',
  'concerning',
  'including',
  'of',
  'in',
  'to',
  'for',
  'with',
  'by',
  'from',
  'at',
  'as',
  'on',
  'what',
  'who',
  'which',
  'whom',
  'whose',
]);

function _tokenize(q) {
  return String(q)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function normalizeQuery(q) {
  return String(q)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detect intent with NER-assisted regex.
 */
function detectIntent(q) {
  const lower = normalizeQuery(q);

  if (/\b(who|whom)\b/.test(lower)) return 'who';
  if (/\b(what does|meaning of|mean)\b/.test(lower)) return 'meaning';
  if (/\b(how (is|was|do|does)|related to|connection between|compare)\b/.test(lower))
    return 'relation';
  if (/\b(etymology|origin|root|comes from|derived from|cognates?)\b/.test(lower))
    return 'etymology';
  if (/\b(pronunciation|pronounce|how do you say|how is .* pronounced)\b/.test(lower))
    return 'pronunciation';
  if (/\b(myth|mythology|story|legend|tale|epic|saga)\b/.test(lower)) return 'mythology';
  if (/\b(symbol|icon|attribute|sacred animal|sacred bird|weapon|staff)\b/.test(lower))
    return 'symbols';
  if (/\b(variant|spelling|alternate|other form|different spelling)\b/.test(lower))
    return 'variants';
  if (/\b(original script|writing|glyph|hieroglyph|devanagari|cuneiform|rune)\b/.test(lower))
    return 'script';
  if (
    /\b(business(es)?|company|companies|tenant|lease|leasing|advertiser|shop|store)\b/.test(lower)
  )
    return 'tenant';
  if (/\b(where|buy|purchase|find|acquire|get this name)\b/.test(lower)) return 'commercial';
  if (/\b(claim|buy this domain|how much|price|cost|pricing)\b/.test(lower)) return 'acquisition';
  if (/\b(tell me more|more about|explain|describe|overview)\b/.test(lower)) return 'explore';

  return 'general';
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return null;
  }
}

function etymologySummary(etymology) {
  const parsed = safeJsonParse(etymology);
  if (!parsed) return etymology;
  const parts = [];
  if (parsed.protoForm && parsed.protoLanguage) {
    parts.push(`From Proto-${parsed.protoLanguage} *${parsed.protoForm}*`);
    if (parsed.protoGloss) parts.push(`(“${parsed.protoGloss}”)`);
  }
  if (parsed.derivation) parts.push(parsed.derivation);
  if (parsed.cognates?.length) {
    const cognates = parsed.cognates
      .slice(0, 3)
      .map((c) => `${c.form} (${c.language})`)
      .join(', ');
    parts.push(`Cognates include ${cognates}.`);
  }
  return parts.join(' ');
}

function resolveAnaphora(q, history) {
  const lower = q.toLowerCase();
  const anaphoric = /\b(he|she|it|they|them|their|this|that|these|those|the name|this name)\b/.test(
    lower
  );
  if (!anaphoric) return q;

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === 'oracle' && turn.primaryId) {
      const database = getDb();
      const entry = database
        .prepare('SELECT unicode, ascii FROM entries WHERE id = ?')
        .get(turn.primaryId);
      if (entry) {
        const name = entry.unicode || entry.ascii;
        return lower
          .replace(/\b(he|she|it|they|them)\b/gi, name)
          .replace(/\b(this|that|these|those)\b/gi, name)
          .replace(/\b(the name|this name)\b/gi, name);
      }
    }
  }
  return q;
}

function _extractNamedEntities(q) {
  const database = getDb();
  const normalized = normalizeQuery(q);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  // Direct matches on unicode / ascii / id
  const direct = database
    .prepare(
      `
      SELECT id, unicode, ascii FROM entries
      WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
      `
    )
    .all(normalized, normalized, normalized);

  if (direct.length) return direct;

  // Token prefix / substring matches across unicode, ascii, id, meaning, domain
  if (tokens.length) {
    const conditions = tokens
      .map(() => 'LOWER(unicode) LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(id) LIKE ?')
      .join(' OR ');
    const params = [];
    for (const t of tokens) {
      const like = `%${t}%`;
      params.push(like, like, like);
    }
    const fuzzy = database
      .prepare(`SELECT id, unicode, ascii FROM entries WHERE ${conditions} LIMIT 5`)
      .all(...params);
    if (fuzzy.length) return fuzzy;
  }

  return [];
}

function retrieveEntriesFTS(q, limit = 10) {
  const database = getDb();
  const normalized = normalizeQuery(q);

  // Exact match
  const exact = database
    .prepare(
      `
      SELECT e.* FROM entries e
      WHERE LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ?
      LIMIT ?
    `
    )
    .all(normalized, normalized, normalized, limit);

  if (exact.length) return exact;

  // FTS5 prefix search
  const ftsQuery = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}*`)
    .join(' ');

  if (!ftsQuery) return [];

  return database
    .prepare(
      `
      SELECT e.* FROM entries e
      JOIN entries_fts fts ON e.rowid = fts.rowid
      WHERE entries_fts MATCH ?
      ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC, e.confidence_score DESC, e.has_flagship DESC
      LIMIT ?
    `
    )
    .all(ftsQuery, limit);
}

async function retrieveEntriesSemantic(q, limit = 10) {
  try {
    const database = getDb();
    const queryVec = await embedText(q);
    if (!queryVec) return [];

    const rows = database
      .prepare(
        `
        SELECT s.id as site_id, s.lexicon_entry_id, s.domain, e.embedding
        FROM indexed_sites s
        JOIN embeddings e ON s.id = e.site_id
        WHERE s.status = 'active' AND s.lexicon_entry_id IS NOT NULL
      `
      )
      .all();

    const scored = rows
      .map((row) => {
        const vec = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, 384);
        let dot = 0;
        for (let i = 0; i < 384; i++) dot += queryVec[i] * vec[i];
        return { entryId: row.lexicon_entry_id, score: dot };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2);

    const seen = new Set();
    const entries = [];
    for (const item of scored) {
      if (seen.has(item.entryId)) continue;
      seen.add(item.entryId);
      const entry = database.prepare('SELECT * FROM entries WHERE id = ?').get(item.entryId);
      if (entry) entries.push(entry);
      if (entries.length >= limit) break;
    }
    return entries;
  } catch (_e) {
    return [];
  }
}

async function retrieveEntries(q, limit = 5) {
  const fts = retrieveEntriesFTS(q, limit);
  const semantic = await retrieveEntriesSemantic(q, limit);

  const seen = new Set(fts.map((e) => e.id));
  const combined = [...fts];
  for (const e of semantic) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      combined.push(e);
    }
  }

  // Re-rank: exact > fts > semantic
  const normalized = normalizeQuery(q);
  combined.sort((a, b) => {
    const aNormAscii = normalizeQuery(a.ascii);
    const aNormUnicode = normalizeQuery(a.unicode);
    const bNormAscii = normalizeQuery(b.ascii);
    const bNormUnicode = normalizeQuery(b.unicode);

    const aExact =
      normalized === aNormAscii ||
      normalized === aNormUnicode ||
      normalized === a.id ||
      normalized.includes(aNormAscii) ||
      normalized.includes(aNormUnicode) ||
      normalized.includes(a.id);
    const bExact =
      normalized === bNormAscii ||
      normalized === bNormUnicode ||
      normalized === b.id ||
      normalized.includes(bNormAscii) ||
      normalized.includes(bNormUnicode) ||
      normalized.includes(b.id);

    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    const aTier = a.tier === 'dual' ? 3 : a.tier === '1' ? 2 : 1;
    const bTier = b.tier === 'dual' ? 3 : b.tier === '1' ? 2 : 1;
    if (aTier !== bTier) return bTier - aTier;

    return (b.confidence_score || 0) - (a.confidence_score || 0);
  });

  return combined.slice(0, limit);
}

function retrieveSitesFTS(q, limit = 5) {
  const database = getDb();
  const normalized = normalizeQuery(q);

  const ftsQuery = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}*`)
    .join(' ');

  if (ftsQuery) {
    const rows = database
      .prepare(
        `
        SELECT s.*, e.unicode as entry_unicode
        FROM indexed_sites s
        LEFT JOIN entries e ON s.lexicon_entry_id = e.id
        JOIN indexed_sites_fts fts ON s.id = fts.rowid
        WHERE s.status = 'active' AND indexed_sites_fts MATCH ?
        ORDER BY s.is_flagship DESC, s.quality_score DESC, s.authority_score DESC
        LIMIT ?
      `
      )
      .all(ftsQuery, limit);
    if (rows.length) return rows;
  }

  // Fallback: LIKE search over titles/descriptions
  return database
    .prepare(
      `
      SELECT s.*, e.unicode as entry_unicode
      FROM indexed_sites s
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE s.status = 'active'
        AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ? OR s.h1 LIKE ?
             OR s.tenant_name LIKE ? OR s.tenant_category LIKE ? OR e.unicode LIKE ? OR e.ascii LIKE ?)
      ORDER BY s.is_flagship DESC, s.quality_score DESC, s.authority_score DESC
      LIMIT ?
    `
    )
    .all(
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      limit
    );
}

async function retrieveSites(q, limit = 5) {
  const fts = retrieveSitesFTS(q, limit);
  if (fts.length) return fts;

  const keywords = searchKeywords(q, limit);
  const seen = new Set(fts.map((r) => r.id));
  for (const k of keywords) {
    if (!seen.has(k.id)) {
      seen.add(k.id);
      fts.push(k);
      if (fts.length >= limit) break;
    }
  }
  return fts;
}

function retrieveRelated(entry, limit = 3) {
  if (!entry) return [];
  const database = getDb();
  return database
    .prepare(
      `
      SELECT e.id, e.unicode, e.ascii, e.meaning, e.pantheon, COUNT(*) as co_count
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.site_id = em2.site_id
      JOIN entries e ON em2.entry_id = e.id
      WHERE em1.entry_id = ? AND em2.entry_id != ?
      GROUP BY e.id
      ORDER BY co_count DESC
      LIMIT ?
    `
    )
    .all(entry.id, entry.id, limit);
}

function _formatLore(lore) {
  if (!lore) return null;
  const parts = [];
  if (lore.overview) parts.push(lore.overview);
  if (lore.pronunciation?.ipa) parts.push(`Pronounced ${lore.pronunciation.ipa}.`);
  if (lore.mythology) parts.push(lore.mythology);
  if (lore.archaeology) parts.push(lore.archaeology);
  if (lore.culturalLegacy) parts.push(lore.culturalLegacy);
  return parts.join(' ');
}

function _formatBreakdown(breakdown) {
  if (!breakdown?.length) return null;
  return breakdown
    .map((b) => `${b.char || ''} → ${b.to_char || b.to || ''} (${b.type || 'char'})`)
    .join('; ');
}

function formatVariants(variants) {
  if (!variants?.length) return null;
  return variants
    .filter((v) => ['owned', 'ideal', 'macron-only', 'ascii'].includes(v.type) || v.sources?.length)
    .map((v) => `${v.unicode || v.text} (${v.type})`)
    .join(', ');
}

function generateFollowUps(intent, primary, related = [], sites = []) {
  const followUps = [];
  if (!primary) {
    followUps.push('Who is the most important Greek deity?');
    followUps.push('What realms are in the Norse pantheon?');
    followUps.push('Which names are available to lease?');
    return followUps;
  }

  const name = primary.unicode || primary.ascii;

  if (intent === 'who' || intent === 'general' || intent === 'explore') {
    followUps.push(`What does ${name} mean?`);
    followUps.push(`What is the etymology of ${name}?`);
  }
  if (intent === 'meaning' || intent === 'etymology') {
    followUps.push(`Who is ${name}?`);
    followUps.push(`Which businesses are on ${name}?`);
  }
  if (intent === 'tenant' || intent === 'commercial') {
    followUps.push(`Who is ${name}?`);
    followUps.push(`How do I lease ${name}?`);
  }
  if (intent === 'relation' || intent === 'general') {
    if (related.length) {
      followUps.push(`How is ${name} related to ${related[0].unicode || related[0].ascii}?`);
    }
  }
  if (sites.length && !followUps.some((f) => f.includes('business'))) {
    followUps.push(`Which businesses are on ${name}?`);
  }
  if (!followUps.some((f) => f.includes('lease')) && (primary.has_flagship || primary.tier)) {
    followUps.push(`How do I lease ${name}?`);
  }

  return followUps.slice(0, 3);
}

function buildCitations(entries, sites) {
  const citations = [];
  for (const e of entries.slice(0, 3)) {
    citations.push({
      type: 'entry',
      label: e.unicode || e.ascii,
      url: `/sites/${e.id}/`,
      snippet: e.meaning,
    });
  }
  for (const s of sites.slice(0, 3)) {
    citations.push({
      type: 'site',
      label: s.tenant_name || s.title || s.domain,
      url: `https://${s.punycode}`,
      snippet: s.description || s.content_snippet,
    });
  }
  return citations;
}

function synthesizeAnswer(q, entries, sites, related, intent, history = []) {
  const primary = entries[0];
  const context = {
    query: q,
    intent,
    entry: primary,
    entries: entries.slice(0, 3),
    sites: sites.slice(0, 3),
    related: related.slice(0, 3),
  };

  let answer = '';
  const citations = buildCitations(entries, sites);

  const isFollowUp = history.length > 0 && history.some((h) => h.role === 'user');
  const followIntro = isFollowUp && primary ? `Following up on **${primary.unicode}** — ` : '';

  if (!primary) {
    if (sites.length) {
      answer = `${followIntro}We found these indexed sites related to “${q}”: ${sites
        .map((s) => `**${s.tenant_name || s.title || s.domain}**`)
        .join(', ')}.`;
    } else {
      answer = `I don’t have enough data in the PUNYCODEX knowledge base to answer “${q}” confidently. Try a deity, realm, or mythological concept.`;
    }

    return {
      answer,
      citations,
      context,
      followUps: generateFollowUps('general', null),
      primaryId: null,
    };
  }

  const ctx = getEntryContext(primary.id);
  const name = primary.unicode || primary.ascii;
  const tierLabel =
    primary.tier === 'dual' ? 'Dual-Tier' : primary.tier === '1' ? 'Tier-1' : 'Tier-2';

  switch (intent) {
    case 'who':
      answer = `${followIntro}**${name}** is a **${tierLabel}** Unicode restoration from the **${primary.pantheon}** pantheon.`;
      if (ctx?.meaning) answer += ` The name means “${ctx.meaning}.”`;
      if (ctx?.lore?.overview) answer += ` ${ctx.lore.overview}`;
      if (ctx?.domain) answer += ` It is associated with ${ctx.domain}.`;
      break;

    case 'meaning':
      answer = `${followIntro}**${name}** means “${ctx?.meaning || 'unknown'}.”`;
      if (ctx?.etymology) {
        answer += ` ${etymologySummary(ctx.etymology)}`;
      }
      if (ctx?.domain) answer += ` The name is associated with ${ctx.domain}.`;
      break;

    case 'etymology':
      answer = `${followIntro}The etymology of **${name}**: ${
        etymologySummary(ctx?.etymology) || 'We do not yet have a detailed etymology on file.'
      }`;
      break;

    case 'pronunciation':
      answer = `${followIntro}**${name}**${
        ctx?.lore?.pronunciation?.ipa
          ? ` is pronounced **${ctx.lore.pronunciation.ipa}**.`
          : ' has no recorded pronunciation guide yet.'
      }`;
      if (ctx?.lore?.pronunciation?.guide) answer += ` ${ctx.lore.pronunciation.guide}`;
      break;

    case 'mythology':
      answer = `${followIntro}**${name}**${
        ctx?.lore?.mythology
          ? `: ${ctx.lore.mythology}`
          : ' has no detailed mythology entry in the catalog yet.'
      }`;
      break;

    case 'symbols':
      answer = `${followIntro}**${name}**${
        ctx?.lore?.symbols
          ? ` is associated with ${ctx.lore.symbols}.`
          : ' has no recorded symbols or attributes yet.'
      }`;
      break;

    case 'variants':
      answer = `${followIntro}**${name}** has the following attested Unicode forms: ${
        formatVariants(ctx?.variants) || 'no variants recorded.'
      }`;
      break;

    case 'script':
      answer = `${followIntro}**${name}**${
        ctx?.originalScript
          ? ` is written in the original script as **${ctx.originalScript}**.`
          : ' has no original-script record yet.'
      }`;
      break;

    case 'tenant':
    case 'commercial':
      if (sites.length) {
        const names = sites.map((s) => s.tenant_name || s.title || s.domain).join(', ');
        answer = `${followIntro}The following businesses are connected to **${name}**: **${names}**.`;
      } else if (ctx?.availability?.status === 'available') {
        answer = `${followIntro}**${name}** is available for registration. You can claim it through a registrar or lease ad space on its temple page.`;
      } else {
        answer = `${followIntro}**${name}** has no tenant currently leasing this name. You could claim it.`;
      }
      break;

    case 'acquisition':
      answer = `${followIntro}**${name}** is a PUNYCODEX entry. You can lease ad space on its temple page or claim the Unicode domain through our platform. Use the “Lease this Space” buttons on the temple page or contact us to discuss domain acquisition.`;
      break;

    case 'relation':
      if (related.length) {
        const relatedList = related.map((r) => `**${r.unicode || r.ascii}**`).join(', ');
        answer = `${followIntro}**${name}** is often mentioned alongside ${relatedList} across the indexed Unicode web.`;
      } else {
        answer = `${followIntro}**${name}** does not yet have enough semantic connections in our index. As we crawl more sites, related entities will appear here.`;
      }
      break;

    default:
      answer = `${followIntro}Here is what PUNYCODEX knows about **${name}**: ${
        ctx?.meaning ? `it means “${ctx.meaning}.”` : ''
      } ${ctx?.domain ? `It is associated with ${ctx.domain}.` : ''} ${
        ctx?.lore?.overview ? ctx.lore.overview : ''
      }`.trim();
      if (!answer.replace(/[* ]/g, '')) {
        answer = `${followIntro}**${name}** is a **${tierLabel}** entry in the **${primary.pantheon}** pantheon.`;
      }
  }

  const followUps = generateFollowUps(intent, primary, related, sites);

  return { answer, citations, context, followUps, primaryId: primary.id };
}

async function callLlmIfConfigured(prompt) {
  const apiKey = process.env.ORACLE_LLM_API_KEY;
  const model = process.env.ORACLE_LLM_MODEL;
  if (!apiKey || !model) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are the PUNYCODEX Oracle, a scholarly assistant for Unicode domain names and mythological entities. Answer using ONLY the provided context. Cite sources inline with [entry:id] or [site:domain]. Keep answers concise.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (_e) {
    return null;
  }
}

function buildLlmPrompt(q, contexts, intent) {
  const _primary = contexts[0];
  const promptParts = [`User question: ${q}`, `Intent: ${intent}`, '', 'Context:'];

  for (const ctx of contexts.slice(0, 3)) {
    promptParts.push(
      `- ${ctx.unicode || ctx.ascii} (${ctx.pantheon}, ${ctx.tierLabel || ctx.tier})`
    );
    if (ctx.meaning) promptParts.push(`  Meaning: ${ctx.meaning}`);
    if (ctx.lore?.overview) promptParts.push(`  Overview: ${ctx.lore.overview}`);
    if (ctx.etymology) promptParts.push(`  Etymology: ${etymologySummary(ctx.etymology)}`);
    if (ctx.site) promptParts.push(`  Live site: ${ctx.site.domain} — ${ctx.site.title}`);
    if (ctx.availability?.status === 'available')
      promptParts.push(`  Status: available for registration`);
  }

  promptParts.push('', 'Answer the question using only the context above. Cite sources inline.');
  return promptParts.join('\n');
}

async function askOracle(q, history = []) {
  if (!q?.trim()) {
    return {
      answer: 'Ask me about a deity, realm, symbol, or business on PUNYCODEX.',
      citations: [],
      context: {},
      followUps: generateFollowUps('general', null),
      primaryId: null,
    };
  }

  const resolvedQ = resolveAnaphora(q, history);
  const intent = detectIntent(resolvedQ);
  let entries = await retrieveEntries(resolvedQ);

  if (!entries.length && resolvedQ !== q && history.length) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role === 'oracle' && turn.primaryId) {
        const database = getDb();
        const fallback = database.prepare('SELECT * FROM entries WHERE id = ?').get(turn.primaryId);
        if (fallback) {
          entries = [fallback];
          break;
        }
      }
    }
  }

  const primary = entries[0];
  const sites = await retrieveSites(resolvedQ);
  const related = primary ? retrieveRelated(primary) : [];

  const result = synthesizeAnswer(resolvedQ, entries, sites, related, intent, history);

  // Optional LLM polish with grounded prompt
  const contexts = entries
    .slice(0, 3)
    .map((e) => getEntryContext(e.id))
    .filter(Boolean);
  if (contexts.length && process.env.ORACLE_LLM_API_KEY) {
    const prompt = buildLlmPrompt(resolvedQ, contexts, intent);
    const llmAnswer = await callLlmIfConfigured(prompt);
    if (llmAnswer) {
      result.answer = llmAnswer;
    }
  }

  return result;
}

module.exports = {
  askOracle,
  detectIntent,
  retrieveEntries,
  retrieveSites,
  retrieveRelated,
  etymologySummary,
};
