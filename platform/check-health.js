const db = require('better-sqlite3')('db/punycodex.db');
const stats = {
  active: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active'").get().c,
  punycode: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active' AND punycode LIKE 'xn--%'").get().c,
  spam: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='spam'").get().c,
  avgQuality: db.prepare("SELECT AVG(quality_score) as q FROM indexed_sites WHERE status='active'").get().q,
  lowQuality: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active' AND (quality_score < 20 OR quality_score IS NULL)").get().c,
  parked: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active' AND (LOWER(title) LIKE '%for sale%' OR LOWER(description) LIKE '%domain%')").get().c,
  emptyContent: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status='active' AND (word_count < 50 OR word_count IS NULL)").get().c,
  withEntityMentions: db.prepare("SELECT COUNT(DISTINCT site_id) as c FROM entity_mentions").get().c
};
console.log(JSON.stringify(stats, null, 2));
