const Database = require('better-sqlite3');
const db = new Database('db/punycodex.db');
const stats = {
  withVideo: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE og_video IS NOT NULL AND og_video != ''").get().c,
  withRating: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE rating_value IS NOT NULL").get().c,
  withSitemap: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE sitemap_entries > 0").get().c,
  withAnchorTexts: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE anchor_texts IS NOT NULL").get().c,
  withReadability: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE readability_score IS NOT NULL").get().c,
  totalActive: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'").get().c
};
console.log(stats);
