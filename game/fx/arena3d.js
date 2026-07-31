/**
 * Mythic Duel — The Arena 3D
 *
 * A custom WebGL2 diorama battlefield: mascots stand as living characters on
 * obsidian pedestals in a fog-lit arena, champions on raised thrones at each
 * end. Zero dependencies — a compact renderer with billboard sprites, a
 * procedural floor, camera choreography for attacks, and a projection API so
 * the DOM layer can anchor stat chips and hit areas to the 3D world.
 *
 * The 2D canvas fx overlay and all DOM interaction stay authoritative; this
 * layer makes the world they act upon.
 *
 * Usage:
 *   const arena = Arena3D.mount(canvasEl);
 *   arena.setChampions({ player: cardLike, enemy: cardLike });
 *   arena.syncBoard(players);            // engine state → sprites
 *   arena.attackChoreo({ fromUid, toUid, toSide, archetype, colors, onImpact });
 *   const pos = arena.project(uid);      // { x, y, scale } in CSS pixels
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  root.Arena3D = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  /* ── Shaders ───────────────────────────────────────────────────────────── */

  var FLOOR_VS = `
    attribute vec3 aPos;
    uniform mat4 uVP;
    varying vec3 vWorld;
    void main() {
      vWorld = aPos;
      gl_Position = uVP * vec4(aPos, 1.0);
    }`;

  var FLOOR_FS = `
    precision mediump float;
    varying vec3 vWorld;
    uniform vec3 uGlow;
    void main() {
      float r = length(vWorld.xz) / 16.0;
      vec3 base = mix(vec3(0.055, 0.06, 0.085), vec3(0.015, 0.017, 0.028), smoothstep(0.0, 1.0, r));
      // faint gold grid
      vec2 g = abs(fract(vWorld.xz * 0.5) - 0.5);
      float line = 1.0 - smoothstep(0.46, 0.5, max(g.x, g.y));
      base += uGlow * line * 0.08 * (1.0 - r);
      // center medallion glow
      float med = smoothstep(1.6, 0.4, length(vWorld.xz));
      base += uGlow * med * 0.10;
      gl_FragColor = vec4(base, 1.0);
    }`;

  var PED_VS = `
    attribute vec3 aPos;
    attribute vec3 aNormal;
    uniform mat4 uVP;
    uniform mat4 uModel;
    varying float vLight;
    varying vec3 vWorld;
    void main() {
      vec4 w = uModel * vec4(aPos, 1.0);
      vWorld = w.xyz;
      vec3 n = normalize((uModel * vec4(aNormal, 0.0)).xyz);
      vLight = 0.35 + 0.65 * max(0.0, dot(n, normalize(vec3(0.4, 0.9, 0.25))));
      gl_Position = uVP * w;
    }`;

  var PED_FS = `
    precision mediump float;
    varying float vLight;
    varying vec3 vWorld;
    uniform vec3 uColor;
    uniform vec3 uRim;
    void main() {
      vec3 c = uColor * vLight;
      float rim = smoothstep(0.44, 0.5, vWorld.y);
      c += uRim * rim * 0.7;
      gl_FragColor = vec4(c, 1.0);
    }`;

  var BILL_VS = `
    attribute vec2 aCorner;      // -0.5..0.5 quad corner
    attribute vec2 aUV;
    uniform mat4 uVP;
    uniform vec3 uCenter;        // world center of the sprite
    uniform vec2 uSize;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform float uBob;
    uniform float uSway;
    varying vec2 vUV;
    void main() {
      vUV = aUV;
      float cs = cos(uSway), sn = sin(uSway);
      vec2 rc = vec2(aCorner.x * cs - aCorner.y * sn, aCorner.x * sn + aCorner.y * cs);
      vec3 world = uCenter + uCamRight * (rc.x * uSize.x) + uCamUp * (rc.y * uSize.y + uBob);
      gl_Position = uVP * vec4(world, 1.0);
    }`;

  var BILL_FS = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform float uDim;
    uniform vec3 uTint;
    varying vec2 vUV;
    void main() {
      vec4 c = texture2D(uTex, vUV);
      if (c.a < 0.06) discard;
      c.rgb = mix(c.rgb, c.rgb * uTint, 0.35) * uDim;
      gl_FragColor = c;
    }`;

  var PART_VS = `
    attribute vec3 aPos;
    attribute float aSize;
    attribute vec4 aColor;
    uniform mat4 uVP;
    varying vec4 vColor;
    void main() {
      vColor = aColor;
      gl_Position = uVP * vec4(aPos, 1.0);
      gl_PointSize = aSize;
    }`;

  var PART_FS = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float a = smoothstep(0.5, 0.12, length(d));
      gl_FragColor = vec4(vColor.rgb, vColor.a * a);
    }`;

  /* ── GL helpers ────────────────────────────────────────────────────────── */

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Arena3D shader: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Arena3D link: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function mat4Perspective(fov, aspect, near, far) {
    var f = 1 / Math.tan(fov / 2);
    var nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  }

  function mat4LookAt(eye, target, up) {
    var zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    var zl = Math.hypot(zx, zy, zz);
    zx /= zl; zy /= zl; zz /= zl;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    var xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ]);
  }

  function mat4Mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function hexToRgb(hex, fallback) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return fallback || [0.83, 0.69, 0.22];
    var v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }

  /* ── Texture loading ───────────────────────────────────────────────────── */

  function loadTexture(gl, url) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // 1px gold placeholder while the image streams in.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 34, 22, 255]));
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    img.src = url;
    return tex;
  }

  /* ── Geometry ──────────────────────────────────────────────────────────── */

  function makeFloor(gl) {
    var data = new Float32Array([-20, 0, -20, 20, 0, -20, -20, 0, 20, 20, 0, 20]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buf: buf, count: 4 };
  }

  function makePedestal(gl) {
    var SEG = 24;
    var verts = [];
    var R = 0.55, H = 0.16;
    for (var i = 0; i <= SEG; i++) {
      var a = (i / SEG) * Math.PI * 2;
      var x = Math.cos(a) * R, z = Math.sin(a) * R;
      verts.push(x, 0, z, x * 0.9, -0.9, z * 0.9);
      verts.push(x, H, z, x * 0.9, 0.25, z * 0.9);
    }
    // top cap fan
    var capStart = verts.length / 6;
    verts.push(0, H, 0, 0, 1, 0);
    for (var j = 0; j <= SEG; j++) {
      var a2 = (j / SEG) * Math.PI * 2;
      verts.push(Math.cos(a2) * R, H, Math.sin(a2) * R, 0, 1, 0);
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    return { buf: buf, sideCount: (SEG + 1) * 2, capStart: capStart, capCount: SEG + 2 };
  }

  function makeQuad(gl) {
    var data = new Float32Array([
      -0.5, 0, 0, 1,
      0.5, 0, 1, 1,
      -0.5, 1, 0, 0,
      0.5, 1, 1, 0,
    ]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buf: buf, count: 4 };
  }

  /* ── The renderer ──────────────────────────────────────────────────────── */

  function mount(canvas) {
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
    if (!gl) return null;

    var floorProg = program(gl, FLOOR_VS, FLOOR_FS);
    var pedProg = program(gl, PED_VS, PED_FS);
    var billProg = program(gl, BILL_VS, BILL_FS);
    var partProg = program(gl, PART_VS, PART_FS);

    var floor = makeFloor(gl);
    var pedestal = makePedestal(gl);
    var quad = makeQuad(gl);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* State */
    var sprites = new Map(); // uid → { uid, side, index, center, size, tex, dim, tint, bobPhase }
    var thrones = [null, null]; // champion sprites per side
    var particles = [];
    var champions = [null, null];
    var glow = [0.83, 0.69, 0.22];
    var cam = {
      fov: (42 * Math.PI) / 180,
      eye: [0, 6.4, 11.5],
      target: [0, 0.6, 0],
      choreo: null, // { t, dur, fromEye, toEye, fromT, toT, hold }
    };
    var running = true;
    var raf = null;
    var lastT = 0;
    var time = 0;

    function slotPos(side, index, count) {
      var spread = 1.62;
      var x = (index - (Math.max(count, 1) - 1) / 2) * spread;
      var z = side === 0 ? 2.7 : -2.7;
      return [x, 0.16, z];
    }

    function thronePos(side) {
      return [0, 0.55, side === 0 ? 5.4 : -5.4];
    }

    function camRight() {
      // right vector from the current view
      var zx = cam.eye[0] - cam.target[0], zy = cam.eye[1] - cam.target[1], zz = cam.eye[2] - cam.target[2];
      var zl = Math.hypot(zx, zy, zz);
      zx /= zl; zy /= zl; zz /= zl;
      var xx = 0 * zz - 1 * zy * -1, xy = 1 * zx * -1 - 0 * zz; // up (0,1,0) × z
      var xr = [zy * 0 - zz * 1, zz * 0 - zx * 0, zx * 1 - zy * 0];
      var l = Math.hypot(xr[0], xr[1], xr[2]) || 1;
      return [xr[0] / l, xr[1] / l, xr[2] / l];
    }

    function vpMatrix() {
      var aspect = canvas.width / Math.max(1, canvas.height);
      var proj = mat4Perspective(cam.fov, aspect, 0.1, 60);
      var view = mat4LookAt(cam.eye, cam.target, [0, 1, 0]);
      return mat4Mul(proj, view);
    }

    /* Public: champions */
    function setChampions(opts) {
      champions = [opts.player || null, opts.enemy || null];
      for (var side = 0; side < 2; side++) {
        var c = champions[side];
        if (!c) continue;
        thrones[side] = {
          uid: 'throne-' + side,
          side: side,
          center: thronePos(side),
          size: [1.7, 2.55],
          tex: c.art && c.art.mascot ? loadTexture(gl, c.art.mascot) : null,
          dim: 1,
          tint: hexToRgb(c.art && c.art.colors && c.art.colors.primary, [1, 1, 1]),
          bobPhase: side * 1.7,
        };
      }
      var gc = champions[0] && champions[0].art && champions[0].art.colors && champions[0].art.colors.glow;
      if (gc) {
        var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(gc);
        if (m) glow = [m[1] / 255, m[2] / 255, m[3] / 255];
      }
    }

    /* Public: board sync — engine state → sprites */
    function syncBoard(players) {
      var seen = {};
      for (var side = 0; side < 2; side++) {
        var board = players[side].board;
        for (var i = 0; i < board.length; i++) {
          var m = board[i];
          var uid = 'm' + m.uid;
          seen[uid] = true;
          var pos = slotPos(side, i, board.length);
          var existing = sprites.get(uid);
          var art = m.def && m.def.art;
          var tint = hexToRgb(art && art.colors && art.colors.primary, side === 0 ? [1, 0.95, 0.85] : [0.85, 0.9, 1]);
          if (!existing) {
            sprites.set(uid, {
              uid: uid,
              side: side,
              center: [pos[0], pos[1] - 0.8, pos[2]],
              home: pos.slice(),
              size: [1.1, 1.65],
              tex: art && art.mascot ? loadTexture(gl, art.mascot) : null,
              baseDim: m.sick ? 0.45 : 1,
              dim: 0,
              tint: tint,
              bobPhase: Math.random() * Math.PI * 2,
              born: time,
              state: 'summon',
              stateT: 0,
            });
          } else {
            existing.home = pos.slice();
            existing.baseDim = m.sick ? 0.45 : 1;
          }
        }
      }
      for (var uid of sprites.keys()) {
        if (!seen[uid]) sprites.delete(uid);
      }
    }

    /* Public: projection (world → CSS pixels on the canvas) */
    function project(uidOrPos) {
      var pos = null;
      if (typeof uidOrPos === 'string') {
        var s = sprites.get(uidOrPos) || (uidOrPos === 'throne-0' ? thrones[0] : uidOrPos === 'throne-1' ? thrones[1] : null);
        if (!s) return null;
        pos = [s.center[0], s.center[1] + s.size[1] * 0.75, s.center[2]];
      } else {
        pos = uidOrPos;
      }
      var vp = vpMatrix();
      var x = pos[0], y = pos[1], z = pos[2];
      var cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
      var cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
      var cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.001) return null;
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((cx / cw + 1) / 2) * rect.width,
        y: ((1 - cy / cw) / 2) * rect.height,
        scale: 1 / cw,
      };
    }

    /* Public: attack choreography */
    function attackChoreo(opts) {
      var from = null;
      if (opts.fromUid === 'throne-0') from = thrones[0];
      else if (opts.fromUid === 'throne-1') from = thrones[1];
      else if (opts.fromUid) from = sprites.get(opts.fromUid) || null;
      var to = null;
      if (opts.toUid && sprites.get(opts.toUid)) to = sprites.get(opts.toUid).center;
      else if (opts.toSide != null) to = thronePos(opts.toSide);
      if (REDUCED || !from || !to) {
        if (opts.onImpact) opts.onImpact();
        return;
      }
      // The actor itself strikes: lean back, fly to the target, return home.
      from.state = 'windup';
      from.stateT = 0;
      from.strikeFrom = from.home.slice();
      from.strikeTo = [to[0], to[1] + 0.1, to[2] + (from.side === 0 ? 0.9 : -0.9)];
      var midEye = [(from.home[0] + to[0]) / 2, 4.4, (from.home[2] + to[2]) / 2 + (from.home[2] > 0 ? 4.4 : -4.4) * 0.55];
      cam.choreo = {
        t: 0,
        dur: 0.55,
        hold: 0.55,
        fromEye: cam.eye.slice(),
        midEye: midEye,
        fromT: cam.target.slice(),
        midT: [(from.home[0] + to[0]) / 2, 0.9, (from.home[2] + to[2]) / 2],
        onImpact: opts.onImpact || null,
        impacted: false,
      };
    }

    /* Public: flinch (damage taken) and death (destroyed) */
    function spriteFlinch(uid) {
      var s = sprites.get(uid);
      if (!s || s.state === 'death' || s.state === 'strike' || s.state === 'windup') return;
      s.state = 'flinch';
      s.stateT = 0;
    }

    function spriteDeath(uid) {
      var s = sprites.get(uid);
      if (!s) return;
      s.state = 'death';
      s.stateT = 0;
      burst([s.center[0], s.center[1] + 0.5, s.center[2]], [0.9, 0.85, 0.7, 0.8], 18, 1.1);
    }

    function spriteDamaged(uid) {
      spriteFlinch(uid);
    }

    /* Sprite state machine: summon → idle → windup → strike → return → idle,
       with flinch and death as interrupts. The actors act. */
    function advanceSprite(s, dt) {
      s.stateT += dt;
      var base = s.baseDim;
      if (s.state === 'summon') {
        var k = Math.min(1, s.stateT / 0.5);
        var e = 1 - Math.pow(1 - k, 3);
        s.center[0] = s.home[0];
        s.center[1] = s.home[1] - 0.8 * (1 - e);
        s.center[2] = s.home[2];
        s.dim = base * e;
        if (k >= 1) {
          s.state = 'idle';
          s.dim = base;
          burst([s.home[0], s.home[1] + 0.2, s.home[2]], s.tint.concat([0.7]), 12, 0.8);
        }
        return;
      }
      if (s.state === 'windup') {
        var w = Math.min(1, s.stateT / 0.22);
        var dx = s.strikeTo[0] - s.strikeFrom[0];
        var dz = s.strikeTo[2] - s.strikeFrom[2];
        s.center[0] = s.strikeFrom[0] - dx * 0.1 * w;
        s.center[2] = s.strikeFrom[2] - dz * 0.1 * w;
        if (s.stateT >= 0.22) {
          s.state = 'strike';
          s.stateT = 0;
        }
        return;
      }
      if (s.state === 'strike') {
        var k2 = Math.min(1, s.stateT / 0.26);
        var e2 = 1 - Math.pow(1 - k2, 3);
        s.center[0] = s.strikeFrom[0] + (s.strikeTo[0] - s.strikeFrom[0]) * e2;
        s.center[2] = s.strikeFrom[2] + (s.strikeTo[2] - s.strikeFrom[2]) * e2;
        s.center[1] = s.home[1] + Math.sin(k2 * Math.PI) * 0.75;
        if (k2 >= 1) {
          s.state = 'return';
          s.stateT = 0;
        }
        return;
      }
      if (s.state === 'return') {
        var k3 = Math.min(1, s.stateT / 0.34);
        var e3 = 1 - Math.pow(1 - k3, 3);
        s.center[0] = s.strikeTo[0] + (s.home[0] - s.strikeTo[0]) * e3;
        s.center[2] = s.strikeTo[2] + (s.home[2] - s.strikeTo[2]) * e3;
        s.center[1] = s.home[1] + Math.sin((1 - k3) * Math.PI) * 0.3;
        if (k3 >= 1) {
          s.state = 'idle';
          s.center = s.home.slice();
        }
        return;
      }
      if (s.state === 'flinch') {
        var f = s.stateT / 0.24;
        if (f >= 1) {
          s.state = 'idle';
          s.dim = base;
          s.center[2] = s.home[2];
        } else {
          s.dim = base + (1 - f) * 1.5;
          s.center[2] = s.home[2] + (s.side === 0 ? 1 : -1) * 0.16 * (1 - f);
        }
        return;
      }
      if (s.state === 'death') {
        var d = Math.min(1, s.stateT / 0.55);
        s.center[1] = s.home[1] - d * 0.95;
        s.dim = Math.max(0, base * (1 - d));
        return;
      }
      // idle: gentle re-centering after board shifts.
      s.center[0] += (s.home[0] - s.center[0]) * 0.12;
      s.center[1] += (s.home[1] - s.center[1]) * 0.12;
      s.center[2] += (s.home[2] - s.center[2]) * 0.12;
      s.dim += (base - s.dim) * 0.2;
    }

    /* Public: hero-hit flash particles */
    function burst(pos, color, n, spread) {
      for (var i = 0; i < (n || 26); i++) {
        var a = Math.random() * Math.PI * 2;
        var v = (0.8 + Math.random() * 1.6) * (spread || 1);
        particles.push({
          x: pos[0], y: pos[1] + 0.6, z: pos[2],
          vx: Math.cos(a) * v, vy: 1.2 + Math.random() * 1.6, vz: Math.sin(a) * v,
          life: 0.7 + Math.random() * 0.4, maxLife: 1,
          color: color,
          size: 4 + Math.random() * 6,
        });
      }
    }

    function heroHit(side) {
      burst(thronePos(side), side === 0 ? [1, 0.4, 0.3, 0.9] : [1, 0.85, 0.35, 0.9], 34, 1.6);
    }

    /* Frame */
    function frame(t) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
      lastT = t;
      time += dt;

      // Camera choreography.
      if (cam.choreo) {
        var ch = cam.choreo;
        ch.t += dt;
        var k = Math.min(1, ch.t / ch.dur);
        var ease = 1 - Math.pow(1 - k, 3);
        if (ch.t <= ch.dur) {
          for (var i = 0; i < 3; i++) {
            cam.eye[i] = ch.fromEye[i] + (ch.midEye[i] - ch.fromEye[i]) * ease;
            cam.target[i] = ch.fromT[i] + (ch.midT[i] - ch.fromT[i]) * ease;
          }
        } else if (ch.t <= ch.dur + ch.hold) {
          if (!ch.impacted && ch.onImpact) {
            ch.impacted = true;
            ch.onImpact();
          }
        } else if (ch.t <= ch.dur * 2 + ch.hold) {
          var k2 = Math.min(1, (ch.t - ch.dur - ch.hold) / ch.dur);
          var e2 = 1 - Math.pow(1 - k2, 3);
          var homeEye = [0, 6.4, 11.5];
          var homeT = [0, 0.6, 0];
          for (var j = 0; j < 3; j++) {
            cam.eye[j] = ch.midEye[j] + (homeEye[j] - ch.midEye[j]) * e2;
            cam.target[j] = ch.midT[j] + (homeT[j] - ch.midT[j]) * e2;
          }
        } else {
          cam.choreo = null;
        }
      } else if (!REDUCED) {
        // Idle drift.
        cam.eye[0] = Math.sin(time * 0.14) * 0.55;
        cam.eye[1] = 6.4 + Math.sin(time * 0.1) * 0.18;
      }

      // Resize.
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.02, 0.025, 0.04, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var vp = vpMatrix();
      var right = camRight();

      // Floor.
      gl.useProgram(floorProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(floorProg, 'uVP'), false, vp);
      gl.uniform3fv(gl.getUniformLocation(floorProg, 'uGlow'), glow);
      gl.bindBuffer(gl.ARRAY_BUFFER, floor.buf);
      var aPos = gl.getAttribLocation(floorProg, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, floor.count);

      // Pedestals under sprites + thrones.
      gl.useProgram(pedProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(pedProg, 'uVP'), false, vp);
      var pPos = gl.getAttribLocation(pedProg, 'aPos');
      var pNorm = gl.getAttribLocation(pedProg, 'aNormal');
      gl.bindBuffer(gl.ARRAY_BUFFER, pedestal.buf);
      gl.enableVertexAttribArray(pPos);
      gl.vertexAttribPointer(pPos, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(pNorm);
      gl.vertexAttribPointer(pNorm, 3, gl.FLOAT, false, 24, 12);

      function drawPedestal(center, scale, color) {
        var model = new Float32Array([
          scale, 0, 0, 0,
          0, scale, 0, 0,
          0, 0, scale, 0,
          center[0], 0, center[2], 1,
        ]);
        gl.uniformMatrix4fv(gl.getUniformLocation(pedProg, 'uModel'), false, model);
        gl.uniform3fv(gl.getUniformLocation(pedProg, 'uColor'), color);
        gl.uniform3fv(gl.getUniformLocation(pedProg, 'uRim'), glow);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, pedestal.sideCount);
        gl.drawArrays(gl.TRIANGLE_FAN, pedestal.capStart, pedestal.capCount);
      }

      sprites.forEach(function (s) {
        advanceSprite(s, dt);
        drawPedestal(s.home, 1, s.side === 0 ? [0.10, 0.09, 0.13] : [0.13, 0.10, 0.12]);
      });
      thrones.forEach(function (s) {
        if (s) {
          advanceSprite(s, dt);
          drawPedestal(s.home, 2.2, [0.12, 0.10, 0.15]);
        }
      });

      // Billboards.
      gl.useProgram(billProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(billProg, 'uVP'), false, vp);
      gl.uniform3fv(gl.getUniformLocation(billProg, 'uCamRight'), right);
      gl.uniform3fv(gl.getUniformLocation(billProg, 'uCamUp'), [0, 1, 0]);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.buf);
      var bCorner = gl.getAttribLocation(billProg, 'aCorner');
      var bUV = gl.getAttribLocation(billProg, 'aUV');
      gl.enableVertexAttribArray(bCorner);
      gl.vertexAttribPointer(bCorner, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(bUV);
      gl.vertexAttribPointer(bUV, 2, gl.FLOAT, false, 16, 8);

      function drawSprite(s) {
        if (!s.tex) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, s.tex);
        gl.uniform1i(gl.getUniformLocation(billProg, 'uTex'), 0);
        gl.uniform3fv(gl.getUniformLocation(billProg, 'uCenter'), s.center);
        gl.uniform2fv(gl.getUniformLocation(billProg, 'uSize'), s.size);
        gl.uniform1f(gl.getUniformLocation(billProg, 'uBob'), REDUCED ? 0 : Math.sin(time * 1.6 + s.bobPhase) * 0.05);
        gl.uniform1f(gl.getUniformLocation(billProg, 'uSway'), REDUCED ? 0 : Math.sin(time * 0.9 + s.bobPhase) * 0.035);
        gl.uniform1f(gl.getUniformLocation(billProg, 'uDim'), s.dim);
        gl.uniform3fv(gl.getUniformLocation(billProg, 'uTint'), s.tint);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);
      }

      sprites.forEach(drawSprite);
      thrones.forEach(function (s) {
        if (s) drawSprite(s);
      });

      // Particles.
      if (particles.length > 0) {
        var alive = [];
        var data = [];
        for (var pi = 0; pi < particles.length; pi++) {
          var p = particles[pi];
          p.life -= dt;
          if (p.life <= 0) continue;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 4.5 * dt;
          alive.push(p);
          var a = Math.max(0, p.life / 0.9);
          data.push(p.x, p.y, p.z, p.size, p.color[0], p.color[1], p.color[2], p.color[3] * a);
        }
        particles = alive;
        if (data.length > 0) {
          gl.useProgram(partProg);
          gl.uniformMatrix4fv(gl.getUniformLocation(partProg, 'uVP'), false, vp);
          var pbuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
          var pp = gl.getAttribLocation(partProg, 'aPos');
          var ps = gl.getAttribLocation(partProg, 'aSize');
          var pc = gl.getAttribLocation(partProg, 'aColor');
          gl.enableVertexAttribArray(pp);
          gl.vertexAttribPointer(pp, 3, gl.FLOAT, false, 32, 0);
          gl.enableVertexAttribArray(ps);
          gl.vertexAttribPointer(ps, 1, gl.FLOAT, false, 32, 12);
          gl.enableVertexAttribArray(pc);
          gl.vertexAttribPointer(pc, 4, gl.FLOAT, false, 32, 16);
          gl.drawArrays(gl.POINTS, 0, data.length / 8);
          gl.deleteBuffer(pbuf);
        }
      }
    }
    raf = requestAnimationFrame(frame);

    return {
      setChampions: setChampions,
      syncBoard: syncBoard,
      project: project,
      attackChoreo: attackChoreo,
      heroHit: heroHit,
      spriteFlinch: spriteFlinch,
      spriteDeath: spriteDeath,
      burst: burst,
      slotPos: slotPos,
      thronePos: thronePos,
      setPaused: function (p) {
        running = !p ? true : running;
      },
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      },
    };
  }

  return { mount: mount };
});
