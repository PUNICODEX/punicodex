/**
 * PuniCodex — Adversarial Attack Generator
 *
 * Generates deceptive Unicode name/domain/URL variants for red-team testing of
 * the Name Authenticity Shield. All outputs carry an `expectedVerdict` label so
 * the runner can compute TPR/FPR/FNR/precision/recall against a classifier.
 */

const path = require('node:path');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const {
  CONFUSABLE_TO_ASCII,
  buildSkeleton,
} = require(path.join(__dirname, '..', 'platform', 'api', 'confusable-atlas.js'));
const { VERDICTS } = require(path.join(__dirname, '..', 'platform', 'api', 'authenticity-verdicts.js'));
const CONFUSABLE_DB = require(path.join(__dirname, '..', 'platform', 'db', 'confusables.json'));

const BRAND_TARGETS = [
  'apple', 'google', 'microsoft', 'amazon', 'paypal', 'netflix', 'facebook',
  'twitter', 'instagram', 'linkedin', 'github', 'stripe', 'shopify', 'spotify',
  'adobe', 'oracle', 'ibm', 'intel', 'nvidia', 'tesla', 'uber', 'airbnb',
  'booking', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'protonmail',
  'gmail', 'outlook', 'yahoo', 'icloud', 'dropbox', 'slack', 'discord',
  'zoom', 'teams', 'onedrive', 'gdrive', 'aws', 'azure', 'gcp', 'cloudflare',
  'vercel', 'netlify', 'heroku', 'docker', 'kubernetes', 'terraform', 'jenkins',
  'gitlab', 'bitbucket', 'jira', 'confluence', 'trello', 'asana', 'notion',
  'figma', 'sketch', 'canva', 'photoshop', 'premiere', 'aftereffects',
  'lightroom', 'indesign', 'audition', 'animate', 'xd', 'canva',
];

const PERSON_TARGETS = [
  'john', 'jane', 'mary', 'james', 'robert', 'patricia', 'michael', 'linda',
  'william', 'elizabeth', 'david', 'barbara', 'richard', 'susan', 'joseph',
  'jessica', 'thomas', 'sarah', 'charles', 'karen', 'christopher', 'nancy',
  'daniel', 'lisa', 'matthew', 'betty', 'anthony', 'margaret', 'mark', 'sandra',
  'donald', 'ashley', 'steven', 'kimberly', 'paul', 'emily', 'andrew', 'donna',
  'joshua', 'michelle', 'kenneth', 'dorothy', 'kevin', 'carol', 'brian',
  'amanda', 'george', 'melissa', 'edward', 'deborah', 'ronald', 'stephanie',
];

const ETLDS = ['com', 'net', 'org', 'co.uk', 'de', 'fr', 'io', 'ai', 'app', 'dev'];
const EVIL_WORDS = ['secure', 'login', 'auth', 'verify', 'account', 'update', 'confirm', 'safe'];

const INVISIBLE_CHARS = [
  '\u200B', // zero width space
  '\u200C', // zero width non-joiner
  '\u200D', // zero width joiner
  '\uFE0F', // variation selector-16
  '\uFE0E', // variation selector-15
  '\u2060', // word joiner
  '\u00AD', // soft hyphen
  '\u180E', // mongolian vowel separator
  '\u200F', // right-to-left mark
  '\u200E', // left-to-right mark
  '\u202D', // left-to-right override
  '\u202E', // right-to-left override
  '\uFFEF', // byte order mark (interchange)
];

const COMBINING_MARKS = [
  '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306',
  '\u0307', '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D',
  '\u030E', '\u030F', '\u0310', '\u0311', '\u0312', '\u0313', '\u0314',
  '\u0315', '\u0316', '\u0317', '\u0318', '\u0319', '\u031A', '\u031B',
  '\u031C', '\u031D', '\u031E', '\u031F',
];

const SAFE_MIXED_SCRIPT_NAMES = [
  // Legitimate mixed-script scholarly forms from the lexicon.
  { input: 'Apóllōn', target: 'apollon', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Dionýsos', target: 'dionysos', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
  { input: 'Persephónē', target: 'persephone', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
  { input: 'Rāma', target: 'rama', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Kr̥ṣṇa', target: 'krishna', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Śiva', target: 'shiva', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Tōkyō', target: 'tokyo', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Ōsaka', target: 'osaka', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Kyōto', target: 'kyoto', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Hēra', target: 'hera', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
  { input: 'Athēnā', target: 'athena', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
  { input: 'Hermês', target: 'hermes', expectedVerdict: VERDICTS.RECOGNIZED_VARIANT },
  { input: 'Þórr', target: 'thor', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Óðinn', target: 'odin', expectedVerdict: VERDICTS.CANONICAL },
  { input: 'Freyja', target: 'freyja', expectedVerdict: VERDICTS.CANONICAL },
  // Real-world legitimate mixed-script personal/brand names.
  { input: 'Beyoncé', target: 'beyonce', expectedVerdict: VERDICTS.STYLED },
  { input: 'Zoë', target: 'zoe', expectedVerdict: VERDICTS.STYLED },
  { input: 'Chloë', target: 'chloe', expectedVerdict: VERDICTS.STYLED },
  { input: 'José', target: 'jose', expectedVerdict: VERDICTS.STYLED },
  { input: 'François', target: 'francois', expectedVerdict: VERDICTS.STYLED },
  { input: 'Señor', target: 'senor', expectedVerdict: VERDICTS.STYLED },
  { input: 'Naïve', target: 'naive', expectedVerdict: VERDICTS.STYLED },
  { input: 'résumé', target: 'resume', expectedVerdict: VERDICTS.STYLED },
  { input: 'McDonald’s', target: 'mcdonalds', expectedVerdict: VERDICTS.STYLED },
  { input: 'L’Oréal', target: 'loreal', expectedVerdict: VERDICTS.STYLED },
  { input: 'Häagen-Dazs', target: 'haagendazs', expectedVerdict: VERDICTS.STYLED },
  { input: 'M&M’s', target: 'mms', expectedVerdict: VERDICTS.STYLED },
  { input: 'FAÇONNABLE', target: 'faconnable', expectedVerdict: VERDICTS.STYLED },
  { input: 'Škoda', target: 'skoda', expectedVerdict: VERDICTS.STYLED },
  { input: 'Mærsk', target: 'maersk', expectedVerdict: VERDICTS.STYLED },
  { input: 'Børsen', target: 'borsen', expectedVerdict: VERDICTS.STYLED },
  { input: 'Ørsted', target: 'orsted', expectedVerdict: VERDICTS.STYLED },
];

const MIXED_SCRIPT_ATTACK_SCRIPTS = {
  // script-name -> representative visually confusable letters
  Greek: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'],
  Cyrillic: ['а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я'],
  Armenian: ['ա', 'բ', 'գ', 'դ', 'ե', 'զ', 'է', 'ը', 'թ', 'ժ', 'ի', 'լ', 'խ', 'ծ', 'կ', 'հ', 'ձ', 'ղ', 'ճ', 'մ', 'յ', 'ն', 'շ', 'ո', 'չ', 'պ', 'ջ', 'ռ', 'ս', 'վ', 'տ', 'ր', 'ց', 'ւ', 'փ', 'ք', 'և', 'օ', 'ֆ'],
  Georgian: ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ', 'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ', 'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ'],
  Arabic: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'],
  Devanagari: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'],
};

function getBuiltInTargets() {
  const lexiconTargets = LEXICON.map((entry) => ({
    id: entry.id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    pantheon: entry.pantheon,
    tier: entry.tier,
  }));

  const brandTargets = BRAND_TARGETS.map((id) => ({ id, ascii: id, unicode: id, pantheon: 'brand' }));
  const personTargets = PERSON_TARGETS.map((id) => ({ id, ascii: id, unicode: id, pantheon: 'person' }));

  return [...lexiconTargets, ...brandTargets, ...personTargets];
}

function buildAsciiToConfusables() {
  const map = new Map();
  for (const [char, target] of CONFUSABLE_TO_ASCII.entries()) {
    const key = String(target).toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(char);
  }
  return map;
}
const ASCII_TO_CONFUSABLES = buildAsciiToConfusables();

function buildAsciiToConfusablesByScript() {
  const map = new Map();
  for (const entry of CONFUSABLE_DB.entries) {
    const key = String(entry.target).toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, new Map());
    const scriptMap = map.get(key);
    const script = entry.script || 'Unknown';
    if (!scriptMap.has(script)) scriptMap.set(script, []);
    scriptMap.get(script).push(entry.char);
  }
  return map;
}
const ASCII_TO_CONFUSABLES_BY_SCRIPT = buildAsciiToConfusablesByScript();

function seedableRng(seed = 0) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function choice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function sample(rng, arr, n) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function shuffle(rng, arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function replaceAt(str, index, replacement) {
  const chars = [...str];
  chars[index] = replacement;
  return chars.join('');
}

function insertAt(str, index, char) {
  const chars = [...str];
  chars.splice(index, 0, char);
  return chars.join('');
}

function getDisplayName(target) {
  return target.unicode || target.ascii || target.id;
}

function getAsciiName(target) {
  return target.ascii || target.id;
}

// ── Family generators ──

function getConfusablePositions(base) {
  const chars = [...base];
  return chars
    .map((c, i) => ({ idx: i, confusables: ASCII_TO_CONFUSABLES.get(c.toLowerCase()) || [] }))
    .filter((p) => p.confusables.length > 0);
}

function* generateSingleConfusable(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getAsciiName(target);
    const positions = getConfusablePositions(base);
    if (positions.length === 0) continue;

    let produced = 0;
    // Systematic sweep through each position and each confusable.
    for (const { idx, confusables } of positions) {
      if (produced >= perTarget) break;
      for (const conf of shuffle(rng, confusables)) {
        if (produced >= perTarget) break;
        const attack = replaceAt(base, idx, conf);
        yield {
          input: attack,
          type: 'term',
          family: 'single-confusable',
          target: target.id,
          expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
        };
        produced++;
      }
    }
    // Fallback: reuse random confusable positions.
    let guard = 0;
    while (produced < perTarget && guard < perTarget * 10) {
      guard++;
      const { idx, confusables } = choice(rng, positions);
      const attack = replaceAt(base, idx, choice(rng, confusables));
      yield {
        input: attack,
        type: 'term',
        family: 'single-confusable',
        target: target.id,
        expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
      };
      produced++;
    }
  }
}

function* generateMultiConfusable(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getAsciiName(target);
    const positions = getConfusablePositions(base);
    if (positions.length < 2) continue;

    let produced = 0;
    let guard = 0;
    while (produced < perTarget && guard < perTarget * 20) {
      guard++;
      const chosen = sample(
        rng,
        positions,
        Math.min(positions.length, 2 + Math.floor(rng() * 3))
      );
      if (chosen.length < 2) continue;
      let attack = base;
      for (const { idx, confusables } of chosen) {
        attack = replaceAt(attack, idx, choice(rng, confusables));
      }
      yield {
        input: attack,
        type: 'term',
        family: 'multi-confusable',
        target: target.id,
        expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
      };
      produced++;
    }
  }
}

function* generateInvisibleInjection(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getDisplayName(target);
    let produced = 0;
    while (produced < perTarget) {
      const invisible = choice(rng, INVISIBLE_CHARS);
      const count = 1 + Math.floor(rng() * 3);
      const position = Math.floor(rng() * ([...base].length + 1));
      let attack = base;
      for (let i = 0; i < count; i++) {
        attack = insertAt(attack, position + i, invisible);
      }
      yield {
        input: attack,
        type: 'term',
        family: 'invisible-injection',
        target: target.id,
        expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
      };
      produced++;
    }
  }
}

function* generateNormalizationAttack(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getDisplayName(target);
    let produced = 0;
    while (produced < perTarget) {
      const mode = Math.floor(rng() * 4);
      let attack = base;
      if (mode === 0) {
        // NFD stacking: insert combining acute after each letter.
        attack = [...base].map((c) => `${c}\u0301`).join('');
      } else if (mode === 1) {
        // Overlong combining stack on a random letter.
        const idx = Math.floor(rng() * [...base].length);
        const stack = COMBINING_MARKS.slice(0, 3 + Math.floor(rng() * 5)).join('');
        attack = insertAt(base, idx + 1, stack);
      } else if (mode === 2) {
        // Homoglyph canonical equivalence: NFKC-equivalent fullwidth/math.
        const map = {
          a: 'ａ', b: 'ｂ', c: 'ｃ', d: 'ｄ', e: 'ｅ', f: 'ｆ', g: 'ｇ', h: 'ｈ',
          i: 'ｉ', j: 'ｊ', k: 'ｋ', l: 'ｌ', m: 'ｍ', n: 'ｎ', o: 'ｏ', p: 'ｐ',
          q: 'ｑ', r: 'ｒ', s: 'ｓ', t: 'ｔ', u: 'ｕ', v: 'ｖ', w: 'ｗ', x: 'ｘ',
          y: 'ｙ', z: 'ｚ',
        };
        attack = [...base].map((c) => map[c.toLowerCase()] || c).join('');
      } else {
        // Mixed precomposed + decomposed equivalent forms.
        const chars = [...base];
        const idx = Math.floor(rng() * chars.length);
        const c = chars[idx];
        if (c.normalize('NFD') !== c) {
          chars[idx] = c.normalize('NFD');
        } else {
          chars[idx] = `${c}\u0304`;
        }
        attack = chars.join('');
      }
      yield {
        input: attack,
        type: 'term',
        family: 'normalization-attack',
        target: target.id,
        expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
      };
      produced++;
    }
  }
}

function* generateEtldSubdomain(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getAsciiName(target);
    let produced = 0;
    while (produced < perTarget) {
      const etld = choice(rng, ETLDS);
      const evil = choice(rng, EVIL_WORDS);
      const mode = Math.floor(rng() * 4);
      let input;
      if (mode === 0) {
        input = `${base}.${evil}.${etld}`;
      } else if (mode === 1) {
        input = `${base}-login.${evil}.${etld}`;
      } else if (mode === 2) {
        input = `${evil}.${base}.${etld}`;
      } else {
        input = `${base}.${etld}.${evil}.${etld}`;
      }
      yield {
        input,
        type: 'domain',
        family: 'etld-subdomain',
        target: target.id,
        expectedVerdict: VERDICTS.LOOKALIKE_DOMAIN,
      };
      produced++;
    }
  }
}

function* generatePathQueryHomograph(targets, perTarget, rng) {
  for (const target of targets) {
    const base = getAsciiName(target);
    let produced = 0;
    while (produced < perTarget) {
      const evil = choice(rng, EVIL_WORDS);
      const etld = choice(rng, ETLDS);
      const mode = Math.floor(rng() * 5);
      let input;
      if (mode === 0) {
        input = `https://${evil}.${etld}/${base}`;
      } else if (mode === 1) {
        input = `https://${evil}.${etld}/login?user=${base}`;
      } else if (mode === 2) {
        // Redirect to a lookalike subdomain under the attacker-controlled
        // registrable domain, not to the legitimate target domain.
        input = `https://${evil}.${etld}/signin?redirect=https://${base}.${evil}.${etld}`;
      } else if (mode === 3) {
        input = `https://${evil}.${etld}/verify/${base}/confirm`;
      } else {
        input = `https://${evil}.${etld}/?target=${base}.${etld}`;
      }
      yield {
        input,
        type: 'url',
        family: 'path-query-homograph',
        target: target.id,
        expectedVerdict: VERDICTS.HOMOGRAPH_SPOOF,
      };
      produced++;
    }
  }
}

function* generateMixedScriptLegitimate(_targets, perTarget, rng) {
  let produced = 0;
  const pool = shuffle(rng, SAFE_MIXED_SCRIPT_NAMES);
  while (produced < perTarget) {
    const item = pool[produced % pool.length];
    yield {
      input: item.input,
      type: 'term',
      family: 'mixed-script-legitimate',
      target: item.target,
      expectedVerdict: item.expectedVerdict,
    };
    produced++;
  }
}

function* generateMixedScriptAttack(targets, perTarget, rng) {
  const scriptNames = Object.keys(MIXED_SCRIPT_ATTACK_SCRIPTS);
  for (const target of targets) {
    const base = getAsciiName(target);
    let produced = 0;
    while (produced < perTarget) {
      const script = choice(rng, scriptNames);
      const fallbackLetters = MIXED_SCRIPT_ATTACK_SCRIPTS[script];
      const chars = [...base];
      // Replace 1-3 positions with visually similar letters from another script.
      const positions = sample(rng, chars.map((_, i) => i), 1 + Math.floor(rng() * 3));
      if (positions.length === 0) continue;
      let attack = base;
      for (const idx of positions) {
        const original = [...attack][idx].toLowerCase();
        const byScript = ASCII_TO_CONFUSABLES_BY_SCRIPT.get(original);
        const fromScript = byScript?.get(script) || [];
        const replacement =
          fromScript.length > 0
            ? choice(rng, fromScript)
            : choice(rng, fallbackLetters);
        attack = replaceAt(attack, idx, replacement);
      }
      yield {
        input: attack,
        type: 'term',
        family: 'mixed-script-attack',
        target: target.id,
        expectedVerdict: VERDICTS.MIXED_SCRIPT_SPOOF,
      };
      produced++;
    }
  }
}

const FAMILY_GENERATORS = {
  'single-confusable': generateSingleConfusable,
  'multi-confusable': generateMultiConfusable,
  'invisible-injection': generateInvisibleInjection,
  'normalization-attack': generateNormalizationAttack,
  'etld-subdomain': generateEtldSubdomain,
  'path-query-homograph': generatePathQueryHomograph,
  'mixed-script-legitimate': generateMixedScriptLegitimate,
  'mixed-script-attack': generateMixedScriptAttack,
};

function isDeceptiveVerdict(verdict) {
  return (
    verdict === VERDICTS.HOMOGRAPH_SPOOF ||
    verdict === VERDICTS.MIXED_SCRIPT_SPOOF ||
    verdict === VERDICTS.LOOKALIKE_DOMAIN ||
    verdict === VERDICTS.UNSAFE
  );
}

/**
 * Generate adversarial attack inputs.
 *
 * @param {Array<{id:string,ascii:string,unicode:string}>} [targets]
 * @param {Object} [options]
 * @param {number} [options.perTarget=200]
 * @param {string[]} [options.families]
 * @param {boolean} [options.includeSafe=true]
 * @param {number} [options.seed=0]
 * @returns {Array<{input:string,type:string,family:string,target:string,expectedVerdict:string}>}
 */
function generateAttacks(targets, options = {}) {
  const resolvedTargets = targets && targets.length > 0 ? targets : getBuiltInTargets();
  const perTarget = options.perTarget ?? 200;
  const families = options.families ?? Object.keys(FAMILY_GENERATORS);
  const includeSafe = options.includeSafe ?? true;
  const seed = options.seed ?? 0;
  const rng = seedableRng(seed);

  const attacks = [];
  const seen = new Set();

  for (const family of families) {
    const generator = FAMILY_GENERATORS[family];
    if (!generator) continue;
    if (family === 'mixed-script-legitimate' && !includeSafe) continue;

    const familyTargets = family === 'mixed-script-legitimate' ? [] : resolvedTargets;
    const familyPerTarget = family === 'mixed-script-legitimate' ? perTarget : perTarget;

    for (const attack of generator(familyTargets, familyPerTarget, rng)) {
      if (seen.has(attack.input)) continue;
      seen.add(attack.input);
      attacks.push(attack);
    }
  }

  return attacks;
}

module.exports = {
  generateAttacks,
  getBuiltInTargets,
  isDeceptiveVerdict,
  FAMILY_GENERATORS,
};
