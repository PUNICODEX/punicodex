#!/usr/bin/env node
/**
 * PuniCodex — per-temple Open Graph card generator.
 *
 * Composes a branded 1200×630 JPEG for every lexicon entry:
 *   flagship → the temple mascot in a gold ring, Unicode name, domain, badges
 *   base     → the PuniCodex emblem, Unicode name, pantheon label
 *
 * Output: /assets/og/{id}.jpg (deploy-safe — .vercelignore strips PNGs under
 * sites/ and webp OG support is patchy; JPEG at a stable root path works
 * everywhere).
 *
 * Rendering: SVG -> sharp. Fonts come from the build machine (Georgia serif for
 * names, Arial for badges) which is fine because the cards are baked, committed
 * artifacts — no runtime font dependency.
 *
 * Because the fonts come from the build machine, the JPEG bytes are
 * platform-specific (Windows renders Georgia/Arial; Linux runners substitute
 * DejaVu). Re-baking on every generate would therefore dirty the tree on any
 * machine but the one that last committed the cards — and the CI divergence
 * gate (`npm run generate` + `git diff --exit-code`) would fail on every run.
 * So existing cards are SKIPPED by default; delete assets/og/ or pass --force
 * after changing cardSvg() or a mascot, then commit the re-baked output.
 *
 * Run: node scripts/generate-og-images.js [--only <id>] [--force]
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'og');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const flagshipById = new Map(ARCHETYPES.filter((a) => a.built).map((a) => [a.id, a]));

const WIDTH = 1200;
const HEIGHT = 630;
const JPEG_QUALITY = 85;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgba(hex, alpha) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

async function pngDataUri(file) {
  const buf = await sharp(file).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function tierLabelOf(entry) {
  if (entry.tier === 'dual') return 'Dual-Tier';
  return entry.tierLabel || `Tier ${entry.tier}`;
}

function cardSvg({ entry, meta, mascotUri, emblemUri, flagship }) {
  const color = meta.color;
  const glow = hexToRgba(color, 0.28);
  const glowFaint = hexToRgba(color, 0.1);
  const name = esc(entry.unicode);
  const ascii = esc(entry.ascii);
  const pantheon = esc(meta.label);
  const domain = esc(entry.domain || '');
  const tier = esc(tierLabelOf(entry));

  // Shrink the name for long forms so it never clips.
  const nameSize = name.length > 18 ? 56 : name.length > 12 ? 68 : name.length > 8 ? 80 : 92;

  const ringImage = mascotUri
    ? `<image href="${mascotUri}" x="800" y="115" width="400" height="400" preserveAspectRatio="xMidYMid meet" style="clip-path: circle(190px at 200px 200px);"/>`
    : `<image href="${emblemUri}" x="860" y="175" width="280" height="280" preserveAspectRatio="xMidYMid meet"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="82%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${glow}"/>
      <stop offset="55%" stop-color="${glowFaint}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0A0A0A"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect x="24" y="24" width="${WIDTH - 48}" height="${HEIGHT - 48}" fill="none" stroke="#D4AF37" stroke-opacity="0.55" stroke-width="1.5"/>

  <!-- Right-side ring with mascot (or emblem for base temples) -->
  <circle cx="1000" cy="315" r="212" fill="none" stroke="#D4AF37" stroke-width="3" stroke-opacity="0.9"/>
  <circle cx="1000" cy="315" r="196" fill="#111111" stroke="${color}" stroke-opacity="0.5" stroke-width="1"/>
  ${ringImage}

  <!-- Left column -->
  <text x="80" y="150" font-family="Arial, sans-serif" font-size="26" letter-spacing="6" fill="${color}">${pantheon.toUpperCase()}</text>
  <text x="78" y="150" font-family="Arial, sans-serif" font-size="26" letter-spacing="6" fill="${color}" opacity="0.25" transform="translate(2 2)">${pantheon.toUpperCase()}</text>
  <text x="80" y="255" font-family="Georgia, 'Times New Roman', serif" font-size="${nameSize}" fill="#F5F0E1">${name}</text>
  <text x="82" y="320" font-family="'Courier New', monospace" font-size="30" fill="#C9B77A">${ascii}</text>
  <text x="80" y="385" font-family="Georgia, serif" font-size="30" font-style="italic" fill="#A0A0A0">${domain}</text>

  <rect x="80" y="430" width="${tier.length * 15 + 36}" height="46" rx="23" fill="none" stroke="#D4AF37" stroke-width="1.5"/>
  <text x="98" y="461" font-family="Arial, sans-serif" font-size="24" fill="#F0D878">${tier}</text>
  ${flagship ? '<text x="98" y="508" font-family="Arial, sans-serif" font-size="20" letter-spacing="3" fill="#8B7355">FLAGSHIP TEMPLE</text>' : ''}

  <!-- Footer strip -->
  <line x1="80" y1="545" x2="1120" y2="545" stroke="#D4AF37" stroke-opacity="0.35" stroke-width="1"/>
  <text x="80" y="585" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="#D4AF37">PUNICODEX</text>
  <text x="1120" y="585" font-family="Arial, sans-serif" font-size="22" fill="#A0A0A0" text-anchor="end">punicodex.com</text>
</svg>`;
}

async function main() {
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
  const force = process.argv.includes('--force');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const emblemUri = await pngDataUri(
    path.join(ROOT, 'assets', 'brand', '01-logos', 'punicodex-emblem-gold.png')
  );

  let written = 0;
  let skipped = 0;
  for (const entry of LEXICON) {
    if (only && entry.id !== only) continue;
    const out = path.join(OUT_DIR, `${entry.id}.jpg`);
    if (!force && !only && fs.existsSync(out)) {
      // Baked bytes are platform-specific (host fonts); committed cards win.
      skipped++;
      continue;
    }
    const arch = flagshipById.get(entry.id);
    const meta = PANTHEON_META[entry.pantheon] || { label: entry.pantheon, color: '#D4AF37' };

    let mascotUri = null;
    if (arch?.mascotPath) {
      const mascotFile = path.join(ROOT, arch.mascotPath.replace(/^\//, ''));
      if (fs.existsSync(mascotFile)) {
        mascotUri = await pngDataUri(mascotFile);
      }
    }

    const svg = cardSvg({ entry, meta, mascotUri, emblemUri, flagship: Boolean(arch) });
    await sharp(Buffer.from(svg)).jpeg({ quality: JPEG_QUALITY }).toFile(out);
    written++;
    if (written % 100 === 0) console.log(`   ✓ ${written} cards...`);
  }
  console.log(`OG cards: ${written} written, ${skipped} skipped -> assets/og/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
