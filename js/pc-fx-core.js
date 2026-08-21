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
  const DPR_CAP = 1.5; // crisp on hi-DPI at ~44% less fill cost than 2

  // ── Glyph renderability (drop .notdef boxes and blanks) ────────────────
  // Batched: one raster strip + ONE getImageData per probe set. The old
  // per-glyph probe forced a GPU→CPU readback stall for every character.
  const PROBE_CELL = 24;
  const PROBE_STRIDE = 32; // bleed headroom so wide glyphs stay in their cell
  const probeCache = new Map(); // font|chars → Set of renderable chars

  function probeSet(font, charsStr) {
    const key = `${font}|${charsStr}`;
    let ok = probeCache.get(key);
    if (ok) return ok;
    const chars = [...charsStr]; // code points, not UTF-16 units
    const w = PROBE_STRIDE * (chars.length + 1); // final cell: U+FFFF → .notdef
    const c = document.createElement('canvas');
    c.width = w;
    c.height = PROBE_CELL;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = `20px ${font}`;
    x.textBaseline = 'alphabetic';
    chars.forEach((ch, i) => x.fillText(ch, PROBE_STRIDE * i + 2, 18));
    x.fillText('￿', PROBE_STRIDE * chars.length + 2, 18);
    const data = x.getImageData(0, 0, w, PROBE_CELL).data;
    const ref = PROBE_STRIDE * chars.length;
    ok = new Set();
    chars.forEach((ch, i) => {
      const off = PROBE_STRIDE * i;
      let ink = 0;
      let diff = 0;
      for (let py = 0; py < PROBE_CELL; py++) {
        const row = py * w * 4;
        for (let px = 0; px < PROBE_CELL; px++) {
          const a = data[row + (off + px) * 4 + 3];
          ink += a;
          if (a !== data[row + (ref + px) * 4 + 3]) diff++;
        }
      }
      if (ink > 0 && diff > 0) ok.add(ch); // not blank, not .notdef
    });
    probeCache.set(key, ok);
    return ok;
  }

  function isRenderable(ch, font) {
    return probeSet(font, ch).has(ch);
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
      const ok = probeSet(set.font, set.chars);
      for (const ch of set.chars) {
        if (!ok.has(ch)) continue;
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
