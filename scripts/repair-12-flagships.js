/**
 * Repair script for 12 corrupted flagship temples.
 *
 * Strategy:
 * 1. Extract booking system from current (corrupted) file
 * 2. Revert script.js to 85bd6e53 (pre-corruption)
 * 3. Apply proper canvas wrapping using line-based boundary detection
 * 4. Append extracted booking system
 * 5. Verify syntax
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const BROKEN = [
  'aphrodite', 'apollon', 'ares', 'artemis', 'athena', 'atlas',
  'demeter', 'hephaistos', 'hestia', 'medousa', 'persephone', 'prometheus'
];

// Non-canvas section headers (line-based, case-insensitive)
const NON_CANVAS_PATTERNS = [
  /SCROLL REVEALS/i,
  /NAV SCROLL EFFECT/i,
  /MOBILE NAV TOGGLE/i,
  /SMOOTH SCROLL/i,
  /PREFERS REDUCED MOTION/i,
  /3D TILT ON CARDS/i,
  /CARD HOVER/i,
  /MASCOT PARALLAX/i,
];

// Canvas init calls that must stay inside if(ctx)
const INIT_CALL_PATTERNS = [
  /^\s*window\.addEventListener\('resize',\s*(resize|resizeCanvas)\)/,
  /^\s*(resize|resizeCanvas)\s*\(\)\s*;?\s*$/,
  /^\s*(animate|animateCanvas)\s*\(\)\s*;?\s*$/,
  /^\s*init(Tilt|Elements|Petals|Doves|Hearts|Bubbles|Mists|Sparks|Keys|Embers|Waves|Particles|Flares|Trails|Tendrils|Souls|Helm|Fire|Butterflies|Leaves|Wheat|Sunbeams|Stars|Dust|Glow|Orbs|Paths|Snow|Rain|Fog|Clouds|Lightning|Bolts|Branches|Segments|Glows|Flashes|Pulses|Rings|Spirals|Hexes|Nodes|Links|Triangles|Circles|Squares|Diamonds|Crosses|Arrows|Dots|Lines|Curves|Shapes|Forms|Patterns|Textures|Gradients|Shadows|Highlights|Reflections|Refractions|Diffractions|Interference|Scattering|Absorption|Emission|Transmission)\s*\(\)\s*;?\s*$/,
];

function isInitCall(line) {
  return INIT_CALL_PATTERNS.some(re => re.test(line));
}

function findNonCanvasStart(lines, afterLine) {
  for (let i = afterLine; i < lines.length; i++) {
    for (const re of NON_CANVAS_PATTERNS) {
      if (re.test(lines[i])) {
        // If this is inside a /* */ block, find the start of the block
        if (!lines[i].trim().startsWith('//')) {
          // Walk back to find /*
          for (let j = i; j >= afterLine; j--) {
            if (lines[j].includes('/*')) {
              return j;
            }
          }
        }
        return i;
      }
    }
  }
  return -1;
}

function repairFile(id) {
  const filePath = path.join(SITES_DIR, id, 'script.js');

  // Step 1: Extract booking system from current file
  let currentJs = fs.readFileSync(filePath, 'utf8');
  const bookingMarker = '// ========== BOOKING SYSTEM ==========';
  const bookingIdx = currentJs.indexOf(bookingMarker);
  const bookingSystem = bookingIdx !== -1 ? currentJs.slice(bookingIdx) : '';

  // Step 2: Revert to 85bd6e53
  let baseJs;
  try {
    baseJs = execSync(`git show 85bd6e53:sites/${id}/script.js`, { encoding: 'utf8' });
  } catch (e) {
    console.log(`  ${id}: ERROR - could not revert to 85bd6e53: ${e.message}`);
    return false;
  }

  const lines = baseJs.split('\n').map(l => l.replace(/\r$/, ''));

  // Step 3: Find canvas init
  let canvasLine = -1;
  let ctxLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (canvasLine === -1 && lines[i].includes("const canvas = document.getElementById")) {
      canvasLine = i;
    }
    if (ctxLine === -1 && lines[i].includes("const ctx = canvas.getContext('2d')")) {
      ctxLine = i;
    }
  }

  if (canvasLine === -1 || ctxLine === -1) {
    console.log(`  ${id}: ERROR - could not find canvas init`);
    return false;
  }

  // Find the canvas element ID
  const canvasMatch = lines[canvasLine].match(/document\.getElementById\('([^']+)'\)/);
  const canvasId = canvasMatch ? canvasMatch[1] : 'canvas';

  // Find first non-canvas section after ctx init
  const nonCanvasStart = findNonCanvasStart(lines, ctxLine + 1);

  if (nonCanvasStart === -1) {
    // No non-canvas sections - use early return guard
    const newLines = [...lines];
    newLines[canvasLine] = `const canvas = document.getElementById('${canvasId}');`;
    newLines[ctxLine] = `    if (!canvas) { console.log('[${id}] Canvas ${canvasId} not present on this page'); return; }\n    const ctx = canvas.getContext('2d');`;
    baseJs = newLines.join('\n');
  } else {
    // Find canvas init calls between nonCanvasStart and end of file
    const initCalls = [];
    for (let i = nonCanvasStart; i < lines.length; i++) {
      if (isInitCall(lines[i])) {
        initCalls.push({ line: i, text: lines[i] });
      }
    }

    // Reconstruct
    const newLines = [];

    // Before canvas init (keep as-is)
    for (let i = 0; i < canvasLine; i++) {
      newLines.push(lines[i]);
    }

    // Canvas init with guard
    newLines.push(`const canvas = document.getElementById('${canvasId}');`);
    newLines.push(`    const ctx = canvas ? canvas.getContext('2d') : null;`);
    newLines.push(`    if (ctx) {`);

    // Canvas code (from after ctx init to nonCanvasStart)
    for (let i = ctxLine + 1; i < nonCanvasStart; i++) {
      newLines.push(lines[i]);
    }

    // Move init calls inside if(ctx)
    for (const call of initCalls) {
      newLines.push(call.text);
    }

    // Close if(ctx)
    newLines.push(`    } else {`);
    newLines.push(`      console.log('[${id}] Canvas ${canvasId} not present on this page');`);
    newLines.push(`    }`);

    // Non-canvas code (skip init calls since we moved them)
    const initCallLines = new Set(initCalls.map(c => c.line));
    for (let i = nonCanvasStart; i < lines.length; i++) {
      if (!initCallLines.has(i)) {
        newLines.push(lines[i]);
      }
    }

    baseJs = newLines.join('\n');
  }

  // Step 4: Append booking system
  if (bookingSystem) {
    baseJs = baseJs + '\n\n' + bookingSystem;
  }

  // Step 5: Fix split addEventListener artifacts
  baseJs = baseJs.replace(/addEventLis\s*\n\s*tener/g, 'addEventListener');

  // Step 6: Guard unguarded canvas.style.display
  baseJs = baseJs.replace(/(^|\n)(\s*)(canvas\.style\.display\s*=\s*['"][^'"]+['"];)/g, (match, newline, indent, stmt) => {
    const idx = baseJs.indexOf(match);
    const preceding = baseJs.slice(Math.max(0, idx - 20), idx);
    if (preceding.includes('if (canvas)')) return match;
    return newline + indent + 'if (canvas) ' + stmt;
  });

  // Step 7: Verify syntax
  try {
    new Function(baseJs);
  } catch (e) {
    console.log(`  ${id}: SYNTAX ERROR - ${e.message}`);
    return false;
  }

  // Step 8: Verify scroll reveals are outside if(ctx)
  const verifyLines = baseJs.split('\n');
  let ifCtxLine = -1, elseLine = -1;
  for (let i = 0; i < verifyLines.length; i++) {
    if (ifCtxLine === -1 && verifyLines[i].match(/^\s*if\s*\(\s*ctx\s*\)/)) ifCtxLine = i;
    if (ifCtxLine !== -1 && elseLine === -1 && verifyLines[i].match(/^\s*}\s*else\s*{/)) {
      let depth = 1;
      for (let j = ifCtxLine + 1; j < i; j++) {
        for (let c = 0; c < verifyLines[j].length; c++) {
          if (verifyLines[j][c] === '{') depth++;
          else if (verifyLines[j][c] === '}') depth--;
        }
      }
      if (depth === 1) { elseLine = i; break; }
    }
  }

  let scrollInside = false;
  if (ifCtxLine !== -1 && elseLine !== -1) {
    for (let i = ifCtxLine + 1; i < elseLine; i++) {
      if (verifyLines[i].match(/SCROLL REVEALS/i)) { scrollInside = true; break; }
    }
  }

  if (scrollInside) {
    console.log(`  ${id}: WARNING - scroll reveals still inside if(ctx)`);
    return false;
  }

  fs.writeFileSync(filePath, baseJs, 'utf8');
  console.log(`  ${id}: Repaired successfully`);
  return true;
}

console.log('Repairing 12 corrupted flagships...\n');
let fixed = 0, failed = 0;
for (const id of BROKEN) {
  if (repairFile(id)) fixed++;
  else failed++;
}
console.log(`\nDone: ${fixed} repaired, ${failed} failed.`);
