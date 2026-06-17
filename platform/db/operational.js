const postgres = require('postgres');
const { getDb: getSharedDb, closeDb: closeSharedDb } = require('./connection');

const DATABASE_URL = process.env.DATABASE_URL;

let pgClient = null;

function getPgClient() {
  if (!pgClient) {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    pgClient = postgres(DATABASE_URL);
  }
  return pgClient;
}

function isPostgres() {
  return Boolean(DATABASE_URL);
}

function parsePlaceholders(sql) {
  const parts = sql.split(/\$(\d+)/g);
  const strings = [];
  const values = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      strings.push(parts[i]);
    } else {
      const paramIndex = parseInt(parts[i], 10) - 1;
      values.push(paramIndex);
    }
  }
  return { strings, values };
}

function toTaggedTemplate(sql, params) {
  const { strings, values: paramIndices } = parsePlaceholders(sql);
  const raw = [...strings];
  raw.raw = raw;
  const args = paramIndices.map((idx) => params[idx]);
  return [raw, ...args];
}

function convertPlaceholders(sql) {
  // Convert Postgres $1, $2... placeholders to SQLite ? placeholders
  if (!isPostgres()) {
    return sql.replace(/\$(\d+)/g, () => '?');
  }
  return sql;
}

async function query(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    return getPgClient()(...tagged);
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).all(...params);
}

async function get(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    const rows = await getPgClient()(...tagged);
    return rows[0];
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).get(...params);
}

async function all(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    return getPgClient()(...tagged);
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).all(...params);
}

async function run(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    const result = await getPgClient()(...tagged);
    return { changes: result.count || 0 };
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  const stmt = db.prepare(convertedSql);
  const info = stmt.run(...params);
  return { changes: info.changes };
}

async function insert(sql, params = []) {
  if (!sql.match(/RETURNING\s+id/i)) {
    throw new Error('insert() requires RETURNING id in the SQL');
  }
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    const rows = await getPgClient()(...tagged);
    return rows[0]?.id;
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  const row = db.prepare(convertedSql).get(...params);
  return row?.id;
}

async function exec(sql) {
  if (isPostgres()) {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await getPgClient().unsafe(statement);
    }
    return;
  }
  const db = getSharedDb();
  db.exec(sql);
}

async function transaction(fn) {
  if (isPostgres()) {
    return getPgClient().begin(fn);
  }
  const db = getSharedDb();
  const tx = db.transaction((cb) => cb());
  tx(() => fn({ get, all, run, insert }));
}

async function closeDb() {
  if (isPostgres() && pgClient) {
    await pgClient.end();
    pgClient = null;
  } else {
    closeSharedDb();
  }
}

module.exports = {
  isPostgres,
  query,
  get,
  all,
  run,
  insert,
  exec,
  transaction,
  closeDb,
};
