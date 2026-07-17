/**
 * PuniCodex — Hebrew script risk module
 *
 * Detects final-form substitutions, Yiddish digraphs, and mixed-form anomalies
 * in Hebrew text.
 */

const HEBREW_RANGES = [
  [0x0590, 0x05ff],
  [0xfb1d, 0xfb4f],
];

const FINAL_FORMS = new Map([
  [0x05da, 'kaf'],
  [0x05dd, 'mem'],
  [0x05df, 'nun'],
  [0x05e3, 'pe'],
  [0x05e5, 'tsadi'],
]);

const NON_FINAL_FORMS = new Map([
  [0x05db, 'kaf'],
  [0x05de, 'mem'],
  [0x05e0, 'nun'],
  [0x05e4, 'pe'],
  [0x05e6, 'tsadi'],
]);

const YIDDISH_DIGRAPHS = new Set([0x05f0, 0x05f1, 0x05f2]);

function isHebrewCodePoint(cp) {
  return HEBREW_RANGES.some(([start, end]) => cp >= start && cp <= end);
}

function isHebrew(ch) {
  return isHebrewCodePoint(ch.codePointAt(0));
}

function hasHebrew(str) {
  for (const ch of String(str)) {
    if (isHebrew(ch)) return true;
  }
  return false;
}

function isHebrewLetter(cp) {
  return (
    (cp >= 0x05d0 && cp <= 0x05ea) ||
    (cp >= 0xfb1d && cp <= 0xfb4f) ||
    (cp >= 0x0590 && cp <= 0x05cf)
  );
}

function hasPresentationForm(str) {
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xfb1d && cp <= 0xfb4f) return true;
  }
  return false;
}

function tokenBoundaries(str) {
  const s = String(str);
  const tokens = [];
  let start = 0;
  for (let i = 0; i <= s.length; i += 1) {
    const cp = s.codePointAt(i);
    const isBoundary = i === s.length || !isHebrewLetter(cp);
    if (isBoundary && start < i) {
      tokens.push({ start, end: i });
      start = i + (cp && cp > 0xffff ? 1 : 0);
    } else if (isBoundary) {
      start = i + 1;
    }
  }
  return tokens;
}

function analyzeHebrew(input) {
  const str = String(input);
  if (!hasHebrew(str)) {
    return { scriptFamily: 'Hebrew', present: false, riskScore: 0, risks: [] };
  }

  const risks = [];
  let score = 0;

  if (hasPresentationForm(str)) {
    risks.push('mixed-hebrew-forms');
    score += 0.25;
  }

  let yiddishDigraph = false;
  for (const ch of str) {
    if (YIDDISH_DIGRAPHS.has(ch.codePointAt(0))) {
      yiddishDigraph = true;
      break;
    }
  }
  if (yiddishDigraph) {
    risks.push('yiddish-digraph');
    score += 0.15;
  }

  const tokens = tokenBoundaries(str);
  let finalFormAnomaly = false;

  for (const { start, end } of tokens) {
    const slice = str.slice(start, end);
    const letters = [...slice].filter((ch) => isHebrewLetter(ch.codePointAt(0)));
    if (letters.length === 0) continue;

    for (let i = 0; i < letters.length; i += 1) {
      const cp = letters[i].codePointAt(0);
      const isLast = i === letters.length - 1;
      if (!isLast && FINAL_FORMS.has(cp)) {
        finalFormAnomaly = true;
      }
      if (isLast && NON_FINAL_FORMS.has(cp)) {
        finalFormAnomaly = true;
      }
    }
  }

  if (finalFormAnomaly) {
    risks.push('final-form-substitution');
    score += 0.45;
  }

  return {
    scriptFamily: 'Hebrew',
    present: true,
    riskScore: Math.min(1, score),
    risks,
  };
}

module.exports = {
  isHebrew,
  hasHebrew,
  analyzeHebrew,
};
