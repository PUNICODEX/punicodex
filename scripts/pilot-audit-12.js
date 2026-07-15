const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IDS = ['zeus','ra','thor','shiva','long','quetzalcoatl','oshun','jizo','manannan','dazhbog','amitabha','ea'];

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function audit(id) {
  const dir = path.join(ROOT, 'sites', id);
  const lore = fs.readFileSync(path.join(dir, 'lore', 'index.html'), 'utf8');
  const extended = fs.existsSync(path.join(dir, 'lore', 'extended', 'index.html'))
    ? fs.readFileSync(path.join(dir, 'lore', 'extended', 'index.html'), 'utf8')
    : '';
  const gallery = fs.existsSync(path.join(dir, 'gallery', 'index.html'))
    ? fs.readFileSync(path.join(dir, 'gallery', 'index.html'), 'utf8')
    : '';

  const title = extract(lore, /<title>([^<]+)<\/title>/);
  const subtitle = extract(lore, /<p class="hero-subtitle[^"]*"[^>]*>([^<]+)<\/p>/);

  const hasPlaceholder = lore.includes('section-provenance-placeholder') ||
    lore.includes('script-altar-placeholder') ||
    /script-placeholder-note|bespoke provenance study|being prepared|Contribute scholarly provenance/.test(lore);

  const sectionHeadings = [...lore.matchAll(/<h2[^>]*class="section-title"[^>]*>([^<]+)<\/h2>/g)].map(m => stripTags(m[1]));

  const provenanceBlocks = (lore.match(/provenance-block/g) || []).length;
  const signCards = (lore.match(/sign-card/g) || []).length;
  const emptySignCards = (lore.match(/<div class="sign-name"><\/div>/g) || []).length;

  const galleryImages = (gallery.match(/<img /g) || []).length;
  const galleryItems = (gallery.match(/gallery-item|gallery-card/g) || []).length;

  const mythSection = lore.includes('section-myth') || lore.includes('The Myth') || lore.includes('Mythic Narrative');
  const legacySection = lore.includes('section-legacy') || lore.includes('Cultural Legacy') || lore.includes('Legacy');
  const sourceSection = lore.includes('section-sources') || lore.includes('Scholarly Sources') || lore.includes('Primary Sources');

  const wordCount = stripTags(lore).split(/\s+/).length;
  const extendedWordCount = stripTags(extended).split(/\s+/).length;

  const truncatedSubtitle = subtitle && (subtitle.endsWith('...') || subtitle.endsWith('the') || subtitle.endsWith('and'));

  return {
    id,
    title,
    subtitle,
    hasPlaceholder,
    sectionHeadings,
    provenanceBlocks,
    signCards,
    emptySignCards,
    galleryImages,
    galleryItems,
    mythSection,
    legacySection,
    sourceSection,
    wordCount,
    extendedWordCount,
    truncatedSubtitle
  };
}

const results = IDS.map(audit);
console.log(JSON.stringify(results, null, 2));
