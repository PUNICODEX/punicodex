/**
 * PuniCodex — The Monolith (PC/FX scene, /type/)
 *
 * A tall obsidian slab (box ratio 1 : 2.4 : 0.35) turning slowly on its
 * axis, gold hairline edges over obsidian. Down its front face cascade
 * columns of glyphs from seven script traditions — greek, runes,
 * hieroglyphs, cuneiform, devanagari, cjk, hebrew — each glyph scrolling
 * downward at its column's own pace, fading in at the top edge and out at
 * the bottom. When the slab turns the face away, the cascade ghosts dimly
 * through the stone (depth-graded, never culled). A slim caret pulses on
 * the face — the cursor inlaid in the monolith — and a faint inner glow
 * wells up from the base.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const HX = 0.5; // half width
  const HY = 1.2; // half height  (1 : 2.4 ratio)
  const HZ = 0.175; // half depth   (1 : 0.35 ratio)
  const COLUMNS = 7;
  const ROWS = 9;
  const FACE_W = HX * 2;
  const FACE_H = HY * 2;
  const BUCKET_ALPHA = [0.18, 0.45, 1];

  // One script tradition per column, cycling through the set.
  const COLUMN_SCRIPTS = ['greek', 'runes', 'hieroglyphs', 'cuneiform', 'devanagari', 'cjk', 'hebrew'];

  function boxCorner(sx, sy, sz) {
    return { x: sx * HX, y: sy * HY, z: sz * HZ };
  }

  // Depth bucket of a segment midpoint → gold hairline stroke.
  function strokeSeg(ctx, project, a, b, cx, cy, orbit, baseAlpha, rgb) {
    const pa = project(a.x, a.y, a.z, cx, cy, orbit);
    const pb = project(b.x, b.y, b.z, cx, cy, orbit);
    const zm = (pa.z + pb.z) / 2;
    const d = Math.max(0, Math.min(1, (zm + 0.6) / 1.2));
    const bucket = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
    ctx.strokeStyle = `rgba(${rgb || '212,175,55'},${baseAlpha * BUCKET_ALPHA[bucket]})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.stroke();
  }

  function attach(canvas) {
    const glyphs = PCFX.buildAtlas(
      COLUMN_SCRIPTS.map((key) => PCFX.SCRIPTS[key]),
      TINTS,
      SPRITE
    );
    if (glyphs.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // Bucket the atlas back into per-script lists so each column speaks a
    // single tradition.
    const byScript = COLUMN_SCRIPTS.map((key) => {
      const chars = PCFX.SCRIPTS[key].chars;
      return glyphs.filter((g) => chars.includes(g.ch));
    });

    // The cascade: fixed lane per column, y advancing downward with time.
    // Deterministic picks keep the reduced-motion still stable.
    const cells = [];
    for (let col = 0; col < COLUMNS; col++) {
      const pool = byScript[col % byScript.length];
      if (!pool || pool.length === 0) continue;
      const x = -HX + FACE_W * ((col + 1) / (COLUMNS + 1));
      const speed = 0.055 + col * 0.009;
      for (let row = 0; row < ROWS; row++) {
        cells.push({
          x,
          y0: -HY + FACE_H * ((row + (col % 3) * 0.33) / ROWS),
          speed,
          glyph: pool[(col * 31 + row * 17) % pool.length],
          size: 0.85 + ((col * 7 + row * 3) % 10) / 22,
          phase: ((col * 13 + row * 7) % 20) / 20,
        });
      }
    }

    // The twelve box edges.
    const corners = [
      boxCorner(-1, -1, -1),
      boxCorner(1, -1, -1),
      boxCorner(1, -1, 1),
      boxCorner(-1, -1, 1),
      boxCorner(-1, 1, -1),
      boxCorner(1, 1, -1),
      boxCorner(1, 1, 1),
      boxCorner(-1, 1, 1),
    ];
    const EDGES = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0], // top face
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4], // bottom face
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7], // verticals
    ];
    // Engraved register seams across the front face.
    const SEAMS = [-0.6, 0, 0.6].map((y) => [
      { x: -HX, y, z: HZ },
      { x: HX, y, z: HZ },
    ]);

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 0, // face front, cascade mid-scroll, caret bright
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.36;
      },
      onFrame(state, t) {
        const { ctx } = state;
        t = Math.max(0, t); // the first rAF timestamp can precede scene start
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.16 + state.pointer.x * 0.22;
        const rotX = 0.1 + state.pointer.y * 0.1;
        const project = PCFX.makeProjector(rotY, rotX, 4.2);

        // Inner glow welling from the base of the slab + ground pool.
        const inner = project(0, HY * 0.72, 0, CX, CY, R);
        const iSize = R * 0.75;
        ctx.globalAlpha = 0.32;
        ctx.drawImage(glow, inner.sx - iSize / 2, inner.sy - iSize / 2, iSize, iSize);
        const ground = project(0, HY + 0.1, 0, CX, CY, R);
        const gW = R * 1.35;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(glow, ground.sx - gW / 2, ground.sy - gW / 7, gW, gW / 3.5);
        ctx.globalAlpha = 1;

        // The slab: rear edges faint, face edges brighter.
        for (const [a, b] of EDGES) {
          const front = corners[a].z > 0 && corners[b].z > 0;
          strokeSeg(ctx, project, corners[a], corners[b], CX, CY, R, front ? 0.95 : 0.5);
        }
        for (const [a, b] of SEAMS) {
          strokeSeg(ctx, project, a, b, CX, CY, R, 0.22);
        }

        // The cascade on the front face, depth-sorted back to front.
        const projected = cells
          .map((cell) => {
            const y = -HY + ((cell.y0 + HY + t * cell.speed) % FACE_H);
            return { cell, y, pr: project(cell.x, y, HZ, CX, CY, R) };
          })
          .sort((a, b) => a.pr.z - b.pr.z);
        for (const { cell, y, pr } of projected) {
          const depth = Math.max(0, Math.min(1, (pr.z + 0.6) / 1.2));
          const tier = depth > 0.58 ? 0 : depth > 0.36 ? 1 : 2;
          // Fade in at the top edge, out at the bottom edge.
          const edgeIn = Math.max(0, Math.min(1, (y + HY) / 0.4));
          const edgeOut = Math.max(0, Math.min(1, (HY - y) / 0.4));
          const edge = Math.min(edgeIn, edgeOut);
          const tw = 0.85 + 0.15 * Math.sin(t * 1.1 + cell.phase * Math.PI * 2);
          // Behind the slab the glyphs ghost through the stone.
          const through = pr.z > 0 ? 1 : 0.32;
          const alpha = (0.1 + depth * depth * 0.95) * edge * tw * through;
          if (alpha < 0.02) continue;
          const size = R * 0.145 * cell.size * pr.scale;
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(cell.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;

        // The inlaid caret, pulsing softly on the face.
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + 1.1);
        const cTop = project(0.09, 0.2, HZ, CX, CY, R);
        const cBot = project(0.09, 0.4, HZ, CX, CY, R);
        const cThrough = cTop.z > 0 ? 1 : 0.3;
        ctx.strokeStyle = `rgba(245,227,168,${0.85 * pulse * cThrough})`;
        ctx.lineWidth = Math.max(1, R * 0.012 * cTop.scale);
        ctx.beginPath();
        ctx.moveTo(cTop.sx, cTop.sy);
        ctx.lineTo(cBot.sx, cBot.sy);
        ctx.stroke();
        const cgSize = R * 0.18;
        ctx.globalAlpha = 0.5 * pulse * cThrough;
        ctx.drawImage(glow, cTop.sx - cgSize / 2, (cTop.sy + cBot.sy) / 2 - cgSize / 2, cgSize, cgSize);
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-monolith').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
