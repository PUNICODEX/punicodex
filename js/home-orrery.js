/**
 * PuniCodex — The Orrery of Scripts (home hero)
 *
 * A procedurally rendered 3D celestial sphere built from the writing systems
 * of the 24 pantheons. ~400 glyphs ride a Fibonacci lattice on a hollow
 * spherical shell around the wordmark; three armillary rings precess slowly.
 * Real 3D: rotation matrices + perspective divide, depth-sorted sprites,
 * z-graded alpha, pointer parallax.
 *
 * Zero dependencies, zero image requests — every sprite is rasterized once
 * into an offscreen atlas at boot. Honors prefers-reduced-motion (renders a
 * single static frame), pauses off-screen and on hidden tabs.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('orrery');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 1.5 keeps the sphere crisp on hi-DPI phones at ~44% fewer pixels than 2.
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  // Adaptive frame governor: when the device can't hold ~60fps, render
  // every 2nd (then 3rd) frame — identical scene, graceful degradation.
  let frameBudget = 19; // ms EMA target before stepping down
  let frameSkip = 1;
  let frameTick = 0;
  let emaFrame = 16;

  // ── Glyph inventory (one per script tradition of the pantheon) ──────────
  const SCRIPT_SETS = [
    { font: '"Cormorant Garamond", serif', chars: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθλμνξπρστυφχψωάέήίόύώ' },
    { font: 'serif', chars: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ' }, // runes
    { font: 'serif', chars: '𒀭𒈗𒆠𒌓𒉌𒊑𒁹𒄑𒉺𒀀𒈨𒂖𒃶𒄴𒈦' }, // cuneiform
    { font: 'serif', chars: '𓂀𓆣𓋹𓊵𓇳𓈖𓊪𓏏𓊹𓉐𓏤𓇋' }, // hieroglyphs
    { font: 'serif', chars: 'अआइईउऊएऐओऔकखगघचछजझतथदधनपफबभमयरलवशषसहॐ' }, // devanagari
    { font: 'serif', chars: 'אבגדהוזחטיכלמנסעפצקרשת' }, // hebrew
    { font: 'serif', chars: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' }, // arabic
    { font: 'serif', chars: '龍神天道宇宙日月山川火水風雷光闇星空海命雲王靈' }, // CJK
    { font: 'serif', chars: 'あいうえおかきくけこさしすせそのやゆよ' }, // kana
    { font: 'serif', chars: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ' }, // cyrillic
    { font: 'serif', chars: 'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆ' }, // armenian
    { font: 'serif', chars: 'აბგდევზთიკლმნოპჟრსტუფქღყ' }, // georgian
    { font: 'serif', chars: 'กขคงจฉชซดตทนบปพฟภมยรลวศษสหอฮ' }, // thai
    { font: 'serif', chars: 'அஆஇஈஉஊஎஏஐஒஓகசதநபமயரலவழளறன' }, // tamil
    { font: 'serif', chars: 'ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎᚏ' }, // ogham
    { font: 'serif', chars: '𐤀𐤁𐤂𐤃𐤄𐤅𐤆𐤇𐤈𐤉𐤊𐤋𐤌𐤍' }, // phoenician
    { font: '"Cormorant Garamond", serif', chars: 'ĀĒĪŌŪāēīōūÁÉÍÓÚáéíóúÊÔêôḖṒ' }, // latin accents
  ];

  // Surrogates must be iterated with code points, not UTF-16 units.
  function codePoints(str) {
    const out = [];
    for (const ch of str) out.push(ch);
    return out;
  }

  // Reject glyphs the platform can't draw (renders as .notdef box or blank).
  function isRenderable(ch, font) {
    const c = isRenderable._c || (isRenderable._c = document.createElement('canvas'));
    const x = isRenderable._x || (isRenderable._x = c.getContext('2d', { willReadFrequently: true }));
    c.width = c.height = 24;
    x.font = `20px ${font}`;
    x.textBaseline = 'alphabetic';
    x.clearRect(0, 0, 24, 24);
    x.fillText(ch, 2, 18);
    const a = x.getImageData(0, 0, 24, 24).data;
    let ink = 0;
    for (let i = 3; i < a.length; i += 4) ink += a[i];
    if (ink === 0) return false; // blank
    x.clearRect(0, 0, 24, 24);
    x.fillText('￿', 2, 18); // U+FFFF → .notdef
    const b = x.getImageData(0, 0, 24, 24).data;
    let diff = 0;
    for (let i = 3; i < a.length; i += 4) if (a[i] !== b[i]) diff++;
    return diff > 0;
  }

  // ── Sprite atlas (three depth tints) ────────────────────────────────────
  const TINTS = [
    { name: 'near', color: '#F5E3A8' }, // ivory-gold, front
    { name: 'mid', color: '#D4AF37' }, // pantheon gold
    { name: 'far', color: '#4E5266' }, // dim slate, behind
  ];
  const SPRITE = 72;

  function buildAtlas() {
    const glyphs = [];
    for (const set of SCRIPT_SETS) {
      for (const ch of codePoints(set.chars)) {
        if (!isRenderable(ch, set.font)) continue;
        const sprites = TINTS.map((tint) => {
          const c = document.createElement('canvas');
          c.width = c.height = SPRITE;
          const x = c.getContext('2d');
          x.font = `${SPRITE * 0.62}px ${set.font}`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillStyle = tint.color;
          x.fillText(ch, SPRITE / 2, SPRITE / 2 + SPRITE * 0.03);
          return c;
        });
        glyphs.push({ sprites });
      }
    }
    return glyphs;
  }

  function makeGlowSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(212,175,55,0.55)');
    g.addColorStop(0.35, 'rgba(212,175,55,0.16)');
    g.addColorStop(1, 'rgba(212,175,55,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return c;
  }

  // ── Particles on a hollow Fibonacci shell ───────────────────────────────
  const N = 300;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  function buildParticles(glyphs) {
    if (glyphs.length === 0) return [];
    const particles = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const y = 1 - 2 * t; // fibonacci lattice, pole to pole
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN_ANGLE * i;
      // Hollow shell: keep the wordmark's sphere of influence clear.
      const shell = 0.58 + 0.37 * Math.pow(Math.random(), 0.8);
      particles.push({
        x: Math.cos(theta) * r * shell,
        y: y * shell,
        z: Math.sin(theta) * r * shell,
        glyph: glyphs[(Math.random() * glyphs.length) | 0],
        size: 0.55 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.6 + Math.random() * 1.4,
      });
    }
    return particles;
  }

  // ── The signatures: one emblem glyph per script tradition, riding
  // the prime ring like bright stars on an ecliptic. ───────────────────────
  const SIGNATURE_CHARS = [
    'Ω', 'ᛟ', '𒀭', '𓂀', 'ॐ', 'א', 'ع', '神', 'あ', 'Я', 'Հ', 'ღ', 'ศ', 'ஓ', 'ᚏ', '𐤀', 'Ē',
  ];

  function buildSignatures() {
    const out = [];
    for (const ch of SIGNATURE_CHARS) {
      for (const set of SCRIPT_SETS) {
        if (!set.chars.includes(ch)) continue;
        if (!isRenderable(ch, set.font)) break;
        const sprites = TINTS.map((tint) => {
          const c = document.createElement('canvas');
          c.width = c.height = SPRITE;
          const x = c.getContext('2d');
          x.font = `${SPRITE * 0.62}px ${set.font}`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillStyle = tint.color;
          x.fillText(ch, SPRITE / 2, SPRITE / 2 + SPRITE * 0.03);
          return c;
        });
        out.push({ sprites });
        break;
      }
    }
    return out;
  }

  // ── Armillary rings (precessing great circles) ──────────────────────────
  const RINGS = [
    { tilt: 0.42, speed: 0.021, alpha: 0.34, radius: 1.04 },
    { tilt: -0.68, speed: -0.014, alpha: 0.22, radius: 1.13 },
    { tilt: 1.18, speed: 0.009, alpha: 0.15, radius: 1.22 },
  ];
  const RING_SEGMENTS = 160;

  // ── Scene state ─────────────────────────────────────────────────────────
  let W = 0;
  let H = 0;
  let CX = 0;
  let CY = 0;
  let ORBIT = 0;
  let running = false;
  let visible = true;
  let rafId = 0;
  let start = performance.now();
  let parallaxX = 0;
  let parallaxY = 0;
  let targetPX = 0;
  let targetPY = 0;

  const glyphs = buildAtlas();
  const particles = buildParticles(glyphs);
  const signatures = buildSignatures();
  const glow = makeGlowSprite();

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H * 0.46;
    ORBIT = Math.min(W * 0.38, H * 0.46);
    if (REDUCED) drawFrame(perf0());
  }
  function perf0() {
    return 12500; // a pleasing still angle for the reduced-motion frame
  }

  function drawFrame(now) {
    const t = (now - start) / 1000;
    // Pointer parallax (lerped); inert for reduced motion.
    parallaxX += (targetPX - parallaxX) * 0.045;
    parallaxY += (targetPY - parallaxY) * 0.045;
    const rotY = t * 0.055 + parallaxX * 0.35;
    const rotX = 0.42 + Math.sin(t * 0.11) * 0.045 + parallaxY * 0.22;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const CAM = 3.1;

    ctx.clearRect(0, 0, W, H);

    // Central nebula behind the wordmark.
    const nebR = ORBIT * 1.05;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
    ctx.globalAlpha = 1;

    const projected = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // Y-axis spin, then X-axis tilt.
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;
      const y1 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;
      const scale = CAM / (CAM - z2);
      projected.push({
        sx: CX + x1 * scale * ORBIT,
        sy: CY + y1 * scale * ORBIT,
        z: z2,
        scale,
        p,
      });
    }
    projected.sort((a, b) => a.z - b.z); // far first

    for (const pr of projected) {
      const { p } = pr;
      const depth = (pr.z + 1.25) / 2.5; // 0 back → 1 front
      const tier = depth > 0.55 ? 0 : depth > 0.36 ? 1 : 2;
      const tw = 0.82 + 0.18 * Math.sin(t * p.twinkle + p.phase);
      const alpha = (0.1 + depth * depth * depth * 0.9) * tw;
      const size = SPRITE * p.size * pr.scale * 0.34;
      if (pr.z > 0.45) {
        const gSize = size * 4.2;
        ctx.globalAlpha = (pr.z - 0.45) * 0.65 * tw;
        ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
      }
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(p.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // Armillary rings: hairline polylines through the same projection.
    for (const ring of RINGS) {
      const spin = t * ring.speed * 8;
      const cosT = Math.cos(ring.tilt);
      const sinT = Math.sin(ring.tilt);
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      ctx.beginPath();
      for (let s = 0; s <= RING_SEGMENTS; s++) {
        const a = (s / RING_SEGMENTS) * Math.PI * 2;
        const x = Math.cos(a) * ring.radius;
        const y = Math.sin(a) * ring.radius;
        const z = 0;
        // ring tilt about X, slow spin about Y
        const y2 = y * cosT - z * sinT;
        const z2r = y * sinT + z * cosT;
        const x3 = x * cosS + z2r * sinS;
        const z3 = -x * sinS + z2r * cosS;
        const y3 = y2 * cosX - z3 * sinX;
        const z4 = y2 * sinX + z3 * cosX;
        const scale = CAM / (CAM - z4);
        const sx = CX + x3 * scale * ORBIT;
        const sy = CY + y3 * scale * ORBIT;
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `rgba(212,175,55,${ring.alpha * 0.85})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // The signatures on the prime ring — one bright glyph per tradition.
    if (signatures.length > 0) {
      const ring = RINGS[0];
      const spin = t * ring.speed * 8;
      const cosT = Math.cos(ring.tilt);
      const sinT = Math.sin(ring.tilt);
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      for (let i = 0; i < signatures.length; i++) {
        const a = (i / signatures.length) * Math.PI * 2;
        const x = Math.cos(a) * ring.radius;
        const y = Math.sin(a) * ring.radius;
        const y2 = y * cosT;
        const z2r = y * sinT;
        const x3 = x * cosS + z2r * sinS;
        const z3 = -x * sinS + z2r * cosS;
        const y3 = y2 * cosX - z3 * sinX;
        const z4 = y2 * sinX + z3 * cosX;
        const scale = CAM / (CAM - z4);
        const sx = CX + x3 * scale * ORBIT;
        const sy = CY + y3 * scale * ORBIT;
        const size = SPRITE * 0.85 * scale * 0.5;
        const depth = (z4 + 1.25) / 2.5;
        const alpha = 0.35 + depth * depth * 0.65;
        const gSize = size * 3.4;
        ctx.globalAlpha = alpha * 0.5;
        ctx.drawImage(glow, sx - gSize / 2, sy - gSize / 2, gSize, gSize);
        ctx.globalAlpha = alpha;
        ctx.drawImage(signatures[i].sprites[0], sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }
  }

  let lastT = 0;
  function loop(now) {
    if (!running) return;
    // Governor: EMA of real frame time steers the skip factor.
    if (lastT) {
      const dt = now - lastT;
      emaFrame = emaFrame * 0.9 + dt * 0.1;
      if (emaFrame > 34 && frameSkip < 3) frameSkip = 3;
      else if (emaFrame > frameBudget && frameSkip < 2) frameSkip = 2;
      else if (emaFrame < 14 && frameSkip > 1) frameSkip = 1;
    }
    lastT = now;
    if (frameTick++ % frameSkip === 0) drawFrame(now);
    rafId = requestAnimationFrame(loop);
  }
  function play() {
    if (REDUCED || running || !visible || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ── Wiring ──────────────────────────────────────────────────────────────
  resize();
  if (REDUCED) {
    drawFrame(perf0());
  } else {
    play();
  }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) play();
        else pause();
      },
      { threshold: 0.02 }
    ).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else play();
  });

  if (!REDUCED) {
    window.addEventListener(
      'pointermove',
      (e) => {
        targetPX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetPY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }
})();
