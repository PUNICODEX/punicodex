/**
 * Personal Research Agent — builds a report from the knowledge graph.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function _log(agent, action, target, result) {
  try {
    getDb()
      .prepare('INSERT INTO agent_activity_log (agent, action, target, result) VALUES (?, ?, ?, ?)')
      .run(agent, action, target || null, JSON.stringify(result || {}));
  } catch (_e) {}
}

function loadLoreCatalog() {
  try {
    return require('../browser/renderer/lore-catalog.json');
  } catch (_e) {
    return {};
  }
}

function createReport(sessionToken, topic) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO research_reports (session_token, topic, status) VALUES (?, ?, ?)')
    .run(sessionToken, topic, 'pending');
  return { id: result.lastInsertRowid, topic, status: 'pending' };
}

function generateFindings(topic) {
  const catalog = loadLoreCatalog();
  const db = getDb();
  const entries = db
    .prepare(
      `SELECT id, unicode, ascii, pantheon, meaning FROM entries
       WHERE ascii LIKE ? OR unicode LIKE ? OR meaning LIKE ?
       LIMIT 20`
    )
    .all(`%${topic}%`, `%${topic}%`, `%${topic}%`);

  const findings = entries.map((e) => {
    const lore = catalog[e.id];
    return {
      entryId: e.id,
      unicode: e.unicode,
      pantheon: e.pantheon,
      meaning: e.meaning,
      summary: lore?.mythology?.summary || lore?.etymology || 'No lore available.',
    };
  });

  const sources = [
    'PUNYCODEX canonical lexicon',
    'PUNYCODEX lore catalog',
    'Liddell-Scott-Jones (LSJ) where cited',
  ];

  return { findings, sources };
}

function completeReport(reportId) {
  const db = getDb();
  const report = db.prepare('SELECT * FROM research_reports WHERE id = ?').get(reportId);
  if (!report) return null;
  const { findings, sources } = generateFindings(report.topic);
  db.prepare(
    "UPDATE research_reports SET status = 'completed', findings = ?, sources = ?, completed_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(findings), JSON.stringify(sources), reportId);
  return { ...report, status: 'completed', findings, sources };
}

function getReports(sessionToken) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM research_reports WHERE session_token = ? ORDER BY created_at DESC')
    .all(sessionToken)
    .map((r) => ({
      id: r.id,
      topic: r.topic,
      status: r.status,
      findings: safeJson(r.findings, []),
      sources: safeJson(r.sources, []),
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }));
}

function safeJson(str, fallback) {
  try {
    return JSON.parse(str || 'null');
  } catch {
    return fallback;
  }
}

module.exports = { createReport, completeReport, getReports, generateFindings };
