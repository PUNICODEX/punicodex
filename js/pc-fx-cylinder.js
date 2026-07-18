/**
 * PuniCodex — The Cylinder Seal (PC/FX scene, /authenticity/)
 *
 * A Mesopotamian cylinder seal — humanity's first authentication device —
 * rolls across the frame, pressing its glyphs into the clay below. The seal
 * is a cylinder of radius r, half-length hl, long axis horizontal:
 *   P(h, a) = ( h, r·cos(a), r·sin(a) )   h ∈ [-hl, hl], a ∈ [0, 2π)
 * It spins about its own long axis while translating left → right, rolling
 * without slipping: roll angle = travel / r, so the surface ring at the
 * contact line is always the ring being pressed. Cuneiform glyphs sit on an
 * (a, h) grid on the curved surface (the standard cylindrical unwrap);
 * every time the seal advances one ring-spacing (2πr / A_COLS) the ring now
 * at the contact line is stamped into an offscreen "clay" canvas that
 * scrolls with the seal and fades like an old impression.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame (the trail is deterministically re-simulated for the still);
 * pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const BUCKET_ALPHA = [0.18, 0.45, 1];

  // Seal geometry (world units; the frame is ±1.19 of the orbit scale).
  const R_SEAL = 0.44;
  const HALF_LEN = 0.72;
  const A_COLS = 14; // glyph rings around the circumference
  const H_ROWS = 5; // glyph rows along the length
  const RING_PTS = 56;
  const LON_LINES = 7; // longitudinal wires, every other glyph column
  const LON_PTS = 20;

  // Travel: slow stately traverse, wrapping just outside the frame.
  const WRAP = 1.55; // travel half-range in world units
  const SPEED = 0.145; // world units / second
  const STAMP_SPACING = (2 * Math.PI * R_SEAL) / A_COLS; // one ring per stamp
  const TRAIL_FADE = 0.0028; // destination-out alpha eroded per 1/60s step
  const TRAIL_HISTORY = 14; // seconds of trail rebuilt for the reduced still
  const T0 = 9; // scene opens mid-pass, a fresh trail already behind the seal
  const SIM_DT = 1 / 60;
  const SIM_MAX_STEPS = 1200;

  // A Mesopotamian seal reads in cuneiform; Phoenician stands by as a
  // visually adjacent fallback on systems without a cuneiform font.
  const SEAL_SETS = [PCFX.SCRIPTS.cuneiform, PCFX.SCRIPTS.phoenician];

  function sealPoint(h, a) {
    return { x: h, y: R_SEAL * Math.cos(a), z: R_SEAL * Math.sin(a) };
  }

  // Depth-graded hairline polyline (same bucketing as the other scenes).
  function strokeGraded(ctx, project, pts, cx, cy, orbit, travelX, baseAlpha) {
    let prev = null;
    let bucket = -1;
    let drawing = false;
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const pr = project(pts[i].x, pts[i].y, pts[i].z, cx, cy, orbit);
      const sx = pr.sx + travelX;
      const d = Math.max(0, Math.min(1, (pr.z + R_SEAL) / (2 * R_SEAL)));
      const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
      if (!drawing) {
        ctx.beginPath();
        ctx.moveTo(sx, pr.sy);
        bucket = b;
        drawing = true;
      } else if (b !== bucket) {
        ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(prev.sx, prev.sy);
        ctx.lineTo(sx, pr.sy);
        bucket = b;
      } else {
        ctx.lineTo(sx, pr.sy);
      }
      prev = { sx, sy: pr.sy };
    }
    if (drawing) {
      ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
      ctx.stroke();
    }
  }

  function attach(canvas) {
    const glyphs = PCFX.buildAtlas(SEAL_SETS, TINTS, SPRITE);
    if (glyphs.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // The (a, h) glyph grid — deterministic picks so the reduced-motion
    // still composes the same seal every time.
    const grid = [];
    for (let j = 0; j < A_COLS; j++) {
      const row = [];
      for (let k = 0; k < H_ROWS; k++) {
        row.push(glyphs[(j * 7 + k * 11 + j * k * 3) % glyphs.length]);
      }
      grid.push(row);
    }

    // Wireframe base angles: five rings (two end caps + three inner) and
    // the longitudinal wires; the roll is applied per frame.
    const rings = [];
    for (let ri = 0; ri < 5; ri++) {
      const angles = [];
      for (let s = 0; s <= RING_PTS; s++) angles.push((s / RING_PTS) * Math.PI * 2);
      rings.push(angles);
    }
    const longitudinals = [];
    for (let li = 0; li < LON_LINES; li++) longitudinals.push((li / LON_LINES) * Math.PI * 2);

    // The clay: a persistent offscreen canvas the seal stamps into; old
    // impressions are eroded a little per simulation step.
    const clay = document.createElement('canvas');
    const clayCtx = clay.getContext('2d');

    let CX = 0;
    let CY = 0;
    let R = 0;
    let GROUND_Y = 0; // screen y of the contact line
    let SEAL_CY = 0; // screen y of the seal's axis
    let simT = null; // last simulated time (null → rebuild history)
    let stampIdx = 0; // next stamp column index (monotonic in time)

    function travelAt(t) {
      const span = WRAP * 2;
      return ((t * SPEED) % span + span) % span - WRAP; // world units, [-WRAP, WRAP)
    }

    function pressStamp() {
      // The ring crossing the contact line at this stamp's time is pressed.
      // stampIdx counts rings pressed since t = 0, so the seal "unrolls"
      // its glyphs in order — exactly like the real artifact.
      const stampTime = (stampIdx * STAMP_SPACING) / SPEED;
      const ring = ((stampIdx % A_COLS) + A_COLS) % A_COLS;
      const x = CX + travelAt(stampTime) * R;
      const rowGap = ((2 * HALF_LEN) / H_ROWS) * R * 0.5; // ground-plane foreshortening
      const size = rowGap * 1.28;
      for (let k = 0; k < H_ROWS; k++) {
        const y = GROUND_Y + rowGap * 1.1 + k * rowGap;
        clayCtx.globalAlpha = 0.72;
        clayCtx.drawImage(grid[ring][k].sprites[1], x - size / 2, y - size / 2, size, size);
      }
      clayCtx.globalAlpha = 1;
      stampIdx++;
    }

    function simulate(t) {
      if (simT === null || t < simT) {
        // Fresh start (first frame, resize, or time jump backwards):
        // rebuild the trail the seal would have laid in recent history.
        clayCtx.clearRect(0, 0, clay.width, clay.height);
        simT = Math.max(0, t - TRAIL_HISTORY);
        stampIdx = Math.ceil((simT * SPEED) / STAMP_SPACING);
      }
      let steps = 0;
      while (simT < t && steps < SIM_MAX_STEPS) {
        simT = Math.min(simT + SIM_DT, t);
        steps++;
        // Erode the old impressions.
        clayCtx.globalCompositeOperation = 'destination-out';
        clayCtx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
        clayCtx.fillRect(0, 0, clay.width, clay.height);
        clayCtx.globalCompositeOperation = 'source-over';
        // Press every ring that reached the contact line in this step.
        while (stampIdx * STAMP_SPACING <= simT * SPEED) pressStamp();
      }
      if (simT < t) simT = t; // over the step cap (tab slept) — skip ahead
    }

    PCFX.createScene({
      canvas,
      // Scene time is t + 9s (T0), so 300ms lands at scene time 9.3s: the
      // seal sits just left of centre on its first visible pass with the
      // full trail unrolled behind it from the frame's left edge.
      reducedT: 300,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.46;
        SEAL_CY = CY - R * 0.4;
        GROUND_Y = SEAL_CY + R_SEAL * R * 1.04;
        clay.width = Math.max(1, Math.round(state.w * state.dpr));
        clay.height = Math.max(1, Math.round(state.h * state.dpr));
        clayCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        simT = null; // rebuild the trail for the new size on the next frame
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const ts = t + T0; // scene time: the seal was already rolling at load
        simulate(ts);

        const rotY = 0.3 + state.pointer.x * 0.1;
        const rotX = 0.52 + Math.sin(ts * 0.06) * 0.02 + state.pointer.y * 0.08;
        const project = PCFX.makeProjector(rotY, rotX, 3.4);
        const travel = travelAt(ts);
        const travelX = travel * R; // applied post-projection: motion stays horizontal
        // Rolling without slipping. The roll phase is a continuous function
        // of scene time (not of the wrapped travel) so the surface never
        // jumps when the seal wraps off-frame to start a new pass.
        const roll = (ts * SPEED) / R_SEAL;

        // Ambient glow behind the seal.
        const nebR = R * 0.8;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(glow, CX + travelX - nebR, SEAL_CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // The clay trail, then the faint ground hairline it sits on.
        ctx.drawImage(clay, 0, 0, state.w, state.h);
        ctx.strokeStyle = 'rgba(212,175,55,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y + 0.5);
        ctx.lineTo(state.w, GROUND_Y + 0.5);
        ctx.stroke();

        // Wireframe: end-cap rings define the silhouette, inner rings and
        // the longitudinal wires sit back.
        for (let ri = 0; ri < rings.length; ri++) {
          const h = -HALF_LEN + (ri / (rings.length - 1)) * 2 * HALF_LEN;
          const rolledPts = rings[ri].map((a) => sealPoint(h, a + roll));
          const isEnd = ri === 0 || ri === rings.length - 1;
          strokeGraded(ctx, project, rolledPts, CX, SEAL_CY, R, travelX, isEnd ? 0.62 : 0.3);
        }
        for (const a0 of longitudinals) {
          const rolledPts = [];
          for (let s = 0; s <= LON_PTS; s++) {
            rolledPts.push(sealPoint(-HALF_LEN + (s / LON_PTS) * 2 * HALF_LEN, a0 + roll));
          }
          strokeGraded(ctx, project, rolledPts, CX, SEAL_CY, R, travelX, 0.18);
        }

        // The glyph grid on the curved surface, back to front. Width is
        // foreshortened numerically: two probes at a ± ε measure how much
        // of the surface's local circumference survives projection.
        const EPS = 0.02;
        const projected = [];
        for (let j = 0; j < A_COLS; j++) {
          const a = ((j + 0.5) / A_COLS) * Math.PI * 2 + roll;
          for (let k = 0; k < H_ROWS; k++) {
            const h = -HALF_LEN + ((k + 0.5) / H_ROWS) * 2 * HALF_LEN;
            const p = sealPoint(h, a);
            const pr = project(p.x, p.y, p.z, CX, SEAL_CY, R);
            pr.sx += travelX;
            const qa = sealPoint(h, a + EPS);
            const qb = sealPoint(h, a - EPS);
            const pa = project(qa.x, qa.y, qa.z, CX, SEAL_CY, R);
            const pb = project(qb.x, qb.y, qb.z, CX, SEAL_CY, R);
            const arc = Math.hypot(pa.sx - pb.sx, pa.sy - pb.sy);
            const full = 2 * EPS * R_SEAL * pr.scale * R;
            pr.foreshorten = full > 0 ? Math.max(0.12, Math.min(1, arc / full)) : 1;
            projected.push({ j, k, pr });
          }
        }
        projected.sort((a, b) => a.pr.z - b.pr.z);
        for (const { j, k, pr } of projected) {
          const depth = Math.max(0, Math.min(1, (pr.z + R_SEAL) / (2 * R_SEAL)));
          const tier = depth > 0.58 ? 0 : depth > 0.36 ? 1 : 2;
          const alpha = 0.08 + depth * depth * 0.92;
          const size = ((2 * HALF_LEN) / H_ROWS) * R * pr.scale * 0.82;
          const w = size * pr.foreshorten;
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(grid[j][k].sprites[tier], pr.sx - w / 2, pr.sy - size / 2, w, size);
        }
        ctx.globalAlpha = 1;

        // A warm contact glow where the seal meets the clay.
        const cgR = R * 0.5;
        ctx.globalAlpha = 0.22;
        ctx.drawImage(glow, CX + travelX - cgR, GROUND_Y - cgR * 0.55, cgR * 2, cgR * 1.1);
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-cylinder').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
