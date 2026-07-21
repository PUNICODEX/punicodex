/**
 * PuniCodex — PC/FX Core: shared procedural 3D canvas engine.
 *
 * The foundation of the site's procedural visual identity (hero orrery,
 * temple glyph halos, and the per-page mathematical scenes). Zero
 * dependencies, zero image requests: every glyph sprite is rasterized once
 * into an offscreen atlas at boot; unsupported glyphs are renderability-
 * tested and dropped.
 *
 * A scene = canvas + particle set + ring set + custom hook. The engine owns
 * the frame loop (reduced-motion renders one static frame), pause on
 * offscreen/hidden, DPR capping, and resize. Scene modules supply geometry.
 */
(function () {
  'use strict';

  const PCFX = {};
  const DPR_CAP = 2;

  // ── Glyph renderability (drop .notdef boxes and blanks) ────────────────
  let probeCanvas = null;
  let probeCtx = null;
  function isRenderable(ch, font) {
    if (!probeCanvas) {
      probeCanvas = document.createElement('canvas');
      probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
    }
    const c = probeCanvas;
    const x = probeCtx;
    c.width = c.height = 24;
    x.font = `20px ${font}`;
    x.textBaseline = 'alphabetic';
    x.clearRect(0, 0, 24, 24);
    x.fillText(ch, 2, 18);
    const a = x.getImageData(0, 0, 24, 24).data;
    let ink = 0;
    for (let i = 3; i < a.length; i += 4) ink += a[i];
    if (ink === 0) return false;
    x.clearRect(0, 0, 24, 24);
    x.fillText('￿', 2, 18);
    const b = x.getImageData(0, 0, 24, 24).data;
    for (let i = 3; i < a.length; i += 4) if (a[i] !== b[i]) return true;
    return false;
  }
  PCFX.isRenderable = isRenderable;

  // ── Sprite atlas: one canvas per glyph per tint ─────────────────────────
  function makeGlyphSprite(ch, font, color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.font = `${size * 0.62}px ${font}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = color;
    x.fillText(ch, size / 2, size / 2 + size * 0.03);
    return c;
  }

  function buildAtlas(sets, tints, size) {
    const glyphs = [];
    for (const set of sets) {
      for (const ch of set.chars) {
        if (!isRenderable(ch, set.font)) continue;
        glyphs.push({
          ch,
          sprites: tints.map((tint) => makeGlyphSprite(ch, set.font, tint.color, size)),
        });
      }
    }
    return glyphs;
  }
  PCFX.buildAtlas = buildAtlas;

  // ── Glow sprite (shared radial gradient) ────────────────────────────────
  function makeGlowSprite(rgb) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},0.55)`);
    g.addColorStop(0.35, `rgba(${rgb},0.16)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return c;
  }
  PCFX.makeGlowSprite = makeGlowSprite;

  // ── 3D projection: rotate about Y then X, perspective divide ───────────
  function makeProjector(rotY, rotX, cam) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    return function project(x, y, z, cx, cy, orbit) {
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const scale = cam / (cam - z2);
      return { sx: cx + x1 * scale * orbit, sy: cy + y1 * scale * orbit, z: z2, scale };
    };
  }
  PCFX.makeProjector = makeProjector;

  // ── Scene lifecycle ─────────────────────────────────────────────────────
  // opts: { canvas, onResize(state), onFrame(state, t), reducedT (ms),
  //         dpr, interactive }
  function createScene(opts) {
    const canvas = opts.canvas;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, opts.dpr || DPR_CAP);
    const state = {
      canvas,
      ctx,
      w: 0,
      h: 0,
      dpr,
      running: false,
      visible: true,
      reduced,
      start: performance.now(),
      pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    };
    let rafId = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      state.w = Math.max(1, Math.round(rect.width));
      state.h = Math.max(1, Math.round(rect.height));
      canvas.width = state.w * dpr;
      canvas.height = state.h * dpr;
      canvas.style.width = `${state.w}px`;
      canvas.style.height = `${state.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opts.onResize) opts.onResize(state);
      if (reduced && opts.onFrame) opts.onFrame(state, (opts.reducedT ?? 12500) / 1000);
    }

    function frame(now) {
      if (!state.running) return;
      state.pointer.x += (state.pointer.tx - state.pointer.x) * 0.045;
      state.pointer.y += (state.pointer.ty - state.pointer.y) * 0.045;
      opts.onFrame(state, (now - state.start) / 1000);
      rafId = requestAnimationFrame(frame);
    }
    function play() {
      if (reduced || state.running || !state.visible || document.hidden || !opts.onFrame) return;
      state.running = true;
      rafId = requestAnimationFrame(frame);
    }
    function pause() {
      state.running = false;
      cancelAnimationFrame(rafId);
    }

    resize();
    if (reduced) {
      if (opts.onFrame) opts.onFrame(state, (opts.reducedT ?? 12500) / 1000);
    } else {
      play();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          state.visible = entries[0].isIntersecting;
          if (state.visible) play();
          else pause();
        },
        { threshold: 0.02 }
      ).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else play();
    });
    if (!reduced && opts.interactive !== false) {
      window.addEventListener(
        'pointermove',
        (e) => {
          state.pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
          state.pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        },
        { passive: true }
      );
    }
    return state;
  }
  PCFX.createScene = createScene;

  // Shared gold tint ladder (matches the hero orrery).
  PCFX.TINTS = [
    { name: 'near', color: '#F5E3A8' },
    { name: 'mid', color: '#D4AF37' },
    { name: 'far', color: '#4E5266' },
  ];

  // Script sets for glyph sourcing (font + code-point list).
  PCFX.SCRIPTS = {
    greek: { font: '"Cormorant Garamond", serif', chars: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθλμνξπρστυφχψωάέήίόύώ' },
    runes: { font: 'serif', chars: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ' },
    cuneiform: { font: 'serif', chars: '𒀭𒈗𒆠𒌓𒉌𒊑𒁹𒄑𒉺𒀀𒈨𒂖𒃶𒄴𒈦' },
    hieroglyphs: { font: 'serif', chars: '𓂀𓆣𓋹𓊵𓇳𓈖𓊪𓏏𓊹𓉐𓏤𓇋' },
    devanagari: { font: 'serif', chars: 'अआइईउऊएऐओऔकखगघचछजझतथदधनपफबभमयरलवशषसहॐ' },
    hebrew: { font: 'serif', chars: 'אבגדהוזחטיכלמנסעפצקרשת' },
    arabic: { font: 'serif', chars: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' },
    cjk: { font: 'serif', chars: '龍神天道宇宙日月山川火水風雷光闇星空海命雲王靈' },
    kana: { font: 'serif', chars: 'あいうえおかきくけこさしすせそのやゆよ' },
    cyrillic: { font: 'serif', chars: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ' },
    armenian: { font: 'serif', chars: 'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆ' },
    georgian: { font: 'serif', chars: 'აბგდევზთიკლმნოპჟრსტუფქღყ' },
    thai: { font: 'serif', chars: 'กขคงจฉชซดตทนบปพฟภมยรลวศษสหอฮ' },
    tamil: { font: 'serif', chars: 'அஆஇஈஉஊஎஏஐஒஓகசதநபமயரலவழளறன' },
    ogham: { font: 'serif', chars: 'ᚁᚂᚃᚄᚅᚆᚇᚈᚉᚊᚋᚌᚍᚎᚏ' },
    phoenician: { font: 'serif', chars: '𐤀𐤁𐤂𐤃𐤄𐤅𐤆𐤇𐤈𐤉𐤊𐤋𐤌𐤍' },
  };

  // Pantheon → preferred script key (for temple halos and themed scenes).
  PCFX.PANTHEON_SCRIPTS = {
    greek: 'greek',
    norse: 'runes',
    egyptian: 'hieroglyphs',
    mesopotamian: 'cuneiform',
    hindu: 'devanagari',
    japanese: 'kana',
    chinese: 'cjk',
    hebrew: 'hebrew',
    phoenician: 'phoenician',
    canaanite: 'phoenician',
    arabian: 'arabic',
    avestan: 'arabic',
    slavic: 'cyrillic',
    baltic: 'cyrillic',
    celtic: 'ogham',
    armenian: 'armenian',
    georgian: 'georgian',
    thai: 'thai',
    tamil: 'tamil',
    'native-american': 'ogham', // no font for mayan/aztec scripts — ogham reads "carved"
    mayan: 'cjk', // visually dense block glyphs
    aztec: 'cjk',
    yoruba: 'latin',
    aboriginal: 'latin',
    latin: { font: '"Cormorant Garamond", serif', chars: 'ABCDEFGHIKLMNOPQRSTVXYZ' },
  };

  window.PCFX = PCFX;
})();
