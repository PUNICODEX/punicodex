#!/usr/bin/env node
/**
 * Seed indexed_sites with real metadata from generated flagship temples.
 *
 * This script reads each flagship's sites/{id}/index.html, extracts
 * title, description, OG tags, and canonical URL, then upserts the
 * indexed_sites row with real content, a quality score, and a fresh
 * last_crawled timestamp. It is idempotent.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Database = require('better-sqlite3');
const { domainToASCII } = require('node:url');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'platform', 'db', 'punicodex.db');

function loadArchetypes() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
  return vm.runInNewContext(`(function(){
${src}
return ARCHETYPES;
})()`);
}

function loadLexicon() {
  const src = fs.readFileSync(path.join(ROOT, 'type', 'js', 'lexicon.js'), 'utf8');
  const lex = vm.runInNewContext(`(function(){
${src}
return LEXICON;
})()`);
  return new Map(lex.map((e) => [e.id, e]));
}

function extractMeta(html) {
  const meta = {};
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  meta.title = titleMatch ? titleMatch[1].trim() : null;

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  meta.description = descMatch ? descMatch[1].trim() : null;

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
                   html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  meta.ogTitle = ogTitle ? ogTitle[1].trim() : null;

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
                  html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  meta.ogDescription = ogDesc ? ogDesc[1].trim() : null;

  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  meta.canonical = canonical ? canonical[1].trim() : null;

  return meta;
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}. Run npm run db first.`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const archetypes = loadArchetypes();
  const lexicon = loadLexicon();

  const flagships = archetypes.filter((a) => a.built && a.domainUnicode);
  console.log(`Seeding ${flagships.length} flagship sites from generated temples…`);

  const update = db.prepare(`
    UPDATE indexed_sites
    SET title = ?,
        description = ?,
        og_title = ?,
        og_description = ?,
        canonical_url = ?,
        content_snippet = ?,
        content_length = ?,
        word_count = ?,
        quality_score = ?,
        freshness_score = ?,
        status = 'active',
        last_crawled = datetime('now'),
        next_crawl_after = datetime('now', '+7 days')
    WHERE lexicon_entry_id = ?
  `);

  const getSite = db.prepare('SELECT id FROM indexed_sites WHERE lexicon_entry_id = ?');
  const insert = db.prepare(`
    INSERT INTO indexed_sites (
      domain, punycode, title, description, og_title, og_description, canonical_url,
      content_snippet, content_length, word_count, quality_score, freshness_score,
      status, last_crawled, next_crawl_after, is_flagship, lexicon_entry_id, pantheon, tier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now', '+7 days'), 1, ?, ?, ?)
  `);

  let updated = 0;
  let inserted = 0;

  for (const a of flagships) {
    const id = a.id;
    const entry = lexicon.get(id);
    if (!entry) {
      console.warn(`  skip: no lexicon entry for ${id}`);
      continue;
    }

    const templePath = path.join(ROOT, 'sites', id, 'index.html');
    if (!fs.existsSync(templePath)) {
      console.warn(`  skip: no temple HTML for ${id}`);
      continue;
    }

    const html = fs.readFileSync(templePath, 'utf8');
    const meta = extractMeta(html);
    const title = meta.ogTitle || meta.title || `${entry.unicode} — ${entry.domain || ''}`;
    const description = meta.ogDescription || meta.description || '';
    const snippet = description || title;
    const contentLength = html.length;
    const wordCount = html.split(/\s+/).length;
    const qualityScore = Math.min(95, 60 + Math.floor(wordCount / 100));

    try {
      const existing = getSite.get(id);
      if (existing) {
        update.run(
          title,
          description,
          meta.ogTitle || title,
          meta.ogDescription || description,
          meta.canonical || `https://punicodex.com/${id}/`,
          snippet,
          contentLength,
          wordCount,
          qualityScore,
          1.0,
          id
        );
        updated++;
      } else {
        const punycode = domainToASCII(a.domainUnicode.toLowerCase());
        insert.run(
          a.domainUnicode,
          punycode,
          title,
          description,
          meta.ogTitle || title,
          meta.ogDescription || description,
          meta.canonical || `https://punicodex.com/${id}/`,
          snippet,
          contentLength,
          wordCount,
          qualityScore,
          1.0,
          id,
          entry.pantheon,
          entry.tier
        );
        inserted++;
      }
    } catch (err) {
      console.warn(`  failed for ${id}: ${err.message}`);
    }
  }

  // Rebuild FTS index so new content is searchable
  db.prepare("INSERT INTO indexed_sites_fts(indexed_sites_fts) VALUES('rebuild')").run();

  db.close();
  console.log(`\nSeeded flagship sites: ${updated} updated, ${inserted} inserted.`);
}

main();
