/**
 * PUNYCODEX — Temple Page Generator
 * Generates SEO-optimized base temple pages from the lexicon.
 * Skips existing directories (preserves flagships).
 *
 * Usage: node scripts/generate-temples.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const { LEXICON } = require('../type/js/lexicon.js');
const { SOURCE_CATALOG } = require('../type/js/source-catalog.js');
const {
  getOriginalScript,
  getScriptName,
  hasOriginalScript,
  getOriginalScriptLabel,
  getProvenance,
  getNoScriptNote,
} = require('../type/js/original-scripts.js');
// Stacked diacritics are no longer rendered inline in base temples;
// they remain available via the Type Tool and flagship temples.

// ─── Flagship Preservation ───
// Load handcrafted flagship IDs from archetypes-v2.js so they are never
// overwritten by base-temple generation, even if a previous run left them
// with a base-temple HTML comment/CSS link.
function loadBuiltArchetypeIds() {
  try {
    const archetypePath = path.join(__dirname, '..', 'js', 'archetypes-v2.js');
    const content = fs.readFileSync(archetypePath, 'utf8');
    const ids = new Set();
    const regex = /id:\s*"([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      // The built flag always follows the id within the same archetype object.
      const idx = content.indexOf('built:', match.index);
      if (idx !== -1) {
        const builtLine = content.substring(idx, idx + 20);
        if (builtLine.includes('true')) {
          ids.add(match[1]);
        }
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}
const BUILT_ARCHETYPE_IDS = loadBuiltArchetypeIds();

function isAsciiOnlyUnicode(entry) {
  return /^[\x00-\x7F]+$/.test(entry.unicode || '');
}

// ─── Pantheon Theming ───
const PANTHEON_COLORS = {
  greek: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4169E1',
  },
  'greek-location': {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4169E1',
  },
  norse: {
    primary: '#C0C0C0',
    primaryDim: '#808080',
    primaryBright: '#E8E8E8',
    secondary: '#5C9BD1',
  },
  egyptian: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#1E3A5F',
  },
  sanskrit: {
    primary: '#FF9933',
    primaryDim: '#CC7A29',
    primaryBright: '#FFB366',
    secondary: '#8B0000',
  },
  celtic: {
    primary: '#228B22',
    primaryDim: '#1A6B1A',
    primaryBright: '#32CD32',
    secondary: '#B8D4E3',
  },
  mesopotamian: {
    primary: '#CD7F32',
    primaryDim: '#A06020',
    primaryBright: '#E09040',
    secondary: '#C2B280',
  },
  polynesian: {
    primary: '#1E90FF',
    primaryDim: '#1670CC',
    primaryBright: '#4DA6FF',
    secondary: '#FF7F50',
  },
  japanese: {
    primary: '#DC143C',
    primaryDim: '#A01030',
    primaryBright: '#FF3355',
    secondary: '#1A1A1A',
  },
  nahuatl: {
    primary: '#50C878',
    primaryDim: '#3A9E5A',
    primaryBright: '#6EE89A',
    secondary: '#2F2F2F',
  },
  yoruba: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#4B0082',
  },
  slavic: {
    primary: '#C0C0C0',
    primaryDim: '#808080',
    primaryBright: '#E8E8E8',
    secondary: '#228B22',
  },
  zoroastrian: {
    primary: '#FF4500',
    primaryDim: '#CC3700',
    primaryBright: '#FF6633',
    secondary: '#F5F5F5',
  },
  incan: {
    primary: '#D4AF37',
    primaryDim: '#8B7355',
    primaryBright: '#F0D878',
    secondary: '#DC143C',
  },
  canaanite: {
    primary: '#8B4513',
    primaryDim: '#5D2E0C',
    primaryBright: '#B87333',
    secondary: '#D4AF37',
  },
};

const PANTHEON_LABELS = {
  greek: 'Greek',
  'greek-location': 'Greek',
  norse: 'Old Norse',
  egyptian: 'Egyptian',
  sanskrit: 'Sanskrit',
  celtic: 'Celtic',
  mesopotamian: 'Mesopotamian',
  polynesian: 'Polynesian',
  japanese: 'Japanese',
  nahuatl: 'Nahuatl',
  yoruba: 'Yoruba',
  slavic: 'Slavic',
  zoroastrian: 'Zoroastrian',
  incan: 'Incan',
  canaanite: 'Canaanite',
};

// ─── Helpers ───

function getColors(pantheon) {
  return PANTHEON_COLORS[pantheon] || PANTHEON_COLORS.greek;
}

function getPunycode(unicode) {
  try {
    const domain = `${unicode.toLowerCase()}.com`;
    const encoded = domainToASCII(domain);
    return encoded === domain ? null : encoded;
  } catch {
    return null;
  }
}

function getTierSubtype(entry) {
  const hasStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(entry.unicode);
  const hasLength = /[āēīōūĀĒĪŌŪ]/.test(entry.unicode);

  if (entry.tier === 'dual') return 'Dual-Tier';
  if (entry.tier === '1') {
    if (hasStress && hasLength) return 'Tier-1 Full';
    if (hasStress) return 'Tier-1 Accent-Preserving';
    if (hasLength) return 'Tier-1 Macron-Preserving';
    return 'Tier-1';
  }
  if (entry.tier === '2') {
    if (hasStress) return 'Tier-2 Accent-Preserving';
    if (hasLength) return 'Tier-2 Macron-Preserving';
    return 'Tier-2 Basic';
  }
  return entry.tierLabel;
}

function buildOriginalScriptBody(entry, originalScript, hasOriginal) {
  if (hasOriginal) {
    const provenance = getProvenance(entry);
    if (provenance && Array.isArray(provenance.steps) && provenance.steps.length > 0) {
      const steps = provenance.steps
        .map((s) => `<span class="provenance-step">${escapeHtml(s)}</span>`)
        .join(' · ');
      return `The name in its original ${getScriptName(entry)} form. <strong>${escapeHtml(originalScript)}</strong> → ${escapeHtml(entry.unicode)}. ${steps}`;
    }
    return `The name in its original ${getScriptName(entry)} form. <strong>${escapeHtml(originalScript)}</strong> carries the full phonetic and orthographic weight of the source tradition.`;
  }
  return getNoScriptNote(entry);
}

function getTierExplanation(entry, subtype) {
  const original = getOriginalScript(entry) || entry.unicode;
  const pantheonLabel = PANTHEON_LABELS[entry.pantheon] || 'Ancient';

  if (entry.tier === 'dual') {
    return `The ${pantheonLabel} original <strong>${original}</strong> contains both stress (acute/circumflex) and at least one long vowel. Multiple historically valid Unicode spellings exist — each corresponds to a real, attested alternate restoration. The PUNYCODEX owns the canonical variants, making this a <strong>Dual-Tier</strong> pair.`;
  }
  if (entry.tier === '1') {
    const isGreek = entry.pantheon === 'greek' || entry.pantheon === 'greek-location';
    const hasStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(entry.unicode);
    const hasLength = /[āēīōūĀĒĪŌŪ]/.test(entry.unicode);

    if (!isGreek) {
      return `The ${pantheonLabel} name <strong>${original}</strong> is represented by its most canonical scholarly spelling. For non-Greek names, Tier-1 status reflects the definitive attested restoration rather than Greek-style stress/length features. This is the authoritative Unicode form — a <strong>single-tier Tier-1</strong> name.`;
    }
    if (hasStress && hasLength) {
      return `The ${pantheonLabel} original <strong>${original}</strong> contains both stress AND at least one long vowel. However, there is only <strong>one</strong> historically valid Unicode restoration. The ASCII fallback is modern English, not ancient canonical. This is the full scholarly orthography — a <strong>single-tier Tier-1 Full</strong> name.`;
    }
    if (hasStress) {
      return `The ${pantheonLabel} original <strong>${original}</strong> preserves stress (acute/circumflex) in its Unicode restoration. There is only <strong>one</strong> historically valid spelling with this feature preserved. This is classified as a <strong>single-tier Tier-1 Accent-Preserving</strong> name.`;
    }
    if (hasLength) {
      return `The ${pantheonLabel} original <strong>${original}</strong> preserves vowel length (macron) in its Unicode restoration. There is only <strong>one</strong> historically valid spelling with this feature preserved. This is classified as a <strong>single-tier Tier-1 Macron-Preserving</strong> name.`;
    }
    return `The ${pantheonLabel} form <strong>${original}</strong> is classified as <strong>single-tier Tier-1</strong> in the PUNYCODEX collection. The Unicode restoration represents the scholarly convention for this name.`;
  }
  if (entry.tier === '2') {
    if (isAsciiOnlyUnicode(entry)) {
      return `The ${pantheonLabel} name <strong>${original}</strong> is attested in the Latin alphabet. The Unicode restoration is identical to ASCII, so no diacritic or script recovery is needed. It is catalogued as a <strong>single-tier Tier-2</strong> name because the scholarly form carries no stress or length marks.`;
    }
    if (subtype === 'Tier-2 Basic') {
      return `The ${pantheonLabel} form <strong>${original}</strong> preserves neither stress nor length in this Unicode restoration. This makes it a <strong>single-tier Tier-2 Basic</strong> name — still a scholarly step above plain ASCII, but without the distinctive phonetic features that define higher tiers.`;
    }
    const feature = subtype.includes('Accent')
      ? 'stress (acute accent)'
      : subtype.includes('Macron')
        ? 'length (macron vowel)'
        : 'no distinctive phonetic features';
    return `The ${pantheonLabel} original <strong>${original}</strong> contains only <strong>${feature}</strong>. This makes it a <strong>single-tier Tier-2</strong> name. The Unicode restoration preserves what can be preserved — honoring the single feature that distinguishes it from plain ASCII.`;
  }
  return '';
}

function getBreakdownTypeClass(type) {
  const map = {
    stress: 'breakdown-type--stress',
    length: 'breakdown-type--length',
    dual: 'breakdown-type--dual',
    same: 'breakdown-type--same',
    special: 'breakdown-type--special',
    drop: 'breakdown-type--drop',
  };
  return map[type] || 'breakdown-type--same';
}

function getBreakdownTypeLabel(type) {
  const map = {
    stress: 'Stress',
    length: 'Length',
    dual: 'Dual',
    same: 'Same',
    special: 'Special',
    drop: 'Drop',
  };
  return map[type] || type;
}

function getRelatedEntries(entry, allEntries, limit = 6) {
  return allEntries
    .filter((e) => e.id !== entry.id && e.pantheon === entry.pantheon)
    .slice(0, limit);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── HTML Template ───

function generateTempleHTML(entry, related) {
  const colors = getColors(entry.pantheon);
  const subtype = getTierSubtype(entry);
  const punycode = getPunycode(entry.unicode);
  const pantheonLabel = PANTHEON_LABELS[entry.pantheon] || 'Ancient';
  const originalScript = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  const isDual = entry.tier === 'dual';

  // Variants from lexicon
  const hasVariants = entry.variants && entry.variants.length > 0;
  const variantHtml = hasVariants
    ? entry.variants
        .map((v) => `<span class="variant-chip variant-${v.type}">${escapeHtml(v.unicode)}</span>`)
        .join(' ')
    : '';

  // Etymology section
  const hasEtymology = entry.etymology && typeof entry.etymology === 'object';
  const protoLabel = hasEtymology
    ? {
        'proto-indo-european': 'PIE',
        'proto-afro-asiatic': 'Afro-Asiatic',
        'proto-polynesian': 'Proto-Polynesian',
        'proto-uto-aztecan': 'Proto-Uto-Aztecan',
        'proto-sino-tibetan': 'Proto-Sino-Tibetan',
        'proto-mayan': 'Proto-Mayan',
        isolate: 'Language Isolate',
        unknown: 'Unknown',
      }[entry.etymology.protoLanguage] || entry.etymology.protoLanguage
    : '';
  const cognateHtml =
    hasEtymology && entry.etymology.cognates && entry.etymology.cognates.length > 0
      ? entry.etymology.cognates
          .slice(0, 3)
          .map((c) => {
            const isInternal = LEXICON.some((e) => e.id === c.id);
            const tag = isInternal ? 'a' : 'span';
            const href = isInternal
              ? ` href="https://punycodex.com/sites/${c.id}${BUILT_ARCHETYPE_IDS.has(c.id) ? '/lore/' : '/'}"`
              : '';
            return `<${tag}${href} class="cognate-card reveal-up">
                <span class="cognate-lang">${escapeHtml(c.language)}</span>
                <span class="cognate-form">${escapeHtml(c.form)}</span>
                <span class="cognate-rel">${escapeHtml(c.relationship)}</span>
                ${c.note ? `<span class="cognate-note">${escapeHtml(c.note)}</span>` : ''}
            </${tag}>`;
          })
          .join('')
      : '';

  // Meta
  const pageTitle = `${hasOriginal ? `${originalScript} — ` : ''}${entry.unicode} | ${entry.domain} | PUNYCODEX`;
  const pageDesc = `Discover ${entry.unicode}.com — the authentic Unicode domain for ${hasOriginal ? `${originalScript}, ` : ''}${entry.domain}. Scholarly orthography, Punycode encoding, and sources: ${entry.sources.join(', ')}.`;
  const canonicalUrl = `https://punycodex.com/sites/${entry.id}/`;

  // Tier feature cards
  const hasStress = entry.breakdown.some((b) => b.type === 'stress');
  const hasLength = entry.breakdown.some((b) => b.type === 'length');
  const hasBoth = hasStress && hasLength;

  return `<!-- PUNYCODEX Base Temple — Auto-Generated by scripts/generate-temples.js -->
<!-- Do not edit by hand. Regenerate with: node scripts/generate-temples.js -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDesc)}">
    <meta name="keywords" content="${entry.unicode}, ${entry.ascii}, Punycode, Unicode domain, ${entry.pantheon}, ${entry.domain}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDesc)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNYCODEX">
    <meta property="og:image" content="https://punycodex.com/assets/images/og-default.svg">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://punycodex.com/assets/images/og-default.svg">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
    
    <!-- Schema.org -->
    <script type="application/ld+json">
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${entry.unicode} — ${entry.domain}`,
    description: pageDesc,
    url: canonicalUrl,
    about: {
      '@type': 'Thing',
      name: hasOriginal ? originalScript : entry.unicode,
      alternateName: [entry.ascii, entry.unicode],
      description: entry.meaning,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'PUNYCODEX',
      url: 'https://punycodex.com',
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: 'https://punycodex.com/assets/images/og-default.svg',
    },
  },
  null,
  4
)}
    </script>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Lato:wght@300;400;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://punycodex.com/css/temple-base.css">
    <style>
        :root {
            --primary: ${colors.primary};
            --primary-dim: ${colors.primaryDim};
            --primary-bright: ${colors.primaryBright};
            --secondary: ${colors.secondary};
        }
    </style>
</head>
<body>
    <!-- Particle Canvas -->
    <canvas id="particle-canvas"></canvas>

    <!-- Navigation -->
    <nav class="main-nav" id="main-nav">
        <div class="nav-inner">
            <a href="https://punycodex.com/" class="nav-logo">PUNYCODEX</a>
            <div class="nav-links">
                <a href="https://punycodex.com/pantheon/" class="nav-link">Pantheon</a>
                <a href="https://punycodex.com/lexicon/" class="nav-link">Lexicon</a>
                <a href="https://punycodex.com/type/#${entry.id}" class="nav-link">Type</a>
                <a href="https://punycodex.com/tiers/" class="nav-link">Tiers</a>
                <a href="https://punycodex.com/api/v1/docs/" class="nav-link">API</a>
            </div>
            <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <!-- Hero -->
    <section class="hero" id="hero">
        <div class="hero-content">
            <div class="hero-text">
                <p class="hero-eyebrow reveal-up">The Authentic Orthography</p>
                <h1 class="hero-title reveal-up">
                    <span class="title-greek">${hasOriginal ? escapeHtml(originalScript) : escapeHtml(entry.unicode)}</span>
                    <span class="title-divider"></span>
                    <span class="title-trans">${escapeHtml(entry.unicode)}</span>
                </h1>
                <p class="hero-subtitle reveal-up">${escapeHtml(entry.domain)}${entry.meaning ? ` · ${escapeHtml(entry.meaning)}` : ''}</p>
                <div class="hero-meta reveal-up">
                    ${
                      isDual && entry.variants
                        ? `
                    <div class="tier-bridge">
                        <span class="meta-badge tier-1">Tier-1 ${subtype.includes('Accent') ? 'Accent-Preserving' : 'Full'}</span>
                        <span class="tier-connector"></span>
                        <span class="meta-badge tier-2">Tier-2 ${subtype.includes('Macron') ? 'Macron-Preserving' : 'Full'}</span>
                    </div>
                    <div class="domain-bridge">
                        <span class="meta-domain">${entry.unicode.toLowerCase()}.com</span>
                        <span class="domain-connector">·</span>
                        <span class="meta-domain-alt">${(entry.variants.find((v) => v.type === 'owned' || v.type === 'alt-stress') || entry.variants[0]).unicode.toLowerCase()}.com</span>
                    </div>`
                        : `
                    <span class="meta-badge">${escapeHtml(subtype)}</span>
                    <span class="meta-domain">${entry.unicode.toLowerCase()}.com</span>
                    `
                    }
                </div>
                <div class="hero-cta reveal-up">
                    <a href="https://punycodex.com/type/#${entry.id}" class="btn-primary">
                        <span>Try the Type Tool</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 17L17 7M17 7H7M17 7V17"/>
                        </svg>
                    </a>
                    <a href="#the-name" class="btn-primary btn-ghost">
                        <span>Explore the Name</span>
                    </a>
                </div>
            </div>
            <div class="hero-visual reveal-scale">
                <div class="hero-pattern">
                    <div class="hero-pattern-ring"></div>
                    <div class="hero-pattern-ring"></div>
                    <div class="hero-pattern-ring"></div>
                    <div class="hero-pattern-center"></div>
                </div>
            </div>
        </div>
        <div class="hero-scroll-indicator">
            <div class="scroll-line"></div>
        </div>
    </section>

    <!-- The Name Section -->
    <section class="section section-name" id="the-name">
        <div class="section-bg-glow"></div>
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">01</span>
                <h2 class="section-title">The Authentic Name</h2>
                <p class="section-subtitle">Why <em>${entry.unicode.toLowerCase()}.com</em> is the correct form</p>
            </div>
            
            <div class="name-grid">
                <div class="name-card reveal-up">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h3 class="card-title">${hasOriginal ? getScriptName(entry) : 'Scholarly Transliteration'}</h3>
                    <p class="card-greek">${hasOriginal ? escapeHtml(originalScript) : escapeHtml(entry.unicode)}</p>
                    <p class="card-body">${buildOriginalScriptBody(entry, originalScript, hasOriginal)}</p>
                </div>

                <div class="name-card reveal-up" data-delay="100">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                            <path d="M4 7V4h3M4 17v3h3M20 7V4h-3M20 17v3h-3M9 9h6v6H9z"/>
                        </svg>
                    </div>
                    <h3 class="card-title">ASCII Constraint</h3>
                    <p class="card-ascii">${entry.ascii.toUpperCase()}</p>
                    <p class="card-body">${isAsciiOnlyUnicode(entry) ? `This name is already attested in the Latin alphabet. The Unicode form <strong>${escapeHtml(entry.unicode)}</strong> is identical to ASCII apart from capitalization, so no diacritic, stress, or script information was erased.` : `Stripped of its identity, the name was reduced to plain Latin letters. The original orthography — stress, length, breathing — was erased by systems that only understand A-Z.`}</p>
                </div>

                <div class="name-card reveal-up" data-delay="200">
                    <div class="card-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <h3 class="card-title">Unicode Restoration</h3>
                    <p class="card-unicode">${escapeHtml(entry.unicode)}</p>
                    <p class="card-body">${isAsciiOnlyUnicode(entry) ? `Because the name is already in Latin letters, the Unicode restoration does not add diacritics or change the script. Its value here is canonical spelling and consistent cataloguing, not the recovery of lost marks.` : `The Unicode restoration recovers what ASCII destroyed. This is <strong>philological accuracy</strong> — not decoration. The domain encodes to Punycode, but the browser displays the truth.`}</p>
                </div>
            </div>

            ${
              hasVariants
                ? `
            <div class="variants-panel reveal-up">
                <div class="variants-panel-label">Valid Scholarly Variations</div>
                <div class="variants-panel-list">${variantHtml}</div>
                <p class="variants-panel-note">Each variant is an attested scholarly orthography. The <strong>owned</strong> form is the active domain; others are historically valid alternatives.</p>
            </div>
            `
                : ''
            }

            <div class="punycode-explainer reveal-up">
                <div class="explainer-label">Punycode Encoding</div>
                <div class="explainer-box">
                    <code class="explainer-code">${entry.unicode.toLowerCase()}.com &rarr; ${punycode || `${entry.unicode.toLowerCase()}.com`}</code>
                    <p class="explainer-note">${isAsciiOnlyUnicode(entry) ? `Because <strong>${escapeHtml(entry.unicode)}</strong> uses only ASCII characters, no Punycode encoding is required. The browser displays the name as-is, and the domain is the same sequence to both DNS and humanity.` : `The non-ASCII characters in <strong>${escapeHtml(entry.unicode)}</strong> are encoded while the ASCII remains visible. To the DNS, it is Punycode. To humanity, it is <em>${escapeHtml(entry.unicode)}</em>.`}</p>
                </div>
            </div>
        </div>
    </section>

    ${
      hasEtymology
        ? `
    <!-- Etymology Section -->
    <section class="section section-etymology" id="etymology">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">02</span>
                <h2 class="section-title">Etymology</h2>
                <p class="section-subtitle">The deep ancestry of <em>${escapeHtml(entry.unicode)}</em></p>
            </div>

            <div class="etymology-proto reveal-up">
                ${entry.etymology.protoLanguage ? `<span class="proto-badge">${escapeHtml(protoLabel)}</span>` : ''}
                ${entry.etymology.protoForm ? `<span class="proto-form">${escapeHtml(entry.etymology.protoForm)}</span>` : ''}
                ${entry.etymology.protoGloss ? `<span class="proto-gloss">"${escapeHtml(entry.etymology.protoGloss)}"</span>` : ''}
            </div>

            ${
              entry.etymology.derivation
                ? `
            <div class="etymology-derivation reveal-up">
                <p class="lead-text">${escapeHtml(entry.etymology.derivation)}</p>
            </div>
            `
                : ''
            }

            ${
              cognateHtml
                ? `
            <div class="cognate-grid">
                ${cognateHtml}
            </div>
            `
                : ''
            }

            ${
              entry.etymology.certainty
                ? `
            <div class="etymology-certainty reveal-up">
                <span class="certainty-badge certainty-${entry.etymology.certainty}">${escapeHtml(entry.etymology.certainty)}</span>
            </div>
            `
                : ''
            }
        </div>
    </section>
    `
        : ''
    }

    <!-- Breakdown Section -->
    <section class="section section-breakdown" id="breakdown">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">03</span>
                <h2 class="section-title">Character Breakdown</h2>
                <p class="section-subtitle">How <em>${entry.ascii}</em> becomes <em>${escapeHtml(entry.unicode)}</em></p>
            </div>

            <div class="reveal-up">
                <table class="breakdown-table">
                    <thead>
                        <tr>
                            <th>Step</th>
                            <th>ASCII</th>
                            <th></th>
                            <th>Unicode</th>
                            <th>Type</th>
                            <th>Scholarly Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entry.breakdown
                          .map(
                            (step, i) => `
                        <tr>
                            <td><span style="color:var(--primary-dim);font-family:var(--font-mono);">${String(i + 1).padStart(2, '0')}</span></td>
                            <td><span class="breakdown-char">${escapeHtml(step.char)}</span></td>
                            <td><span class="breakdown-arrow">&rarr;</span></td>
                            <td><span class="breakdown-char" style="color:var(--secondary);">${escapeHtml(step.to)}</span></td>
                            <td><span class="breakdown-type ${getBreakdownTypeClass(step.type)}">${getBreakdownTypeLabel(step.type)}</span></td>
                            <td><span class="breakdown-note">${escapeHtml(step.note)}</span></td>
                        </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <!-- Tier Section -->
    <section class="section section-tier" id="tier">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">04</span>
                <h2 class="section-title">Tier Classification</h2>
                <p class="section-subtitle">Why ${escapeHtml(entry.unicode)} is classified as ${escapeHtml(subtype)}</p>
            </div>

            <div class="tier-explanation reveal-up">
                <p class="lead-text">${getTierExplanation(entry, subtype)}</p>
            </div>

            <div class="tier-feature-grid">
                <div class="tier-feature-card ${hasStress || hasBoth ? 'active' : 'inactive'} reveal-up">
                    <div class="tier-feature-label">Stress</div>
                    <div class="tier-feature-value">${hasStress || hasBoth ? 'Preserved' : '—'}</div>
                    <div class="tier-feature-desc">${hasStress || hasBoth ? 'Acute or circumflex accent marks the pitch stress of the original.' : 'Not present in this restoration.'}</div>
                </div>
                <div class="tier-feature-card ${hasLength || hasBoth ? 'active' : 'inactive'} reveal-up" data-delay="100">
                    <div class="tier-feature-label">Length</div>
                    <div class="tier-feature-value">${hasLength || hasBoth ? 'Preserved' : '—'}</div>
                    <div class="tier-feature-desc">${hasLength || hasBoth ? 'Macron (ō, ē, ā) marks long vowels from the original.' : 'Not present in this restoration.'}</div>
                </div>
                <div class="tier-feature-card ${hasBoth ? 'active' : 'inactive'} reveal-up" data-delay="200">
                    <div class="tier-feature-label">Dual Variant</div>
                    <div class="tier-feature-value">${hasBoth ? 'Yes' : '—'}</div>
                    <div class="tier-feature-desc">${hasBoth ? 'Both stress and length create multiple valid scholarly restorations.' : 'Only one valid Unicode restoration exists for this name.'}</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Sources Section -->
    <section class="section section-related" id="sources">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">05</span>
                <h2 class="section-title">Scholarly Sources</h2>
                <p class="section-subtitle">Attested in accredited reference works</p>
            </div>

            <div class="sources-section reveal-up">
                <div class="sources-list">
                    ${entry.sources
                      .map((src) => {
                        const cat = SOURCE_CATALOG[src];
                        if (cat?.url) {
                          return `<a href="${cat.url}" target="_blank" rel="noopener" class="source-badge" title="${escapeHtml(cat.full)} (${cat.year})">${escapeHtml(src)}</a>`;
                        }
                        return `<span class="source-badge">${escapeHtml(src)}</span>`;
                      })
                      .join('')}
                </div>
            </div>
        </div>
    </section>

    <!-- Related Names -->
    <section class="section section-related" id="related">
        <div class="container">
            <div class="section-header reveal-up">
                <span class="section-number">06</span>
                <h2 class="section-title">Related Names</h2>
                <p class="section-subtitle">More from the ${pantheonLabel} pantheon</p>
            </div>

            ${
              hasEtymology && entry.etymology.cognates && entry.etymology.cognates.length > 0
                ? `
            <div class="related-cognates-header reveal-up">
                <h3 class="related-subtitle">Cognates & Related Forms</h3>
                <p class="related-subtitle-desc">Names sharing etymological ancestry with <em>${escapeHtml(entry.unicode)}</em></p>
            </div>
            <div class="related-grid">
                ${entry.etymology.cognates
                  .map((c) => {
                    const cognateEntry = LEXICON.find((e) => e.id === c.id);
                    if (cognateEntry) {
                      const cSubtype = getTierSubtype(cognateEntry);
                      return `
                <a href="https://punycodex.com/sites/${cognateEntry.id}${cognateEntry.hasAdSite ? '/lore/' : '/'}" class="related-card reveal-up">
                    <span class="related-name">${escapeHtml(cognateEntry.unicode)}</span>
                    <span class="related-greek">${cognateEntry.greek && cognateEntry.greek !== '—' ? escapeHtml(cognateEntry.greek) : ''}</span>
                    <span class="related-domain">${escapeHtml(cognateEntry.domain)}</span>
                    <span class="related-tier">${escapeHtml(cSubtype)}</span>
                    <span class="related-cognate-rel">${escapeHtml(c.relationship)} · ${escapeHtml(c.language)}</span>
                </a>`;
                    }
                    return `
                <span class="related-card reveal-up" style="cursor:default;">
                    <span class="related-name">${escapeHtml(c.form)}</span>
                    <span class="related-greek">&nbsp;</span>
                    <span class="related-domain">${escapeHtml(c.language)}</span>
                    <span class="related-tier">${escapeHtml(c.relationship)}</span>
                </span>`;
                  })
                  .join('')}
            </div>
            `
                : ''
            }

            ${
              related.length > 0
                ? `
            <div class="related-same-header reveal-up">
                <h3 class="related-subtitle">Same Pantheon</h3>
                <p class="related-subtitle-desc">More names from the ${pantheonLabel} tradition</p>
            </div>
            <div class="related-grid">
                ${related
                  .map((r) => {
                    const rSubtype = getTierSubtype(r);
                    return `
                <a href="https://punycodex.com/sites/${r.id}${r.hasAdSite ? '/lore/' : '/'}" class="related-card reveal-up">
                    <span class="related-name">${escapeHtml(r.unicode)}</span>
                    <span class="related-greek">${r.greek && r.greek !== '—' ? escapeHtml(r.greek) : ''}</span>
                    <span class="related-domain">${escapeHtml(r.domain)}</span>
                    <span class="related-tier">${escapeHtml(rSubtype)}</span>
                </a>`;
                  })
                  .join('')}
            </div>
            `
                : `
            <div class="tier-explanation reveal-up">
                <p class="lead-text">Explore the full <a href="https://punycodex.com/lexicon/" style="color:var(--primary);">Lexicon</a> to discover more names from the ${pantheonLabel} tradition.</p>
            </div>
            `
            }
        </div>
    </section>

    <!-- Type Tool CTA -->
    <section class="section section-type-cta" id="type-cta">
        <div class="container">
            <div class="type-cta-content reveal-up">
                <h2 class="type-cta-title">Experience the Name</h2>
                <p class="type-cta-body">See how ${escapeHtml(entry.unicode)} behaves in the PUNYCODEX Type Tool — with predictive autocomplete, character-by-character breakdown, and scholarly constraint validation.</p>
                <div class="type-cta-input">
                    <code>${entry.ascii}</code>
                    <span style="color:var(--white-dim);">&rarr;</span>
                    <code>${escapeHtml(entry.unicode)}</code>
                </div>
                <a href="https://punycodex.com/type/#${entry.id}" class="btn-primary">
                    <span>Open in Type Tool</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17"/>
                    </svg>
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="main-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="https://punycodex.com/" class="footer-logo">PUNYCODEX</a>
                    <p class="footer-tagline">Authentic unicode domains.<br>Real words. Real orthography. Real internet.</p>
                </div>
                <div class="footer-info">
                    <div class="footer-block">
                        <span class="footer-label">Domain</span>
                        <span class="footer-value">${entry.unicode.toLowerCase()}.com</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Classification</span>
                        <span class="footer-value">${escapeHtml(subtype)}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">${getOriginalScriptLabel(entry)}</span>
                        <span class="footer-value">${hasOriginal ? escapeHtml(originalScript) : escapeHtml(entry.unicode)}</span>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p class="footer-credit">The gods have returned &middot; The internet is merely the first temple</p>
            </div>
        </div>
    </footer>

    <script src="https://punycodex.com/js/temple-base.js"></script>
</body>
</html>`;
}

// ─── Main ───

function main() {
  const rootDir = path.join(__dirname, '..');
  const sitesDir = path.join(rootDir, 'sites');

  let generated = 0;
  let skipped = 0;
  const errors = [];

  console.log('🏛️  PUNYCODEX Temple Generator');
  console.log(`   Lexicon entries: ${LEXICON.length}`);
  console.log('');

  for (const entry of LEXICON) {
    const dir = path.join(sitesDir, entry.id);
    const indexPath = path.join(dir, 'index.html');

    // Skip flagships (hand-crafted temples that don't reference shared assets)
    if (BUILT_ARCHETYPE_IDS.has(entry.id)) {
      skipped++;
      continue;
    }
    if (fs.existsSync(indexPath)) {
      const existing = fs.readFileSync(indexPath, 'utf8');
      const isBaseTemple =
        existing.includes('temple-base.css') ||
        existing.includes('PUNYCODEX Base Temple — Auto-Generated');
      if (!isBaseTemple) {
        skipped++;
        continue;
      }
      // Overwrite existing base temples
    }

    try {
      const related = getRelatedEntries(entry, LEXICON);
      const html = generateTempleHTML(entry, related);

      fs.mkdirSync(dir, { recursive: true });
      // Atomic write: avoid Windows file-lock issues by writing to a temp
      // file and renaming it into place.
      const tmpPath = `${indexPath}.tmp`;
      fs.writeFileSync(tmpPath, html, 'utf8');
      fs.renameSync(tmpPath, indexPath);
      generated++;

      if (generated % 50 === 0) {
        console.log(`   ✓ Generated ${generated} temples...`);
      }
    } catch (err) {
      errors.push({ id: entry.id, error: err.message });
      console.error(`   ✗ Error generating ${entry.id}:`, err.message);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Generated:  ${generated}`);
  console.log(`   Skipped:    ${skipped} (flagships)`);
  console.log(`   Errors:     ${errors.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log(`   - ${e.id}: ${e.error}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateTempleHTML,
  getTierSubtype,
  getRelatedEntries,
  getPunycode,
  PANTHEON_LABELS,
  LEXICON,
  SOURCE_CATALOG,
};
