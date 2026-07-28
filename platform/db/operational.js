const Database = require('better-sqlite3');
const { getDb: getSharedDb, closeDb: closeSharedDb } = require('./connection');
const { getDbPath } = require('./db');

const DATABASE_URL = process.env.DATABASE_URL;

let pgClient = null;
let postgresPromise = null;

async function loadPostgres() {
  if (!postgresPromise) {
    postgresPromise = import('postgres');
  }
  return postgresPromise;
}

async function getPgClient() {
  if (!pgClient) {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    const { default: postgres } = await loadPostgres();
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
    return (await getPgClient())(...tagged);
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).all(...params);
}

async function get(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    const rows = await (await getPgClient())(...tagged);
    return rows[0];
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).get(...params);
}

async function all(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    return (await getPgClient())(...tagged);
  }
  const db = getSharedDb();
  const convertedSql = convertPlaceholders(sql);
  return db.prepare(convertedSql).all(...params);
}

async function run(sql, params = []) {
  if (isPostgres()) {
    const tagged = toTaggedTemplate(sql, params);
    const result = await (await getPgClient())(...tagged);
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
    const rows = await (await getPgClient())(...tagged);
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
    const client = await getPgClient();
    for (const statement of statements) {
      await client.unsafe(statement);
    }
    return;
  }
  const db = getSharedDb();
  db.exec(sql);
}

// Wrap the postgres driver's TransactionSql into the {get, all, run, insert}
// helper contract the SQLite transaction path provides and every caller
// destructures. Pure and exported for tests (the driver itself is mocked by
// suites that exercise this).
function wrapTransactionSql(tsql) {
  const exec = (query, params = []) => tsql(...toTaggedTemplate(query, params));
  return {
    get: async (query, params) => (await exec(query, params))[0],
    all: (query, params) => exec(query, params),
    run: async (query, params) => {
      const result = await exec(query, params);
      return { changes: result.count ?? 0 };
    },
    insert: async (query, params) => {
      if (!/RETURNING\s+id/i.test(query)) {
        throw new Error('insert() requires RETURNING id in the SQL');
      }
      const rows = await exec(query, params);
      return rows[0]?.id;
    },
  };
}

async function transaction(fn, opts = {}) {
  if (isPostgres()) {
    const client = await getPgClient();
    // The postgres driver's sql.begin() hands the callback a raw TransactionSql
    // function — NOT the {get, all, run, insert} helper shape the SQLite path
    // provides and every caller destructures. Wrap it so both backends honour
    // the same contract (found via the production booking 500s).
    return client.begin(async (tsql) => fn(wrapTransactionSql(tsql)));
  }
  // Use a dedicated connection per SQLite transaction. The shared connection
  // cannot nest or interleave transactions, and Node's async model would
  // otherwise cause "cannot start a transaction within a transaction" errors
  // under concurrent writes. WAL mode lets multiple connections proceed safely.
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(opts.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN');

  const tQuery = (sql, params) => {
    const converted = convertPlaceholders(sql);
    return db.prepare(converted).all(...params);
  };
  const tGet = (sql, params) => {
    const rows = tQuery(sql, params);
    return rows[0];
  };
  const tAll = tQuery;
  const tRun = (sql, params) => {
    const converted = convertPlaceholders(sql);
    const info = db.prepare(converted).run(...params);
    return { changes: info.changes };
  };
  const tInsert = (sql, params) => {
    if (!sql.match(/RETURNING\s+id/i)) {
      throw new Error('insert() requires RETURNING id in the SQL');
    }
    const converted = convertPlaceholders(sql);
    const row = db.prepare(converted).get(...params);
    return row?.id;
  };

  try {
    await fn({ get: tGet, all: tAll, run: tRun, insert: tInsert });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    db.close();
  }
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
  wrapTransactionSql,
  closeDb,
};
