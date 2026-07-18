/**
 * PuniCodex — The Fallen Column (PC/FX scene, /404.html)
 *
 * A broken Doric column lying on its side: four tumbled drum segments, each
 * a wireframe cylinder — two end ellipses plus fourteen flutes — resting at
 * slight angles on a faint ground ellipse. Two fracture faces are jagged
 * (hash-noised rims) where the order broke apart. A handful of dust motes
 * drift through a slow rim light on the nearest edges.
 *
 * The composition is near-static — an error page should stay calm: the
 * camera breathes on a long sine and one drum rolls almost imperceptibly.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const FLUTES = 14;
  const ELLIPSE_PTS = 40;
  const FLUTE_PTS = 9;
  const BUCKET_ALPHA = [0.22, 0.52, 1];
  const PHI_FRAC = 0.6180339887498949;

  function frac(x) {
    return x - Math.floor(x);
  }

  // The four drums: axis local X, resting on the ground plane y = 0.5
  // (screen-down is +y), so each centre sits at 0.5 − r. yaw pitches them
  // around Y, roll turns the flutes, lift is a slight Z-tilt so the near
  // ends ride a touch higher.
  const SEGMENTS = [
    { r: 0.155, len: 0.78, pos: [-0.52, 0.345, 0.08], yaw: -0.14, roll: 0.4, lift: 0.05, speed: 0.004 },
    { r: 0.145, len: 0.56, pos: [0.26, 0.355, -0.42], yaw: 0.52, roll: 1.7, lift: -0.04, speed: 0 },
    { r: 0.16, len: 0.44, pos: [0.6, 0.34, 0.3], yaw: -0.42, roll: 2.9, lift: 0.09, speed: 0 },
    { r: 0.185, len: 0.26, pos: [-0.06, 0.315, -0.14], yaw: 0.1, roll: 0.9, lift: 0.02, speed: 0 },
  ];
  // Fracture faces: [segment index, end (+1 = right cap, -1 = left cap)].
  const BROKEN = new Set(['1:1', '2:-1']);

  function buildSegment(seg, seed) {
    const parts = [];
    for (const end of [-1, 1]) {
      const pts = [];
      const broken = BROKEN.has(`${seed}:${end}`);
      for (let s = 0; s <= ELLIPSE_PTS; s++) {
        const a = (s / ELLIPSE_PTS) * Math.PI * 2;
        const jag = broken ? 1 + 0.16 * (frac(s * PHI_FRAC * 7 + seed * 0.13) - 0.5) : 1;
        pts.push({
          x: end * (seg.len / 2) * (broken ? jag : 1),
          y: seg.r * Math.cos(a) * jag,
          z: seg.r * Math.sin(a) * jag,
        });
      }
      parts.push({ pts, kind: 'cap' });
    }
    for (let f = 0; f < FLUTES; f++) {
      const a = (f / FLUTES) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= FLUTE_PTS; s++) {
        const x = -seg.len / 2 + (s / FLUTE_PTS) * seg.len;
        pts.push({ x, y: seg.r * Math.cos(a), z: seg.r * Math.sin(a) });
      }
      parts.push({ pts, kind: 'flute' });
    }
    return parts;
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');
    const drums = SEGMENTS.map((seg, i) => ({ seg, parts: buildSegment(seg, i) }));

    // Dust motes: fixed x/z, y slowly rising (up is -y), wrapping in a box.
    const MOTES = 24;
    const motes = [];
    for (let i = 0; i < MOTES; i++) {
      motes.push({
        x: (frac(i * PHI_FRAC) - 0.5) * 2,
        y0: frac(i * 0.7548776662) * 1.5 - 0.75,
        z: (frac(i * 0.5698402909) - 0.5) * 1.6,
        size: 0.006 + frac(i * 0.3180339887) * 0.009,
        phase: frac(i * 0.9196433771) * Math.PI * 2,
        speed: 0.014 + frac(i * 0.4426976731) * 0.02,
      });
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    function segPoint(seg, p, t) {
      const roll = seg.roll + t * seg.speed;
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const y1 = p.y * cr - p.z * sr;
      const z1 = p.y * sr + p.z * cr;
      const cy = Math.cos(seg.yaw);
      const sy = Math.sin(seg.yaw);
      const x2 = p.x * cy + z1 * sy;
      const z2 = -p.x * sy + z1 * cy;
      const cl = Math.cos(seg.lift);
      const sl = Math.sin(seg.lift);
      return {
        x: x2 * cl - y1 * sl + seg.pos[0],
        y: x2 * sl + y1 * cl + seg.pos[1],
        z: z2 + seg.pos[2],
      };
    }

    // Depth-graded hairline polyline (same bucketing as the other scenes).
    function strokeGraded(ctx, project, pts, baseAlpha, width) {
      let prev = null;
      let bucket = -1;
      let drawing = false;
      ctx.lineWidth = width || 1;
      for (let i = 0; i < pts.length; i++) {
        const pr = project(pts[i].x, pts[i].y, pts[i].z, CX, CY, R);
        const d = Math.max(0, Math.min(1, (pr.z + 1.05) / 2.1));
        const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
        if (!drawing) {
          ctx.beginPath();
          ctx.moveTo(pr.sx, pr.sy);
          bucket = b;
          drawing = true;
        } else if (b !== bucket) {
          ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(prev.sx, prev.sy);
          ctx.lineTo(pr.sx, pr.sy);
          bucket = b;
        } else {
          ctx.lineTo(pr.sx, pr.sy);
        }
        prev = pr;
      }
      if (drawing) {
        ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
        ctx.stroke();
      }
    }

    PCFX.createScene({
      canvas,
      reducedT: 6000, // camera settled mid-breath, motes mid-drift
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.5;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = 0.22 + Math.sin(t * 0.045) * 0.05 + state.pointer.x * 0.18;
        const rotX = 0.46 + Math.sin(t * 0.03) * 0.02 + state.pointer.y * 0.12;
        const project = PCFX.makeProjector(rotY, rotX, 3.6);

        // Faint ground ellipse: the museum floor the order fell on.
        const ground = [];
        for (let s = 0; s <= 72; s++) {
          const a = (s / 72) * Math.PI * 2;
          ground.push({ x: Math.cos(a) * 1.02, y: 0.5, z: Math.sin(a) * 0.62 });
        }
        strokeGraded(ctx, project, ground, 0.3, 1);

        // Ambient warmth low in the frame.
        const gR = R * 0.9;
        ctx.globalAlpha = 0.28;
        ctx.drawImage(glow, CX - gR, CY + R * 0.14 - gR, gR * 2, gR * 2);
        ctx.globalAlpha = 1;

        // The drums.
        for (const drum of drums) {
          let rim = null;
          for (const part of drum.parts) {
            const pts = part.pts.map((p) => segPoint(drum.seg, p, t));
            strokeGraded(ctx, project, pts, part.kind === 'cap' ? 0.9 : 0.62, 1);
            // Track the front-most point for the rim light.
            for (const p of pts) {
              const pr = project(p.x, p.y, p.z, CX, CY, R);
              if (!rim || pr.z > rim.z) rim = pr;
            }
          }
          if (rim && rim.z > 0.18) {
            const gSize = R * (0.16 + rim.z * 0.1);
            ctx.globalAlpha = Math.min(0.4, (rim.z - 0.18) * 0.9);
            ctx.drawImage(glow, rim.sx - gSize / 2, rim.sy - gSize / 2, gSize, gSize);
            ctx.globalAlpha = 1;
          }
        }

        // Dust motes rising through the ruin, depth-graded.
        for (const mote of motes) {
          const y = (((mote.y0 - t * mote.speed) % 1.5) + 1.5) % 1.5 - 0.75;
          const x = mote.x + Math.sin(t * 0.1 + mote.phase) * 0.04;
          const pr = project(x, y, mote.z, CX, CY, R);
          const depth = Math.max(0, Math.min(1, (pr.z + 1.05) / 2.1));
          const tw = 0.6 + 0.4 * Math.sin(t * 0.7 + mote.phase * 3);
          const alpha = (0.12 + depth * depth * 0.6) * tw;
          const size = Math.max(1.2, mote.size * R * pr.scale);
          if (depth > 0.8) {
            const gSize = size * 5;
            ctx.globalAlpha = alpha * 0.5;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#F5E3A8';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-column').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
