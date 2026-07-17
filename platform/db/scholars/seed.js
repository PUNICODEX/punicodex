/**
 * Seed the Scholarly Edition database from generated manifests.
 *
 * Publishes the canonical manifest content under the "PuniCodex Team"
 * identity with full edit-history attribution. Scholar contributions are
 * sacred: a section whose body is already non-empty is never modified.
 *
 * Usage:
 *   node platform/db/scholars/seed.js
 *
 * Idempotent: safe to run multiple times (including on every serverless cold
 * start). Repeat runs skip everything and publish nothing.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getDb } = require('../connection');
const dbApi = require('./index');
const { hashPassword } = require('../../scholars/auth');

const MANIFESTS_DIR = path.join(__dirname, '..', '..', 'scholars', 'manifests');
const ALL_MANIFEST = path.join(MANIFESTS_DIR, 'all.json');

const ADMIN_INSTITUTION_NAME = 'PuniCodex Team';
const ADMIN_INSTITUTION_SLUG = 'punicodex-admin';
const ADMIN_EMAIL = 'admin@punicodex.com';
const ADMIN_DISPLAY_NAME = 'PuniCodex Team';
const ADMIN_NOTE = 'Initial scholarly content published by PuniCodex Team.';
const LEGACY_ADMIN_NAME = 'PuniCodex Admin';

/**
 * One-time, idempotent rename of the original "PuniCodex Admin" identity to
 * "PuniCodex Team". Runs before every seed (including serverless cold
 * starts) so any database copy — local or bundled — self-heals.
 */
function renameLegacyAdminIdentity(db) {
  db.prepare('UPDATE scholars_institutions SET name = ? WHERE slug = ? AND name = ?').run(
    ADMIN_INSTITUTION_NAME,
    ADMIN_INSTITUTION_SLUG,
    LEGACY_ADMIN_NAME
  );
  db.prepare('UPDATE scholars_users SET display_name = ? WHERE email = ? AND display_name = ?').run(
    ADMIN_DISPLAY_NAME,
    ADMIN_EMAIL,
    LEGACY_ADMIN_NAME
  );
  db.prepare(
    "UPDATE scholars_sections SET editor_notes = REPLACE(editor_notes, ?, ?) WHERE editor_notes LIKE '%' || ? || '%'"
  ).run(LEGACY_ADMIN_NAME, ADMIN_DISPLAY_NAME, LEGACY_ADMIN_NAME);
  db.prepare(
    "UPDATE scholars_history SET attribution = REPLACE(attribution, ?, ?) WHERE attribution LIKE '%' || ? || '%'"
  ).run(LEGACY_ADMIN_NAME, ADMIN_DISPLAY_NAME, LEGACY_ADMIN_NAME);
}

function readManifest(entryId) {
  const file = path.join(MANIFESTS_DIR, `${entryId}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Ensure the canonical admin identity exists. The account carries an
 * unguessable random password hash (the plaintext is generated in-memory and
 * immediately discarded), so it can never sign in through the normal flow;
 * it exists only to attribute machine-published content.
 */
function ensureAdminIdentity(db) {
  renameLegacyAdminIdentity(db);
  let institution = dbApi.getInstitutionBySlug(ADMIN_INSTITUTION_SLUG);
  if (!institution) {
    const result = dbApi.createInstitution({
      name: ADMIN_INSTITUTION_NAME,
      slug: ADMIN_INSTITUTION_SLUG,
      domain: 'punicodex.com',
      accreditation: 'PuniCodex internal',
      metadata: { note: 'Canonical content administration identity.' },
    });
    institution = dbApi.getInstitutionById(result.lastInsertRowid);
  }

  // The admin institution must be active and sponsored so it never blocks reads.
  if (institution.status !== 'active' || institution.sponsorship_status !== 'active') {
    db.prepare(
      "UPDATE scholars_institutions SET status = 'active', sponsorship_status = 'active' WHERE id = ?"
    ).run(institution.id);
  }

  let user = dbApi.getUserByEmail(ADMIN_EMAIL);
  if (!user) {
    const result = dbApi.createUserWithPassword({
      email: ADMIN_EMAIL,
      institutionId: institution.id,
      role: 'curator',
      displayName: ADMIN_DISPLAY_NAME,
      department: 'Digital Philology',
      passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
      accountStatus: 'active',
    });
    user = dbApi.getUserById(result.lastInsertRowid);
  }

  if (user.account_status !== 'active') {
    db.prepare("UPDATE scholars_users SET account_status = 'active' WHERE id = ?").run(user.id);
    user.account_status = 'active';
  }

  return { institution, user };
}

function seedTemple(manifest, stats) {
  let temple = dbApi.getTempleByEntryId(manifest.entryId);
  if (temple) {
    stats.templesSkipped += 1;
    return temple;
  }
  dbApi.createTemple({
    entryId: manifest.entryId,
    name: manifest.name,
    pantheon: manifest.pantheon,
    tier: manifest.tier,
    manifestVersion: manifest.taxonomyVersion,
  });
  stats.templesCreated += 1;
  return dbApi.getTempleByEntryId(manifest.entryId);
}

function seedSections(db, temple, manifest, admin, stats) {
  for (const section of manifest.sections) {
    const manifestBody = typeof section.body === 'string' ? section.body : '';
    const sources = Array.isArray(section.sources) ? section.sources : [];
    const media = Array.isArray(section.media) ? section.media : [];
    const attribution = {
      userId: admin.user.id,
      institutionId: admin.institution.id,
      note: ADMIN_NOTE,
    };

    const existing = dbApi.getSectionByTempleAndKey(temple.id, section.key);

    if (!existing) {
      const result = dbApi.createSection({
        templeId: temple.id,
        key: section.key,
        label: section.label,
        body: manifestBody,
        sources,
        media,
        editorNotes: section.editorNotes || '',
        status: section.status || 'empty',
      });
      stats.sectionsCreated += 1;
      if (manifestBody.trim() !== '') {
        dbApi.withTransaction(() => {
          db.prepare('UPDATE scholars_sections SET updated_by = ? WHERE id = ?').run(
            admin.user.id,
            result.lastInsertRowid
          );
          dbApi.createHistoryRecord({
            sectionId: result.lastInsertRowid,
            editId: null,
            body: manifestBody,
            sources,
            media,
            attribution,
            diff: null,
          });
        });
        stats.sectionsPublished += 1;
      }
      continue;
    }

    // Scholar edits are sacred: never touch a section with a non-empty body.
    if (typeof existing.body === 'string' && existing.body.trim() !== '') {
      stats.sectionsSkipped += 1;
      continue;
    }
    if (manifestBody.trim() === '') {
      stats.sectionsSkipped += 1;
      continue;
    }

    dbApi.withTransaction(() => {
      dbApi.updateSection({
        id: existing.id,
        body: manifestBody,
        sources,
        media,
        editorNotes: section.editorNotes ?? existing.editor_notes,
        status: 'published',
        updatedBy: admin.user.id,
      });
      dbApi.createHistoryRecord({
        sectionId: existing.id,
        editId: null,
        body: manifestBody,
        sources,
        media,
        attribution,
        diff: null,
      });
    });
    stats.sectionsPublished += 1;
  }
}

const REPUBLISH_NOTE = 'Scholarly elevation pass republished by PuniCodex Team.';

/**
 * Republish manifest content over existing sections after an intentional
 * content elevation pass. Unlike the seed this OVERWRITES bodies — but only
 * for sections whose entire edit history is admin-attributed. A section any
 * scholar (non-admin user) has ever contributed to is left untouched.
 * Never invoked by the cold-start seed; run explicitly:
 *
 *   node platform/db/scholars/seed.js --republish
 */
function republishScholarsFromManifests({ logger = console } = {}) {
  const stats = { updated: 0, unchanged: 0, created: 0, scholarProtected: 0 };

  if (!fs.existsSync(ALL_MANIFEST)) {
    logger.warn(
      `Missing aggregate manifest: ${ALL_MANIFEST}. Run: node scripts/generate-scholars-manifests.js`
    );
    return stats;
  }

  const db = getDb();
  const admin = ensureAdminIdentity(db);
  const all = JSON.parse(fs.readFileSync(ALL_MANIFEST, 'utf8'));
  const entryIds = Object.keys(all.manifests).sort();

  const scholarGuard = db.prepare(
    "SELECT COUNT(*) AS c FROM scholars_history WHERE section_id = ? AND json_extract(attribution, '$.userId') != ?"
  );

  for (const entryId of entryIds) {
    const manifest = readManifest(entryId);
    const temple =
      dbApi.getTempleByEntryId(entryId) ||
      seedTemple(manifest, { templesCreated: 0, templesSkipped: 0 });

    for (const section of manifest.sections) {
      const manifestBody = typeof section.body === 'string' ? section.body : '';
      if (manifestBody.trim() === '') continue;
      const sources = Array.isArray(section.sources) ? section.sources : [];
      const media = Array.isArray(section.media) ? section.media : [];

      const existing = dbApi.getSectionByTempleAndKey(temple.id, section.key);
      if (!existing) {
        const result = dbApi.createSection({
          templeId: temple.id,
          key: section.key,
          label: section.label,
          body: manifestBody,
          sources,
          media,
          editorNotes: section.editorNotes || '',
          status: 'published',
        });
        db.prepare('UPDATE scholars_sections SET updated_by = ? WHERE id = ?').run(
          admin.user.id,
          result.lastInsertRowid
        );
        dbApi.createHistoryRecord({
          sectionId: result.lastInsertRowid,
          editId: null,
          body: manifestBody,
          sources,
          media,
          attribution: {
            userId: admin.user.id,
            institutionId: admin.institution.id,
            note: ADMIN_NOTE,
          },
          diff: null,
        });
        stats.created += 1;
        continue;
      }

      const current = typeof existing.body === 'string' ? existing.body : '';
      if (current === manifestBody) {
        stats.unchanged += 1;
        continue;
      }
      if (scholarGuard.get(existing.id, admin.user.id).c > 0) {
        stats.scholarProtected += 1;
        continue;
      }

      dbApi.withTransaction(() => {
        dbApi.updateSection({
          id: existing.id,
          body: manifestBody,
          sources,
          media,
          editorNotes: section.editorNotes ?? existing.editor_notes,
          status: 'published',
          updatedBy: admin.user.id,
        });
        dbApi.createHistoryRecord({
          sectionId: existing.id,
          editId: null,
          body: manifestBody,
          sources,
          media,
          attribution: {
            userId: admin.user.id,
            institutionId: admin.institution.id,
            note: REPUBLISH_NOTE,
          },
          diff: null,
        });
      });
      stats.updated += 1;
    }
  }

  logger.log('Scholarly Edition republish complete.');
  logger.log(
    `  Updated: ${stats.updated}, unchanged: ${stats.unchanged}, created: ${stats.created}, scholar-protected: ${stats.scholarProtected}`
  );
  return stats;
}

function seedScholarsFromManifests({ logger = console } = {}) {
  const stats = {
    templesCreated: 0,
    templesSkipped: 0,
    sectionsCreated: 0,
    sectionsPublished: 0,
    sectionsSkipped: 0,
  };

  if (!fs.existsSync(ALL_MANIFEST)) {
    logger.warn(
      `Missing aggregate manifest: ${ALL_MANIFEST}. Run: node scripts/generate-scholars-manifests.js`
    );
    return stats;
  }

  const db = getDb();
  const admin = ensureAdminIdentity(db);

  const all = JSON.parse(fs.readFileSync(ALL_MANIFEST, 'utf8'));
  const entryIds = Object.keys(all.manifests).sort();

  for (const entryId of entryIds) {
    const manifest = readManifest(entryId);
    const temple = seedTemple(manifest, stats);
    seedSections(db, temple, manifest, admin, stats);
  }

  logger.log('Scholarly Edition seed complete.');
  logger.log(`  Temples: ${stats.templesCreated} created, ${stats.templesSkipped} already existed`);
  logger.log(
    `  Sections: ${stats.sectionsCreated} created, ${stats.sectionsPublished} published, ${stats.sectionsSkipped} skipped`
  );
  return stats;
}

if (require.main === module) {
  try {
    if (process.argv.includes('--republish')) {
      republishScholarsFromManifests();
    } else {
      seedScholarsFromManifests();
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  }
}

module.exports = { seedScholarsFromManifests, republishScholarsFromManifests, ensureAdminIdentity };
