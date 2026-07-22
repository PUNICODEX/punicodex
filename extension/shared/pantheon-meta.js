/**
 * PUNICODEX — Canonical pantheon metadata.
 *
 * Single source of truth for pantheon labels, emoji, and colors. Every
 * consumer (lexicon browse, API name services, type engine, connections,
 * temple generators) derives from this module — do not re-declare pantheon
 * maps anywhere else (guarded by test/pantheon-meta.test.js).
 *
 * UMD: browser global PANTHEON_META, Node module.exports.
 */

const PANTHEON_META = {
  greek: { label: 'Greek', emoji: '⚡', color: '#D4AF37' },
  'greek-location': { label: 'Greek Locations', proseLabel: 'Greek', emoji: '📍', color: '#B8860B' },
  norse: { label: 'Norse', proseLabel: 'Old Norse', emoji: '❄️', color: '#87CEEB' },
  egyptian: { label: 'Egyptian', emoji: '☀️', color: '#228B22' },
  sanskrit: { label: 'Sanskrit', emoji: '🕉️', color: '#FF7F50' },
  celtic: { label: 'Celtic', emoji: '🌿', color: '#32CD32' },
  mesopotamian: { label: 'Mesopotamian', emoji: '🏛️', color: '#8B4513' },
  polynesian: { label: 'Polynesian', emoji: '🌊', color: '#20B2AA' },
  roman: { label: 'Roman', emoji: '🦅', color: '#8B0000' },
  japanese: { label: 'Japanese', emoji: '⛩️', color: '#DC143C' },
  nahuatl: { label: 'Nahuatl', emoji: '🐍', color: '#9ACD32' },
  yoruba: { label: 'Yoruba', emoji: '🥁', color: '#FFD700' },
  slavic: { label: 'Slavic', emoji: '🔥', color: '#4682B4' },
  zoroastrian: { label: 'Zoroastrian', emoji: '🔆', color: '#FF4500' },
  incan: { label: 'Incan', emoji: '🦙', color: '#CD853F' },
  chinese: { label: 'Chinese', emoji: '🐉', color: '#F08080' },
  buddhist: { label: 'Buddhist', emoji: '☸️', color: '#9932CC' },
  taoist: { label: 'Taoist', emoji: '☯️', color: '#4169E1' },
  korean: { label: 'Korean', emoji: '🇰🇷', color: '#FF69B4' },
  canaanite: { label: 'Canaanite', emoji: '🌴', color: '#800080' },
  phoenician: { label: 'Phoenician', emoji: '🌅', color: '#800000' },
  hittite: { label: 'Hittite', emoji: '🦁', color: '#A0522D' },
  mapuche: { label: 'Mapuche', emoji: '🌋', color: '#2E8B57' },
  baltic: { label: 'Baltic', emoji: '🌲', color: '#00CED1' },
  aboriginal: { label: 'Aboriginal', emoji: '🪃', color: '#D2691E' },
};

function pantheonLabel(id) {
  return PANTHEON_META[id]?.label || id;
}

function pantheonProseLabel(id) {
  return PANTHEON_META[id]?.proseLabel || PANTHEON_META[id]?.label || id;
}

function pantheonEmoji(id) {
  return PANTHEON_META[id]?.emoji || '✦';
}

function pantheonColor(id) {
  return PANTHEON_META[id]?.color || '#888888';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PANTHEON_META,
    pantheonLabel,
    pantheonProseLabel,
    pantheonEmoji,
    pantheonColor,
  };
}
