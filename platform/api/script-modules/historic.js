/**
 * PuniCodex — Historic script risk module
 *
 * Treats Runic, Cuneiform, and similar historic scripts as stylistic unless
 * they are mixed with modern scripts in a way that could impersonate a
 * contemporary identity.
 */

const HISTORIC_RANGES = [
  ['Runic', 0x16a0, 0x16ff],
  ['Cuneiform', 0x12000, 0x123ff],
  ['EgyptianHieroglyphs', 0x13000, 0x1342f],
];

function getHistoricScriptName(cp) {
  for (const [name, start, end] of HISTORIC_RANGES) {
    if (cp >= start && cp <= end) return name;
  }
  return null;
}

function isHistoric(ch) {
  return getHistoricScriptName(ch.codePointAt(0)) !== null;
}

function hasHistoric(str) {
  for (const ch of String(str)) {
    if (isHistoric(ch)) return true;
  }
  return false;
}

function isInvisible(cp) {
  return (
    cp === 0x200b ||
    cp === 0x200c ||
    cp === 0x200d ||
    cp === 0x2060 ||
    cp === 0xfeff ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0xe0100 && cp <= 0xe01ef)
  );
}

function isControl(cp) {
  return (cp >= 0x0000 && cp <= 0x001f) || (cp >= 0x007f && cp <= 0x009f);
}

function getRealScript(ch) {
  const cp = ch.codePointAt(0);
  if (isInvisible(cp) || isControl(cp)) return 'Inherited';
  const historic = getHistoricScriptName(cp);
  if (historic) return historic;
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  return 'Other';
}

function hasModernScript(str) {
  for (const ch of String(str)) {
    const script = getRealScript(ch);
    if (script !== 'Inherited' && !getHistoricScriptName(ch.codePointAt(0))) return true;
  }
  return false;
}

function analyzeHistoric(input) {
  const str = String(input);
  const scripts = new Set();
  for (const ch of str) {
    const name = getHistoricScriptName(ch.codePointAt(0));
    if (name) scripts.add(name);
  }

  if (scripts.size === 0) {
    return { scriptFamily: 'Historic', present: false, riskScore: 0, risks: [] };
  }

  const risks = [];
  let score = 0.1;

  if (hasModernScript(str)) {
    risks.push('mixed-with-modern-script');
    score += 0.35;
  }

  return {
    scriptFamily: 'Historic',
    present: true,
    scripts: [...scripts],
    riskScore: Math.min(1, score),
    risks,
  };
}

module.exports = {
  isHistoric,
  hasHistoric,
  analyzeHistoric,
};
