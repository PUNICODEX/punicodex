const fs = require('fs');
const path = require('path');

const SITES_DIR = 'sites';

// Diverse sample: flagships, generated, different pantheons
const sample = [
  'zeus',       // Greek flagship (pre-batch)
  'poseidon',   // Greek flagship (batch)
  'ares',       // Greek flagship (pre-batch)
  'aigyptos',   // Egyptian flagship (pre-batch)
  'ab',         // Egyptian generated (first batch)
  'odinn',      // Norse
  'amaterasu',  // Japanese
  'osiris',     // Egyptian
  'shiva',      // Sanskrit
  'thor',       // Norse
  'loki',       // Norse generated
  'ra',         // Egyptian flagship (pre-batch, template source)
  'nike',       // Greek flagship (pre-batch, template source)
];

const TEMPLATE_SOURCES = new Set(['nike', 'ra']);

const issues = [];

function checkCanvasGuard(js, templeId) {
  // New surgical guard: if (ctx) {
  if (js.includes('if (ctx)')) return 'ok';
  // Base temple guard: if (particleCanvas && ...)
  if (js.includes('if (particleCanvas')) return 'ok';
  // Old broken guard: if (!canvas) { ... return; }
  if (js.match(/if\s*\(\s*!canvas\s*\)\s*\{[^}]*return;/)) return 'old-broken';
  // Any other if (!canvas) pattern is considered safe (if/else, compound conditions)
  if (js.includes('if (!canvas)')) return 'ok';
  if (js.includes('if (canvas)')) return 'ok';
  return 'missing';
}

function check(templeId) {
  const templePath = path.join(SITES_DIR, templeId);
  const isTemplate = TEMPLATE_SOURCES.has(templeId);
  const results = { id: templeId, issues: [] };

  // Check homepage
  const homePath = path.join(templePath, 'index.html');
  if (fs.existsSync(homePath)) {
    const home = fs.readFileSync(homePath, 'utf8');
    if (!home.includes('endorsement-hero')) results.issues.push('Home: missing endorsement-hero');
    if (!home.includes('booking-modal')) results.issues.push('Home: missing booking-modal');
    if (!isTemplate && (home.includes('Níkē') || home.includes('Νίκη'))) results.issues.push('Home: Nike clone DNA');
    if (!home.includes('footer-value')) results.issues.push('Home: missing footer');
    if (!isTemplate && home.includes('Greek Original')) results.issues.push('Home: still says Greek Original');
    if (!isTemplate && !home.includes('Original Script')) results.issues.push('Home: missing Original Script');
    if (!home.includes('.com')) results.issues.push('Home: footer domain missing .com');
  } else {
    results.issues.push('Home: file missing');
  }

  // Check lore
  const lorePath = path.join(templePath, 'lore', 'index.html');
  if (fs.existsSync(lorePath)) {
    const lore = fs.readFileSync(lorePath, 'utf8');
    if (!lore.includes('tab-nav')) results.issues.push('Lore: missing tab-nav');
    if (!isTemplate && (lore.includes('Níkē') || lore.includes('Νίκη'))) results.issues.push('Lore: Nike clone DNA');
    if (!lore.includes('footer-value')) results.issues.push('Lore: missing footer');
    if (!isTemplate && lore.includes('Greek Original')) results.issues.push('Lore: still says Greek Original');
    if (!isTemplate && !lore.includes('Original Script')) results.issues.push('Lore: missing Original Script');
  } else {
    results.issues.push('Lore: file missing');
  }

  // Check gallery
  const galleryPath = path.join(templePath, 'gallery', 'index.html');
  if (fs.existsSync(galleryPath)) {
    const gallery = fs.readFileSync(galleryPath, 'utf8');
    if (!gallery.includes('tab-nav')) results.issues.push('Gallery: missing tab-nav');
    if (!gallery.includes('gallery-placeholder') && !gallery.includes('gallery-grid')) results.issues.push('Gallery: missing placeholder/grid');
    if (!isTemplate && (gallery.includes('Níkē') || gallery.includes('Νίκη'))) results.issues.push('Gallery: Nike clone DNA');
    if (!gallery.includes('footer-value')) results.issues.push('Gallery: missing footer');
    if (!isTemplate && gallery.includes('Greek Original')) results.issues.push('Gallery: still says Greek Original');
  } else {
    results.issues.push('Gallery: file missing');
  }

  // Check script.js
  const jsPath = path.join(templePath, 'script.js');
  if (fs.existsSync(jsPath)) {
    const js = fs.readFileSync(jsPath, 'utf8');
    const bookingCount = (js.match(/BOOKING SYSTEM/g) || []).length;
    if (bookingCount === 0) results.issues.push('JS: missing booking system');
    if (bookingCount > 1) results.issues.push('JS: duplicate booking system (' + bookingCount + ')');
    
    if (!isTemplate) {
      const guardStatus = checkCanvasGuard(js, templeId);
      if (guardStatus === 'missing') results.issues.push('JS: missing canvas guard');
      if (guardStatus === 'old-broken') results.issues.push('JS: old broken canvas guard (return exits IIFE)');
    }
  } else {
    results.issues.push('JS: file missing');
  }

  // Check CSS
  const cssPath = path.join(templePath, 'styles.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    if (!css.includes('GALLERY')) results.issues.push('CSS: missing GALLERY block');
    if (!css.includes('.gallery-placeholder')) results.issues.push('CSS: missing gallery-placeholder styles');
  } else {
    results.issues.push('CSS: file missing');
  }

  return results;
}

console.log('AUDIT REPORT\n' + '='.repeat(60));
let totalIssues = 0;
for (const id of sample) {
  const r = check(id);
  if (r.issues.length === 0) {
    console.log(`✅ ${id}: PASS`);
  } else {
    console.log(`❌ ${id}: ${r.issues.length} issue(s)`);
    for (const issue of r.issues) {
      console.log(`   - ${issue}`);
    }
    totalIssues += r.issues.length;
  }
}
console.log('='.repeat(60));
console.log(`Total temples audited: ${sample.length}`);
console.log(`Total issues found: ${totalIssues}`);
if (totalIssues === 0) {
  console.log('ALL CHECKS PASSED');
}
