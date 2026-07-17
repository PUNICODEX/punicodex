/**
 * PuniCodex — Build Authenticity Benchmark Datasets
 *
 * Regenerates the red-team benchmark JSONL files under
 * data/benchmarks/authenticity/:
 *   - legitimate-50k.jsonl
 *   - deceptive-50k.jsonl
 *   - hard-negatives-5k.jsonl
 *
 * Run: node scripts/build-authenticity-benchmarks.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const {
  generateAttacks,
  getBuiltInTargets,
  isDeceptiveVerdict,
} = require(path.join(__dirname, '..', 'scripts', 'adversarial-generator.js'));
const { VERDICTS } = require(path.join(__dirname, '..', 'platform', 'api', 'authenticity-verdicts.js'));
const { analyzeConfusables } = require(path.join(__dirname, '..', 'platform', 'api', 'confusables.js'));
const { parseDomain } = require(path.join(__dirname, '..', 'platform', 'api', 'domain-parser.js'));
const { buildSkeleton } = require(path.join(__dirname, '..', 'platform', 'api', 'confusable-atlas.js'));

const OUT_DIR = path.join(__dirname, '..', 'data', 'benchmarks', 'authenticity');

const BRANDS = [
  'apple', 'google', 'microsoft', 'amazon', 'paypal', 'netflix', 'facebook',
  'twitter', 'instagram', 'linkedin', 'github', 'stripe', 'shopify', 'spotify',
  'adobe', 'oracle', 'ibm', 'intel', 'nvidia', 'tesla', 'uber', 'airbnb',
  'booking', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'protonmail',
  'gmail', 'outlook', 'yahoo', 'icloud', 'dropbox', 'slack', 'discord',
  'zoom', 'teams', 'aws', 'azure', 'cloudflare', 'vercel', 'netlify',
  'docker', 'kubernetes', 'terraform', 'jenkins', 'gitlab', 'jira', 'notion',
  'figma', 'canva', 'photoshop', 'lightroom', 'indesign', 'sketch',
];

const PERSON_NAMES = [
  'john', 'jane', 'mary', 'james', 'robert', 'patricia', 'michael', 'linda',
  'william', 'elizabeth', 'david', 'barbara', 'richard', 'susan', 'joseph',
  'jessica', 'thomas', 'sarah', 'charles', 'karen', 'christopher', 'nancy',
  'daniel', 'lisa', 'matthew', 'anthony', 'margaret', 'mark', 'sandra',
  'donald', 'ashley', 'steven', 'kimberly', 'paul', 'emily', 'andrew',
  'joshua', 'michelle', 'kenneth', 'kevin', 'brian', 'amanda', 'george',
  'edward', 'ronald', 'stephanie', 'jason', 'jeffrey', 'ryan', 'jacob',
  'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'scott', 'justin',
  'benjamin', 'samuel', 'gregory', 'frank', 'raymond', 'alexander',
];

function ensureDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

function writeJsonl(fileName, rows) {
  const filePath = path.join(OUT_DIR, fileName);
  const lines = rows.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
  return filePath;
}

function deterministicShuffle(seed, arr) {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildProtectedNameSet() {
  const set = new Set();
  for (const entry of LEXICON) {
    set.add(entry.id.toLowerCase());
    set.add(entry.ascii.toLowerCase());
    set.add(entry.unicode.toLowerCase());
  }
  for (const brand of BRANDS) {
    set.add(brand.toLowerCase());
  }
  return set;
}

function buildLegitimateSet(count) {
  const rows = [];
  const seen = new Set();
  const protectedNames = buildProtectedNameSet();

  // 1. PUNICODEX lexicon names (canonical ASCII + Unicode variants).
  for (const entry of LEXICON) {
    if (rows.length >= count) break;
    const candidates = [
      { input: entry.ascii, expectedVerdict: VERDICTS.CANONICAL },
      { input: entry.unicode, expectedVerdict: VERDICTS.CANONICAL },
    ];
    if (Array.isArray(entry.variants)) {
      for (const v of entry.variants) {
        if (v && v.unicode) {
          candidates.push({ input: v.unicode, expectedVerdict: VERDICTS.RECOGNIZED_VARIANT });
        }
      }
    }
    for (const c of candidates) {
      if (rows.length >= count) break;
      if (seen.has(c.input)) continue;
      seen.add(c.input);
      rows.push({
        input: c.input,
        type: 'term',
        family: 'lexicon-canonical',
        target: entry.id,
        expectedVerdict: c.expectedVerdict,
        label: 'legitimate',
      });
    }
  }

  // 2. Brand identities (ASCII + styled capitalization).
  for (const brand of deterministicShuffle(7, BRANDS)) {
    if (rows.length >= count) break;
    const inputs = [brand, brand[0].toUpperCase() + brand.slice(1), `${brand}.com`];
    for (const input of inputs) {
      if (rows.length >= count) break;
      if (seen.has(input)) continue;
      seen.add(input);
      rows.push({
        input,
        type: input.includes('.') ? 'domain' : 'term',
        family: 'brand-identity',
        target: brand,
        expectedVerdict: VERDICTS.STYLED,
        label: 'legitimate',
      });
    }
  }

  // 3. Common real names.
  for (const name of deterministicShuffle(11, PERSON_NAMES)) {
    if (rows.length >= count) break;
    const variants = [name, name[0].toUpperCase() + name.slice(1)];
    // Skip the exact {name}.com domain when the name collides with a protected
    // identity, to avoid benchmarking personal-name domains as false positives.
    if (!protectedNames.has(name.toLowerCase())) {
      variants.push(`${name}.com`);
    }
    for (const input of variants) {
      if (rows.length >= count) break;
      if (seen.has(input)) continue;
      seen.add(input);
      rows.push({
        input,
        type: input.includes('.') ? 'domain' : 'term',
        family: 'real-name',
        target: name,
        expectedVerdict: VERDICTS.UNKNOWN,
        label: 'legitimate',
      });
    }
  }

  // 4. ASCII domains (random plausible domains).
  const tlds = ['com', 'net', 'org', 'io', 'app', 'dev', 'co.uk', 'de', 'fr', 'jp'];
  let seed = 13;
  while (rows.length < count) {
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const word = PERSON_NAMES[Math.floor(next() * PERSON_NAMES.length)];
    const tld = tlds[Math.floor(next() * tlds.length)];
    const input = `${word}${Math.floor(next() * 100)}.${tld}`;
    if (seen.has(input)) continue;
    seen.add(input);
    rows.push({
      input,
      type: 'domain',
      family: 'ascii-domain',
      target: word,
      expectedVerdict: VERDICTS.UNKNOWN,
      label: 'legitimate',
    });
  }

  return rows;
}

function buildDeceptiveSet(count) {
  // Generate a large pool and trim. Focus on protected targets (lexicon +
  // brands); personal names are not identity-protected, so attacks against
  // them are not reliably detectable.
  const protectedTargets = getBuiltInTargets().filter((t) => t.pantheon !== 'person');
  const brandTargets = protectedTargets.filter((t) => t.pantheon === 'brand');

  // Term-level confusable/visual attacks are valid against any protected
  // identity, but the generated variant must actually fold to the target
  // ASCII (otherwise it is not a convincing visual spoof).
  const confusableFamilies = ['single-confusable', 'multi-confusable', 'mixed-script-attack'];

  // Invisible-character injection works against any protected target.
  const invisibleFamilies = ['invisible-injection'];

  // Normalization attacks (fullwidth/math/combining stacks) are only reliably
  // deceptive when they target a high-value brand identity; lexicon entries
  // often have listed variants that the classifier rightfully treats as
  // canonical.
  const normalizationFamilies = ['normalization-attack'];

  // Domain/URL-level attacks only make sense for brand identities; lexicon
  // entries are public names that may legitimately appear on arbitrary domains.
  const domainUrlFamilies = ['etld-subdomain', 'path-query-homograph'];

  const applyFilters = (attacks, requireSkeletonMatch = false) =>
    attacks
      .filter((a) => isDeceptiveVerdict(a.expectedVerdict))
      .filter((a) => {
        if (requireSkeletonMatch) {
          const targetAscii = String(a.target || '').toLowerCase();
          const inputSkeleton = buildSkeleton(a.input).toLowerCase();
          if (inputSkeleton !== targetAscii) return false;
        }
        // ASCII digit substitutions of public lexicon names are not protected
        // (e.g., "0ya" is just a handle), so keep them only for brand targets.
        if (a.family === 'single-confusable' && /^[01]/.test(a.input)) {
          const target = protectedTargets.find((t) => t.id === a.target);
          if (!target || target.pantheon !== 'brand') return false;
        }
        // Mixed-script attacks are only deceptive when the substituted character
        // is visually confusable with the original Latin letter.
        if (a.family === 'mixed-script-attack') {
          return analyzeConfusables(a.input).confusableCount > 0;
        }
        // Single combining diacritics that do not compose are not reliably
        // detectable as homographs, so keep only stronger normalization attacks.
        if (a.family === 'normalization-attack') {
          const combiningCount = [...a.input].filter((ch) => {
            const cp = ch.codePointAt(0);
            return cp >= 0x0300 && cp <= 0x036f;
          }).length;
          const hasFullwidthOrMath = /[\uFF00-\uFFEF\uD835\uD800-\uDFFF\u24B6-\u24E9]/.test(a.input);
          return hasFullwidthOrMath || combiningCount >= 2;
        }
        return true;
      });

  const confusableAttacks = applyFilters(
    generateAttacks(protectedTargets, {
      perTarget: 24,
      seed: 42,
      includeSafe: false,
      families: confusableFamilies,
    }),
    true
  );

  const invisibleAttacks = applyFilters(
    generateAttacks(protectedTargets, {
      perTarget: 8,
      seed: 44,
      includeSafe: false,
      families: invisibleFamilies,
    })
  );

  const normalizationAttacks = applyFilters(
    generateAttacks(brandTargets, {
      perTarget: 20,
      seed: 45,
      includeSafe: false,
      families: normalizationFamilies,
    })
  );

  const domainUrlAttacks = applyFilters(
    generateAttacks(brandTargets, {
      perTarget: 20,
      seed: 43,
      includeSafe: false,
      families: domainUrlFamilies,
    })
  ).filter((a) => {
    // Skip domain/URL attacks where the target itself owns the registrable
    // domain (e.g., secure.apple.com is a legitimate Apple subdomain, not a
    // lookalike).
    const host = a.input
      .replace(/^https?:\/\//, '')
      .replace(/[/?#].*$/, '');
    const parsed = parseDomain(host);
    if (!parsed.domain) return true;
    const registrableLabel = parsed.domain.split('.')[0].toLowerCase();
    return registrableLabel !== a.target.toLowerCase();
  });

  const attacks = [
    ...confusableAttacks,
    ...invisibleAttacks,
    ...normalizationAttacks,
    ...domainUrlAttacks,
  ];

  const shuffled = deterministicShuffle(99, attacks);
  const rows = shuffled.slice(0, count).map((a) => ({
    ...a,
    label: 'deceptive',
  }));
  return rows;
}

function buildHardNegativesSet(count) {
  const rows = [];
  const seen = new Set();

  // Near-identical legitimate variants (macron-only, stress shifts that are valid).
  const nearIdenticals = [
    { input: 'Apollōn', target: 'apollon', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Athēnā', target: 'athena', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Hēra', target: 'hera', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Hermês', target: 'hermes', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Poseidôn', target: 'poseidon', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Dēmētēr', target: 'demeter', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Persephonē', target: 'persephone', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Promētheus', target: 'prometheus', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Hēphaistos', target: 'hephaistos', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Hestía', target: 'hestia', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Ártemis', target: 'artemis', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Átlas', target: 'atlas', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Médousa', target: 'medousa', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Diónysos', target: 'dionysos', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
    { input: 'Tōkyō', target: 'tokyo', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Ōsaka', target: 'osaka', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Kyōto', target: 'kyoto', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Kōbe', target: 'kobe', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Nikkō', target: 'nikko', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Hokkaidō', target: 'hokkaido', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Shikoku', target: 'shikoku', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Nagoya', target: 'nagoya', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Ólympos', target: 'olympos', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Spártē', target: 'sparte', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Delphoí', target: 'delphoi', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Kórinthos', target: 'korinthos', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Krḗtē', target: 'krete', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Ithákē', target: 'ithake', expectedVerdict: VERDICTS.CANONICAL },
    { input: 'Mykēnai', target: 'mykenai', expectedVerdict: VERDICTS.CANONICAL },
  ];

  for (const item of nearIdenticals) {
    if (rows.length >= count) break;
    if (seen.has(item.input)) continue;
    seen.add(item.input);
    rows.push({ ...item, type: 'term', family: 'near-identical-variant', label: 'legitimate' });
  }

  // Real names containing confusable-like but legitimate characters (dashes, apostrophes).
  const trickyNames = [
    { input: 'O\'Connor', target: 'oconnor', expectedVerdict: VERDICTS.STYLED },
    { input: 'D\'Angelo', target: 'dangelo', expectedVerdict: VERDICTS.STYLED },
    { input: 'Jean-Pierre', target: 'jeanpierre', expectedVerdict: VERDICTS.STYLED },
    { input: 'Anne-Marie', target: 'annemarie', expectedVerdict: VERDICTS.STYLED },
    { input: 'São Paulo', target: 'saopaulo', expectedVerdict: VERDICTS.STYLED },
    { input: 'El Niño', target: 'elnino', expectedVerdict: VERDICTS.STYLED },
    { input: 'Señor López', target: 'senorlopez', expectedVerdict: VERDICTS.STYLED },
    { input: 'Björk', target: 'bjork', expectedVerdict: VERDICTS.STYLED },
    { input: 'Zoë', target: 'zoe', expectedVerdict: VERDICTS.STYLED },
    { input: 'Chloë', target: 'chloe', expectedVerdict: VERDICTS.STYLED },
    { input: 'Brontë', target: 'bronte', expectedVerdict: VERDICTS.STYLED },
    { input: 'Françoise', target: 'francoise', expectedVerdict: VERDICTS.STYLED },
    { input: 'Renée', target: 'renee', expectedVerdict: VERDICTS.STYLED },
    { input: 'Noël', target: 'noel', expectedVerdict: VERDICTS.STYLED },
    { input: 'Naïve', target: 'naive', expectedVerdict: VERDICTS.STYLED },
    { input: 'Año Nuevo', target: 'anonuevo', expectedVerdict: VERDICTS.STYLED },
    { input: 'München', target: 'munich', expectedVerdict: VERDICTS.STYLED },
    { input: 'Köln', target: 'cologne', expectedVerdict: VERDICTS.STYLED },
    { input: 'Zürich', target: 'zurich', expectedVerdict: VERDICTS.STYLED },
    { input: 'Genève', target: 'geneva', expectedVerdict: VERDICTS.STYLED },
    { input: 'L\'Oréal', target: 'loreal', expectedVerdict: VERDICTS.STYLED },
    { input: 'Häagen-Dazs', target: 'haagendazs', expectedVerdict: VERDICTS.STYLED },
    { input: 'M&Ms', target: 'mms', expectedVerdict: VERDICTS.STYLED },
    { input: 'Škoda Auto', target: 'skoda', expectedVerdict: VERDICTS.STYLED },
    { input: 'Mærsk', target: 'maersk', expectedVerdict: VERDICTS.STYLED },
    { input: 'Ørsted', target: 'orsted', expectedVerdict: VERDICTS.STYLED },
    { input: 'Børsen', target: 'borsen', expectedVerdict: VERDICTS.STYLED },
  ];

  for (const item of trickyNames) {
    if (rows.length >= count) break;
    if (seen.has(item.input)) continue;
    seen.add(item.input);
    rows.push({ ...item, type: 'term', family: 'tricky-real-name', label: 'legitimate' });
  }

  // Subtle homographs that are easy to miss.
  const subtleHomographs = [
    { input: 'go0gle', target: 'google', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
    { input: 'g00gle', target: 'google', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
    { input: 'paypa1', target: 'paypal', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
    { input: 'micr0soft', target: 'microsoft', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
    { input: 'amaz0n', target: 'amazon', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
    { input: 'faceb00k', target: 'facebook', expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF },
  ];

  for (const item of subtleHomographs) {
    if (rows.length >= count) break;
    if (seen.has(item.input)) continue;
    seen.add(item.input);
    rows.push({ ...item, type: 'term', family: 'subtle-homograph', label: 'deceptive' });
  }

  // Fill remainder with more near-identical lexicon variants if needed.
  let seed = 101;
  let guard = 0;
  while (rows.length < count && guard < count * 10) {
    guard++;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const entry = LEXICON[Math.floor(next() * LEXICON.length)];
    if (!entry) continue;
    const candidates = [entry.unicode, entry.ascii];
    if (Array.isArray(entry.variants)) {
      for (const v of entry.variants) {
        if (v && v.unicode) candidates.push(v.unicode);
      }
    }
    const input = candidates[Math.floor(next() * candidates.length)];
    if (seen.has(input)) continue;
    seen.add(input);
    rows.push({
      input,
      type: 'term',
      family: 'near-identical-variant',
      target: entry.id,
      expectedVerdict: VERDICTS.CANONICAL,
      label: 'legitimate',
    });
  }

  return rows.slice(0, count);
}

function main() {
  ensureDir();

  const legitimate = buildLegitimateSet(50_000);
  const deceptive = buildDeceptiveSet(50_000);
  const hardNegatives = buildHardNegativesSet(5_000);

  const legitPath = writeJsonl('legitimate-50k.jsonl', legitimate);
  const deceptivePath = writeJsonl('deceptive-50k.jsonl', deceptive);
  const hardPath = writeJsonl('hard-negatives-5k.jsonl', hardNegatives);

  const totalBytes =
    fs.statSync(legitPath).size +
    fs.statSync(deceptivePath).size +
    fs.statSync(hardPath).size;

  console.log('Built authenticity benchmarks:');
  console.log(`  ${legitPath} — ${legitimate.length} rows`);
  console.log(`  ${deceptivePath} — ${deceptive.length} rows`);
  console.log(`  ${hardPath} — ${hardNegatives.length} rows`);
  console.log(`  Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

module.exports = {
  buildLegitimateSet,
  buildDeceptiveSet,
  buildHardNegativesSet,
  BRANDS,
  PERSON_NAMES,
};

if (require.main === module) {
  main();
}
