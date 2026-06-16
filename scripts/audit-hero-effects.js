const fs = require('fs');
const path = require('path');

const sitesDir = 'sites';
const dirs = fs.readdirSync(sitesDir).filter((id) => fs.statSync(path.join(sitesDir, id)).isDirectory());
const flagships = dirs.filter((id) => fs.existsSync(path.join(sitesDir, id, 'gallery')));

function analyze(id) {
  const idx = fs.readFileSync(path.join(sitesDir, id, 'index.html'), 'utf8');
  const canvasMatch = idx.match(/<canvas[^>]+class="hero-canvas"[^>]*>/);
  const hasInlineInit = /<script[\s\S]*?>(?:(?!<\/script>).)*?getContext\s*\(\s*['"]2d['"]\s*\)/s.test(idx);
  const hasEffectAttr = /data-effect=/.test(idx);
  const effectMatch = idx.match(/data-effect="([^"]+)"/);
  return {
    id,
    hasCanvas: !!canvasMatch,
    hasInlineInit,
    hasEffectAttr,
    effect: effectMatch ? effectMatch[1] : null,
  };
}

const results = flagships.map(analyze).sort((a, b) => {
  if (a.hasEffectAttr !== b.hasEffectAttr) return a.hasEffectAttr ? 1 : -1;
  if (a.hasInlineInit !== b.hasInlineInit) return a.hasInlineInit ? 1 : -1;
  return a.id.localeCompare(b.id);
});

console.log(JSON.stringify(results, null, 2));
