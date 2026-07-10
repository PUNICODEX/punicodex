#!/usr/bin/env node
/**
 * PÚNYCODEX — Scholarly Edition Page Generator
 *
 * Generates blank `/sites/{id}/scholars/index.html` pages for all 123
 * flagships using the canonical section taxonomy. Idempotent: safe to
 * re-run without touching existing lore/gallery/home content.
 */

const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'templates', 'flagship');
const SITES_DIR = path.join(ROOT, 'sites');

const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const {
  getOriginalScript,
  hasOriginalScript,
  getOriginalScriptLabel,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const {
  generateBlankManifest,
  getSectionDefinition,
} = require(path.join(ROOT, 'platform', 'scholars', 'taxonomy'));

const BESPOKE_EFFECTS = (() => {
  try {
    return require(path.join(TEMPLATE_DIR, 'effects', 'effects.json'));
  } catch {
    return {};
  }
})();

const PANTHEON_COLORS = {
  greek: { primary: '#D4AF37', secondary: '#4169E1' },
  'greek-location': { primary: '#D4AF37', secondary: '#228B22' },
  norse: { primary: '#C0C0C0', secondary: '#5C9BD1' },
  egyptian: { primary: '#D4AF37', secondary: '#1E3A5F' },
  sanskrit: { primary: '#FF9933', secondary: '#8B0000' },
  celtic: { primary: '#228B22', secondary: '#B8D4E3' },
  mesopotamian: { primary: '#CD7F32', secondary: '#C2B280' },
  polynesian: { primary: '#1E90FF', secondary: '#FF7F50' },
  japanese: { primary: '#DC143C', secondary: '#1A1A1A' },
  nahuatl: { primary: '#50C878', secondary: '#2F2F2F' },
  yoruba: { primary: '#D4AF37', secondary: '#4B0082' },
  slavic: { primary: '#C0C0C0', secondary: '#228B22' },
  zoroastrian: { primary: '#FF4500', secondary: '#F5F5F5' },
  incan: { primary: '#D4AF37', secondary: '#DC143C' },
  canaanite: { primary: '#D4AF37', secondary: '#4169E1' },
  phoenician: { primary: '#D4AF37', secondary: '#800080' },
  hittite: { primary: '#CD7F32', secondary: '#C2B280' },
  chinese: { primary: '#DC143C', secondary: '#D4AF37' },
  taoist: { primary: '#1A1A1A', secondary: '#87CEEB' },
  buddhist: { primary: '#D4AF37', secondary: '#800080' },
  korean: { primary: '#DC143C', secondary: '#0047A0' },
  abrahamic: { primary: '#4169E1', secondary: '#D4AF37' },
};

const OWNED_DOMAINS = (() => {
  try {
    return require(path.join(ROOT, 'platform', 'db', 'owned-domains.json'));
  } catch {
    return [];
  }
})();
const OWNED_DOMAINS_SET = new Set(OWNED_DOMAINS.map((d) => d.toLowerCase().normalize('NFC')));

function getLexiconEntry(id) {
  return LEXICON.find((e) => e.id === id);
}

function getArchetype(id) {
  return ARCHETYPES.find((a) => a.id === id);
}

function paletteFor(entry) {
  const archetype = getArchetype(entry.id);
  if (archetype?.colors?.primary && archetype?.colors?.secondary) {
    return {
      primary: archetype.colors.primary,
      secondary: archetype.colors.secondary,
    };
  }
  return PANTHEON_COLORS[entry.pantheon] || PANTHEON_COLORS.greek;
}

function getEffect(templeId) {
  return BESPOKE_EFFECTS[templeId]?.canvasId || `${templeId}-canvas`;
}

function getUnicode(entry) {
  return entry.unicode || entry.ascii || entry.id;
}

function getAscii(entry) {
  return entry.ascii || entry.id;
}

function getGreekOrOriginal(entry) {
  if (entry.pantheon === 'greek' || entry.pantheon === 'greek-location') {
    return entry.greek || getOriginalScript(entry) || entry.unicode;
  }
  return getOriginalScript(entry) || entry.unicode;
}

function getDomain(entry) {
  const archetype = getArchetype(entry.id);
  return archetype?.domain || entry.domain || '';
}

function getMeaning(entry) {
  return entry.meaning || '';
}

function getTierLabel(entry) {
  if (entry.tier === 'dual') return 'Dual-Tier';
  if (entry.tier === '1') return 'Tier-1';
  if (entry.tier === '2') return 'Tier-2';
  return entry.tierLabel || 'Tier-2';
}

function getOwnedForms(entry) {
  const candidates = [entry.unicode];
  for (const v of entry.variants || []) {
    if (v?.unicode) candidates.push(v.unicode);
  }
  const seen = new Set();
  const forms = [];
  for (const f of candidates) {
    if (!f) continue;
    const domain = `${f}.com`.toLowerCase().normalize('NFC');
    const key = f.toLowerCase().normalize('NFC');
    if (OWNED_DOMAINS_SET.has(domain) && !seen.has(key)) {
      seen.add(key);
      forms.push(f);
    }
  }
  return forms;
}

function getDomainsText(entry) {
  const ownedForms = getOwnedForms(entry);
  if (ownedForms.length === 0) {
    return `${getUnicode(entry)}.com`;
  }
  return ownedForms.map((f) => `${f}.com`).join(' \u00b7 ');
}

function getPunycodeExplainer(entry) {
  const primary = getUnicode(entry);
  try {
    const ace = url.domainToASCII(`${primary.toLowerCase()}.com`);
    if (ace && !ace.includes(' ')) return `${primary}.com \u2192 ${ace}`;
  } catch (_e) {}
  return `${primary}.com \u2192 ${primary}.com`;
}

function buildExtendedTab() {
  return `<a href="../lore/extended/index.html" class="nav-link">Extended</a>`;
}

function buildTocItems(manifest) {
  return manifest.sections
    .map((section, index) => {
      const num = String(index + 1).padStart(2, '0');
      return `<li><a href="#${section.key}">${num} &mdash; ${section.label}</a></li>`;
    })
    .join('\n');
}

function buildSectionsHtml(manifest) {
  return manifest.sections
    .map((section, index) => {
      const num = String(index + 1).padStart(2, '0');
      const def = getSectionDefinition(section.key);
      const purpose = def?.purpose ? `<p class="scholars-section-purpose">${def.purpose}</p>` : '';
      return `<section class="scholars-section" id="${section.key}">
    <div class="scholars-section-header">
        <span class="scholars-section-number">${num}</span>
        <h2 class="scholars-section-title">${section.label}</h2>
        <span class="scholars-section-status empty">Awaiting Contribution</span>
    </div>
    <div class="scholars-section-body">
        ${purpose}
        <div class="scholars-empty-state">
            <p>This section is blank and ready for scholarly contribution. Verified universities and students may propose content through the PUNYCODEX Scholarly Edition workflow.</p>
            <a href="#" class="contribute-cta" data-scholars-contribute>Contribute to ${section.label} →</a>
        </div>
    </div>
</section>`;
    })
    .join('\n\n');
}

function buildFooter(templeId, unicode, entry) {
  const label = getOriginalScriptLabel(entry);
  const script = hasOriginalScript(entry) ? getOriginalScript(entry) : '—';
  return `<footer class="section footer-section">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-block">
                <span class="footer-label">Unicode Restoration</span>
                <span class="footer-value">${unicode}</span>
            </div>
            <div class="footer-block">
                <span class="footer-label">${label}</span>
                <span class="footer-value">${script}</span>
            </div>
            <div class="footer-block">
                <span class="footer-label">Pantheon</span>
                <span class="footer-value">${entry.pantheon}</span>
            </div>
            <div class="footer-block">
                <span class="footer-label">Classification</span>
                <span class="footer-value">${getTierLabel(entry)}</span>
            </div>
        </div>
        <div class="footer-bottom">
            <p class="footer-credit">Part of the <a href="https://punycodex.com/">PUNYCODEX</a> temple network.</p>
            <p class="footer-legal">Scholarly Edition content is contributed under CC BY 4.0 and reviewed by PUNYCODEX curators.</p>
        </div>
    </div>
</footer>`;
}

function generateScholarsPage(templeId) {
  const entry = getLexiconEntry(templeId);
  if (!entry) {
    throw new Error(`No lexicon entry found for ${templeId}`);
  }

  const manifest = generateBlankManifest(templeId);
  const palette = paletteFor(entry);

  const vars = {
    TEMPLE_ID: templeId,
    UNICODE: getUnicode(entry),
    ASCII: getAscii(entry),
    GREEK: getGreekOrOriginal(entry),
    DOMAIN: getDomain(entry),
    MEANING: getMeaning(entry),
    PRIMARY: palette.primary,
    SECONDARY: palette.secondary,
    EFFECT: getEffect(templeId),
    TIER_LABEL: getTierLabel(entry),
    DOMAINS_TEXT: getDomainsText(entry),
    PUNYCODE: getPunycodeExplainer(entry),
    EXTENDED_TAB: buildExtendedTab(),
    TOC_ITEMS: buildTocItems(manifest),
    SECTIONS_HTML: buildSectionsHtml(manifest),
    ATTRIBUTION_NUMBER: String(manifest.sections.length + 1).padStart(2, '0'),
    EDIT_HISTORY_NUMBER: String(manifest.sections.length + 2).padStart(2, '0'),
    FOOTER: buildFooter(templeId, getUnicode(entry), entry),
  };

  let html = fs.readFileSync(path.join(TEMPLATE_DIR, 'scholars', 'index.html'), 'utf8');
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = vars[key] == null ? '' : String(vars[key]);
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}

module.exports = { generateScholarsPage };

function main() {
  const built = ARCHETYPES.filter((a) => a.built);
  let generated = 0;
  let errors = 0;

  for (const archetype of built) {
    try {
      const html = generateScholarsPage(archetype.id);
      const outDir = path.join(SITES_DIR, archetype.id, 'scholars');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
      generated += 1;
    } catch (err) {
      console.error(`Failed to generate Scholars page for ${archetype.id}:`, err.message);
      errors += 1;
    }
  }

  console.log(`Generated ${generated} Scholars pages.`);
  if (errors > 0) {
    console.error(`${errors} page(s) failed.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
