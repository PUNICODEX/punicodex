#!/usr/bin/env node
/**
 * Applies the 39-domain flagship manifest (tools/new-domains/manifest.js)
 * into every canonical source of the flywheel: lexicon, original scripts,
 * archetypes, owned domains, pronunciation atlas, bespoke hero effects, and
 * image assets. Idempotent: existing ids are skipped, never overwritten.
 * Real punycode is computed with node:url (never hand-written guesses).
 */

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST = require('./manifest.js');
const MATERIALS = path.join(
  ROOT,
  'extended flagship materials',
  'new domains 20-07-26',
  'Kimi_Agent_Srevol Domain Value Analysis (1)',
  'punycodex'
);

// Material dir names differ from lexicon ids for a few entries.
const MATERIAL_DIRS = {
  anubis: 'ꜣnpw',
  amsa: 'Aṃśa',
  daksa: 'Dakṣa',
  dhatr: 'Dhātṛ',
  delos: 'Delos',
  drakon: 'Drákōn',
  guanyin: 'Guanyin',
  hokkaido: 'Hokkaido',
  honshu: 'Honshu',
  kyushu: 'Kyushu',
  mengpo: 'Mengpo',
  monokeros: 'Monókerōs',
  nuwa: 'Nuwā',
  ogun: 'Ogun',
  pangu: 'Pangu',
  phanes: 'Phánēs',
  pusan: 'Pūṣan',
  pegasos: 'Pḗgasos',
  seiren: 'Seirḗn',
  steh: 'Stḫ',
  seshat: 'Sšꜣt',
  troia: 'Troia',
  tvastr: 'Tvastr',
  yanluo: 'Yánluó',
  hp: 'Ḥp',
  achilleus: 'Achilleus',
  asklepios: 'Asklepios',
  atropos: 'Atropos',
  diana: 'Diana',
  fuxi: 'Fuxi',
  ianus: 'Ianus',
  iuno: 'Iuno',
  iuppiter: 'Iuppiter',
  neptunus: 'Neptunus',
  tezcatlipoca: 'Tezcatlipoca',
  tumatauenga: 'Tumatauenga',
  tyche: 'Tyche',
  vulcanus: 'Vulcanus',
  xolotl: 'Xolotl',
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Breakdown derivation (validator: length === ascii.length; types from
// {stress, length, dual, special, drop, merge, same}) ──────────────────────
const MACRONS = 'āēīōūĀĒĪŌŪȳȲ';
const STRESS = 'áéíóúýàèìòùâêîôûäëïöüā́ḗṓḗā̂ạấ';
const ACUTE = 'áéíóúýÁÉÍÓÚÝ';
const CIRC = 'âêîôûÂÊÎÔÛ';
const GRAVES = 'àèìòùÀÈÌÒÙ';
const STACKED = 'ḗṓḖṒ';
const TONE_MARKED = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜǝńňǹḿŋ';
const SPECIALS = 'ꜣꜥḥḫẖðþÐÞꜢꜦḤḪ';

function classifyChar(baseChar, unicodeCluster) {
  const nfd = unicodeCluster.normalize('NFD');
  const marks = [...nfd].slice(1).join('');
  if (STACKED.includes(baseChar)) return { type: 'dual', note: 'Stacked macron + acute on one vowel' };
  if (marks.includes('̄') && (marks.includes('́') || marks.includes('̀'))) {
    return { type: 'dual', note: 'Stacked macron + stress mark' };
  }
  if (marks.includes('̄')) return { type: 'length', note: 'Macron marks the long vowel' };
  if (marks.includes('̂')) return { type: 'stress', note: 'Circumflex (Greek long + stress)' };
  if (marks.includes('́') || marks.includes('̀')) return { type: 'stress', note: 'Stress mark (acute/tone)' };
  if (marks.includes('̣') || marks.includes('̃') || marks.includes('̇')) {
    return { type: 'special', note: 'Script-specific diacritic' };
  }
  if (SPECIALS.includes(baseChar)) return { type: 'special', note: 'Script-specific letter' };
  if (baseChar !== unicodeCluster) return { type: 'special', note: 'Script-specific form' };
  return { type: 'same', note: '' };
}

function deriveBreakdown(entry) {
  const ascii = entry.ascii;
  const unicode = entry.unicode;
  // Walk ascii chars and unicode clusters in parallel.
  const uChars = [...unicode];
  const out = [];
  for (let i = 0; i < ascii.length; i++) {
    const a = ascii[i];
    const u = uChars[i];
    if (u === undefined) {
      out.push({ char: a, to: '', type: 'drop', note: 'Dropped in the Unicode form' });
      continue;
    }
    if (u.toLowerCase() === a.toLowerCase()) {
      out.push({ char: a, to: u, type: 'same', note: 'Same letter' });
      continue;
    }
    const c = classifyChar(u, u);
    out.push({ char: a, to: u, type: c.type, note: c.note });
  }
  return out;
}

function jsStr(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// ── Lexicon entries ────────────────────────────────────────────────────────
function lexiconEntry(e) {
  const variants =
    e.tier === '1'
      ? `[\n      { unicode: ${jsStr(e.unicode.replace(/[\u0301\u0300\u0302]/g, ''))}, type: 'macron-only', note: 'LSJ convention: length only, no stress mark' }\n    ]`
      : '[]';
  const breakdown = deriveBreakdown(e)
    .map(
      (s) =>
        `        { char: ${jsStr(s.char)}, to: ${jsStr(s.to)}, type: ${jsStr(s.type)}, note: ${jsStr(s.note)} }`
    )
    .join(',\n');
  return `  {
    "id": ${jsStr(e.id)},
    "hasAdSite": true,
    "ascii": ${jsStr(e.ascii)},
    "unicode": ${jsStr(e.unicode)},
    "greek": ${jsStr(e.greek)},
    "pantheon": ${jsStr(e.pantheon)},
    "tier": ${jsStr(e.tier)},
    "tierLabel": ${jsStr(e.tierLabel)},
    "domain": ${jsStr(e.domain)},
    "meaning": ${jsStr(e.meaning)},
    "sources": [${e.sources.map((s) => `"${s}"`).join(', ')}],
    "variants": ${variants},
    "breakdown": [
${breakdown}
    ]
  }`;
}

// ── Archetype entries ──────────────────────────────────────────────────────
function archetypeEntry(e) {
  const puny = domainToASCII(e.domainUnicode);
  return `    {
        id: "${e.id}",
        rentalTier: "${e.rentalTier}",
        name: "${e.unicode}",
        greek: "${e.greek === '—' ? '—' : e.greek}",
        domain: "${e.domain}",
        tagline: "${e.tagline}",
        tier: "tier-${e.tier}",
        tierDetail: "single-tier",
        pantheon: "${e.pantheon}",
        folder: "${e.id}",
        domainUnicode: "${e.domainUnicode}",
        domainPunycode: "${puny}",
        colors: { primary: "${e.colors.primary}", secondary: "${e.colors.secondary}", glow: "${e.colors.glow}" },
        mascotPath: "/sites/${e.id}/assets/${e.id}_mascot.webp",
        mascotFallback: "/sites/${e.id}/assets/${e.id}_mascot.webp",
        logomarkPath: "/sites/${e.id}/assets/${e.id}_logomark.webp",
        built: true,
        hasAdSite: true,
        darkPunchline: false
    }`;
}

// ── Original-script entries (Egyptian + Vedic) ─────────────────────────────
function originalScriptEntry(e) {
  const o = e.originalScript;
  return `  ${e.id}: {
    originalScript: ${jsStr(o.script)},
    scriptName: ${jsStr(o.scriptName)},
    provenance: {
      original: ${jsStr(o.provenance.original)},
      transliteration: ${jsStr(o.provenance.transliteration)},
      steps: [
        ${o.provenance.steps.map((s) => jsStr(s)).join(',\n        ')}
      ],
      sources: [
        ${o.provenance.sources.map((s) => jsStr(s)).join(',\n        ')}
      ],
    },
  },`;
}

// ── Pronunciation entries ──────────────────────────────────────────────────
function pronunciationEntry(e) {
  const approx = e.tagline.replace(/^The /, 'the ');
  return `  "${e.id}": {
    "ipa": "${e.ipa}",
    "ipaLabel": "Scholarly reconstruction",
    "approximation": "${approx.replace(/"/g, '\\"')}."
  },`;
}

// ── Effect JS (motif templates, temple palette + glyph drift) ─────────────
function effectJs(e) {
  const glyphs = {
    greek: 'ΑΘΔΖΗΛΞΠΣΦΨΩ',
    'greek-location': 'ΑΘΔΖΗΛΞΠΣΦΨΩ',
    roman: 'AÉILMNRSTVX',
    egyptian: '𓂀𓆣𓋹𓊵𓇳𓈖𓊪',
    sanskrit: 'अआइईउऊॐकदनपयरसह',
    chinese: '龍神天道宇宙日月山川',
    japanese: '北海道本州九州日月山川',
    nahuatl: '𐀀𐀁𐀂𐀃XYZOT',
    yoruba: 'ÀÈÒÓÈṢGB',
    polynesian: 'AEIOUTKMNPRW',
  }[e.pantheon] || 'ΑΘΔΖΗΛΞΠΣΦΨΩ';
  const motifCode = MOTIFS[e.effect.motif](e);
  return `// ${e.unicode} — ${e.tagline} (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('${e.effect.canvasId}');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }
    const P = readColor('data-primary', '${e.colors.primary}');
    const S = readColor('data-secondary', '${e.colors.secondary}');
    const GLYPHS = '${glyphs}';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

${motifCode}
})();
`;
}

const MOTIFS = {
  storm: () => `    const bolts = [];
    const rain = [];
    for (let i = 0; i < 90; i++) rain.push({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8 });
    for (let i = 0; i < 5; i++) bolts.push({ x: Math.random(), t: Math.random() * 400 });
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(5,5,12,0.9)');
        g.addColorStop(1, 'rgba(15,15,30,0.98)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        frame++;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
        ctx.lineWidth = 1;
        for (const r of rain) {
            r.y += r.v / 100;
            if (r.y > 1) { r.y = 0; r.x = Math.random(); }
            const x = r.x * width, y = r.y * height;
            ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke();
        }
        for (const b of bolts) {
            b.t--;
            if (b.t <= 0) { b.t = 180 + Math.random() * 300; b.x = Math.random(); }
            if (b.t < 8) {
                ctx.globalAlpha = (8 - b.t) / 8;
                ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
                const x = b.x * width;
                ctx.beginPath();
                ctx.moveTo(x, 0); ctx.lineTo(x + 20, height * 0.25); ctx.lineTo(x - 10, height * 0.28);
                ctx.lineTo(x + 25, height * 0.55); ctx.lineTo(x - 5, height * 0.3); ctx.lineTo(x + 15, height * 0.05);
                ctx.closePath(); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  void: () => `    const orbs = [];
    for (let i = 0; i < 120; i++) orbs.push({ a: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 0.7, s: (Math.random() - 0.5) * 0.002, g: Math.random() });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
        rg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.10)');
        rg.addColorStop(1, 'rgba(2,2,8,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        for (const o of orbs) {
            o.a += o.s + 0.001;
            const x = cx + Math.cos(o.a) * o.r * width * 0.6;
            const y = cy + Math.sin(o.a) * o.r * height * 0.6;
            ctx.globalAlpha = 0.15 + o.g * 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(x, y, 0.8 + o.g * 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  time: () => `    const threads = [];
    for (let i = 0; i < 7; i++) threads.push({ y: 0.15 + i * 0.12, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(4,4,10,0.95)'; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const th of threads) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const y = th.y * height + Math.sin(x / 120 + t * th.speed + th.phase) * height * 0.04;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 20; i++) {
            const x = ((t * 20 + i * 97) % (width + 40)) - 20;
            const y = (i / 20) * height;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.8)';
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  light: () => `    const rays = 24;
    const motes = [];
    for (let i = 0; i < 70; i++) motes.push({ x: Math.random(), y: Math.random(), s: 0.1 + Math.random() * 0.3, a: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.42;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
        rg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.22)');
        rg.addColorStop(1, 'rgba(4,4,10,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * Math.PI * 2 + t * 0.05;
            const len = Math.max(width, height) * (0.25 + 0.1 * Math.sin(t + i));
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.10 + 0.06 * Math.sin(t * 2 + i)).toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();
        }
        for (const m of motes) {
            m.y -= m.s / 100;
            if (m.y < 0) m.y = 1;
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(m.x * width, m.y * height, 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  water: () => `    const waves = [];
    for (let i = 0; i < 5; i++) waves.push({ y: 0.45 + i * 0.1, amp: 18 + i * 8, speed: 0.4 + i * 0.15, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(3,8,18,0.95)');
        g.addColorStop(1, 'rgba(' + Math.round(P.r * 0.25) + ',' + Math.round(P.g * 0.25) + ',' + Math.round(P.b * 0.35) + ',0.95)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const w of waves) {
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 6) {
                const y = w.y * height + Math.sin(x / 90 + t * w.speed + w.phase) * w.amp;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  stars: () => `    const stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, tw: 0.5 + Math.random() * 2, ph: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(3,3,10,0.97)'; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const s of stars) {
            const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.tw + s.ph));
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.95)';
            ctx.beginPath(); ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 5; i++) {
            const sx = ((t * 60 + i * 300) % (width + 200)) - 100;
            const sy = height * 0.2 + i * height * 0.12;
            ctx.globalAlpha = 0.5 * Math.max(0, 1 - Math.abs(((t + i) % 4) - 2) / 2);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.9)';
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 40, sy + 12); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  tree: () => `    function branch(x, y, angle, len, depth) {
        if (depth === 0 || len < 4) return;
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.15 + depth * 0.05).toFixed(3) + ')';
        ctx.lineWidth = depth * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        const t = performance.now() / 1000;
        const sway = Math.sin(t * 0.5 + depth) * 0.06;
        branch(x2, y2, angle - 0.5 + sway, len * 0.72, depth - 1);
        branch(x2, y2, angle + 0.35 + sway, len * 0.7, depth - 1);
    }
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(4,8,5,0.95)'; ctx.fillRect(0, 0, width, height);
        branch(width / 2, height, -Math.PI / 2, height * 0.22, 7);
        for (let i = 0; i < 40; i++) {
            const t = performance.now() / 1000;
            const x = (Math.sin(i * 91) * 0.5 + 0.5) * width;
            const y = ((t * 12 + i * 53) % height);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
            ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) setTimeout(() => requestAnimationFrame(draw), 40);
    }
    draw();`,
  mountain: () => `    const peaks = [0.55, 0.35, 0.7, 0.45, 0.62];
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(5,8,14,0.95)');
        g.addColorStop(1, 'rgba(8,12,22,0.98)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        for (let layer = 0; layer < 3; layer++) {
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.06 + layer * 0.04).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let i = 0; i <= peaks.length; i++) {
                const x = (i / peaks.length) * width;
                const y = height * (1 - peaks[i % peaks.length] * (1 - layer * 0.15));
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < 60; i++) {
            const x = (Math.sin(i * 37) * 0.5 + 0.5) * width;
            const y = (Math.sin(i * 91) * 0.5 + 0.5) * height * 0.6;
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.fillRect(x, y, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
        if (!reduced) setTimeout(() => requestAnimationFrame(draw), 120);
    }
    draw();`,
  sun: () => `    function draw() {
        ctx.clearRect(0, 0, width, height);
        const t = performance.now() / 1000;
        const cx = width / 2, cy = height * 0.4;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
        rg.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)');
        rg.addColorStop(0.3, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
        rg.addColorStop(1, 'rgba(6,4,10,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 0.1;
            const r1 = Math.max(width, height) * 0.12, r2 = r1 * (1.6 + 0.3 * Math.sin(t + i));
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.2 + 0.1 * Math.sin(t * 1.5 + i)).toFixed(3) + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(width, height) * 0.05, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
  flame: () => `    const sparks = [];
    for (let i = 0; i < 80; i++) sparks.push({ x: Math.random(), y: Math.random() + 0.3, v: 0.2 + Math.random() * 0.5, s: Math.random() * 2 + 0.5, a: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, height, 0, 0);
        g.addColorStop(0, 'rgba(' + Math.round(P.r * 0.3) + ',8,8,0.9)');
        g.addColorStop(1, 'rgba(5,5,12,0.97)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        for (const s of sparks) {
            s.y -= s.v / 100;
            s.a += 0.03;
            if (s.y < -0.05) { s.y = 1; s.x = Math.random(); }
            const wob = Math.sin(s.a) * 20;
            ctx.globalAlpha = Math.max(0, s.y) * 0.7;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(s.x * width + wob, s.y * height, s.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();`,
};

// ── Apply ──────────────────────────────────────────────────────────────────
function insertBeforeLast(text, marker, insertion) {
  const idx = text.lastIndexOf(marker);
  if (idx === -1) throw new Error(`marker not found: ${marker}`);
  return text.slice(0, idx) + insertion + text.slice(idx);
}

function main() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const archetypesPath = path.join(ROOT, 'js', 'archetypes-v2.js');
  const ownedPath = path.join(ROOT, 'platform', 'db', 'owned-domains.json');
  const originalScriptsPath = path.join(ROOT, 'type', 'js', 'original-scripts.js');
  const pronunciationPath = path.join(ROOT, 'type', 'js', 'pronunciation-atlas.js');
  const effectsJsonPath = path.join(ROOT, 'templates', 'flagship', 'effects', 'effects.json');
  const flagshipDataPath = path.join(ROOT, 'scripts', 'flagship-data.json');

  const lexiconSrc = fs.readFileSync(lexiconPath, 'utf8');
  const archSrc = fs.readFileSync(archetypesPath, 'utf8');
  const osSrc = fs.readFileSync(originalScriptsPath, 'utf8');
  const pronSrc = fs.readFileSync(pronunciationPath, 'utf8');
  const effectsJson = JSON.parse(fs.readFileSync(effectsJsonPath, 'utf8'));
  const flagshipData = JSON.parse(fs.readFileSync(flagshipDataPath, 'utf8'));
  const owned = JSON.parse(fs.readFileSync(ownedPath, 'utf8'));

  const existingLex = new Set([...lexiconSrc.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]));
  const existingArch = new Set([...archSrc.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]));

  const newEntries = MANIFEST.filter((e) => !existingLex.has(e.id));
  const newArch = MANIFEST.filter((e) => !existingArch.has(e.id));
  console.log(`manifest: ${MANIFEST.length}; new lexicon: ${newEntries.length}; new archetypes: ${newArch.length}`);

  // 1. Lexicon
  if (newEntries.length) {
    const insertion = ',\n' + newEntries.map(lexiconEntry).join(',\n') + '\n';
    fs.writeFileSync(lexiconPath, insertBeforeLast(lexiconSrc, '];', insertion), 'utf8');
    console.log('lexicon.js: appended', newEntries.length);
  }

  // 2. Archetypes
  if (newArch.length) {
    const insertion = newArch.map(archetypeEntry).join(',\n') + ',\n';
    fs.writeFileSync(archetypesPath, insertBeforeLast(archSrc, '];', insertion), 'utf8');
    console.log('archetypes-v2.js: appended', newArch.length);
  }

  // 3. Owned domains
  const ownedSet = new Set(owned);
  let addedOwned = 0;
  for (const e of MANIFEST) {
    for (const d of [e.domainUnicode, domainToASCII(e.domainUnicode)]) {
      if (!ownedSet.has(d)) {
        owned.push(d);
        ownedSet.add(d);
        addedOwned++;
      }
    }
  }
  owned.sort();
  fs.writeFileSync(ownedPath, JSON.stringify(owned, null, 2) + '\n', 'utf8');
  console.log('owned-domains.json: added', addedOwned);

  // 4. Original scripts (Egyptian + Vedic)
  const osNew = MANIFEST.filter((e) => e.originalScript && !osSrc.includes(`  ${e.id}: {`));
  if (osNew.length) {
    const insertion = osNew.map(originalScriptEntry).join('\n') + '\n';
    const anchor = 'const ORIGINAL_SCRIPTS = {';
    fs.writeFileSync(
      originalScriptsPath,
      osSrc.replace(anchor, `${anchor}\n${insertion}`),
      'utf8'
    );
    console.log('original-scripts.js: added', osNew.length);
  }

  // 5. Pronunciation atlas
  const pronNew = MANIFEST.filter((e) => !pronSrc.includes(`  "${e.id}": {`));
  if (pronNew.length) {
    const insertion = pronNew.map(pronunciationEntry).join('\n') + '\n';
    const anchor = 'const PRONUNCIATION_ATLAS = {';
    fs.writeFileSync(
      pronunciationPath,
      pronSrc.replace(anchor, `${anchor}\n${insertion}`),
      'utf8'
    );
    console.log('pronunciation-atlas.js: added', pronNew.length);
  }

  // 6. Effects: effects.json + effectMap + bespoke JS files
  let effectsAdded = 0;
  for (const e of MANIFEST) {
    if (!effectsJson[e.id]) {
      effectsJson[e.id] = { canvasId: e.effect.canvasId };
      effectsAdded++;
    }
    if (!flagshipData.effectMap[e.id]) {
      flagshipData.effectMap[e.id] = e.effect.id;
    }
    const effectFile = path.join(ROOT, 'templates', 'flagship', 'effects', `${e.id}.js`);
    if (!fs.existsSync(effectFile)) {
      fs.writeFileSync(effectFile, effectJs(e), 'utf8');
    }
  }
  fs.writeFileSync(effectsJsonPath, JSON.stringify(effectsJson, null, 2) + '\n', 'utf8');
  fs.writeFileSync(flagshipDataPath, JSON.stringify(flagshipData, null, 2) + '\n', 'utf8');
  console.log('effects: added', effectsAdded, 'entries + JS files');

  // 7. Assets
  let assetsCopied = 0;
  const missing = [];
  for (const e of MANIFEST) {
    const dirName = MATERIAL_DIRS[e.id] || e.id;
    const srcDir = path.join(MATERIALS, dirName);
    const destDir = path.join(ROOT, 'sites', e.id, 'assets');
    const map = [
      [`${e.id}_mascot.png`, `${e.id}_mascot.png`],
      [`${e.id}_logomark.png`, `${e.id}_logomark.png`],
      [`${e.id}_logolockup.png`, `${e.id}_logolockup.png`],
    ];
    // Material filenames use the unicode id (e.g. diana_mascot.png) or the
    // anglicized name (anubis_mascot.png) — find them robustly.
    if (!fs.existsSync(srcDir)) {
      missing.push(`${e.id} (no dir ${dirName})`);
      continue;
    }
    const files = fs.readdirSync(srcDir);
    fs.mkdirSync(destDir, { recursive: true });
    for (const [, destName] of map) {
      const kind = destName.split('_')[1];
      const src = files.find((f) => f.toLowerCase().includes(kind));
      if (src && !fs.existsSync(path.join(destDir, destName))) {
        fs.copyFileSync(path.join(srcDir, src), path.join(destDir, destName));
        assetsCopied++;
      }
    }
  }
  console.log('assets: copied', assetsCopied, 'files; missing:', missing.join('; ') || 'none');
}

main();
