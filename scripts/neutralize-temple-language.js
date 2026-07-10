/**
 * Neutralize legally risky language in existing generated flagship pages.
 * Replaces endorsement/ad-marketplace phrasing with scholarly/sponsorship-neutral
 * wording without changing page structure or bespoke lore content.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'sites');

const REPLACEMENTS = [
  // Head metadata (variable deity names)
  {
    pattern: /<title>([^<]+) — In alignment with the ([^<]+)<\/title>/g,
    replacement: '<title>$1 — $2 | PUNYCODEX</title>',
  },
  {
    pattern: /<meta name="description" content="In alignment with ([^"]+) — the ([^"]+)\. Premium advertising placements on a domain rooted in ancient power\.">/g,
    replacement: '<meta name="description" content="Scholarly restoration of $1, the $2. Explore original script, pronunciation, and Unicode orthography.">',
  },
  {
    pattern: /<meta property="og:title" content="([^"]+) — In alignment with the ([^"]+)">/g,
    replacement: '<meta property="og:title" content="$1 — $2 | PUNYCODEX">',
  },
  {
    pattern: /<meta property="og:description" content="In alignment with ([^"]+) — the ([^"]+)\. Premium advertising placements on a domain rooted in ancient power\.">/g,
    replacement: '<meta property="og:description" content="Scholarly restoration of $1, the $2. Explore original script, pronunciation, and Unicode orthography.">',
  },
  {
    pattern: /<meta name="twitter:title" content="([^"]+) — In alignment with the ([^"]+)">/g,
    replacement: '<meta name="twitter:title" content="$1 — $2 | PUNYCODEX">',
  },
  {
    pattern: /<meta name="twitter:description" content="In alignment with ([^"]+) — the ([^"]+)\.">/g,
    replacement: '<meta name="twitter:description" content="Scholarly restoration of $1, the $2. Explore original script, pronunciation, and Unicode orthography.">',
  },
  {
    pattern: /"name": "([^"]+) — In alignment with the ([^"]+)",/g,
    replacement: '"name": "$1 — $2 | PUNYCODEX",',
  },
  {
    pattern: /"description": "In alignment with ([^"]+) — the ([^"]+)\.",/g,
    replacement: '"description": "Scholarly restoration of $1, the $2. Explore original script, pronunciation, and Unicode orthography.",',
  },
  // Hero section
  {
    pattern: /<p class="endorsement-eyebrow">In alignment with<\/p>/g,
    replacement: '<p class="endorsement-eyebrow">PUNYCODEX entry for</p>',
  },
  {
    pattern: /<span class="meta-badge">Premium Ad Spaces Available<\/span>/g,
    replacement: '<span class="meta-badge">Sponsorship Spaces Available</span>',
  },
  {
    pattern: /<p class="endorsement-lead">Thirteen sacred frames\. One temple\. Claim your place\.<\/p>/g,
    replacement: '<p class="endorsement-lead">Thirteen frames. One temple. Become a patron.</p>',
  },
  {
    pattern: /<a href="#spaces" class="btn-primary">Reserve Your Space<\/a>/g,
    replacement: '<a href="#spaces" class="btn-primary">Sponsor This Space</a>',
  },
  // Takeover copy
  {
    pattern: /Reserved for a single brand that is fully in alignment with ([^<]+)\./g,
    replacement: 'Reserved for a single sponsor that shares the spirit of $1.',
  },
  {
    pattern: /as one cohesive campaign\./g,
    replacement: 'as one cohesive presence.',
  },
  {
    pattern: /<li>All 13 placements under one lease<\/li>/g,
    replacement: '<li>All 13 placements under one sponsorship</li>',
  },
  // How it works
  {
    pattern: /A curated presence, not a checkout lane\. Every submission is reviewed to ensure the brand is truly in alignment with ([^<]+)\./g,
    replacement: 'A curated presence, not a checkout lane. Every submission is reviewed to ensure quality and relevance.',
  },
  {
    pattern: /Reserve your space and tell us why your brand belongs here\. We manually review every submission for alignment with this archetype\./g,
    replacement: 'Sponsor your space and tell us why your project belongs here. We manually review every submission for quality and relevance.',
  },
  {
    pattern: /<span class="trust-pill"><span class="trust-dot"><\/span>Manual brand-alignment review<\/span>/g,
    replacement: '<span class="trust-pill"><span class="trust-dot"></span>Manual content review</span>',
  },
  // Base-temple "correct form" subtitle on home page
  {
    pattern: /<p class="section-subtitle">Why <em>([^<]+)\.com<\/em> is the correct form<\/p>/g,
    replacement: '<p class="section-subtitle">Unicode restoration and ASCII comparison</p>',
  },
  // Booking modal
  {
    pattern: /<h3 class="booking-modal-title">Reserve <span id="booking-slot-name"><\/span><\/h3>/g,
    replacement: '<h3 class="booking-modal-title">Sponsor <span id="booking-slot-name"></span></h3>',
  },
  {
    pattern: /placeholder="https:\/\/yourbrand\.com"/g,
    replacement: 'placeholder="https://yourproject.com"',
  },
  {
    pattern: /placeholder="Describe your brand, campaign goals, and why this archetype is the right alignment\.\.\."/g,
    replacement: 'placeholder="Describe your project, goals, and why this archetype is a good fit..."',
  },
  {
    pattern: /Full-Page Takeover applications are manually reviewed\. We only approve brands that are truly in alignment\./g,
    replacement: 'Full-Page Takeover applications are manually reviewed. We only approve sponsors whose content is relevant and appropriate.',
  },
  {
    pattern: /Every placement is manually reviewed\. Only brands truly in alignment with this temple are approved\./g,
    replacement: 'Every placement is manually reviewed. Only sponsors whose content is relevant and appropriate are approved.',
  },
  {
    pattern: /This reservation covers all 13 frames — every banner and box — as one unified campaign\. Tell us why your brand is in alignment with this temple\./g,
    replacement: 'This reservation covers all 13 frames — every banner and box — as one unified presence. Tell us why your project shares the spirit of this temple.',
  },
];

const LORE_REPLACEMENTS = [
  // Head metadata
  {
    pattern: /<meta name="description" content="The authentic digital shrine to ([^,]+), ([^"]+)\. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ([^"]+)\.">/g,
    replacement: '<meta name="description" content="Scholarly profile of $1, the $2. Explore Unicode orthography, reconstructed pronunciation, and mythology.">',
  },
  {
    pattern: /"description": "The authentic digital shrine to ([^"]+)\. Explore the correct orthography, Unicode restoration, and timeless mythology of ([^"]+)\.",/g,
    replacement: '"description": "Scholarly profile of $1, the $2. Explore Unicode orthography, reconstructed pronunciation, and mythology.",',
  },
  {
    pattern: /<meta property="og:description" content="The authentic digital shrine to ([^"]+)\. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ([^"]+)\.">/g,
    replacement: '<meta property="og:description" content="Scholarly profile of $1, the $2. Explore Unicode orthography, reconstructed pronunciation, and mythology.">',
  },
  {
    pattern: /<meta name="twitter:description" content="The authentic digital shrine to ([^"]+)\. Explore the correct orthography, reconstructed pronunciation, and timeless mythology of ([^"]+)\.">/g,
    replacement: '<meta name="twitter:description" content="Scholarly profile of $1, the $2. Explore Unicode orthography, reconstructed pronunciation, and mythology.">',
  },
  // Subtitle
  {
    pattern: /<p class="section-subtitle">Why <em>([^<]+)\.com<\/em> is the correct form<\/p>/g,
    replacement: '<p class="section-subtitle">Unicode restoration and ASCII comparison</p>',
  },
  // Generated prose fallback (if any)
  {
    pattern: /From classical scholarship to modern fantasy, gaming, and brand language, the name remains a marker of primal force\. Its Unicode restoration makes that legacy addressable on the internet itself\./g,
    replacement: 'From classical scholarship to modern translation and popular retellings, the name remains a marker of cultural continuity. Unicode restoration preserves that legacy in digital text.',
  },
  // Name prose
  {
    pattern: /is attested as ([a-z0-9\-\.]+)\.com/g,
    replacement: 'is documented in academic sources',
  },
];

const EXTENDED_LORE_REPLACEMENTS = [
  // Direct brand references on Nike page
  {
    pattern: /The modern sports brand Nike, Inc\. takes its name and 'swoosh' logo from the goddess[^<]*<\/p>/g,
    replacement: 'The goddess\'s name survives in modern English "victory" and in the branding of Nike, Inc. This page documents the ancient name only.</p>',
  },
  {
    pattern: /The idea that victory can be personified, worshipped, and commercialized stretches unbroken from ancient Greece to the present\./g,
    replacement: 'The idea that victory can be personified and worshipped stretches from ancient Greece into the present day.',
  },
];

function applyReplacements(content, replacements) {
  let changed = false;
  for (const { pattern, replacement } of replacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  }
  return { content, changed };
}

function processFile(filePath, replacements) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = applyReplacements(content, replacements);
  if (result.changed) {
    fs.writeFileSync(filePath, result.content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const siteDirs = fs.readdirSync(SITES_DIR).filter((id) => {
    const p = path.join(SITES_DIR, id);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'));
  });

  let updatedCount = 0;
  let updatedFiles = [];

  for (const id of siteDirs) {
    const siteDir = path.join(SITES_DIR, id);
    const indexPath = path.join(siteDir, 'index.html');
    const lorePath = path.join(siteDir, 'lore', 'index.html');
    const extendedPath = path.join(siteDir, 'lore', 'extended', 'index.html');

    if (processFile(indexPath, REPLACEMENTS)) {
      updatedCount++;
      updatedFiles.push(indexPath);
    }

    if (fs.existsSync(lorePath) && processFile(lorePath, LORE_REPLACEMENTS)) {
      updatedCount++;
      updatedFiles.push(lorePath);
    }

    if (fs.existsSync(extendedPath) && processFile(extendedPath, EXTENDED_LORE_REPLACEMENTS)) {
      updatedCount++;
      updatedFiles.push(extendedPath);
    }
  }

  console.log(`Updated ${updatedCount} files.`);
  if (updatedFiles.length) {
    console.log(updatedFiles.map((f) => path.relative(ROOT, f)).join('\n'));
  }
}

main();
