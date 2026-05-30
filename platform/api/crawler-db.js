const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function getSites({ status, pantheon, entryId, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM indexed_sites WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM indexed_sites WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }
  if (pantheon) {
    sql += ' AND pantheon = ?';
    countSql += ' AND pantheon = ?';
    params.push(pantheon);
  }
  if (entryId) {
    sql += ' AND lexicon_entry_id = ?';
    countSql += ' AND lexicon_entry_id = ?';
    params.push(entryId);
  }

  sql += " ORDER BY is_flagship DESC, status = 'active' DESC, tier = 'dual' DESC, tier = '1' DESC, domain ASC";
  sql += ' LIMIT ? OFFSET ?';

  const sites = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { sites, total, limit, offset };
}

function getSiteByPunycode(punycode) {
  const db = getDb();
  return db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(punycode);
}

function searchSites(q, limit = 20) {
  const db = getDb();
  const like = `%${q}%`;
  return db.prepare(`
    SELECT s.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.meaning as entry_meaning
    FROM indexed_sites s
    LEFT JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE s.domain LIKE ? OR s.title LIKE ? OR s.punycode LIKE ?
      OR e.unicode LIKE ? OR e.ascii LIKE ? OR e.meaning LIKE ?
    ORDER BY s.is_flagship DESC, s.status = 'active' DESC
    LIMIT ?
  `).all(like, like, like, like, like, like, limit);
}

function getAvailability(entryId) {
  const db = getDb();
  const avail = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(entryId);
  if (avail) return { ...avail, registrar_links: JSON.parse(avail.registrar_links || '{}') };
  return null;
}

function setAvailability(entryId, domain, punycode, status = 'available') {
  const db = getDb();
  const links = JSON.stringify(generateRegistrarLinks(domain));
  db.prepare(`
    INSERT INTO availability (entry_id, domain, punycode, status, registrar_links)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entry_id) DO UPDATE SET
      domain = excluded.domain,
      punycode = excluded.punycode,
      status = excluded.status,
      registrar_links = excluded.registrar_links,
      last_checked = datetime('now')
  `).run(entryId, domain, punycode, status, links);
}

function generateRegistrarLinks(domain) {
  const clean = domain.replace(/^www\./, '');
  return {
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(clean)}`,
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(clean)}`,
    porkbun: `https://porkbun.com/checkout/search?q=${encodeURIComponent(clean)}`,
    dynadot: `https://www.dynadot.com/domain/search.html?domain=${encodeURIComponent(clean)}`,
    spaceship: `https://spaceship.com/domains/?query=${encodeURIComponent(clean)}`
  };
}

function getCrawlerStats() {
  const db = getDb();
  return {
    total_sites: db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c,
    active_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get().c,
    pending_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'pending'").get().c,
    error_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'error'").get().c,
    flagged_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'spam'").get().c,
    available_entries: db.prepare('SELECT COUNT(*) as c FROM availability').get().c,
    by_pantheon: db.prepare(`
      SELECT pantheon, COUNT(*) as count FROM indexed_sites WHERE status = 'active' GROUP BY pantheon
    `).all(),
    last_crawled: db.prepare(`
      SELECT MAX(last_crawled) as last_crawled FROM indexed_sites
    `).get().last_crawled
  };
}

function markSiteSpam(punycode) {
  const db = getDb();
  db.prepare(`UPDATE indexed_sites SET status = 'spam' WHERE punycode = ?`).run(punycode);
}

module.exports = {
  getSites,
  getSiteByPunycode,
  searchSites,
  getAvailability,
  setAvailability,
  getCrawlerStats,
  markSiteSpam
};
