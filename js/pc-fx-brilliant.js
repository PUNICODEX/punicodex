/**
 * PuniCodex — The Golden Brilliant (PC/FX scene, /store/)
 *
 * A rotating brilliant-cut gem in gold hairlines. The cut is computed
 * procedurally with 8-fold symmetry from three tiers of vertices:
 *   table   T_k = ( 0.55·cos(22.5°+45k), −0.36, 0.55·sin(22.5°+45k) )  k = 0..7
 *   girdle  G_j = ( 1.00·cos(22.5°j),    −0.08, 1.00·sin(22.5°j) )     j = 0..15
 *   culet   C   = ( 0, 0.78, 0 )
 * Edges: table rim (8), girdle rim (16), crown slants T_k→G_{2k..2k+2}
 * (24 — star + bezel + upper-girdle facets), pavilion mains G_j→C (16).
 * Facet glints are geometry-driven: each facet's world normal is dotted
 * with a fixed light direction, and as the gem's slow rotY sweeps a normal
 * across the light the facet's edges flash bright ivory for a moment.
 * Gentle bob; gold hairline edges depth-graded like the other scenes.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const BUCKET_ALPHA = [0.18, 0.45, 1];
  const DEG = Math.PI / 180;

  // Light: fixed in view space, upper right and slightly in front.
  const LIGHT = (() => {
    const v = { x: 0.45, y: -0.75, z: 0.55 };
    const len = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  })();

  // ── Cut geometry (computed once, local space) ──────────────────────────
  const table = [];
  for (let k = 0; k < 8; k++) {
    const a = (22.5 + 45 * k) * DEG;
    table.push({ x: 0.55 * Math.cos(a), y: -0.36, z: 0.55 * Math.sin(a) });
  }
  const girdle = [];
  for (let j = 0; j < 16; j++) {
    const a = 22.5 * j * DEG;
    girdle.push({ x: Math.cos(a), y: -0.08, z: Math.sin(a) });
  }
  const CULET = { x: 0, y: 0.78, z: 0 };

  const edges = []; // { a, b, tier: base alpha }
  for (let k = 0; k < 8; k++) edges.push({ a: table[k], b: table[(k + 1) % 8], tier: 0.7 });
  for (let j = 0; j < 16; j++) edges.push({ a: girdle[j], b: girdle[(j + 1) % 16], tier: 0.8 });
  for (let k = 0; k < 8; k++) {
    edges.push({ a: table[k], b: girdle[(2 * k) % 16], tier: 0.56 });
    edges.push({ a: table[k], b: girdle[(2 * k + 1) % 16], tier: 0.56 });
    edges.push({ a: table[k], b: girdle[(2 * k + 2) % 16], tier: 0.56 });
  }
  for (let j = 0; j < 16; j++) edges.push({ a: girdle[j], b: CULET, tier: 0.48 });

  // Glint facets: 8 stars, 16 bezel/upper-girdle halves, 16 pavilion mains.
  const facets = [];
  function addFacet(a, b, c) {
    // Outward-facing normal (flipped if it points into the stone).
    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const vx = c.x - a.x;
    const vy = c.y - a.y;
    const vz = c.z - a.z;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const cx = (a.x + b.x + c.x) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    if (nx * cx + nz * cz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const len = Math.hypot(nx, ny, nz);
    facets.push({
      verts: [a, b, c],
      n: { x: nx / len, y: ny / len, z: nz / len },
    });
  }
  for (let k = 0; k < 8; k++) {
    addFacet(table[k], table[(k + 1) % 8], girdle[(2 * k + 2) % 16]); // star
    addFacet(table[k], girdle[(2 * k) % 16], girdle[(2 * k + 1) % 16]); // bezel L
    addFacet(table[k], girdle[(2 * k + 1) % 16], girdle[(2 * k + 2) % 16]); // bezel R
  }
  for (let j = 0; j < 16; j++) addFacet(girdle[j], girdle[(j + 1) % 16], CULET);

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');
    const glowIvory = PCFX.makeGlowSprite('245,227,168');

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      // rotY = 0.22·t → t = 2.5s turns the stone ~31° with three crown
      // facets mid-flash and the culet swinging slightly off-axis.
      reducedT: 2500,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2 - state.h * 0.02;
        R = Math.min(state.w, state.h) * 0.43;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.22 + state.pointer.x * 0.3;
        // Negative rotX tips the crown toward the viewer (ring-box display
        // angle) and aims the crown facet normals at the up-front light.
        const rotX = -0.42 + state.pointer.y * 0.15;
        const bob = Math.sin(t * 0.5) * 0.035;
        const project = PCFX.makeProjector(rotY, rotX, 3.4);

        // Normals to view space: rotY about the axis, then the rotX tilt.
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        function viewNormal(n) {
          const x1 = n.x * cosY + n.z * sinY;
          const z1 = -n.x * sinY + n.z * cosY;
          const y1 = n.y * cosX - z1 * sinX;
          const z2 = n.y * sinX + z1 * cosX;
          return { x: x1, y: y1, z: z2 };
        }
        function proj(v) {
          return project(v.x, v.y + bob, v.z, CX, CY, R);
        }

        // Ambient glow behind the stone.
        const nebR = R * 1.05;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // Hairline edges, depth-graded by midpoint z.
        ctx.lineWidth = 1;
        for (const e of edges) {
          const pa = proj(e.a);
          const pb = proj(e.b);
          const d = Math.max(0, Math.min(1, ((pa.z + pb.z) / 2 + 1.06) / 2.12));
          const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
          ctx.strokeStyle = `rgba(212,175,55,${e.tier * BUCKET_ALPHA[b]})`;
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.stroke();
        }

        // Facet glints: normal crossing the light flashes the facet's edges.
        for (const f of facets) {
          const n = viewNormal(f.n);
          const dot = n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z;
          const raw = (dot - 0.96) / 0.04;
          if (raw <= 0) continue;
          const g0 = Math.min(1, raw);
          const g = g0 * g0 * (3 - 2 * g0); // smoothstep: a flash, not a ramp
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = `rgba(245,227,168,${0.9 * g})`;
          ctx.beginPath();
          const p0 = proj(f.verts[0]);
          ctx.moveTo(p0.sx, p0.sy);
          let cxSum = p0.sx;
          let cySum = p0.sy;
          let zSum = p0.z;
          for (let i = 1; i < 3; i++) {
            const pi = proj(f.verts[i]);
            ctx.lineTo(pi.sx, pi.sy);
            cxSum += pi.sx;
            cySum += pi.sy;
            zSum += pi.z;
          }
          ctx.closePath();
          ctx.stroke();
          ctx.lineWidth = 1;
          if (g > 0.45 && zSum / 3 > -0.2) {
            const gs = R * 0.42;
            ctx.globalAlpha = 0.5 * g;
            ctx.drawImage(
              glowIvory,
              cxSum / 3 - gs / 2,
              cySum / 3 - gs / 2,
              gs,
              gs
            );
            ctx.globalAlpha = 1;
          }
        }
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-brilliant').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
