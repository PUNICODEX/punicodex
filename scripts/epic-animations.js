const fs = require('fs');

const sites = [
  {
    name: 'nike',
    symbol: '✦',
    animName: 'nike-victory',
    particleColor: 'rgba(212,175,55,0.4)',
    keyframes: `
@keyframes nike-symbol {
    0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); }
    25% { transform: scale(1.15) rotate(5deg); filter: drop-shadow(0 0 8px rgba(212,175,55,0.6)); }
    50% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(212,175,55,0.4)); }
    75% { transform: scale(1.15) rotate(-5deg); filter: drop-shadow(0 0 8px rgba(212,175,55,0.6)); }
}
`,
    symbolAnim: 'nike-symbol 3s ease-in-out infinite',
  },
  {
    name: 'hermes',
    symbol: '⚕',
    animName: 'hermes-speed',
    particleColor: 'rgba(192,192,192,0.35)',
    keyframes: `
@keyframes hermes-symbol {
    0% { transform: rotate(0deg); filter: drop-shadow(0 0 2px rgba(212,175,55,0.2)); }
    100% { transform: rotate(360deg); filter: drop-shadow(0 0 6px rgba(212,175,55,0.5)); }
}
@keyframes hermes-streak {
    0% { transform: translateX(-120%); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateX(120%); opacity: 0; }
}
`,
    symbolAnim: 'hermes-symbol 8s linear infinite',
  },
  {
    name: 'ra',
    symbol: '☉',
    animName: 'ra-sun',
    particleColor: 'rgba(255,180,60,0.4)',
    keyframes: `
@keyframes ra-symbol {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 3px rgba(255,180,60,0.4)); }
    50% { transform: scale(1.2); filter: drop-shadow(0 0 12px rgba(255,180,60,0.8)); }
}
@keyframes ra-ray {
    0% { transform: rotate(0deg); opacity: 0.3; }
    50% { opacity: 0.6; }
    100% { transform: rotate(360deg); opacity: 0.3; }
}
`,
    symbolAnim: 'ra-symbol 2.5s ease-in-out infinite',
  },
];

// Shared animation keyframes
const sharedKeyframes = `
@keyframes shimmer-sweep {
    0% { left: -100%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { left: 200%; opacity: 0; }
}
@keyframes float-up {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    15% { opacity: 0.6; }
    85% { opacity: 0.6; }
    100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
}
@keyframes available-pulse {
    0%, 100% { opacity: 0.25; transform: translateX(-50%) translateY(4px) scale(0.92); }
    50% { opacity: 0.85; transform: translateX(-50%) translateY(0) scale(1); }
}
`;

for (const site of sites) {
  const cssFile = `sites/${site.name}/styles.css`;
  const jsFile = `sites/${site.name}/script.js`;

  // ─── CSS CLEANUP & INJECTION ───
  let css = fs.readFileSync(cssFile, 'utf8');

  // Remove ALL blocks that start with selectors containing .space-reserve (but NOT .space-reserved)
  // Also remove .space-price, .space-price-group, .space-price-note blocks
  // Strategy: split by lines, track block depth, remove blocks with target selectors
  const lines = css.split('\n');
  const cleaned = [];
  let skipDepth = 0;
  let inTargetBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts a CSS rule block
    if (skipDepth === 0 && trimmed.endsWith('{') && !trimmed.startsWith('/*')) {
      const selector = trimmed.slice(0, -1).trim();
      // Check if selector contains target classes (but NOT space-reserved)
      const hasReserve = selector.includes('.space-reserve') && !selector.includes('.space-reserved');
      const hasPrice = selector.includes('.space-price') && !selector.includes('.space-reserved');
      const hasFooter = selector.includes('.space-footer') && !selector.includes('.space-reserved');
      if (hasReserve || hasPrice || hasFooter) {
        inTargetBlock = true;
        skipDepth = 1;
        continue; // skip this opening line
      }
    }

    if (inTargetBlock) {
      // Count braces to track nested blocks
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      skipDepth += openBraces - closeBraces;
      if (skipDepth <= 0) {
        inTargetBlock = false;
        skipDepth = 0;
      }
      continue; // skip this line
    }

    cleaned.push(line);
  }

  css = cleaned.join('\n');

  // Clean up double blank lines
  css = css.replace(/\n{3,}/g, '\n\n');

  // Build the new styles block
  const newStyles = `
/* ═══════════════════════════════════════════════════════════════
   ARCHETYPE ANIMATIONS — ${site.name.toUpperCase()}
   ═══════════════════════════════════════════════════════════════ */

/* Frame is the interactive element */
.space-frame {
    cursor: pointer;
}

/* Shimmer sweep across frame */
.space-frame::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(212,175,55,0.06), transparent);
    transform: skewX(-20deg);
    animation: shimmer-sweep 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
}

/* Archetype symbol replaces diamond */
.space-placeholder-logo {
    font-size: 0;
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
}
.space-placeholder-logo::before {
    content: '${site.symbol}';
    font-size: 1.1rem;
    color: var(--classic-gold);
    animation: ${site.symbolAnim};
    display: block;
}

/* Floating particles inside frame */
.space-frame-content::before {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: ${site.particleColor};
    top: 60%;
    left: 25%;
    animation: float-up 4s ease-in-out infinite;
    pointer-events: none;
}
.space-frame-content .particle-2,
.space-frame-content .particle-3 {
    display: none;
}

/* Elegant "Available" hover label */
.space-frame-content::after {
    content: 'Available';
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    font-family: var(--font-display);
    font-size: clamp(0.28rem, 0.7vw, 0.5rem);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(212,175,55,0.5);
    opacity: 0;
    transition: all 0.35s ease;
    pointer-events: none;
    white-space: nowrap;
}
.space-frame:hover .space-frame-content::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    color: rgba(212,175,55,0.75);
}

/* Refined glow on hover */
.space-frame:hover {
    border-color: rgba(212,175,55,0.25);
    box-shadow: 0 0 20px rgba(212,175,55,0.06), inset 0 0 30px rgba(212,175,55,0.03);
}
.space-frame:hover .space-frame-glow {
    opacity: 0.7;
}
${site.keyframes}
${sharedKeyframes}
`;

  // Insert before .space-frame--hero
  css = css.replace(/(\.space-frame--hero \{)/, newStyles + '$1');

  // Insert mobile styles at the end of the @media (max-width: 768px) block
  const mobileStyles = `
    .space-placeholder-logo {
        width: 24px;
        height: 24px;
    }
    .space-placeholder-logo::before {
        font-size: 0.85rem;
    }
    /* Mobile: Available pulses randomly per slot */
    .space-frame-content::after {
        opacity: 0.5;
        animation: available-pulse 3.5s ease-in-out infinite;
    }
    .space-slot:nth-child(1) .space-frame-content::after { animation-delay: 0s; }
    .space-slot:nth-child(2) .space-frame-content::after { animation-delay: 0.7s; }
    .space-slot:nth-child(3) .space-frame-content::after { animation-delay: 1.4s; }
    .space-slot:nth-child(4) .space-frame-content::after { animation-delay: 2.1s; }
    .space-slot:nth-child(5) .space-frame-content::after { animation-delay: 0.3s; }
    .space-slot:nth-child(6) .space-frame-content::after { animation-delay: 1.0s; }
    .space-slot:nth-child(7) .space-frame-content::after { animation-delay: 1.7s; }
    .space-slot:nth-child(8) .space-frame-content::after { animation-delay: 2.4s; }
    .space-slot:nth-child(9) .space-frame-content::after { animation-delay: 0.5s; }
    .space-slot:nth-child(10) .space-frame-content::after { animation-delay: 1.2s; }
    .space-slot:nth-child(11) .space-frame-content::after { animation-delay: 1.9s; }
    .space-slot:nth-child(12) .space-frame-content::after { animation-delay: 2.6s; }
    .space-slot:nth-child(13) .space-frame-content::after { animation-delay: 0.9s; }
`;

  // Find the end of the mobile media query block and insert before it
  const mobileEndMatch = css.match(/(@media \(max-width: 768px\)[\s\S]*?)(\}\s*$)/);
  if (mobileEndMatch) {
    css = css.replace(mobileEndMatch[0], mobileEndMatch[1] + mobileStyles + '\n}');
  }

  fs.writeFileSync(cssFile, css, 'utf8');
  console.log(`CSS updated: ${cssFile}`);

  // ─── JS: fix click handler to use event delegation ───
  let js = fs.readFileSync(jsFile, 'utf8');

  // Replace the direct frame click handler with event delegation
  const oldHandler = `// Event: Click anywhere on an available frame to open booking\ndocument.querySelectorAll('.space-frame').forEach(frame => {\n  frame.addEventListener('click', (e) => {\n    // Don't intercept clicks on live ad links\n    if (e.target.closest('a.space-live-ad')) return;\n    const slotEl = e.target.closest('.space-slot');\n    if (!slotEl) return;\n    const slotId = parseInt(slotEl.dataset.space, 10);\n    openModal(slotId);\n  });\n});`;

  const newHandler = `// Event: Click anywhere on an available frame to open booking\ndocument.body.addEventListener('click', (e) => {\n  const frame = e.target.closest('.space-frame');\n  if (!frame) return;\n  // Don't intercept clicks on live ad links\n  if (e.target.closest('a.space-live-ad')) return;\n  const slotEl = frame.closest('.space-slot');\n  if (!slotEl) return;\n  const slotId = parseInt(slotEl.dataset.space, 10);\n  openModal(slotId);\n});`;

  js = js.replace(oldHandler, newHandler);

  fs.writeFileSync(jsFile, js, 'utf8');
  console.log(`JS updated: ${jsFile}`);
}

console.log('\nDone.');
