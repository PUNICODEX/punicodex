#!/usr/bin/env node
/**
 * PÚNYCODEX — Migrate lore-catalog.json into the Scholarly Edition.
 *
 * Reads scripts/lore-catalog.json and populates scholars_sections for every
 * flagship temple that has lore data. Idempotent: sections with a non-empty
 * body are skipped. Safe to re-run on existing data: migrations are applied
 * idempotently and the migration account is created or activated as needed.
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDb, closeDb } = require('../platform/db/connection');
const { migrate } = require('../platform/db/migrate-scholars');
const { migrate: migrateQuality } = require('../platform/db/migrate-scholars-quality');
const dbApi = require('../platform/db/scholars');
const { validateSectionKey, getSectionDefinition } = require('../platform/scholars/taxonomy');

const LORE_PATH = path.join(__dirname, 'lore-catalog.json');

const LORE_TO_SECTION_MAP = {
  pronunciation: 'pronunciation',
  symbols: 'symbols',
  mythology: 'mythology',
  syncretism: 'syncretism',
  culturalLegacy: 'cultural-legacy',
  archaeology: 'archaeology',
  sources: 'scholarly-sources',
  // The taxonomy labels this "Meditation & Reflection"; its canonical key is "meditation".
  extendedMeditation: 'meditation',
  originalScriptNote: 'original-script',
};

const INSTITUTION_NAME = 'PUNYCODEX Migration';
const INSTITUTION_SLUG = 'punycodex-migration';
const MIGRATION_EMAIL = 'migration@punycodex.com';
const MIGRATION_NOTE = 'Migrated from scripts/lore-catalog.json';

function normalizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((src) => {
    if (typeof src === 'string') return { citation: src };
    if (src && typeof src === 'object') {
      const text = src.citation || src.name || src.title || JSON.stringify(src);
      return { citation: text };
    }
    return { citation: String(src) };
  });
}

function sectionToMarkdown(key, value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();

  if (Array.isArray(value)) {
    if (key === 'symbols') {
      return value
        .map((item) => `- **${item.name || 'Symbol'}**: ${item.meaning || ''}`)
        .join('\n\n');
    }
    return value
      .map((item) => {
        if (typeof item === 'string') return `- ${item}`;
        if (item && typeof item === 'object') {
          return `- **${item.name || item.label || 'Item'}**${item.meaning || item.desc || item.description ? `: ${item.meaning || item.desc || item.description}` : ''}`;
        }
        return `- ${String(item)}`;
      })
      .join('\n\n');
  }

  if (typeof value === 'object') {
    if (key === 'pronunciation') {
      const parts = [];
      if (value.ipa) parts.push(`**IPA**: ${value.ipa}`);
      if (value.ipaLabel) parts.push(`*${value.ipaLabel}*`);
      if (value.approximation) parts.push(`\n**Approximation**: ${value.approximation}`);
      if (Array.isArray(value.phonemes) && value.phonemes.length) {
        parts.push('\n**Phonemes**:');
        value.phonemes.forEach((p) => parts.push(`- *${p.symbol}* — ${p.desc}`));
      }
      if (Array.isArray(value.kin) && value.kin.length) {
        parts.push('\n**Kin forms**:');
        value.kin.forEach((k) => parts.push(`- **${k.label}**: ${k.form}`));
      }
      if (value.note) parts.push(`\n**Note**: ${value.note}`);
      return parts.join('\n').trim();
    }

    if (key === 'mythology') {
      const parts = [];
      if (value.lead) parts.push(value.lead);
      if (Array.isArray(value.myths)) {
        value.myths.forEach((m) => {
          parts.push(`\n### ${m.title || 'Myth'}`);
          if (m.tag) parts.push(`*${m.tag}*`);
          parts.push(m.text || '');
        });
      }
      return parts.join('\n\n').trim();
    }

    if (key === 'domains') {
      const parts = [];
      if (value.title) parts.push(`# ${value.title}`);
      if (value.subtitle) parts.push(`*${value.subtitle}*`);
      if (value.lead) parts.push(value.lead);
      if (Array.isArray(value.cards)) {
        value.cards.forEach((c) => {
          parts.push(`\n### ${c.name}`);
          parts.push(c.desc || '');
        });
      }
      return parts.join('\n\n').trim();
    }

    // Fallback: preserve the structured data inside a Markdown code block.
    return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
  }

  return String(value).trim();
}

function ensureMigrationUser(db) {
  let institution = dbApi.getInstitutionBySlug(INSTITUTION_SLUG);
  if (!institution) {
    const result = dbApi.createInstitution({
      name: INSTITUTION_NAME,
      slug: INSTITUTION_SLUG,
      domain: 'punycodex.com',
      accreditation: 'PUNYCODEX internal migration',
      metadata: { note: MIGRATION_NOTE },
    });
    institution = dbApi.getInstitutionById(result.lastInsertRowid);
  }

  // Ensure the migration institution is active and sponsored so it does not block reads.
  if (institution.status !== 'active' || institution.sponsorship_status !== 'active') {
    db.prepare(
      "UPDATE scholars_institutions SET status = 'active', sponsorship_status = 'active' WHERE id = ?"
    ).run(institution.id);
    institution.status = 'active';
    institution.sponsorship_status = 'active';
  }

  let user = dbApi.getUserByEmail(MIGRATION_EMAIL);
  if (!user) {
    const result = dbApi.createUser({
      email: MIGRATION_EMAIL,
      institutionId: institution.id,
      role: 'curator',
      displayName: 'PUNYCODEX Migration',
      department: 'Digital Philology',
    });
    user = dbApi.getUserById(result.lastInsertRowid);
  }

  // The migration user must be active so foreign-key checks on existing data do not fail.
  if (user.account_status !== 'active') {
    db.prepare("UPDATE scholars_users SET account_status = 'active' WHERE id = ?").run(user.id);
    user.account_status = 'active';
  }

  return { institution, user };
}

function main() {
  const db = getDb();
  migrate(db);
  migrateQuality(db);

  const raw = fs.readFileSync(LORE_PATH, 'utf8');
  const loreCatalog = JSON.parse(raw);

  const { institution, user } = ensureMigrationUser(db);

  let entriesProcessed = 0;
  let sectionsMigrated = 0;
  let sectionsSkipped = 0;
  let sectionsUnsupported = 0;
  let templesMissing = 0;
  let errors = 0;

  for (const [entryId, lore] of Object.entries(loreCatalog)) {
    entriesProcessed += 1;
    const temple = dbApi.getTempleByEntryId(entryId);
    if (!temple) {
      templesMissing += 1;
      console.warn(`Temple not found for ${entryId}; skipping.`);
      continue;
    }

    const topLevelSources = normalizeSources(lore.sources);

    for (const [loreKey, sectionKey] of Object.entries(LORE_TO_SECTION_MAP)) {
      if (!(loreKey in lore)) continue;

      if (!validateSectionKey(sectionKey)) {
        sectionsUnsupported += 1;
        console.warn(
          `Taxonomy does not support section key ${sectionKey} for ${entryId}.${loreKey}; skipping.`
        );
        continue;
      }

      let section = dbApi.getSectionByTempleAndKey(temple.id, sectionKey);
      if (!section) {
        const def = getSectionDefinition(sectionKey);
        const result = dbApi.createSection({
          templeId: temple.id,
          key: sectionKey,
          label: def ? def.label : sectionKey,
          body: '',
          sources: [],
          status: 'empty',
        });
        section = dbApi.getSectionById(result.lastInsertRowid);
      }

      if (typeof section.body === 'string' && section.body.trim() !== '') {
        sectionsSkipped += 1;
        console.log(`Skipping ${entryId}.${sectionKey}: body already populated.`);
        continue;
      }

      const body = sectionToMarkdown(sectionKey, lore[loreKey]);
      const sources = sectionKey === 'scholarly-sources' ? topLevelSources : [];

      try {
        dbApi.withTransaction(() => {
          dbApi.updateSection({
            id: section.id,
            body,
            sources,
            status: 'published',
            updatedBy: user.id,
          });
          dbApi.createHistoryRecord({
            sectionId: section.id,
            editId: null,
            body,
            sources,
            media: [],
            attribution: {
              userId: user.id,
              institutionId: institution.id,
              note: MIGRATION_NOTE,
            },
            diff: null,
          });
        });
        sectionsMigrated += 1;
        console.log(`Migrated ${entryId}.${sectionKey}`);
      } catch (err) {
        errors += 1;
        console.error(`Failed to migrate ${entryId}.${sectionKey}: ${err.message}`);
      }
    }
  }

  console.log('\n=== Lore Migration Summary ===');
  console.log(`Entries processed: ${entriesProcessed}`);
  console.log(`Sections migrated: ${sectionsMigrated}`);
  console.log(`Sections skipped (already populated): ${sectionsSkipped}`);
  console.log(`Sections skipped (unsupported taxonomy): ${sectionsUnsupported}`);
  console.log(`Temples missing: ${templesMissing}`);
  console.log(`Errors: ${errors}`);
}

try {
  main();
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  closeDb();
}
