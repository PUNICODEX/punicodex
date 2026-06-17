/**
 * Unicode Domain Marketplace API.
 * Lease inquiries, premium listings, registrar prices, and reviews.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function migrateMarketplace() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS lease_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT,
      entry_id TEXT NOT NULL,
      email TEXT,
      message TEXT,
      status TEXT DEFAULT 'inquiry',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_lease_inquiries_entry ON lease_inquiries(entry_id);
    CREATE INDEX IF NOT EXISTS idx_lease_inquiries_session ON lease_inquiries(session_token);

    CREATE TABLE IF NOT EXISTS premium_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT UNIQUE NOT NULL,
      tier TEXT DEFAULT 'featured',
      headline TEXT,
      description TEXT,
      asking_price INTEGER,
      currency TEXT DEFAULT 'USD',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_premium_listings_active ON premium_listings(active);

    CREATE TABLE IF NOT EXISTS registrar_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tld TEXT NOT NULL,
      registrar TEXT NOT NULL,
      price INTEGER,
      currency TEXT DEFAULT 'USD',
      url_template TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tld, registrar)
    );
    CREATE INDEX IF NOT EXISTS idx_registrar_prices_tld ON registrar_prices(tld);

    CREATE TABLE IF NOT EXISTS site_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT,
      entry_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_site_reviews_entry ON site_reviews(entry_id);
  `);
}

// --- Lease inquiries ---

function createLeaseInquiry(sessionToken, { entryId, email, message }) {
  migrateMarketplace();
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO lease_inquiries (session_token, entry_id, email, message) VALUES (?, ?, ?, ?)'
    )
    .run(sessionToken, entryId, email || null, message || null);
  return { id: result.lastInsertRowid, entryId, status: 'inquiry' };
}

function getLeaseInquiries(sessionToken) {
  migrateMarketplace();
  const db = getDb();
  return db
    .prepare('SELECT * FROM lease_inquiries WHERE session_token = ? ORDER BY created_at DESC')
    .all(sessionToken)
    .map((r) => ({ id: r.id, entryId: r.entry_id, status: r.status, createdAt: r.created_at }));
}

function updateLeaseStatus(id, status) {
  migrateMarketplace();
  const db = getDb();
  db.prepare(
    "UPDATE lease_inquiries SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);
}

// --- Premium listings ---

function createPremiumListing(entryId, { tier, headline, description, askingPrice, currency }) {
  migrateMarketplace();
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO premium_listings (entry_id, tier, headline, description, asking_price, currency) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    entryId,
    tier || 'featured',
    headline || null,
    description || null,
    askingPrice || null,
    currency || 'USD'
  );
  return getPremiumListing(entryId);
}

function getPremiumListing(entryId) {
  migrateMarketplace();
  const db = getDb();
  const row = db.prepare('SELECT * FROM premium_listings WHERE entry_id = ?').get(entryId);
  if (!row) return null;
  return {
    entryId: row.entry_id,
    tier: row.tier,
    headline: row.headline,
    description: row.description,
    askingPrice: row.asking_price,
    currency: row.currency,
    active: row.active,
  };
}

function listPremiumListings(limit = 20) {
  migrateMarketplace();
  const db = getDb();
  return db
    .prepare('SELECT * FROM premium_listings WHERE active = 1 ORDER BY created_at DESC LIMIT ?')
    .all(limit)
    .map((r) => ({
      entryId: r.entry_id,
      tier: r.tier,
      headline: r.headline,
      description: r.description,
      askingPrice: r.asking_price,
      currency: r.currency,
    }));
}

// --- Registrar prices ---

function setRegistrarPrice(tld, registrar, { price, currency, urlTemplate }) {
  migrateMarketplace();
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO registrar_prices (tld, registrar, price, currency, url_template) VALUES (?, ?, ?, ?, ?)'
  ).run(tld, registrar, price, currency || 'USD', urlTemplate || null);
}

function getRegistrarPrices(tld) {
  migrateMarketplace();
  const db = getDb();
  return db
    .prepare('SELECT * FROM registrar_prices WHERE tld = ? ORDER BY price ASC')
    .all(tld)
    .map((r) => ({
      registrar: r.registrar,
      price: r.price,
      currency: r.currency,
      urlTemplate: r.url_template,
    }));
}

function compareRegistrars(domain) {
  migrateMarketplace();
  const tld = domain.includes('.') ? domain.split('.').pop().toLowerCase() : 'com';
  const prices = getRegistrarPrices(tld);
  const links = generateRegistrarLinks(domain);
  return prices.map((p) => ({
    registrar: p.registrar,
    price: p.price,
    currency: p.currency,
    link: links[p.registrar] || null,
  }));
}

function generateRegistrarLinks(domain) {
  const clean = domain.replace(/^www\./, '');
  return {
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(clean)}`,
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(clean)}`,
    porkbun: `https://porkbun.com/checkout/search?q=${encodeURIComponent(clean)}`,
    dynadot: `https://www.dynadot.com/domain/search.html?domain=${encodeURIComponent(clean)}`,
    spaceship: `https://spaceship.com/domains/?query=${encodeURIComponent(clean)}`,
  };
}

// --- Reviews ---

function addReview(sessionToken, { entryId, rating, review }) {
  migrateMarketplace();
  const db = getDb();
  if (!entryId || !rating || rating < 1 || rating > 5)
    throw new Error('entryId and rating 1-5 required');
  const result = db
    .prepare(
      'INSERT INTO site_reviews (session_token, entry_id, rating, review) VALUES (?, ?, ?, ?)'
    )
    .run(sessionToken, entryId, rating, review || null);
  return { id: result.lastInsertRowid, entryId, rating };
}

function getReviews(entryId) {
  migrateMarketplace();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM site_reviews WHERE entry_id = ? ORDER BY created_at DESC')
    .all(entryId);
  const avg = rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0;
  return {
    average: parseFloat(avg.toFixed(2)),
    count: rows.length,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      createdAt: r.created_at,
    })),
  };
}

module.exports = {
  createLeaseInquiry,
  getLeaseInquiries,
  updateLeaseStatus,
  createPremiumListing,
  getPremiumListing,
  listPremiumListings,
  setRegistrarPrice,
  getRegistrarPrices,
  compareRegistrars,
  addReview,
  getReviews,
};
