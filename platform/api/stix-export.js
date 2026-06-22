/**
 * PUNYCODEX — STIX 2.1 Threat-Intel Export (Phase 18)
 *
 * Exports discovered spoofs, blocked inputs, and spoof relationships as
 * STIX 2.1 bundles. Designed to be consumable by TAXII servers and SIEMs.
 */

const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const DEFAULT_IDENTITY = {
  type: 'identity',
  id: 'identity--punycodex-authenticity-shield',
  name: 'PUNYCODEX Name Authenticity Shield',
  identity_class: 'organization',
  contact_information: 'https://punycodex.com/about/authenticity.html',
};

function stixId(type) {
  return `${type}--${crypto.randomUUID()}`;
}

function toStixTimestamp(date) {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

function severityToConfidence(severity) {
  switch (severity) {
    case 'critical':
      return 95;
    case 'high':
      return 80;
    case 'medium':
      return 60;
    case 'low':
      return 40;
    default:
      return 50;
  }
}

function createIndicator(spoof) {
  const id = stixId('indicator');
  const pattern = spoof.punycode
    ? `[domain-name:value = '${escapePattern(spoof.punycode)}']`
    : `[domain-name:value = '${escapePattern(spoof.input)}']`;

  return {
    type: 'indicator',
    id,
    created: toStixTimestamp(spoof.first_seen),
    modified: toStixTimestamp(spoof.last_seen),
    name: `PUNYCODEX spoof: ${spoof.input}`,
    description: `PUNYCODEX classified ${spoof.input} (${spoof.input_type}) as ${spoof.verdict} with severity ${spoof.severity}.`,
    pattern,
    pattern_type: 'stix',
    valid_from: toStixTimestamp(spoof.first_seen),
    labels: [spoof.verdict, spoof.severity, spoof.discovery_source || 'internal'].filter(Boolean),
    confidence: severityToConfidence(spoof.severity),
    object_marking_refs: [],
  };
}

function createObservedData(spoof) {
  return {
    type: 'observed-data',
    id: stixId('observed-data'),
    created: toStixTimestamp(spoof.first_seen),
    modified: toStixTimestamp(spoof.last_seen),
    first_observed: toStixTimestamp(spoof.first_seen),
    last_observed: toStixTimestamp(spoof.last_seen),
    number_observed: spoof.report_count || 1,
    object_refs: [stixId('indicator')],
    objects: {
      0: {
        type: 'domain-name',
        value: spoof.punycode || spoof.input,
      },
    },
  };
}

function createRelationship(sourceRef, targetRef, relationshipType) {
  return {
    type: 'relationship',
    id: stixId('relationship'),
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    relationship_type: relationshipType,
    source_ref: sourceRef,
    target_ref: targetRef,
  };
}

function escapePattern(value) {
  return String(value).replace(/'/g, "''");
}

function getDb() {
  return new Database(getDbPath());
}

function exportThreatFeed(options = {}) {
  const db = options.db || getDb();
  const since = options.since;
  const limit = Math.min(Math.max(1, options.limit || 1000), 10000);

  let sql = 'SELECT * FROM discovered_spoofs WHERE 1=1';
  const params = [];
  if (since) {
    sql += ' AND first_seen >= ?';
    params.push(since);
  }
  sql += ' ORDER BY first_seen DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const objects = [];

  for (const row of rows) {
    const indicator = createIndicator(row);
    objects.push(indicator);
    objects.push(createObservedData(row));
    objects.push(createRelationship(DEFAULT_IDENTITY.id, indicator.id, 'created'));
  }

  if (objects.length === 0) {
    objects.push(DEFAULT_IDENTITY);
  } else if (!objects.some((o) => o.type === 'identity' && o.id === DEFAULT_IDENTITY.id)) {
    objects.unshift(DEFAULT_IDENTITY);
  }

  return {
    type: 'bundle',
    id: stixId('bundle'),
    spec_version: '2.1',
    objects,
  };
}

function exportBlockedInputs(options = {}) {
  const db = options.db || getDb();
  const since = options.since;
  const limit = Math.min(Math.max(1, options.limit || 1000), 10000);

  let sql = 'SELECT * FROM blocked_inputs WHERE 1=1';
  const params = [];
  if (since) {
    sql += ' AND blocked_at >= ?';
    params.push(since);
  }
  sql += ' ORDER BY blocked_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const objects = [];

  for (const row of rows) {
    const id = stixId('indicator');
    objects.push({
      type: 'indicator',
      id,
      created: toStixTimestamp(row.blocked_at),
      modified: toStixTimestamp(row.blocked_at),
      name: `PUNYCODEX blocked input: ${row.input}`,
      description: `Blocked input of type ${row.type}. Reason: ${row.reason || 'not provided'}.`,
      pattern: `[domain-name:value = '${escapePattern(row.input)}']`,
      pattern_type: 'stix',
      valid_from: toStixTimestamp(row.blocked_at),
      labels: ['blocked', row.type, row.reason].filter(Boolean),
      confidence: 95,
    });
    objects.push(createRelationship(DEFAULT_IDENTITY.id, id, 'created'));
  }

  if (objects.length === 0) {
    objects.push(DEFAULT_IDENTITY);
  } else if (!objects.some((o) => o.type === 'identity' && o.id === DEFAULT_IDENTITY.id)) {
    objects.unshift(DEFAULT_IDENTITY);
  }

  return {
    type: 'bundle',
    id: stixId('bundle'),
    spec_version: '2.1',
    objects,
  };
}

function exportRelationships(options = {}) {
  const db = options.db || getDb();
  const since = options.since;
  const limit = Math.min(Math.max(1, options.limit || 1000), 10000);

  let sql = 'SELECT * FROM spoof_relationships WHERE 1=1';
  const params = [];
  if (since) {
    sql += ' AND discovered_at >= ?';
    params.push(since);
  }
  sql += ' ORDER BY discovered_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const objects = [];

  for (const row of rows) {
    const id = stixId('indicator');
    objects.push({
      type: 'indicator',
      id,
      created: toStixTimestamp(row.discovered_at),
      modified: toStixTimestamp(row.discovered_at),
      name: `PUNYCODEX relationship: ${row.input}`,
      description: `Spoof relationship of type ${row.type} targeting ${row.target_identity_id || 'unknown'}.`,
      pattern: `[domain-name:value = '${escapePattern(row.input)}']`,
      pattern_type: 'stix',
      valid_from: toStixTimestamp(row.discovered_at),
      labels: [row.type, row.status, 'relationship'].filter(Boolean),
      confidence: Math.round((row.reputation_score || 0.5) * 100),
    });

    if (row.target_identity_id) {
      const targetId = stixId('identity');
      objects.push({
        type: 'identity',
        id: targetId,
        name: row.target_identity_id,
        identity_class: 'individual' in row ? 'individual' : 'organization',
      });
      objects.push(createRelationship(id, targetId, 'targets'));
    }
  }

  if (objects.length === 0) {
    objects.push(DEFAULT_IDENTITY);
  } else if (!objects.some((o) => o.type === 'identity' && o.id === DEFAULT_IDENTITY.id)) {
    objects.unshift(DEFAULT_IDENTITY);
  }

  return {
    type: 'bundle',
    id: stixId('bundle'),
    spec_version: '2.1',
    objects,
  };
}

function exportAll(options = {}) {
  const db = options.db || getDb();
  const feed = exportThreatFeed({ ...options, db });
  const blocked = exportBlockedInputs({ ...options, db });
  const relationships = exportRelationships({ ...options, db });

  const objects = [DEFAULT_IDENTITY];
  const dedup = new Set();

  for (const obj of [...feed.objects, ...blocked.objects, ...relationships.objects]) {
    if (obj.type === 'identity' && obj.id === DEFAULT_IDENTITY.id) continue;
    if (dedup.has(obj.id)) continue;
    dedup.add(obj.id);
    objects.push(obj);
  }

  return {
    type: 'bundle',
    id: stixId('bundle'),
    spec_version: '2.1',
    objects,
  };
}

module.exports = {
  exportThreatFeed,
  exportBlockedInputs,
  exportRelationships,
  exportAll,
  DEFAULT_IDENTITY,
};
