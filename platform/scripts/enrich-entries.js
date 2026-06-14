/**
 * Enrich entries with AI-generated temple knowledge panels.
 *
 * Phase 2.2 uses deterministic, data-grounded generation so the feature works
 * without an external LLM. If ORACLE_LLM_API_KEY is configured in the future,
 * this script can delegate the narrative paragraphs to that model.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

function getDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  return db;
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function capitalize(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function pantheonDisplay(pantheon) {
  if (!pantheon) return 'mythological';
  const map = {
    greek: 'Greek',
    'greek-location': 'Greek',
    norse: 'Norse',
    egyptian: 'Egyptian',
    sanskrit: 'Sanskrit / Hindu',
    celtic: 'Celtic',
    mesopotamian: 'Mesopotamian',
    polynesian: 'Polynesian',
    japanese: 'Japanese',
    nahuatl: 'Nahuatl / Aztec',
    yoruba: 'Yoruba',
    slavic: 'Slavic',
    zoroastrian: 'Zoroastrian / Persian',
    incan: 'Incan',
    chinese: 'Chinese',
    buddhist: 'Buddhist',
    taoist: 'Taoist',
    korean: 'Korean',
    phoenician: 'Phoenician',
    hittite: 'Hittite',
  };
  return map[pantheon] || capitalize(pantheon);
}

function tierDisplay(tier, tierLabel) {
  if (tier === 'dual') return 'Dual-Tier';
  return tierLabel || `Tier ${tier}`;
}

function generatePronunciation(unicode, ascii) {
  const name = unicode || ascii;
  if (!name) return null;
  // Very light approximation: spell out ASCII fallback with emphasis on capitals.
  const phonetic = name.replace(
    /[āēīōūȳḗṓ]/g,
    (m) => ({ ā: 'ah', ē: 'ay', ī: 'ee', ō: 'oh', ū: 'oo', ȳ: 'y', ḗ: 'ay', ṓ: 'oh' })[m] || m
  );
  return `Approximate: “${phonetic}” (traditional ${name} pronunciation varies by scholar and dialect).`;
}

function inferSymbols(entry) {
  const symbols = [];
  const domain = (entry.domain || '').toLowerCase();
  const meaning = (entry.meaning || '').toLowerCase();
  const pantheon = (entry.pantheon || '').toLowerCase();
  const text = `${domain} ${meaning}`;

  if (text.includes('sky') || text.includes('thunder') || text.includes('lightning'))
    symbols.push('thunderbolt', 'eagle', 'sky');
  if (text.includes('sea') || text.includes('ocean') || text.includes('wave'))
    symbols.push('trident', 'waves', 'dolphin');
  if (text.includes('war') || text.includes('battle')) symbols.push('spear', 'helmet', 'shield');
  if (text.includes('love') || text.includes('beauty')) symbols.push('dove', 'rose', 'mirror');
  if (text.includes('wisdom') || text.includes('knowledge'))
    symbols.push('owl', 'olive branch', 'scroll');
  if (text.includes('underworld') || text.includes('death'))
    symbols.push('helm of darkness', 'cerberus', 'cypress');
  if (text.includes('hunt') || text.includes('wild')) symbols.push('bow', 'deer', 'crescent moon');
  if (text.includes('fire') || text.includes('forge')) symbols.push('hammer', 'anvil', 'flame');
  if (text.includes('home') || text.includes('hearth'))
    symbols.push('hearth flame', 'kettle', 'swallow');
  if (text.includes('messenger') || text.includes('travel'))
    symbols.push('caduceus', 'winged sandals', "traveler's hat");
  if (text.includes('harvest') || text.includes('grain') || text.includes('fertility'))
    symbols.push('sheaf of wheat', 'cornucopia', 'torch');
  if (text.includes('wine') || text.includes('ecstasy'))
    symbols.push('thyrsus', 'grapevine', 'leopard');
  if (text.includes('sun') || text.includes('light')) symbols.push('sun disk', 'chariot', 'laurel');
  if (text.includes('moon')) symbols.push('crescent moon', 'torch', 'deer');
  if (pantheon.includes('norse') && text.includes('world'))
    symbols.push('Yggdrasil', 'world tree', 'realm boundary');
  if (symbols.length === 0) {
    symbols.push(entry.unicode || entry.ascii, 'sacred name', 'Unicode restoration');
  }
  return symbols.slice(0, 5).join(', ');
}

function generateEtymologyNarrative(entry) {
  const ety = safeJsonParse(entry.etymology);
  if (!ety) {
    return `The deeper etymology of **${entry.unicode}** is still being researched. The meaning currently on file is “${entry.meaning || 'unknown'}.” As the PUNYCODEX corpus expands, a fuller narrative of its linguistic roots will appear here.`;
  }
  const parts = [];
  if (ety.protoForm && ety.protoLanguage) {
    parts.push(
      `The name **${entry.unicode}** reaches back to Proto-${capitalize(ety.protoLanguage)} *${ety.protoForm}*`
    );
    if (ety.protoGloss) parts.push(`meaning “${ety.protoGloss}”`);
  }
  if (ety.derivation) parts.push(ety.derivation);
  if (ety.cognates?.length) {
    const list = ety.cognates
      .slice(0, 3)
      .map((c) => `**${c.form}** in ${c.language}`)
      .join(', ');
    parts.push(`Its linguistic relatives include ${list}.`);
  }
  if (parts.length === 0) {
    return `The etymology of **${entry.unicode}** is recorded as: “${entry.meaning || 'unknown'}.”`;
  }
  return (
    parts.join(' ') +
    ' This lineage shows how a single ancient sound can travel across languages and millennia.'
  );
}

function generateRelevanceToday(entry) {
  const name = entry.unicode || entry.ascii;
  const pantheon = pantheonDisplay(entry.pantheon);
  const domain = entry.domain || 'its mythic sphere';
  const ascii = entry.ascii;
  const parts = [
    `Today, **${name}** survives as more than a ${pantheon} name. Its Unicode restoration makes it a recognizable digital identity for brands, creators, and communities drawn to ${domain}.`,
  ];
  if (entry.has_flagship) {
    parts.push(
      `The flagship **${ascii}.com** temple demonstrates that ancient names can become modern web destinations without losing their scholarly form.`
    );
  } else {
    parts.push(
      `The ASCII form **${ascii}** is the most common modern spelling, but the full Unicode form preserves both stress and length for readers who value philological accuracy.`
    );
  }
  parts.push(
    `As interest in mythic branding grows, ${name} is a candidate for everything from domain collections and NFT identities to educational projects and cultural archives.`
  );
  return parts.join(' ');
}

function generateSummary(entry) {
  const name = entry.unicode || entry.ascii;
  const pantheon = pantheonDisplay(entry.pantheon);
  const tier = tierDisplay(entry.tier, entry.tier_label);
  const meaning = entry.meaning ? `Its meaning is recorded as “${entry.meaning}.”` : '';
  const domain = entry.domain ? `The name is associated with ${entry.domain}.` : '';
  const flagship = entry.has_flagship ? `PUNYCODEX hosts a flagship temple for this name.` : '';

  return `**${name}** is a ${tier} ${pantheon} name. ${meaning} ${domain} ${flagship} In the PUNYCODEX restoration system, it is rendered with the original stress and length marks intact, making it both a scholarly record and a usable Unicode domain identity.`;
}

function enrichEntry(entry) {
  return {
    ai_summary: generateSummary(entry),
    ai_symbols: inferSymbols(entry),
    ai_pronunciation: generatePronunciation(entry.unicode, entry.ascii),
    ai_etymology_narrative: generateEtymologyNarrative(entry),
    ai_relevance_today: generateRelevanceToday(entry),
    ai_enriched_at: new Date().toISOString(),
    ai_review_status: 'pending',
  };
}

function run({ batchSize = 100, force = false } = {}) {
  const db = getDb();
  const where = force ? '1=1' : 'ai_summary IS NULL';
  const entries = db.prepare(`SELECT * FROM entries WHERE ${where}`).all();
  console.log(`Enriching ${entries.length} entries...`);

  const update = db.prepare(`
    UPDATE entries SET
      ai_summary = ?,
      ai_symbols = ?,
      ai_pronunciation = ?,
      ai_etymology_narrative = ?,
      ai_relevance_today = ?,
      ai_enriched_at = ?,
      ai_review_status = ?
    WHERE id = ?
  `);

  const updateMany = db.transaction((rows) => {
    for (const row of rows) {
      const data = enrichEntry(row);
      update.run(
        data.ai_summary,
        data.ai_symbols,
        data.ai_pronunciation,
        data.ai_etymology_narrative,
        data.ai_relevance_today,
        data.ai_enriched_at,
        data.ai_review_status,
        row.id
      );
    }
  });

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    updateMany(batch);
    console.log(`  ${Math.min(i + batchSize, entries.length)} / ${entries.length}`);
  }

  db.close();
  console.log('Enrichment complete.');
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  const batchSize = parseInt(process.env.BATCH_SIZE, 10) || 100;
  run({ force, batchSize });
}

module.exports = { enrichEntry, run };
