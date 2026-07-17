#!/usr/bin/env node
/**
 * PuniCodex — Safety & Adversarial Corpus Generator (Phase 2)
 *
 * Turns the red-team adversarial generator into high-quality instruction-tuning
 * examples for homograph defense, mixed-script detection, normalization attacks,
 * brand disambiguation, and punycode safety.
 *
 * Output:
 *   - data/corpus/safety-examples.jsonl
 *
 * Every example is fully grounded in the adversarial generator's expected
 * verdict so the model learns to classify *and* explain attacks.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII, domainToUnicode } = require('node:url');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'corpus');
const OUT_PATH = path.join(OUT_DIR, 'safety-examples.jsonl');

const { generateAttacks, isDeceptiveVerdict, FAMILY_GENERATORS } = require(path.join(
  ROOT,
  'scripts',
  'adversarial-generator'
));
const { VERDICTS } = require(path.join(ROOT, 'platform', 'api', 'authenticity-verdicts.js'));

const VERDICT_LABELS = {
  [VERDICTS.CANONICAL]: 'canonical',
  [VERDICTS.RECOGNIZED_VARIANT]: 'recognized variant',
  [VERDICTS.ASCII_FALLBACK]: 'ASCII fallback',
  [VERDICTS.STYLED]: 'styled',
  [VERDICTS.TRANSLITERATION_UNCERTAIN]: 'transliteration uncertain',
  [VERDICTS.HOMOGRAPH_SPOOF]: 'homograph spoof',
  [VERDICTS.MIXED_SCRIPT_SPOOF]: 'mixed-script spoof',
  [VERDICTS.LOOKALIKE_DOMAIN]: 'lookalike domain',
  [VERDICTS.UNSAFE]: 'unsafe',
  [VERDICTS.UNKNOWN]: 'unknown',
};

const VERDICT_EXPLANATIONS = {
  [VERDICTS.HOMOGRAPH_SPOOF]:
    'This input uses visually similar Unicode characters to impersonate a protected name. It should not be trusted as the real name.',
  [VERDICTS.MIXED_SCRIPT_SPOOF]:
    'This input mixes characters from different writing systems to create a visual impersonation.',
  [VERDICTS.LOOKALIKE_DOMAIN]:
    'This domain is structured to look like a protected identity without using the real registrable domain.',
  [VERDICTS.UNSAFE]: 'This input matches a known unsafe pattern or blocklist.',
  [VERDICTS.CANONICAL]: 'This is a canonical, scholarly restoration of the name.',
  [VERDICTS.RECOGNIZED_VARIANT]:
    'This is a documented scholarly variant of the canonical name.',
  [VERDICTS.ASCII_FALLBACK]: 'This is the plain ASCII form of a name that has a Unicode restoration.',
  [VERDICTS.STYLED]:
    'This uses legitimate diacritics or stylistic Unicode forms that do not impersonate another identity.',
  [VERDICTS.TRANSLITERATION_UNCERTAIN]:
    'This transliteration is uncertain and should be verified against authoritative sources.',
  [VERDICTS.UNKNOWN]:
    'This input does not match any protected identity and carries no clear deception signals.',
};

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function makeId(target, family, task, index) {
  return `${target}-${family}-${task}-${String(index).padStart(5, '0')}`;
}

function buildClassifyExample(attack, index) {
  const isDeceptive = isDeceptiveVerdict(attack.expectedVerdict);
  const label = VERDICT_LABELS[attack.expectedVerdict] || attack.expectedVerdict;
  const typeLabel = attack.type === 'domain' ? 'domain' : attack.type === 'url' ? 'URL' : 'name';

  return {
    id: makeId(attack.target, attack.family, 'classify', index),
    entryId: attack.target,
    task: 'safety_classify',
    instruction: `Is the following ${typeLabel} a safe canonical form, a legitimate variant, or a deceptive spoof?\n\n"${attack.input}"`,
    input: attack.input,
    output: isDeceptive
      ? `"${attack.input}" is a ${label} (deceptive). ${VERDICT_EXPLANATIONS[attack.expectedVerdict]} Target: ${attack.target}.`
      : `"${attack.input}" is ${label} (not deceptive). ${VERDICT_EXPLANATIONS[attack.expectedVerdict]}`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: attack.type,
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
    },
  };
}

function buildExplainExample(attack, index) {
  if (!isDeceptiveVerdict(attack.expectedVerdict)) return null;

  const label = VERDICT_LABELS[attack.expectedVerdict] || attack.expectedVerdict;
  let mechanism = '';
  switch (attack.family) {
    case 'single-confusable':
    case 'multi-confusable':
      mechanism =
        'One or more letters were replaced with visually confusable Unicode characters that render like the original letters.';
      break;
    case 'invisible-injection':
      mechanism =
        'Invisible control characters (zero-width spaces, variation selectors, bidirectional overrides, etc.) were inserted into the string.';
      break;
    case 'normalization-attack':
      mechanism =
        'The string uses compatibility equivalents, combining diacritic stacks, or decomposed forms that look like the target after normalization.';
      break;
    case 'mixed-script-attack':
      mechanism =
        'Characters from a different writing system were substituted because they look identical or nearly identical to Latin letters.';
      break;
    case 'etld-subdomain':
      mechanism =
        'The protected name appears in a subdomain or label under an attacker-controlled registrable domain.';
      break;
    case 'path-query-homograph':
      mechanism =
        'The protected name appears in a path or query parameter on an unrelated domain, often combined with phishing keywords.';
      break;
    default:
      mechanism = 'The input carries visual or structural deception signals.';
  }

  return {
    id: makeId(attack.target, attack.family, 'explain', index),
    entryId: attack.target,
    task: 'safety_explain',
    instruction: `Why is "${attack.input}" considered a deceptive spoof of "${attack.target}"?`,
    input: attack.input,
    output: `"${attack.input}" is classified as a ${label} because ${mechanism} The intended target appears to be "${attack.target}", but the input is not the canonical or allowed form.`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: attack.type,
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
    },
  };
}

function buildNormalizeExample(attack, index) {
  // Only generate for term-level homographs and normalization attacks.
  if (attack.type !== 'term') return null;
  if (
    attack.family !== 'single-confusable' &&
    attack.family !== 'multi-confusable' &&
    attack.family !== 'normalization-attack'
  ) {
    return null;
  }

  return {
    id: makeId(attack.target, attack.family, 'normalize', index),
    entryId: attack.target,
    task: 'safety_normalize',
    instruction: `Normalize the following visually deceptive string to its closest ASCII form and identify the intended target.\n\n"${attack.input}"`,
    input: attack.input,
    output: `"${attack.input}" normalizes toward "${attack.target}". It is not the canonical Unicode restoration; it is a deceptive variant that should be treated as a spoof.`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: attack.type,
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
    },
  };
}

function buildMixedScriptExample(attack, index) {
  if (attack.family !== 'mixed-script-attack' && attack.family !== 'mixed-script-legitimate') {
    return null;
  }
  const isSpoof = attack.expectedVerdict === VERDICTS.MIXED_SCRIPT_SPOOF;

  return {
    id: makeId(attack.target, attack.family, 'mixed_script', index),
    entryId: attack.target,
    task: 'safety_detect_mixed_script',
    instruction: `Does "${attack.input}" use mixed scripts? If so, is it a legitimate scholarly form or a spoof?`,
    input: attack.input,
    output: isSpoof
      ? `"${attack.input}" mixes scripts deceptively. It substitutes characters from another writing system to impersonate "${attack.target}".`
      : `"${attack.input}" uses mixed scripts legitimately. It is a recognized scholarly or stylistic form of "${attack.target}".`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: attack.type,
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
    },
  };
}

function hasNonAscii(str) {
  return [...str].some((ch) => ch.codePointAt(0) > 127);
}

function buildPunycodeExample(attack, index) {
  if (attack.type !== 'domain') return null;
  if (!hasNonAscii(attack.input)) return null;

  const punycode = domainToASCII(attack.input.toLowerCase());
  if (punycode === attack.input.toLowerCase()) return null;

  return {
    id: makeId(attack.target, attack.family, 'punycode', index),
    entryId: attack.target,
    task: 'safety_punycode',
    instruction: `Decode the following punycode domain and assess whether it is a safe canonical domain or a spoof.\n\n${punycode}`,
    input: punycode,
    output: `${punycode} decodes to "${domainToUnicode(punycode)}". It is a deceptive variant targeting "${attack.target}" and should be treated as a ${VERDICT_LABELS[attack.expectedVerdict] || attack.expectedVerdict}.`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: 'domain',
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
      decoded: domainToUnicode(punycode),
    },
  };
}

function buildUrlAnalysisExample(attack, index) {
  if (attack.type !== 'url') return null;

  return {
    id: makeId(attack.target, attack.family, 'url_analysis', index),
    entryId: attack.target,
    task: 'safety_url_analysis',
    instruction: `Analyze the following URL. Is it a safe canonical link for "${attack.target}" or a deceptive spoof?\n\n${attack.input}`,
    input: attack.input,
    output: `"${attack.input}" is not a safe canonical link for "${attack.target}". It places the target name in a path or query on an unrelated domain, a pattern consistent with a ${VERDICT_LABELS[attack.expectedVerdict] || attack.expectedVerdict}.`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: 'url',
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
    },
  };
}

function buildPunycodeFromTermExample(attack, index) {
  // Only term-level homograph/mixed-script attacks become punycode domains.
  if (attack.type !== 'term') return null;
  if (
    attack.family !== 'single-confusable' &&
    attack.family !== 'multi-confusable' &&
    attack.family !== 'mixed-script-attack'
  ) {
    return null;
  }
  if (!hasNonAscii(attack.input)) return null;

  const domain = `${attack.input.toLowerCase()}.com`;
  let punycode;
  try {
    punycode = domainToASCII(domain);
  } catch {
    return null;
  }
  // Only keep real punycode domains (xn--). Some compatibility characters
  // normalize to plain ASCII before encoding and do not produce xn--.
  if (!punycode.startsWith('xn--')) return null;

  const decoded = domainToUnicode(punycode);

  return {
    id: makeId(attack.target, attack.family, 'punycode', index),
    entryId: attack.target,
    task: 'safety_punycode',
    instruction: `Decode the following punycode domain and assess whether it is a safe canonical domain for "${attack.target}" or a spoof.\n\n${punycode}`,
    input: punycode,
    output: `${punycode} decodes to "${decoded}". It is a punycode homograph spoof of "${attack.target}" and should be treated as a ${VERDICT_LABELS[attack.expectedVerdict] || attack.expectedVerdict}.`,
    sources: ['confusable-atlas', 'adversarial-generator'],
    confidence: 'generated',
    metadata: {
      family: attack.family,
      type: 'domain',
      expectedVerdict: attack.expectedVerdict,
      target: attack.target,
      decoded,
    },
  };
}

const BRAND_DISAMBIGUATION_EXAMPLES = [
  {
    id: 'brand-disambiguate-hermes-001',
    entryId: 'hermes',
    task: 'safety_brand_disambiguate',
    instruction:
      'The string "Hermès" could refer to the Greek deity Hermês or the French fashion house Hermès. How should PuniCodex classify it?',
    input: 'Hermès',
    output:
      'Context is required. In the PuniCodex mythological lexicon, "Hermès" maps to the Greek deity Hermês. If the domain context is hermes.com or a mythology page, it is canonical. If the context is luxury fashion, it is a protected brand identity. The Unicode restoration distinguishes the scholarly deity form from the brand.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'hermes' },
  },
  {
    id: 'brand-disambiguate-nike-001',
    entryId: 'nike',
    task: 'safety_brand_disambiguate',
    instruction:
      'The string "Nike" could refer to the Greek goddess Níkē or the sportswear brand Nike. How should PuniCodex classify it?',
    input: 'Nike',
    output:
      'In PuniCodex, "Níkē" (with acute and macron) is the scholarly Greek goddess. The plain ASCII "Nike" is the modern English homograph shared with the brand. Without a deity-specific Unicode restoration, plain "Nike" is treated as ASCII fallback for the goddess, while brand contexts are handled by the brand shield.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'nike' },
  },
  {
    id: 'brand-disambiguate-ares-001',
    entryId: 'ares',
    task: 'safety_brand_disambiguate',
    instruction:
      'The domain "ares.com" could refer to the Greek god Árēs or Ares Management (finance). How should it be handled?',
    input: 'ares.com',
    output:
      'Domain context disambiguates. If ares.com resolves to a mythology site or is listed as an allowed domain for the deity, it is canonical. If it serves financial content, it is a brand presence. PuniCodex records allowed domains per identity and classifies accordingly.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'domain', target: 'ares' },
  },
  {
    id: 'brand-disambiguate-apollon-001',
    entryId: 'apollon',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Apollo" is a Greek god, but also a space program, a theater chain, and many companies. How does PuniCodex treat it?',
    input: 'Apollo',
    output:
      'PuniCodex treats "Apóllōn" / "Apollōn" as the scholarly deity. The plain ASCII "Apollo" is an ASCII fallback. Space-program, automotive, or entertainment contexts are brand/external identities and are handled by the brand shield; only mythology contexts are canonical here.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'apollon' },
  },
  {
    id: 'brand-disambiguate-athena-001',
    entryId: 'athena',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Athena" is a Greek goddess but also used by healthcare systems, financial services, and tech products. How is it classified?',
    input: 'Athena',
    output:
      '"Athénā" / "Athēnā" is the scholarly goddess form in PuniCodex. Plain "Athena" is ASCII fallback. Corporate or product uses are brand identities; the Unicode restoration signals the deity.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'athena' },
  },
  {
    id: 'brand-disambiguate-atlas-001',
    entryId: 'atlas',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Atlas" is a Titan in Greek mythology, but also a software company, a rocket, and a book publisher. How does PuniCodex handle this collision?',
    input: 'Atlas',
    output:
      'PuniCodex canonizes the Titan as "Átlas" with stress. Plain "Atlas" is ASCII fallback. Software, aerospace, or publishing contexts are treated as brand/external identities unless they explicitly serve the mythology page.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'atlas' },
  },
  {
    id: 'brand-disambiguate-dionysos-001',
    entryId: 'dionysos',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Dionysus" is the Greek god of wine, but the name appears on wine labels and entertainment brands. Is it safe?',
    input: 'Dionysus',
    output:
      '"Diónysos" is the scholarly deity. Plain "Dionysus" is ASCII fallback. Wine or entertainment labels using the name are brand/styled uses; they are not canonical deity references unless on the PuniCodex temple or related scholarly context.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'dionysos' },
  },
  {
    id: 'brand-disambiguate-freyja-001',
    entryId: 'freyja',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Freya" is a Norse goddess, but also a popular product and given name. How should it be disambiguated?',
    input: 'Freya',
    output:
      '"Freyja" is the Norse goddess in PuniCodex. The plain ASCII "Freya" is a common transliteration and may also be a product or personal name. The Unicode restoration "Freyja" signals the deity; other contexts are styled or brand uses.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'freyja' },
  },
  {
    id: 'brand-disambiguate-thor-001',
    entryId: 'thor',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Thor" is a Norse god and a Marvel superhero. How does PuniCodex separate them?',
    input: 'Thor',
    output:
      '"Þórr" is the scholarly Norse deity in PuniCodex. Plain "Thor" is ASCII fallback. Comic, film, or merchandise contexts are brand/entertainment identities and are not canonical deity references.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'thor' },
  },
  {
    id: 'brand-disambiguate-odin-001',
    entryId: 'odinn',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Odin" is the Allfather in Norse mythology, but also used by software, investment, and gaming brands. How is it treated?',
    input: 'Odin',
    output:
      '"Óðinn" is the scholarly deity. Plain "Odin" is ASCII fallback. Software, investment, or gaming brands are external identities; only the mythology context is canonical in PuniCodex.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'odinn' },
  },
  {
    id: 'brand-disambiguate-amaterasu-001',
    entryId: 'amaterasu',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Amaterasu" is a Japanese sun goddess and also appears in video games and products. How does PuniCodex classify it?',
    input: 'Amaterasu',
    output:
      '"Amaterasu" is the Japanese sun goddess in PuniCodex. Game or product uses are styled/brand identities; the canonical entry is the Shinto deity unless the context explicitly belongs to another owner.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'amaterasu' },
  },
  {
    id: 'brand-disambiguate-gaia-001',
    entryId: 'gaia',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Gaia" is the Greek primordial Earth goddess, but also a streaming service, a hypothesis, and various brands. How is it handled?',
    input: 'Gaia',
    output:
      '"Gaîa" / "Gaia" is the primordial goddess in PuniCodex. Streaming, wellness, or scientific contexts are external identities. The plain ASCII form is the same as the goddess, so domain and page context disambiguate.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'gaia' },
  },
  {
    id: 'brand-disambiguate-eros-001',
    entryId: 'eros',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Eros" is the Greek god of love, but also a dating app and an asteroid. How does PuniCodex classify it?',
    input: 'Eros',
    output:
      '"Érōs" is the scholarly deity. Plain "Eros" is ASCII fallback. Dating-app or astronomy contexts are brand/external uses; the deity context is canonical.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'eros' },
  },
  {
    id: 'brand-disambiguate-heimdallr-001',
    entryId: 'heimdallr',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Heimdall" is a Norse god and appears in comics and security products. How is it treated?',
    input: 'Heimdall',
    output:
      '"Heimdallr" is the Norse guardian deity in PuniCodex. Security software or entertainment uses are external brand identities; the mythology context is canonical.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'heimdallr' },
  },
  {
    id: 'brand-disambiguate-horus-001',
    entryId: 'horus',
    task: 'safety_brand_disambiguate',
    instruction:
      '"Horus" is an Egyptian god and also used by security, aviation, and gaming brands. How does PuniCodex disambiguate?',
    input: 'Horus',
    output:
      '"Horus" is the Egyptian falcon deity in PuniCodex. Aviation, security, or gaming brands are external identities; the mythology context is canonical unless the domain is explicitly allowed for another owner.',
    sources: ['brand-shield', 'lexicon'],
    confidence: 'canonical',
    metadata: { family: 'brand-disambiguation', type: 'term', target: 'horus' },
  },
];

function generateCorpus() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const attacks = generateAttacks(undefined, {
    perTarget: 2,
    families: Object.keys(FAMILY_GENERATORS),
    includeSafe: true,
    seed: 2026,
  });

  const examples = [];
  const seenIds = new Set();

  for (let i = 0; i < attacks.length; i++) {
    const attack = attacks[i];

    const classify = buildClassifyExample(attack, i);
    if (!seenIds.has(classify.id)) {
      examples.push(classify);
      seenIds.add(classify.id);
    }

    const explain = buildExplainExample(attack, i);
    if (explain && !seenIds.has(explain.id)) {
      examples.push(explain);
      seenIds.add(explain.id);
    }

    const normalize = buildNormalizeExample(attack, i);
    if (normalize && !seenIds.has(normalize.id)) {
      examples.push(normalize);
      seenIds.add(normalize.id);
    }

    const mixed = buildMixedScriptExample(attack, i);
    if (mixed && !seenIds.has(mixed.id)) {
      examples.push(mixed);
      seenIds.add(mixed.id);
    }

    const punycodeEx = buildPunycodeExample(attack, i);
    if (punycodeEx && !seenIds.has(punycodeEx.id)) {
      examples.push(punycodeEx);
      seenIds.add(punycodeEx.id);
    }

    const urlEx = buildUrlAnalysisExample(attack, i);
    if (urlEx && !seenIds.has(urlEx.id)) {
      examples.push(urlEx);
      seenIds.add(urlEx.id);
    }

    const punyFromTerm = buildPunycodeFromTermExample(attack, i);
    if (punyFromTerm && !seenIds.has(punyFromTerm.id)) {
      examples.push(punyFromTerm);
      seenIds.add(punyFromTerm.id);
    }
  }

  for (const ex of BRAND_DISAMBIGUATION_EXAMPLES) {
    if (!seenIds.has(ex.id)) {
      examples.push(ex);
      seenIds.add(ex.id);
    }
  }

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  const byFamily = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
    const family = ex.metadata?.family || 'brand-disambiguation';
    byFamily[family] = (byFamily[family] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} safety examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
  console.log(`  by family: ${JSON.stringify(byFamily, null, 2)}`);
}

generateCorpus();
