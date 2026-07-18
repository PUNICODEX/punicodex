/**
 * PuniCodex — Muse Sparks (PC/FX scene, /creatives/)
 *
 * A particle plume rising from a flame point: ~120 glyph sparks ignite at
 * the base in bright ivory, climb with a sinusoidal drift, and live out a
 * per-particle cycle — cooling ivory → gold → slate as they fade and
 * shrink — before respawning at the base. A layered ember glow pulses at
 * the source, and a few flare glyphs burn wide on their way up.
 *
 * The motion is a pure function of time, so any t — including the single
 * reduced-motion frame — shows the full plume:
 *   age(t)  = (t / life + phase) mod 1          per-particle life cycle
 *   y(age)  = flameY − rise · age^0.82           decelerating ascent
 *   x(age)  = flameX + sin(age·ω + φ) · A·(0.25 + 0.75·age)   widening drift
 *   α(age)  = smoothstep-in · (1 − age)^1.6      ignite fast, fade slow
 *   s(age)  = s₀ · (1 − 0.55·age)                shrink as it cools
 *
 * 2D canvas built on window.PCFX (js/pc-fx-core.js); glow passes use the
 * 'lighter' composite for an additive feel on the obsidian ground.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const SPARKS = 120;
  const PHI_FRAC = 0.6180339887498949;

  // Sparks of every script the marketplace teaches — Greek for the muses,
  // Latin for the studio, plus the three student-crowd favourites.
  const SPARK_SETS = [
    PCFX.SCRIPTS.greek,
    PCFX.PANTHEON_SCRIPTS.latin,
    PCFX.SCRIPTS.devanagari,
    PCFX.SCRIPTS.kana,
    PCFX.SCRIPTS.cjk,
  ];

  function attach(canvas) {
    const glyphs = PCFX.buildAtlas(SPARK_SETS, TINTS, SPRITE);
    if (glyphs.length === 0) return;
    const glowGold = PCFX.makeGlowSprite('212,175,55');
    const glowIvory = PCFX.makeGlowSprite('245,227,168');

    // Deterministic per-particle parameters (golden-ratio hashing) so the
    // reduced-motion still is a stable composition.
    const sparks = [];
    for (let i = 0; i < SPARKS; i++) {
      const h1 = (i * PHI_FRAC) % 1;
      const h2 = (i * PHI_FRAC * 1.372) % 1;
      const h3 = (i * PHI_FRAC * 2.113) % 1;
      const h4 = (i * PHI_FRAC * 3.731) % 1;
      sparks.push({
        glyph: glyphs[(i * 37 + ((h3 * 97) | 0)) % glyphs.length],
        life: 2.1 + h1 * 2.3, // seconds per cycle
        phase: h2, // where in the cycle this spark starts
        omega: 2.2 + h3 * 3.4, // drift frequency
        phi: h4 * Math.PI * 2, // drift phase
        amp: 0.1 + h2 * 0.2, // drift amplitude (fraction of rise)
        lane: h1 * 2 - 1, // −1..1: horizontal lane across the flame mouth
        size: 0.6 + h3 * 0.55, // base size factor
        flare: i % 17 === 4, // ~7% burn wide
      });
    }

    let CX = 0;
    let FLAME_Y = 0;
    let RISE = 0;
    let MOUTH = 0;

    PCFX.createScene({
      canvas,
      // Any t shows the whole plume; 7.4s catches a flare glyph mid-flight
      // just above the ember bed.
      reducedT: 7400,
      onResize(state) {
        CX = state.w / 2;
        FLAME_Y = state.h * 0.86;
        RISE = state.h * 0.68;
        MOUTH = state.w * 0.18;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);

        // Ember bed: three layered glows pulsing at the source, additive.
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.4);
        const breathe = 0.9 + 0.1 * Math.sin(t * 0.9 + 1.3);
        ctx.globalCompositeOperation = 'lighter';
        let g = RISE * 0.62 * breathe;
        ctx.globalAlpha = 0.32 * pulse;
        ctx.drawImage(glowGold, CX - g, FLAME_Y - g * 0.9, g * 2, g * 2);
        g = RISE * 0.34 * pulse;
        ctx.globalAlpha = 0.55 * pulse;
        ctx.drawImage(glowGold, CX - g, FLAME_Y - g * 0.75, g * 2, g * 2);
        g = RISE * 0.14 * pulse;
        ctx.globalAlpha = 0.75;
        ctx.drawImage(glowIvory, CX - g, FLAME_Y - g * 0.7, g * 2, g * 2);
        ctx.globalCompositeOperation = 'source-over';

        // The plume, back (oldest) to front so young bright sparks sit on top.
        const ordered = sparks
          .map((s) => ({ s, age: (t / s.life + s.phase) % 1 }))
          .sort((a, b) => b.age - a.age);
        for (const { s, age } of ordered) {
          const rise = Math.pow(age, 0.82);
          const y = FLAME_Y - RISE * rise;
          // Teardrop envelope: tight at the flame point, widest mid-plume,
          // converging again at the tip.
          const envelope = Math.pow(Math.sin(Math.PI * Math.min(age * 1.2, 1)), 0.7);
          const lane = s.lane * s.lane * s.lane; // concentrated on the axis
          const x =
            CX +
            lane * MOUTH * envelope +
            Math.sin(age * s.omega * Math.PI + s.phi) * s.amp * RISE * envelope * 0.35;

          const fadeIn = Math.min(1, age / 0.06);
          const alpha = fadeIn * Math.pow(1 - age, 1.9) * 0.95;
          if (alpha < 0.01) continue;
          const tier = age < 0.4 ? 0 : age < 0.75 ? 1 : 2;
          let size = SPRITE * 0.36 * s.size * (RISE / 200) * (1 - 0.55 * age);

          if (s.flare) {
            size *= 1.9;
            const burn = Math.pow(Math.sin(Math.PI * Math.min(1, age * 1.15)), 2);
            if (burn > 0.05) {
              const fg = size * 3.4;
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 0.5 * burn * fadeIn;
              ctx.drawImage(glowIvory, x - fg / 2, y - fg / 2, fg, fg);
              ctx.globalCompositeOperation = 'source-over';
            }
          } else if (age < 0.18) {
            // Just ignited: a small additive halo.
            const hg = size * 2.6;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.25 * (1 - age / 0.18);
            ctx.drawImage(glowGold, x - hg / 2, y - hg / 2, hg, hg);
            ctx.globalCompositeOperation = 'source-over';
          }

          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(s.glyph.sprites[tier], x - size / 2, y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-muse').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
