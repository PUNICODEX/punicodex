/* =====================================================
   PUNICODEX HUB 3D ENGINE
   Hybrid tetrahedral renderer: WebGL fast path with an
   automatic Canvas-2D software fallback (context loss,
   missing support, or an explicit per-device override).
   One scene description drives both paths.
   ===================================================== */

(function () {
  'use strict';

  const TAU = Math.PI * 2;

  const PAL = {
    ivory: [0.910, 0.878, 0.835],
    bronze: [0.722, 0.451, 0.196],
    gold: [0.831, 0.686, 0.216],
    stone: [0.545, 0.506, 0.463],
    celestial: [0.357, 0.608, 0.835],
    ember: [0.851, 0.372, 0.208],
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mix3(out, a, b, t) {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t;
    return out;
  }

  /* =====================================================
     MATRIX MATH (column-major mat4 / mat3)
     ===================================================== */
  function m4Perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  }

  function m4Compose(out, px, py, pz, rx, ry, rz, s) {
    const sx = Math.sin(rx), cx = Math.cos(rx);
    const sy = Math.sin(ry), cy = Math.cos(ry);
    const sz = Math.sin(rz), cz = Math.cos(rz);
    const m00 = cy * cz;
    const m01 = sx * sy * cz + cx * sz;
    const m02 = -cx * sy * cz + sx * sz;
    const m10 = -cy * sz;
    const m11 = -sx * sy * sz + cx * cz;
    const m12 = cx * sy * sz + sx * cz;
    const m20 = sy;
    const m21 = -sx * cy;
    const m22 = cx * cy;
    out[0] = m00 * s; out[1] = m01 * s; out[2] = m02 * s; out[3] = 0;
    out[4] = m10 * s; out[5] = m11 * s; out[6] = m12 * s; out[7] = 0;
    out[8] = m20 * s; out[9] = m21 * s; out[10] = m22 * s; out[11] = 0;
    out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
    return out;
  }

  function m4Mul(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }

  function m3FromM4(out, m) {
    out[0] = m[0]; out[1] = m[1]; out[2] = m[2];
    out[3] = m[4]; out[4] = m[5]; out[5] = m[6];
    out[6] = m[8]; out[7] = m[9]; out[8] = m[10];
    return out;
  }

  function rot3(out, m, x, y, z) {
    out[0] = m[0] * x + m[3] * y + m[6] * z;
    out[1] = m[1] * x + m[4] * y + m[7] * z;
    out[2] = m[2] * x + m[5] * y + m[8] * z;
    return out;
  }

  /* =====================================================
     TETRAHEDRON PRIMITIVES
     ===================================================== */
  const TETRA_V = [
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
  ];
  const TETRA_F = [
    [0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2],
  ];

  function faceNormal(a, b, c, out) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    if (nx * (a[0] + b[0] + c[0]) + ny * (a[1] + b[1] + c[1]) + nz * (a[2] + b[2] + c[2]) < 0) {
      nx = -nx; ny = -ny; nz = -nz;
    }
    out[0] = nx; out[1] = ny; out[2] = nz;
    return out;
  }

  function makeObject() {
    return {
      verts: [],
      faces: [],
      basePos: [0, 0, 0],
      rot: [0, 0, 0],
      rotSpeed: [0, 0, 0],
      scale: 1,
      bobAmp: 0,
      bobFreq: 0.4,
      bobPhase: 0,
      driftSpeed: 0,
      driftMin: -2.2,
      driftMax: 2.2,
      wobble: 0,
      orbit: null,
    };
  }

  function addTetra(obj, center, size, color, opts) {
    const o = opts || {};
    const phase = o.phase !== undefined ? o.phase : 0;
    const emis = o.emis || 0;
    const base = obj.verts.length;
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const v = TETRA_V[i];
      const p = [
        center[0] + v[0] * size,
        center[1] + v[1] * size,
        center[2] + v[2] * size,
      ];
      pts.push(p);
      obj.verts.push(p);
    }
    const n = [0, 0, 0];
    for (let f = 0; f < 4; f++) {
      const tri = TETRA_F[f];
      faceNormal(pts[tri[0]], pts[tri[1]], pts[tri[2]], n);
      obj.faces.push({
        i: [base + tri[0], base + tri[1], base + tri[2]],
        n: [n[0], n[1], n[2]],
        c: color,
        phase: phase + f * 0.13,
        emis: emis,
      });
    }
  }

  /* =====================================================
     SCENE BUILDERS — one tetrahedral world per hub
     ===================================================== */
  function buildSphere(rng, quality) {
    const objects = [];
    const core = makeObject();
    core.rotSpeed = [0.05, 0.11, 0];
    core.wobble = 0.012;
    const R = 1.55;
    const norm = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    const mid = (a, b) => norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    let verts = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];
    let faces = [
      [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
      [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
    ];
    for (let div = 0; div < 2; div++) {
      const cache = {};
      const key = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
      const next = [];
      for (const [a, b, c] of faces) {
        const ab = cache[key(a, b)] || (cache[key(a, b)] = mid(verts[a], verts[b]));
        const bc = cache[key(b, c)] || (cache[key(b, c)] = mid(verts[b], verts[c]));
        const ca = cache[key(c, a)] || (cache[key(c, a)] = mid(verts[c], verts[a]));
        verts.push(ab); const iab = verts.length - 1;
        verts.push(bc); const ibc = verts.length - 1;
        verts.push(ca); const ica = verts.length - 1;
        next.push([a, iab, ica], [b, ibc, iab], [c, ica, ibc], [iab, ibc, ica]);
      }
      faces = next;
    }
    const glowStride = Math.max(3, Math.round(faces.length / 14));
    faces.forEach((f, fi) => {
      const a = verts[f[0]], b = verts[f[1]], c = verts[f[2]];
      const ctr = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      const apex = [
        ctr[0] * R * (1.14 + rng() * 0.1),
        ctr[1] * R * (1.14 + rng() * 0.1),
        ctr[2] * R * (1.14 + rng() * 0.1),
      ];
      const glow = fi % glowStride === 0;
      const color = glow ? PAL.gold : (rng() < (quality === 'low' ? 0.14 : 0.28) ? PAL.bronze : PAL.ivory);
      const base = core.verts.length;
      core.verts.push(
        [a[0] * R, a[1] * R, a[2] * R],
        [b[0] * R, b[1] * R, b[2] * R],
        [c[0] * R, c[1] * R, c[2] * R],
        apex,
      );
      const n = [0, 0, 0];
      const tris = [
        [base, base + 1, base + 2],
        [base, base + 1, base + 3],
        [base + 1, base + 2, base + 3],
        [base, base + 2, base + 3],
      ];
      for (const t of tris) {
        faceNormal(core.verts[t[0]], core.verts[t[1]], core.verts[t[2]], n);
        core.faces.push({ i: t, n: [n[0], n[1], n[2]], c: color, phase: rng(), emis: glow ? 0.85 : 0 });
      }
    });
    objects.push(core);

    const halo = makeObject();
    halo.rotSpeed = [0, -0.045, 0.02];
    const haloN = quality === 'low' ? 55 : 90;
    for (let i = 0; i < haloN; i++) {
      const th = rng() * TAU;
      const ph = Math.acos(2 * rng() - 1);
      const r = 2.35 + rng() * 0.55;
      addTetra(halo, [
        r * Math.sin(ph) * Math.cos(th),
        r * Math.cos(ph) * 0.62,
        r * Math.sin(ph) * Math.sin(th),
      ], 0.022 + rng() * 0.02, rng() < 0.18 ? PAL.gold : PAL.stone, { emis: rng() < 0.12 ? 0.7 : 0 });
    }
    objects.push(halo);
    return objects;
  }

  function buildLattice(rng, count) {
    const objects = [];
    for (let i = 0; i < count; i++) {
      const obj = makeObject();
      const th = rng() * TAU;
      const r = 0.9 + Math.pow(rng(), 0.7) * 2.1;
      obj.basePos = [
        Math.cos(th) * r * 1.35,
        (rng() - 0.5) * 2.4 * (0.4 + rng()),
        Math.sin(th) * r * 0.7 - 0.3,
      ];
      obj.rot = [rng() * TAU, rng() * TAU, rng() * TAU];
      obj.rotSpeed = [(rng() - 0.5) * 0.25, (rng() - 0.5) * 0.35, (rng() - 0.5) * 0.2];
      obj.bobAmp = 0.05 + rng() * 0.1;
      obj.bobFreq = 0.25 + rng() * 0.4;
      obj.bobPhase = rng() * TAU;
      const size = 0.055 + Math.pow(rng(), 1.6) * 0.16;
      const roll = rng();
      const color = roll < 0.14 ? PAL.gold : roll < 0.42 ? PAL.bronze : PAL.ivory;
      addTetra(obj, [0, 0, 0], size, color, { emis: roll < 0.08 ? 0.8 : 0, phase: rng() });
      if (rng() < 0.4) {
        addTetra(obj, [size * 1.5, size * 0.8, 0], size * 0.55, PAL.stone, { phase: rng() });
      }
      objects.push(obj);
    }
    return objects;
  }

  function buildColumns(rng, cols, per) {
    const objects = [];
    const span = 4.6;
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * span;
      const z = -0.7 + rng() * 1.1;
      const speed = 0.14 + rng() * 0.2;
      for (let j = 0; j < per; j++) {
        const obj = makeObject();
        obj.basePos = [x + (rng() - 0.5) * 0.28, -2.3 + (j / per) * 4.6 + rng() * 0.15, z];
        obj.rot = [0, rng() * TAU, 0];
        obj.rotSpeed = [0, (rng() - 0.5) * 0.5, 0];
        obj.driftSpeed = speed;
        obj.driftMin = -2.4;
        obj.driftMax = 2.4;
        const roll = rng();
        const color = roll < 0.12 ? PAL.gold : roll < 0.3 ? PAL.celestial : PAL.ivory;
        addTetra(obj, [0, 0, 0], 0.045 + rng() * 0.05, color, {
          emis: roll < 0.07 ? 0.85 : 0,
          phase: rng(),
        });
        objects.push(obj);
      }
    }
    return objects;
  }

  function buildCompound(rng) {
    const objects = [];
    const t1 = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    const scales = [0.62, 0.4, 0.26];
    scales.forEach((s, idx) => {
      for (let flip = 0; flip < 2; flip++) {
        const obj = makeObject();
        obj.scale = s;
        obj.rotSpeed = [0.1 * (idx + 1) * (flip ? -1 : 1), 0.16 * (idx + 1) * (flip ? 1 : -1), 0];
        obj.wobble = 0.008;
        const dir = flip ? -1 : 1;
        const color = flip ? PAL.bronze : PAL.ivory;
        for (let f = 0; f < 4; f++) {
          const tri = TETRA_F[f];
          const base = obj.verts.length;
          obj.verts.push(
            [t1[tri[0]][0] * dir, t1[tri[0]][1] * dir, t1[tri[0]][2] * dir],
            [t1[tri[1]][0] * dir, t1[tri[1]][1] * dir, t1[tri[1]][2] * dir],
            [t1[tri[2]][0] * dir, t1[tri[2]][1] * dir, t1[tri[2]][2] * dir],
            [0, 0, 0],
          );
          const n = [0, 0, 0];
          const tris = [
            [base, base + 1, base + 2],
            [base, base + 1, base + 3],
            [base + 1, base + 2, base + 3],
            [base, base + 2, base + 3],
          ];
          for (const t of tris) {
            faceNormal(obj.verts[t[0]], obj.verts[t[1]], obj.verts[t[2]], n);
            obj.faces.push({
              i: t,
              n: [n[0], n[1], n[2]],
              c: f === 0 ? PAL.gold : color,
              phase: rng(),
              emis: f === 0 ? 0.5 : 0,
            });
          }
        }
        objects.push(obj);
      }
    });
    const swarm = makeObject();
    swarm.rotSpeed = [0, 0.05, 0];
    const n = 70;
    for (let i = 0; i < n; i++) {
      const th = rng() * TAU;
      const r = 1.5 + rng() * 1.2;
      addTetra(swarm, [
        Math.cos(th) * r,
        (rng() - 0.5) * 1.6,
        Math.sin(th) * r * 0.55,
      ], 0.02 + rng() * 0.025, rng() < 0.15 ? PAL.gold : PAL.stone, { emis: rng() < 0.1 ? 0.7 : 0 });
    }
    objects.push(swarm);
    return objects;
  }

  function buildMonolith(rng) {
    const objects = [];
    const stone = makeObject();
    stone.scale = 0.85;
    stone.rotSpeed = [0.07, 0.12, 0];
    stone.wobble = 0.006;
    addTetra(stone, [0, 0, 0], 0.9, PAL.ivory, { phase: 0 });
    objects.push(stone);
    const ring = makeObject();
    ring.rotSpeed = [0.35, 0.1, 0];
    const rn = 26;
    for (let i = 0; i < rn; i++) {
      const th = (i / rn) * TAU;
      addTetra(ring, [Math.cos(th) * 1.7, Math.sin(th * 2) * 0.12, Math.sin(th) * 1.7],
        0.035, i % 5 === 0 ? PAL.gold : PAL.stone, { emis: i % 5 === 0 ? 0.5 : 0, phase: rng() });
    }
    objects.push(ring);
    return objects;
  }

  function buildGears(rng) {    const objects = [];
    const gearDefs = [
      { x: -1.25, y: 0.55, r: 0.85, teeth: 9, speed: 0.32 },
      { x: 0.15, y: -0.15, r: 1.1, teeth: 12, speed: -0.25 },
      { x: 1.5, y: 0.6, r: 0.72, teeth: 8, speed: 0.38 },
      { x: 0.9, y: -1.25, r: 0.6, teeth: 7, speed: -0.44 },
    ];
    for (const g of gearDefs) {
      const per = g.teeth * 4;
      for (let i = 0; i < per; i++) {
        const th = (i / per) * TAU;
        const isTooth = i % 4 === 0;
        const rr = g.r * (isTooth ? 1.22 : 1.0);
        const o = makeObject();
        o.basePos = [g.x + Math.cos(th) * rr, g.y + Math.sin(th) * rr, 0];
        o.rot = [0, 0, th + Math.PI / 2];
        o.orbit = { cx: g.x, cy: g.y, r: rr, th: th, speed: g.speed };
        const color = isTooth ? PAL.gold : rng() < 0.5 ? PAL.bronze : PAL.ivory;
        addTetra(o, [0, 0, 0], isTooth ? 0.085 : 0.05, color, { emis: isTooth ? 0.25 : 0, phase: rng() });
        objects.push(o);
      }
    }
    const sparks = makeObject();
    for (let i = 0; i < 36; i++) {
      const th = rng() * TAU;
      const r = 0.4 + rng() * 1.9;
      addTetra(sparks, [Math.cos(th) * r, (rng() - 0.5) * 2.4, -0.4 + rng() * 0.6],
        0.016 + rng() * 0.02, rng() < 0.5 ? PAL.ember : PAL.gold, { emis: 0.9, phase: rng() });
    }
    objects.push(sparks);
    return objects;
  }

  const BUILDERS = {
    sphere: (rng, q) => buildSphere(rng, q),
    lattice: (rng, q) => buildLattice(rng, q === 'low' ? 34 : 66),
    columns: (rng, q) => buildColumns(rng, q === 'low' ? 6 : 9, q === 'low' ? 9 : 13),
    compound: (rng, q) => buildCompound(rng),
    monolith: (rng, q) => buildMonolith(rng),
    gears: (rng, q) => buildGears(rng),
  };

  /* =====================================================
     SHARED CPU POSE — model matrix + rotation for time t
     ===================================================== */
  function poseObject(obj, t, m, rot) {
    let px = obj.basePos[0];
    let py = obj.basePos[1];
    let pz = obj.basePos[2];
    if (obj.bobAmp) py += Math.sin(t * obj.bobFreq * TAU * 0.25 + obj.bobPhase) * obj.bobAmp;
    if (obj.driftSpeed) {
      const span = obj.driftMax - obj.driftMin;
      const y = obj.basePos[1] + t * obj.driftSpeed;
      py = obj.driftMin + (((y - obj.driftMin) % span) + span) % span;
    }
    let rx = obj.rot[0] + t * obj.rotSpeed[0];
    let ry = obj.rot[1] + t * obj.rotSpeed[1];
    let rz = obj.rot[2] + t * obj.rotSpeed[2];
    if (obj.orbit) {
      const th = obj.orbit.th + t * obj.orbit.speed;
      px = obj.orbit.cx + Math.cos(th) * obj.orbit.r;
      py = obj.orbit.cy + Math.sin(th) * obj.orbit.r;
      rz = th + Math.PI / 2;
      rx = obj.rot[0];
      ry = obj.rot[1];
    }
    m4Compose(m, px, py, pz, rx, ry, rz, obj.scale);
    m3FromM4(rot, m);
  }

  /* =====================================================
     WEBGL RENDERER
     ===================================================== */
  const VERT_SRC = [
    'attribute vec3 aPos;',
    'attribute vec3 aNorm;',
    'attribute vec3 aColor;',
    'attribute float aEmis;',
    'attribute float aPhase;',
    'uniform mat4 uMVP;',
    'uniform mat3 uRot;',
    'uniform float uTime;',
    'uniform float uPulse;',
    'uniform float uWobble;',
    'varying vec3 vNorm;',
    'varying vec3 vColor;',
    'varying float vEmis;',
    'void main(){',
    '  float w = sin(uTime * 1.9 + aPhase * 6.2831) * uWobble * (1.0 + uPulse * 2.5);',
    '  vec3 p = aPos + aNorm * w;',
    '  gl_Position = uMVP * vec4(p, 1.0);',
    '  vNorm = uRot * aNorm;',
    '  vColor = aColor;',
    '  vEmis = aEmis + uPulse * 0.4;',
    '}',
  ].join('\n');

  const FRAG_SRC = [
    'precision mediump float;',
    'varying vec3 vNorm;',
    'varying vec3 vColor;',
    'varying float vEmis;',
    'uniform vec3 uLight;',
    'void main(){',
    '  vec3 n = normalize(vNorm);',
    '  if (n.z < 0.0) n = -n;',
    '  float d = max(dot(n, uLight), 0.0);',
    '  float rim = pow(1.0 - abs(n.z), 2.2);',
    '  vec3 col = vColor * (0.20 + 0.80 * d) + vColor * rim * 0.38 + vColor * vEmis;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function WebGLRenderer(canvas, objects, onLost) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
    }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const STRIDE = 11 * 4;
    const batches = objects.map((obj) => {
      const n = obj.faces.length * 3;
      const data = new Float32Array(n * 11);
      let o = 0;
      for (const f of obj.faces) {
        for (let k = 0; k < 3; k++) {
          const v = obj.verts[f.i[k]];
          data[o++] = v[0]; data[o++] = v[1]; data[o++] = v[2];
          data[o++] = f.n[0]; data[o++] = f.n[1]; data[o++] = f.n[2];
          data[o++] = f.c[0]; data[o++] = f.c[1]; data[o++] = f.c[2];
          data[o++] = f.emis;
          data[o++] = f.phase;
        }
      }
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { buf, count: n, obj };
    });

    const loc = {
      aPos: gl.getAttribLocation(prog, 'aPos'),
      aNorm: gl.getAttribLocation(prog, 'aNorm'),
      aColor: gl.getAttribLocation(prog, 'aColor'),
      aEmis: gl.getAttribLocation(prog, 'aEmis'),
      aPhase: gl.getAttribLocation(prog, 'aPhase'),
      uMVP: gl.getUniformLocation(prog, 'uMVP'),
      uRot: gl.getUniformLocation(prog, 'uRot'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uPulse: gl.getUniformLocation(prog, 'uPulse'),
      uWobble: gl.getUniformLocation(prog, 'uWobble'),
      uLight: gl.getUniformLocation(prog, 'uLight'),
    };
    if (loc.aPos < 0 || loc.uMVP === null) return null;
    gl.enableVertexAttribArray(loc.aPos);
    gl.enableVertexAttribArray(loc.aNorm);
    gl.enableVertexAttribArray(loc.aColor);
    gl.enableVertexAttribArray(loc.aEmis);
    gl.enableVertexAttribArray(loc.aPhase);
    gl.uniform3f(loc.uLight, -0.42, 0.72, 0.55);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0);

    const mvp = new Float32Array(16);
    const tmp = new Float32Array(16);
    const proj = new Float32Array(16);
    const view = new Float32Array(16);
    const rot = new Float32Array(9);
    let camZ = 4.6;
    let parX = 0, parY = 0;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      onLost();
    });

    return {
      isGL: true,
      setParallax(x, y) { parX = x; parY = y; },
      setCamZ(z) { camZ = z; },
      draw(t, pulse) {
        const w = canvas.width;
        const h = canvas.height;
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        m4Perspective(proj, 0.72, w / h, 0.1, 100);
        view.fill(0);
        view[0] = 1; view[5] = 1; view[10] = 1; view[15] = 1;
        view[12] = parX; view[13] = parY; view[14] = -camZ;
        m4Mul(tmp, proj, view);
        gl.uniform1f(loc.uTime, t);
        gl.uniform1f(loc.uPulse, pulse);
        for (const b of batches) {
          poseObject(b.obj, t, mvp, rot);
          m4Mul(mvp, tmp, mvp);
          gl.uniformMatrix4fv(loc.uMVP, false, mvp);
          gl.uniformMatrix3fv(loc.uRot, false, rot);
          gl.uniform1f(loc.uWobble, b.obj.wobble);
          gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
          gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, STRIDE, 0);
          gl.vertexAttribPointer(loc.aNorm, 3, gl.FLOAT, false, STRIDE, 12);
          gl.vertexAttribPointer(loc.aColor, 3, gl.FLOAT, false, STRIDE, 24);
          gl.vertexAttribPointer(loc.aEmis, 1, gl.FLOAT, false, STRIDE, 36);
          gl.vertexAttribPointer(loc.aPhase, 1, gl.FLOAT, false, STRIDE, 40);
          gl.drawArrays(gl.TRIANGLES, 0, b.count);
        }
      },
      destroy() {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      },
    };
  }

  /* =====================================================
     CANVAS-2D SOFTWARE RENDERER (fallback)
     ===================================================== */
  function Canvas2DRenderer(canvas, objects) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const mvp = new Float32Array(16);
    const tmp = new Float32Array(16);
    const proj = new Float32Array(16);
    const view = new Float32Array(16);
    const rot = new Float32Array(9);
    const nrm = [0, 0, 0];
    let camZ = 4.9;
    let parX = 0, parY = 0;
    const LIGHT = [-0.42, 0.72, 0.55];
    const LL = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
    LIGHT[0] /= LL; LIGHT[1] /= LL; LIGHT[2] /= LL;

    let maxVerts = 0;
    let maxFaces = 0;
    for (const obj of objects) {
      maxVerts = Math.max(maxVerts, obj.verts.length);
      maxFaces = Math.max(maxFaces, obj.faces.length);
    }
    const sx = new Float32Array(maxVerts);
    const sy = new Float32Array(maxVerts);
    const sz = new Float32Array(maxVerts);

    return {
      isGL: false,
      setParallax(x, y) { parX = x; parY = y; },
      setCamZ(z) { camZ = z; },
      draw(t, pulse) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        m4Perspective(proj, 0.72, w / h, 0.1, 100);
        view.fill(0);
        view[0] = 1; view[5] = 1; view[10] = 1; view[15] = 1;
        view[12] = parX; view[13] = parY; view[14] = -camZ;
        m4Mul(tmp, proj, view);

        const polys = [];
        for (const obj of objects) {
          poseObject(obj, t, mvp, rot);
          m4Mul(mvp, tmp, mvp);
          const nv = obj.verts.length;
          for (let i = 0; i < nv; i++) {
            const v = obj.verts[i];
            const x = v[0], y = v[1], z = v[2];
            const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
            const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
            const cz = mvp[2] * x + mvp[6] * y + mvp[10] * z + mvp[14];
            const cw = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15] || 1;
            const iz = 1 / cw;
            sx[i] = (cx * iz * 0.5 + 0.5) * w;
            sy[i] = (1 - (cy * iz * 0.5 + 0.5)) * h;
            sz[i] = cz * iz;
          }
          for (const f of obj.faces) {
            rot3(nrm, rot, f.n[0], f.n[1], f.n[2]);
            if (nrm[2] < 0) { nrm[0] = -nrm[0]; nrm[1] = -nrm[1]; nrm[2] = -nrm[2]; }
            let d = nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2];
            if (d < 0) d = 0;
            const rim = Math.pow(1 - Math.abs(nrm[2]), 2.2);
            const k = 0.20 + 0.80 * d + rim * 0.38 + f.emis + pulse * 0.4;
            const a = f.i[0], b = f.i[1], c = f.i[2];
            polys.push({
              key: (sz[a] + sz[b] + sz[c]) / 3,
              col: f.c,
              k: k,
              pts: [sx[a], sy[a], sx[b], sy[b], sx[c], sy[c]],
            });
          }
        }
        polys.sort((p, q) => p.key - q.key);
        for (const p of polys) {
          ctx.fillStyle = 'rgb(' +
            (Math.min(1, p.col[0] * p.k) * 255 | 0) + ',' +
            (Math.min(1, p.col[1] * p.k) * 255 | 0) + ',' +
            (Math.min(1, p.col[2] * p.k) * 255 | 0) + ')';
          ctx.beginPath();
          ctx.moveTo(p.pts[0], p.pts[1]);
          ctx.lineTo(p.pts[2], p.pts[3]);
          ctx.lineTo(p.pts[4], p.pts[5]);
          ctx.closePath();
          ctx.fill();
        }
      },
      destroy() {},
    };
  }

  /* =====================================================
     PUBLIC FACTORY
     ===================================================== */
  function create(canvas, config) {
    const cfg = config || {};
    const seed = cfg.seed || 1;
    const rng = mulberry32(seed);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
    const quality = isMobile ? 'low' : 'high';
    const objects = (BUILDERS[cfg.scene] || BUILDERS.sphere)(rng, quality);

    let renderer = null;
    let fallbackForced = false;
    try {
      fallbackForced = window.localStorage.getItem('hub3d-renderer') === '2d';
    } catch (e) { /* storage unavailable — proceed with hybrid */ }

    const dprCap = isMobile ? 1.5 : 2;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    }

    function boot2D() {
      renderer = Canvas2DRenderer(canvas, objects);
    }

    if (!fallbackForced && !reduceMotion) {
      // A dying driver can throw from getContext/buffer setup rather than
      // returning null — never let the engine boot take the page's other
      // scripts down with it (the herald first-frame crash class).
      try {
        renderer = WebGLRenderer(canvas, objects, () => {
          renderer = null;
          try { window.localStorage.setItem('hub3d-renderer', '2d'); } catch (e) { /* ok */ }
          boot2D();
          resize();
        });
      } catch (e) {
        renderer = null;
        try { window.localStorage.setItem('hub3d-renderer', '2d'); } catch (e2) { /* ok */ }
      }
    }
    if (!renderer) boot2D();
    if (!renderer) return null;

    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let running = false;
    let inView = true;
    const t0 = performance.now();
    let pulse = 0;
    let parTX = 0, parTY = 0, parX = 0, parY = 0;
    let camZ = cfg.camZ || (isMobile ? 5.6 : 4.8);

    function frame(now) {
      raf = 0;
      const t = (now - t0) / 1000;
      parX += (parTX - parX) * 0.06;
      parY += (parTY - parY) * 0.06;
      pulse *= 0.94;
      renderer.setParallax(parX, parY);
      renderer.setCamZ(camZ);
      renderer.draw(t, pulse);
      if (running && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    if (reduceMotion) {
      renderer.draw(0, 0);
    } else {
      const io = new IntersectionObserver((entries) => {
        inView = entries[0] ? entries[0].isIntersecting : true;
        if (inView && !document.hidden) start(); else stop();
      }, { rootMargin: '120px' });
      io.observe(canvas);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (inView) start();
      });
      start();
    }

    const fine = window.matchMedia('(pointer: fine)').matches;
    function onPointer(ev) {
      const r = canvas.getBoundingClientRect();
      parTX = ((ev.clientX - r.left) / r.width - 0.5) * 0.9;
      parTY = -((ev.clientY - r.top) / r.height - 0.5) * 0.55;
    }
    if (fine && !reduceMotion) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    return {
      pulse(strength) {
        pulse = Math.min(1.2, pulse + (strength || 0.6));
      },
      setCamZ(z) { camZ = z; },
      get usingWebGL() {
        return !!(renderer && renderer.isGL);
      },
      destroy() {
        stop();
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointer);
        if (renderer) renderer.destroy();
        renderer = null;
      },
    };
  }

  window.Hub3D = { create, PAL, mix3 };
})();
