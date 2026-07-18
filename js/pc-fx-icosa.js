/**
 * PuniCodex — The Icosahedron (PC/FX scene, /codex/)
 *
 * The knowledge solid: a gold hairline icosahedron wireframe (12 vertices,
 * 30 edges, from the standard (0,±1,±φ) construction) tumbling slowly over
 * the codex masthead. A glowing Greek glyph rides each of the 12 vertices;
 * a faint inner icosahedron at 0.618 scale counter-rotates inside. Edge
 * alpha is depth-graded so the solid reads as a volume, not a flat drawing.
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
  const PHI = (1 + Math.sqrt(5)) / 2;

  // Standard icosahedron: (0,±1,±φ), (±1,±φ,0), (±φ,0,±1), unit-normalized.
  const NORM = Math.sqrt(1 + PHI * PHI);
  const VERTS = [
    [0, 1, PHI],
    [0, 1, -PHI],
    [0, -1, PHI],
    [0, -1, -PHI],
    [1, PHI, 0],
    [1, -PHI, 0],
    [-1, PHI, 0],
    [-1, -PHI, 0],
    [PHI, 0, 1],
    [-PHI, 0, 1],
    [PHI, 0, -1],
    [-PHI, 0, -1],
  ].map(([x, y, z]) => ({ x: x / NORM, y: y / NORM, z: z / NORM }));

  // Edges: vertex pairs at the icosahedron's edge length (2 before
  // normalization) — 30 of them.
  const EDGE_LEN2 = (2 / NORM) ** 2;
  const EDGES = [];
  for (let i = 0; i < VERTS.length; i++) {
    for (let j = i + 1; j < VERTS.length; j++) {
      const dx = VERTS[i].x - VERTS[j].x;
      const dy = VERTS[i].y - VERTS[j].y;
      const dz = VERTS[i].z - VERTS[j].z;
      if (Math.abs(dx * dx + dy * dy + dz * dz - EDGE_LEN2) < 1e-6) EDGES.push([i, j]);
    }
  }

  // One Greek letter per vertex — the codex's own alphabet.
  const VERTEX_CHARS = 'ΩΨΦΧΘΛΔΣΠΓΞΖ';

  function attach(canvas) {
    if (EDGES.length !== 30) return; // construction guard
    const atlas = PCFX.buildAtlas([PCFX.SCRIPTS.greek], TINTS, SPRITE);
    if (atlas.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    const vertexGlyphs = [];
    for (let i = 0; i < VERTS.length; i++) {
      const ch = VERTEX_CHARS[i % VERTEX_CHARS.length];
      vertexGlyphs.push(atlas.find((g) => g.ch === ch) || atlas[i % atlas.length]);
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    function drawSolid(state, project, scale, alphaMul, withGlyphs, t) {
      const { ctx } = state;

      // Edges, depth-graded hairlines.
      ctx.lineWidth = 1;
      for (const [ia, ib] of EDGES) {
        const a = VERTS[ia];
        const b = VERTS[ib];
        const pa = project(a.x * scale, a.y * scale, a.z * scale, CX, CY, R);
        const pb = project(b.x * scale, b.y * scale, b.z * scale, CX, CY, R);
        const depth = ((pa.z + pb.z) / 2 / scale + 1) / 2;
        const alpha = (0.07 + depth * depth * 0.62) * alphaMul;
        ctx.strokeStyle =
          depth > 0.72 ? `rgba(245,227,168,${alpha})` : `rgba(212,175,55,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // Vertices: glowing glyphs on the outer solid, pin-dots on the inner.
      for (let i = 0; i < VERTS.length; i++) {
        const v = VERTS[i];
        const pr = project(v.x * scale, v.y * scale, v.z * scale, CX, CY, R);
        const depth = (pr.z / scale + 1) / 2;
        if (withGlyphs) {
          const tier = depth > 0.6 ? 0 : depth > 0.4 ? 1 : 2;
          const tw = 0.85 + 0.15 * Math.sin(t * 0.9 + i * 1.7);
          const size = SPRITE * 0.3 * pr.scale;
          if (pr.z > 0.3) {
            const gSize = size * 3.2;
            ctx.globalAlpha = (pr.z - 0.3) * 0.7 * tw * alphaMul;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = Math.min(1, (0.12 + depth * depth * 0.88) * tw * alphaMul);
          ctx.drawImage(
            vertexGlyphs[i].sprites[tier],
            pr.sx - size / 2,
            pr.sy - size / 2,
            size,
            size
          );
        } else {
          ctx.globalAlpha = (0.1 + depth * depth * 0.5) * alphaMul;
          ctx.fillStyle = '#D4AF37';
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, 1.4 * pr.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    PCFX.createScene({
      canvas,
      reducedT: 12500,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.4;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.11 + state.pointer.x * 0.3;
        const rotX = 0.5 + Math.sin(t * 0.12) * 0.08 + state.pointer.y * 0.18;

        // Ambient core glow.
        const nebR = R * 0.85;
        ctx.globalAlpha = 0.35;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // Inner solid first (behind), counter-rotating at golden-ratio scale.
        const inner = PCFX.makeProjector(-t * 0.09 + state.pointer.x * 0.3, rotX, 3.2);
        drawSolid(state, inner, 0.618, 0.42, false, t);
        const outer = PCFX.makeProjector(rotY, rotX, 3.2);
        drawSolid(state, outer, 1, 1, true, t);
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-icosa').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
