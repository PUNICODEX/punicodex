/**
 * Ask the Oracle — conversational RAG-style Q&A over the PUNYCODEX knowledge base.
 *
 * Phase 2.1: multi-turn chat, follow-up suggestions, and history-aware retrieval.
 * If an LLM API key is configured via ORACLE_LLM_API_KEY and ORACLE_LLM_MODEL,
 * the pipeline can optionally call it in a future phase. For now we generate
 * grounded answers deterministically from retrieved context.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { searchKeywords } = require('./keyword-extractor');

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','can','shall','this','that','these','those','it','its','he','she',
  'we','they','you','i','me','him','her','us','them','my','your','our','their',
  'his','am','so','if','out','up','down','over','under','again','further','then',
  'once','here','there','when','where','why','how','all','each','every','both',
  'few','more','most','other','some','such','no','nor','not','only','own','same',
  'than','too','very','just','now','also','get','got','go','going','came','come',
  'about','into','through','during','before','after','above','below','between',
  'among','until','while','because','against','off','on','onto','upon','within',
  'without','per','via','like','regarding','concerning','including','of','in',
  'to','for','with','by','from','at','as','on','what','who','which','whom','whose'
]);

function tokenize(q) {
  return String(q)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function detectIntent(q) {
  const lower = q.toLowerCase();
  if (/\b(who|whom)\b/.test(lower)) return 'who';
  if (/\b(what does|meaning of|mean)\b/.test(lower)) return 'meaning';
  if (/\b(where|buy|purchase|shop|find)\b/.test(lower)) return 'commercial';
  if (/\b(business|company|tenant|lease|advertiser)\b/.test(lower)) return 'tenant';
  if (/\b(how is|related to|connection between|compare)\b/.test(lower)) return 'relation';
  if (/\b(etymology|origin|root|comes from)\b/.test(lower)) return 'etymology';
  if (/\b(tell me more|more about|explain|describe)\b/.test(lower)) return 'explore';
  if (/\b(claim|get this name|buy this domain|how much|price|cost)\b/.test(lower)) return 'acquisition';
  return 'general';
}

function safeJsonParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (e) { return null; }
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
  if (parsed.cognates && parsed.cognates.length) {
    const cognates = parsed.cognates.slice(0, 3).map(c => `${c.form} (${c.language})`).join(', ');
    parts.push(`Cognates include ${cognates}.`);
  }
  return parts.join(' ');
}

function resolveAnaphora(q, history) {
  const lower = q.toLowerCase();
  const anaphoric = /\b(he|she|it|they|them|their|this|that|these|those|the name|this name)\b/.test(lower);
  if (!anaphoric) return q;

  // Find the most recent oracle turn that had a primary entry.
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === 'oracle' && turn.primaryId) {
      const database = getDb();
      const entry = database.prepare('SELECT unicode, ascii FROM entries WHERE id = ?').get(turn.primaryId);
      if (entry) {
        const name = entry.unicode || entry.ascii;
        // Replace common anaphoric phrases with the entity name
        return lower
          .replace(/\b(he|she|it|they|them)\b/gi, name)
          .replace(/\b(this|that|these|those)\b/gi, name)
          .replace(/\b(the name|this name)\b/gi, name);
      }
    }
  }
  return q;
}

function retrieveEntries(q, limit = 3) {
  const database = getDb();
  const words = tokenize(q);
  const query = q.toLowerCase().trim();
  const seen = new Set();
  const rows = [];

  // Exact / prefix match
  const exact = database.prepare(`
    SELECT * FROM entries
    WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
    LIMIT ?
  `).all(query, query, query, limit);
  for (const row of exact) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      rows.push(row);
    }
  }

  // Token-based match across key fields
  if (rows.length < limit && words.length) {
    const conditions = words.map(() => `(LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR LOWER(id) LIKE ? OR LOWER(meaning) LIKE ? OR LOWER(domain) LIKE ?)`).join(' OR ');
    const params = [];
    for (const w of words) {
      const like = `%${w}%`;
      params.push(like, like, like, like, like);
    }
    const fuzzy = database.prepare(`
      SELECT * FROM entries
      WHERE ${conditions}
      ORDER BY tier = 'dual' DESC, tier = '1' DESC, confidence_score DESC, has_flagship DESC
      LIMIT ?
    `).all(...params, limit);
    for (const row of fuzzy) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
        if (rows.length >= limit) break;
      }
    }
  }

  return rows;
}

function retrieveSites(q, limit = 3) {
  const database = getDb();
  const query = q.toLowerCase().trim();

  const rows = database.prepare(`
    SELECT s.*, e.unicode as entry_unicode
    FROM indexed_sites s
    LEFT JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE s.status = 'active'
      AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ? OR s.h1 LIKE ?
           OR s.tenant_name LIKE ? OR s.tenant_category LIKE ? OR e.unicode LIKE ? OR e.ascii LIKE ?)
    ORDER BY s.is_flagship DESC, s.quality_score DESC, s.authority_score DESC
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit);

  if (rows.length < limit) {
    const keywords = searchKeywords(q, limit);
    const seen = new Set(rows.map(r => r.id));
    for (const k of keywords) {
      if (!seen.has(k.id)) {
        seen.add(k.id);
        rows.push(k);
        if (rows.length >= limit) break;
      }
    }
  }

  return rows;
}

function retrieveRelated(entry, limit = 3) {
  if (!entry) return [];
  const database = getDb();
  return database.prepare(`
    SELECT e.id, e.unicode, e.ascii, e.meaning, e.pantheon, COUNT(*) as co_count
    FROM entity_mentions em1
    JOIN entity_mentions em2 ON em1.site_id = em2.site_id
    JOIN entries e ON em2.entry_id = e.id
    WHERE em1.entry_id = ? AND em2.entry_id != ?
    GROUP BY e.id
    ORDER BY co_count DESC
    LIMIT ?
  `).all(entry.id, entry.id, limit);
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
  if (sites.length && !followUps.some(f => f.includes('business'))) {
    followUps.push(`Which businesses are on ${name}?`);
  }
  if (!followUps.some(f => f.includes('lease')) && (primary.has_flagship || primary.tier)) {
    followUps.push(`How do I lease ${name}?`);
  }

  return followUps.slice(0, 3);
}

function synthesizeAnswer(q, entries, sites, related, intent, history = []) {
  const primary = entries[0];
  const context = {
    query: q,
    intent,
    entry: primary,
    entries: entries.slice(0, 3),
    sites: sites.slice(0, 3),
    related: related.slice(0, 3)
  };

  let answer = '';
  const citations = [];

  // Build citations first.
  for (const e of entries.slice(0, 3)) {
    citations.push({
      type: 'entry',
      label: e.unicode || e.ascii,
      url: `/sites/${e.id}/`,
      snippet: e.meaning
    });
  }
  for (const s of sites.slice(0, 3)) {
    citations.push({
      type: 'site',
      label: s.tenant_name || s.title || s.domain,
      url: `https://${s.punycode}`,
      snippet: s.description || s.content_snippet
    });
  }

  const isFollowUp = history.length > 0 && history.some(h => h.role === 'user');
  const followIntro = isFollowUp && primary ? `Following up on **${primary.unicode}** — ` : '';

  if (intent === 'who' && primary) {
    answer = `${followIntro}**${primary.unicode}** is a ${primary.tier === 'dual' ? 'Dual-Tier' : `Tier ${primary.tier}`} Unicode name from the **${primary.pantheon}** pantheon. ${primary.meaning ? `It means “${primary.meaning}.”` : ''} ${primary.domain ? `The domain or sphere associated with ${primary.unicode} is ${primary.domain}.` : ''}`;
  } else if (intent === 'meaning' && primary) {
    answer = `${followIntro}**${primary.unicode}** means “${primary.meaning || 'unknown'}.” ${primary.domain ? `It is associated with ${primary.domain}.` : ''}`;
  } else if (intent === 'etymology' && primary) {
    const ety = etymologySummary(primary.etymology);
    answer = `${followIntro}The etymology of **${primary.unicode}**: ${ety || 'We do not yet have a detailed etymology on file.'}`;
  } else if (intent === 'tenant' || intent === 'commercial') {
    if (sites.length) {
      const names = sites.map(s => s.tenant_name || s.title || s.domain).join(', ');
      answer = `${followIntro}On PUNYCODEX, the following businesses are connected to your query: **${names}**.`;
      if (primary) {
        answer += ` The entry **${primary.unicode}** (${primary.meaning || primary.domain || primary.pantheon}) provides the mythological context for these results.`;
      }
    } else if (primary) {
      answer = `${followIntro}**${primary.unicode}** is the PUNYCODEX entry for your query, but no tenant is currently leasing this name. You could claim it.`;
    } else {
      answer = `We don’t have a matching business or entry for “${q}” yet. Try a mythological name or realm.`;
    }
  } else if (intent === 'relation' && primary) {
    if (related.length) {
      const relatedList = related.map(r => `**${r.unicode}**`).join(', ');
      answer = `${followIntro}**${primary.unicode}** is often mentioned alongside ${relatedList} across the indexed Unicode web.`;
    } else {
      answer = `${followIntro}**${primary.unicode}** does not yet have enough semantic connections in our index. As we crawl more sites, related entities will appear here.`;
    }
  } else if (intent === 'acquisition' && primary) {
    answer = `${followIntro}**${primary.unicode}** is a PUNYCODEX entry. You can lease ad space on its temple page or claim the Unicode domain through our platform. Use the “Lease this Space” buttons on the temple page or contact us to discuss domain acquisition.`;
  } else {
    // general / explore
    if (primary) {
      answer = `${followIntro}Here is what PUNYCODEX knows about **${primary.unicode}**: ${primary.meaning ? `it means “${primary.meaning}.”` : ''} ${primary.domain ? `It is associated with ${primary.domain}.` : ''} ${primary.pantheon ? `It belongs to the ${primary.pantheon} pantheon.` : ''}`;
    } else if (sites.length) {
      answer = `${followIntro}We found these indexed sites related to “${q}”: ${sites.map(s => `**${s.tenant_name || s.title || s.domain}**`).join(', ')}.`;
    } else {
      answer = `I don’t have enough data in the PUNYCODEX knowledge base to answer “${q}” confidently. Try a deity, realm, or mythological concept.`;
    }
  }

  const followUps = generateFollowUps(intent, primary, related, sites);

  return { answer, citations, context, followUps, primaryId: primary ? primary.id : null };
}

function askOracle(q, history = []) {
  if (!q || !q.trim()) {
    return {
      answer: 'Ask me about a deity, realm, symbol, or business on PUNYCODEX.',
      citations: [],
      context: {},
      followUps: generateFollowUps('general', null),
      primaryId: null
    };
  }

  const resolvedQ = resolveAnaphora(q, history);
  const intent = detectIntent(resolvedQ);
  let entries = retrieveEntries(resolvedQ);

  // If current query is anaphoric and returned nothing, fall back to the last primary entity.
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
  const sites = retrieveSites(resolvedQ);
  const related = primary ? retrieveRelated(primary) : [];

  return synthesizeAnswer(resolvedQ, entries, sites, related, intent, history);
}

module.exports = { askOracle, detectIntent, retrieveEntries, retrieveSites };
