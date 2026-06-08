const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');

function fixFile(templeId) {
  const filePath = path.join(SITES_DIR, templeId, 'script.js');
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'not-found' };

  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Fix split words (from repair script corruption)
  if (code.includes('addEventListe\n')) {
    code = code.replace(/addEventListe\n\s*ner\b/g, 'addEventListener');
    changed = true;
    console.log(`  ${templeId}: fixed split addEventListener`);
  }

  // 2. Fix canvas.style.display references after } else { block
  // Find all unguarded canvas.style.display = ... that are outside if (canvas) blocks
  // Replace: canvas.style.display = '...';
  // With:    if (canvas) canvas.style.display = '...';
  const displayMatches = [...code.matchAll(/(^|\n)(\s*)(canvas\.style\.display\s*=\s*['"][^'"]+['"];)/g)];
  for (const m of displayMatches) {
    const lineStart = m.index + 1; // after the \n
    const indent = m[2];
    const original = m[3];
    const replacement = `if (canvas) ${original}`;
    // Only replace if not already guarded
    const beforeMatch = code.slice(Math.max(0, lineStart - 30), lineStart);
    if (!beforeMatch.includes('if (canvas)')) {
      code = code.slice(0, lineStart) + indent + replacement + code.slice(lineStart + indent.length + original.length);
      changed = true;
      console.log(`  ${templeId}: guarded canvas.style.display`);
    }
  }

  // 3. Fix initialization calls after } else { console.log('[id] Canvas ...'); }
  // These calls should be inside the if (ctx) block, not after it.
  // Pattern: after the } else { ... } block, there are calls like resize(); initX(); animate();
  // We need to move them inside the if (ctx) block, before the } else {
  const elseMatch = code.match(/(\n[ \t]*)\}\s*else\s*\{\s*\n\s*console\.log\('\[[^\]]+\]\s*Canvas[^']+not present[^']*'\);\s*\n\s*\}/);
  if (elseMatch) {
    const elseBlockStart = elseMatch.index;
    const elseBlockEnd = elseBlockStart + elseMatch[0].length;
    const afterElse = code.slice(elseBlockEnd);

    // Find initialization calls in the first few lines after } else { block
    const initCallRegex = /^(\s*)(resize|initTilt|animate|initElements|animateCanvas|animateLightning|initMist|initSparks|initKeys|initEmbers|initWaves|initParticles|initFlares|initTrails|initTendrils|initSouls|initHelm|initFire|initButterflies|initLeaves|initWheat|initSunbeams|initStars|initDust|initGlow|initOrbs|initPaths|initSnow|initRain|initFog|initClouds|initLightning|initBolts|initBranches|initSegments|initGlows|initFlashes|initPulses|initRings|initSpirals|initHexes|initNodes|initLinks|initTriangles|initCircles|initSquares|initDiamonds|initCrosses|initArrows|initDots|initLines|initCurves|initShapes|initForms|initPatterns|initTextures|initGradients|initShadows|initHighlights|initReflections|initRefractions|initDiffractions|initInterference|initScattering|initAbsorption|initEmission|initTransmission)\s*\(\)\s*;?\s*\n/gm;

    let initCalls = [];
    let m;
    const maxScan = 500;
    const scanArea = afterElse.slice(0, maxScan);
    while ((m = initCallRegex.exec(scanArea)) !== null) {
      initCalls.push(m[0]);
    }

    if (initCalls.length > 0) {
      // Remove the init calls from after the } else { block
      let cleanedAfter = afterElse;
      for (const call of initCalls) {
        cleanedAfter = cleanedAfter.replace(call, '');
      }
      code = code.slice(0, elseBlockStart) + '\n' + initCalls.join('') + code.slice(elseBlockStart, elseBlockEnd) + cleanedAfter;
      changed = true;
      console.log(`  ${templeId}: moved init calls inside if (ctx): ${initCalls.map(s => s.trim()).join(', ')}`);
    }
  }

  if (!changed) {
    return { ok: true, changed: false };
  }

  try {
    new Function(code);
  } catch (e) {
    console.log(`  ${templeId}: SYNTAX ERROR: ${e.message}`);
    return { ok: false, reason: 'syntax-error', error: e.message };
  }

  fs.writeFileSync(filePath, code, 'utf8');
  return { ok: true, changed: true };
}

// Files known to have issues
const TO_FIX = [
  'athena', 'atlas',           // split addEventListener
  'demeter', 'artemis',        // init calls after } else {
  'gaia', 'hades', 'hera', 'jotunheimr', 'kobe', 'kyoto',
  'midgardr', 'olympos', 'osaka', 'pontos', 'poseidon',
  'ragnarok', 'zeus', 'athenai' // canvas.style.display after } else {
];

console.log('Fixing runtime issues...\n');
let fixed = 0;
let unchanged = 0;
let failed = 0;

for (const id of TO_FIX) {
  const result = fixFile(id);
  if (result.ok && result.changed) fixed++;
  else if (result.ok && !result.changed) unchanged++;
  else failed++;
}

// Also scan ALL flagships for any remaining issues
console.log('\n--- Scanning ALL flagships for remaining issues ---');
const dirs = fs.readdirSync(SITES_DIR).filter(d => {
  return fs.existsSync(path.join(SITES_DIR, d, 'script.js'));
}).sort();

for (const id of dirs) {
  const filePath = path.join(SITES_DIR, id, 'script.js');
  const code = fs.readFileSync(filePath, 'utf8');

  // Check for split words
  if (/addEventListe\n\s*ner\b/.test(code)) {
    console.log(`  ${id}: STILL HAS split addEventListener`);
  }

  // Check for unguarded canvas.style.display
  const displayMatches = [...code.matchAll(/(^|\n)(\s*)(canvas\.style\.display\s*=\s*['"][^'"]+['"];)/g)];
  for (const m of displayMatches) {
    const lineStart = m.index + 1;
    const beforeMatch = code.slice(Math.max(0, lineStart - 30), lineStart);
    if (!beforeMatch.includes('if (canvas)')) {
      console.log(`  ${id}: STILL HAS unguarded canvas.style.display`);
      break;
    }
  }
}

console.log(`\nDone: ${fixed} fixed, ${unchanged} unchanged, ${failed} failed.`);
