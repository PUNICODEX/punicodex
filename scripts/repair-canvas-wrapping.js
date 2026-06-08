const fs = require('fs');
const path = require('path');

const BROKEN = [
  'prometheus', 'ares', 'medousa',
  'aphrodite', 'apollon', 'artemis', 'athena', 'atlas',
  'demeter', 'hephaistos', 'hestia', 'persephone'
];

const SITES_DIR = path.join(__dirname, '..', 'sites');

const BOUNDARY_PATTERNS = [
  'const revealElements = document.querySelectorAll',
  'const revealElements = document.querySelector',
  "const nav = document.getElementById('main-nav')",
  "const nav = document.querySelector('.nav-links')",
  "const nav = document.querySelector('.main-nav')",
  "const navToggle = document.getElementById('nav-toggle')",
  "const navLinks = document.querySelector('.nav-links')",
  '// Scroll Reveal',
  '// Reveal',
  '/* Scroll Reveals',
  '/* Reveal',
  'SCROLL REVEALS',
  '// Navigation',
  '// Nav',
  '/* Navigation',
  '/* Nav',
  'NAV SCROLL EFFECT',
  'MOBILE NAV TOGGLE',
  '// Mobile Nav',
  '// Parallax',
  '/* Parallax',
  'MASCOT PARALLAX',
  '// Mouse',
  '/* Mouse',
  '// Smooth Scroll',
  '/* Smooth Scroll',
  'SMOOTH SCROLL',
  '// Prefers Reduced',
  '/* Prefers Reduced',
  'PREFERS REDUCED MOTION',
];

function stripComments(code) {
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < code.length && code[i] !== '\n') i++;
      result += ' '.repeat(i - start);
    } else if (code[i] === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      if (i < code.length) i += 2;
      result += ' '.repeat(i - start);
    } else if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      result += code[i];
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') { result += code[i]; i++; }
        result += code[i];
        i++;
      }
      if (i < code.length) { result += code[i]; i++; }
    } else {
      result += code[i];
      i++;
    }
  }
  return result;
}

function findInjectedElseBlock(code, templeId) {
  // Find the console.log pattern first
  const logPattern = new RegExp(
    `console\\.log\\('\\[${templeId}\\]\\s*Canvas\\s+([^'\\]]+)\\s+not\\s+present\\s+on\\s+this\\s+page'\\);`
  );
  const logMatch = code.match(logPattern);
  if (!logMatch) return null;

  const logEnd = logMatch.index + logMatch[0].length;
  // Find the closing } after the log
  const closingBraceMatch = code.slice(logEnd).match(/^\s*\}/);
  if (!closingBraceMatch) return null;
  const blockEnd = logEnd + closingBraceMatch[0].length;

  // Find the opening } else { before the log
  const beforeLog = code.slice(0, logMatch.index);
  const elseMatch = beforeLog.match(/\}\s*else\s*\{[^}]*$/);
  if (!elseMatch) return null;
  const blockStart = elseMatch.index;

  return {
    start: blockStart,
    end: blockEnd,
    templeId,
    canvasId: logMatch[1].trim(),
  };
}

function findCorrectBoundary(code, initPos) {
  const stripped = stripComments(code);
  let boundaryPos = -1;
  let matchedPattern = null;

  for (const pattern of BOUNDARY_PATTERNS) {
    const pos = stripped.indexOf(pattern, initPos + 200);
    if (pos !== -1 && (boundaryPos === -1 || pos < boundaryPos)) {
      boundaryPos = pos;
      matchedPattern = pattern;
    }
  }

  if (boundaryPos === -1) {
    const iifeEnd = stripped.indexOf('})();', initPos + 200);
    if (iifeEnd !== -1) {
      boundaryPos = iifeEnd;
      matchedPattern = '})();';
    }
  }

  return { pos: boundaryPos, pattern: matchedPattern };
}

function repairFile(templeId) {
  const filePath = path.join(SITES_DIR, templeId, 'script.js');
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${filePath} not found`);
    return { ok: false, reason: 'not-found' };
  }

  let code = fs.readFileSync(filePath, 'utf8');

  const injected = findInjectedElseBlock(code, templeId);
  if (!injected) {
    console.log(`  SKIP: ${templeId} - no injected } else { block found`);
    return { ok: false, reason: 'no-injected-else' };
  }

  console.log(`  Found injected } else { at pos ${injected.start}-${injected.end} (canvas: ${injected.canvasId})`);

  const canvasInitMatch = code.match(/const canvas = document\.getElementById\('([^']+)'\);/);
  if (!canvasInitMatch) {
    console.log(`  SKIP: ${templeId} - no canvas init found`);
    return { ok: false, reason: 'no-canvas-init' };
  }
  const initPos = canvasInitMatch.index;
  const canvasId = canvasInitMatch[1];

  // Check if the injected block is inside a multi-line comment
  const beforeInjected = code.slice(0, injected.start);
  const lastCommentOpen = beforeInjected.lastIndexOf('/*');
  const lastCommentClose = beforeInjected.lastIndexOf('*/');
  const isInsideComment = lastCommentOpen > lastCommentClose;

  if (isInsideComment) {
    console.log(`  Detected: injected block is inside a multi-line comment`);
  }

  // Remove the injected block
  code = code.slice(0, injected.start) + code.slice(injected.end);

  // If the injected block was inside a comment, we also need to fix the broken comment
  if (isInsideComment) {
    // Find and clean up the corrupted comment
    // The pattern is: /* ... text before injected } else { 
    //                 (injected block was here)
    //                 text after injected */
    // We need to restore it to a clean comment
    const commentStart = code.lastIndexOf('/*', injected.start);
    const commentEnd = code.indexOf('*/', injected.start);
    if (commentStart !== -1 && commentEnd !== -1) {
      const beforeComment = code.slice(0, commentStart);
      const afterComment = code.slice(commentEnd + 2);
      // Check what's in the comment - if it's just whitespace + section name, keep it
      const commentContent = code.slice(commentStart + 2, commentEnd);
      const cleaned = commentContent.replace(/\s+/g, ' ').trim();
      if (cleaned.length < 5 || !cleaned.match(/[a-zA-Z]{3}/)) {
        // Empty or nearly empty comment - remove it entirely
        code = beforeComment + afterComment;
      } else {
        // Keep the cleaned comment
        code = beforeComment + '/* ' + cleaned + ' */' + afterComment;
      }
    }
  }

  const boundary = findCorrectBoundary(code, initPos);
  if (boundary.pos === -1) {
    console.log(`  SKIP: ${templeId} - no boundary found`);
    return { ok: false, reason: 'no-boundary' };
  }
  console.log(`  Correct boundary: "${boundary.pattern}" at pos ${boundary.pos}`);

  const beforeBoundary = code.slice(0, boundary.pos);
  const afterBoundary = code.slice(boundary.pos);

  const indent = '\n    ';
  const insertion =
    indent + `} else {` +
    indent + `  console.log('[${templeId}] Canvas ${canvasId} not present on this page');` +
    indent + `}`;

  code = beforeBoundary + insertion + afterBoundary;

  try {
    new Function(code);
  } catch (e) {
    console.log(`  SYNTAX ERROR after repair: ${e.message}`);
    return { ok: false, reason: 'syntax-error', error: e.message };
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`  REPAIRED: ${templeId}`);
  return { ok: true };
}

console.log('Repairing canvas wrapping for broken flagships...\n');
let fixed = 0;
let failed = 0;

for (const id of BROKEN) {
  console.log(`${id}:`);
  const result = repairFile(id);
  if (result.ok) {
    fixed++;
  } else {
    failed++;
  }
}

console.log(`\nDone: ${fixed} fixed, ${failed} failed.`);
