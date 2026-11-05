/* PuniCodex — The Archē experience engine.
 *
 * Progressive enhancement: the page is fully readable without JS. This
 * engine adds the cinematic layer — a fixed canvas of per-scene particle
 * systems (Canvas 2D, deliberately NOT WebGL: context-loss on mobile GPUs
 * killed the herald WebGL piece, and 2D particles + CSS 3D deliver the same
 * film-language at a fraction of the risk), scene direction, 3D card
 * parallax, the Turn inversion, Act II tendril maps, autoplay, and a
 * quality governor that sheds load before it ever stutters.
 */
(function () {
  'use strict';

  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage = document.getElementById('arche-stage');
  var canvas = document.getElementById('arche-fx');
  if (!stage || !canvas) return;

  var scenes = Array.prototype.slice.call(stage.querySelectorAll('.arche-scene'));
  var railDots = Array.prototype.slice.call(document.querySelectorAll('.arche-rail-dot'));
  var autoplayBtn = document.querySelector('[data-autoplay]');

  // ── Canvas setup ────────────────────────────────────────────────────────

  var ctx = null;
  try {
    ctx = canvas.getContext('2d', { alpha: true });
  } catch (e) {
    canvas.style.display = 'none';
  }

  var W = 0;
  var H = 0;
  var DPR = 1;
  var BUDGET = 120;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
    W = window.innerWidth;
    H = window.innerHeight;
    if (ctx) {
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    BUDGET = Math.max(40, Math.min(220, Math.floor((W * H) / 11000)));
    buildTendrils();
  }

  // ── Palette ─────────────────────────────────────────────────────────────

  // Per-scene accent hues: Act II worlds are color-distinct (matches the
  // body[data-fx] grading in arche.css).
  var ACCENTS = {
    'd-chaos': 'rgba(141,123,181,',
    'd-rebel': 'rgba(179,58,58,',
    'd-clay': 'rgba(181,112,63,',
    'd-one': 'rgba(168,146,63,',
    'd-separation': 'rgba(111,135,168,',
    'd-light': 'rgba(201,154,46,',
    'd-water': 'rgba(46,139,154,',
    'd-thunder': 'rgba(58,111,216,',
    'd-wild': 'rgba(76,138,63,',
    'd-order': 'rgba(138,109,47,',
    'd-wisdom': 'rgba(70,89,158,',
    'd-song': 'rgba(184,74,154,',
    'd-love': 'rgba(194,90,110,',
    'd-child': 'rgba(207,159,53,',
    'd-war': 'rgba(156,69,48,',
    'd-death': 'rgba(93,107,125,',
    'd-trickery': 'rgba(125,79,168,',
    'd-renewal': 'rgba(61,138,95,',
    'd-end': 'rgba(138,47,47,',
  };

  function colors() {
    var turned = body.classList.contains('arche-turned');
    var accent = ACCENTS[body.getAttribute('data-fx')];
    if (!turned) return { ink: 'rgba(237,230,214,', gold: 'rgba(212,175,55,', mist: 'rgba(237,230,214,' };
    return {
      ink: 'rgba(5,5,5,',
      gold: accent || 'rgba(154,127,36,',
      mist: 'rgba(5,5,5,',
    };
  }

  // ── Particle systems ────────────────────────────────────────────────────

  function makeField(n, spawn) {
    var p = new Array(n);
    for (var i = 0; i < n; i++) p[i] = spawn(i);
    return p;
  }

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  /* Each system draws one frame. `t` is seconds; `dt` since last frame. */
  var SYSTEMS = {
    prologue: function (c, t, dt, P) {
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = rnd(0, W);
        }
        c.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 1.4 + p.p));
        c.fillStyle = colors().gold + '1)';
        c.fillRect(p.x, p.y, p.r, p.r);
      }
      c.globalAlpha = 1;
    },
    chaos: function (c, t, dt, P) {
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.x += Math.sin(t * 0.9 + p.p + p.y * 0.006) * 26 * dt;
        p.y += Math.cos(t * 0.7 + p.p * 2 + p.x * 0.004) * 22 * dt;
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        if (p.y < -8) p.y = H + 8;
        if (p.y > H + 8) p.y = -8;
        c.globalAlpha = p.a * 0.75;
        c.fillStyle = (i % 5 === 0 ? colors().gold : colors().mist) + '0.8)';
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, 6.2832);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    'the-one': function (c, t) {
      var cx = W / 2;
      var cy = H / 2;
      var breath = 1 + Math.sin(t * 0.8) * 0.08;
      var R = Math.min(W, H) * 0.16 * breath;
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 4);
      var col = colors();
      g.addColorStop(0, col.gold + '0.5)');
      g.addColorStop(0.35, col.gold + '0.14)');
      g.addColorStop(1, col.gold + '0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.fillStyle = col.ink + '1)';
      c.beginPath();
      c.arc(cx, cy, R * 0.45, 0, 6.2832);
      c.fill();
      c.strokeStyle = col.gold + '0.5)';
      c.lineWidth = 1;
      for (var r = 1; r <= 3; r++) {
        c.beginPath();
        c.arc(cx, cy, R * (0.8 + r * 0.55) * breath, 0, 6.2832);
        c.stroke();
      }
    },
    'the-child': function (c, t, dt, P) {
      // Soft glow-orbs rising slowly — the small lights of the future.
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt * 0.5;
        if (p.y < -12) {
          p.y = H + 12;
          p.x = rnd(0, W);
        }
        var pulse = 0.6 + 0.4 * Math.sin(t * 1.8 + p.p);
        var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, col.gold + 0.35 * pulse * p.a + ')');
        g.addColorStop(1, col.gold + '0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(p.x, p.y, p.r * 5, 0, 6.2832);
        c.fill();
      }
    },
    'the-wild': function (c, t, dt, P) {
      // Drifting leaves and fireflies — the forest at dusk.
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        if (i % 3 === 0) {
          // firefly: slow bob, blink
          p.x += Math.sin(t * 0.5 + p.p) * 10 * dt;
          p.y += Math.cos(t * 0.4 + p.p * 2) * 8 * dt;
          c.globalAlpha = p.a * Math.max(0, Math.sin(t * 2.2 + p.p * 5));
          c.fillStyle = col.gold + '1)';
          c.beginPath();
          c.arc(p.x, p.y, 1.4, 0, 6.2832);
          c.fill();
        } else {
          // leaf: fall with sway
          p.y += p.s * dt;
          p.x += Math.sin(t * 0.9 + p.p + p.y * 0.02) * 18 * dt;
          if (p.y > H + 10) {
            p.y = -10;
            p.x = rnd(0, W);
          }
          c.save();
          c.translate(p.x, p.y);
          c.rotate(Math.sin(t * 0.8 + p.p) * 0.9);
          c.globalAlpha = p.a * 0.6;
          c.fillStyle = col.mist + '0.5)';
          c.beginPath();
          c.ellipse(0, 0, p.r * 1.8, p.r * 0.8, 0, 0, 6.2832);
          c.fill();
          c.restore();
        }
      }
      c.globalAlpha = 1;
    },
    'the-song': function (c, t, dt, P) {
      // Notes drifting on sine waves — lyric particles crossing the sky.
      var col = colors();
      var notes = '♪♫♩';
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.x += p.s * dt;
        if (p.x > W + 20) {
          p.x = -20;
          p.y = rnd(0, H);
        }
        p.y += Math.sin(t * 1.6 + p.p + p.x * 0.008) * 22 * dt;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(Math.sin(t * 1.6 + p.p) * 0.25);
        c.globalAlpha = p.a * 0.7;
        c.fillStyle = col.gold + '1)';
        c.font = Math.max(10, p.r * 6) + 'px serif';
        c.fillText(notes[i % notes.length], 0, 0);
        c.restore();
      }
      c.globalAlpha = 1;
    },
    'the-rebel': function (c, t, dt, P) {
      // Violent turbulence — chaos but sharper, faster, edged in crimson.
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.x += Math.sin(t * 2.2 + p.p + p.y * 0.011) * 55 * dt;
        p.y += Math.cos(t * 1.9 + p.p * 2 + p.x * 0.009) * 46 * dt;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        c.globalAlpha = p.a * 0.8;
        c.strokeStyle = i % 6 === 0 ? 'rgba(178,34,34,0.9)' : col.mist + '0.7)';
        c.beginPath();
        c.moveTo(p.x - p.r * 2, p.y);
        c.lineTo(p.x + p.r * 2, p.y);
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    'the-clay': function (c, t, dt, P) {
      // Dust motes gathering into forms — slow convergence toward centres.
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var hx = cx + Math.cos(p.p) * (60 + (i % 5) * 46);
        var hy = cy + Math.sin(p.p) * (44 + (i % 5) * 34);
        p.x += (hx - p.x) * 0.35 * dt;
        p.y += (hy - p.y) * 0.35 * dt;
        p.p += dt * 0.12;
        c.globalAlpha = p.a * 0.65;
        c.fillStyle = (i % 4 === 0 ? col.gold : col.mist) + '0.85)';
        c.beginPath();
        c.arc(p.x, p.y, p.r * 0.8, 0, 6.2832);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    'the-end': function (c, t, dt, P) {
      // Fire horizon — a burning seam at the world's edge, embers rising.
      var col = colors();
      var seam = H * 0.78 + Math.sin(t * 0.9) * 5;
      var g = c.createLinearGradient(0, seam - 70, 0, seam + 30);
      g.addColorStop(0, 'rgba(178,34,34,0)');
      g.addColorStop(0.7, 'rgba(212,120,40,0.28)');
      g.addColorStop(1, 'rgba(255,160,60,0.4)');
      c.fillStyle = g;
      c.fillRect(0, seam - 70, W, 100);
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt * 1.4;
        if (p.y < -8) {
          p.y = seam;
          p.x = rnd(0, W);
        }
        c.globalAlpha = p.a * (0.5 + 0.5 * Math.abs(Math.sin(t * 7 + p.p)));
        c.fillStyle = (i % 3 === 0 ? 'rgba(255,150,60,' : col.gold + '0.7)') + '0.9)';
        c.fillRect(p.x, p.y, p.r, p.r * 2);
      }
      c.globalAlpha = 1;
    },
    separation: function (c, t) {
      var col = colors();
      var seam = H / 2 + Math.sin(t * 0.5) * 8;
      var g = c.createLinearGradient(0, seam - 90, 0, seam + 90);
      g.addColorStop(0, col.gold + '0)');
      g.addColorStop(0.5, col.gold + '0.35)');
      g.addColorStop(1, col.gold + '0)');
      c.fillStyle = g;
      c.fillRect(0, seam - 90, W, 180);
      c.fillStyle = col.mist + '0.05)';
      for (var i = 0; i < 6; i++) {
        var y = seam - 40 - i * 34 + Math.sin(t * 0.6 + i) * 6;
        c.fillRect(0, y, W, 1);
      }
      for (var j = 0; j < 6; j++) {
        var y2 = seam + 40 + j * 34 + Math.cos(t * 0.5 + j) * 6;
        c.fillRect(0, y2, W, 1);
      }
    },
    light: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var rays = 9;
      for (var i = 0; i < rays; i++) {
        var ang = (i / rays) * Math.PI + Math.sin(t * 0.3) * 0.06;
        var len = H * 1.2;
        var g = c.createLinearGradient(cx, -40, cx + Math.cos(ang) * len, -40 + Math.sin(ang) * len);
        g.addColorStop(0, col.gold + '0.22)');
        g.addColorStop(1, col.gold + '0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx, -40);
        c.lineTo(cx + Math.cos(ang - 0.03) * len, -40 + Math.sin(ang - 0.03) * len);
        c.lineTo(cx + Math.cos(ang + 0.03) * len, -40 + Math.sin(ang + 0.03) * len);
        c.fill();
      }
    },
    water: function (c, t) {
      var col = colors();
      c.strokeStyle = col.gold + '0.3)';
      c.lineWidth = 1;
      var lines = 14;
      for (var i = 0; i < lines; i++) {
        var baseY = (i / lines) * H;
        c.beginPath();
        for (var x = 0; x <= W; x += 18) {
          var y = baseY + Math.sin(x * 0.008 + t * 1.1 + i * 0.7) * 9;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(i * 1.3 + t * 0.4));
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    thunder: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y += p.s * dt;
        if (p.y > H) {
          p.y = -10;
          p.x = rnd(0, W);
        }
        c.globalAlpha = p.a * 0.5;
        c.strokeStyle = col.mist + '0.6)';
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - 2, p.y + 12);
        c.stroke();
      }
      // Lightning flash on a seeded-looking cadence.
      var phase = t % 3.7;
      if (phase < 0.09) {
        c.globalAlpha = (0.09 - phase) * 6;
        c.fillStyle = col.ink + '1)';
        c.fillRect(0, 0, W, H);
        c.globalAlpha = ((0.09 - phase) * 6) * 0.9;
        c.strokeStyle = col.gold + '1)';
        c.lineWidth = 2;
        var x = W * (0.3 + 0.4 * Math.abs(Math.sin(Math.floor(t / 3.7) * 12.9898)));
        c.beginPath();
        c.moveTo(x, 0);
        var yy = 0;
        while (yy < H * 0.7) {
          yy += rnd(24, 60);
          x += rnd(-34, 34);
          c.lineTo(x, yy);
        }
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    order: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      var R = Math.min(W, H) * 0.42;
      c.strokeStyle = col.gold + '0.22)';
      c.lineWidth = 1;
      for (var ring = 1; ring <= 3; ring++) {
        c.beginPath();
        for (var k = 0; k <= 6; k++) {
          var a = (k / 6) * Math.PI * 2 + t * 0.05 * (ring % 2 === 0 ? -1 : 1);
          var x = cx + Math.cos(a) * R * ring * 0.36;
          var y = cy + Math.sin(a) * R * ring * 0.36;
          if (k === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
        c.stroke();
      }
      for (var s = 0; s < 6; s++) {
        var a2 = (s / 6) * Math.PI * 2 + t * 0.05;
        c.beginPath();
        c.moveTo(cx + Math.cos(a2) * R * 0.36, cy + Math.sin(a2) * R * 0.36);
        c.lineTo(cx + Math.cos(a2) * R * 1.08, cy + Math.sin(a2) * R * 1.08);
        c.stroke();
      }
    },
    wisdom: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt;
        p.x += Math.sin(t + p.p) * 8 * dt;
        if (p.y < -12) {
          p.y = H + 12;
          p.x = rnd(0, W);
        }
        c.save();
        c.translate(p.x, p.y);
        c.rotate(t * 0.4 + p.p);
        c.globalAlpha = p.a * 0.7;
        c.strokeStyle = col.gold + '0.8)';
        c.lineWidth = 1;
        c.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2);
        c.beginPath();
        c.moveTo(-p.r, 0);
        c.lineTo(p.r, 0);
        c.stroke();
        c.restore();
      }
      c.globalAlpha = 1;
    },
    love: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y += p.s * dt;
        p.x += Math.sin(t * 0.8 + p.p) * 14 * dt;
        if (p.y > H + 10) {
          p.y = -10;
          p.x = rnd(0, W);
        }
        c.save();
        c.translate(p.x, p.y);
        c.rotate(Math.sin(t * 0.6 + p.p) * 0.8);
        c.globalAlpha = p.a * 0.75;
        c.fillStyle = col.gold + '0.5)';
        c.beginPath();
        c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.2832);
        c.fill();
        c.restore();
      }
      c.globalAlpha = 1;
    },
    war: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt * (1 + 0.5 * Math.sin(t * 6 + p.p));
        if (p.y < -8) {
          p.y = H + 8;
          p.x = rnd(0, W);
        }
        c.globalAlpha = p.a * (0.55 + 0.45 * Math.abs(Math.sin(t * 9 + p.p)));
        c.fillStyle = (i % 4 === 0 ? col.gold : colors().mist) + '0.9)';
        c.fillRect(p.x, p.y, p.r, p.r * 2.2);
      }
      c.globalAlpha = 1;
    },
    death: function (c, t) {
      var col = colors();
      for (var i = 0; i < 3; i++) {
        var y = H * (0.25 + i * 0.25) + Math.sin(t * 0.25 + i * 2) * 26;
        var g = c.createLinearGradient(0, y - 90, 0, y + 90);
        g.addColorStop(0, col.mist + '0)');
        g.addColorStop(0.5, col.mist + '0.06)');
        g.addColorStop(1, col.mist + '0)');
        c.fillStyle = g;
        c.fillRect(0, y - 90, W, 180);
      }
    },
    trickery: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var sides = 3 + Math.floor(3.5 + 3.5 * Math.sin(t * 0.7 + p.p));
        c.save();
        c.translate(p.x, p.y);
        c.rotate(t * 0.5 + p.p);
        c.globalAlpha = p.a * (0.35 + 0.35 * Math.sin(t * 2.2 + p.p * 3));
        c.strokeStyle = col.gold + '0.9)';
        c.lineWidth = 1;
        c.beginPath();
        for (var k = 0; k <= sides; k++) {
          var a = (k / sides) * Math.PI * 2;
          var rr = p.r * (1 + 0.25 * Math.sin(t * 3 + k));
          if (k === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.stroke();
        c.restore();
      }
      c.globalAlpha = 1;
    },
    renewal: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      for (var i = 0; i < 5; i++) {
        var phase = (t * 0.22 + i / 5) % 1;
        var R = phase * Math.min(W, H) * 0.55;
        c.globalAlpha = (1 - phase) * 0.5;
        c.strokeStyle = col.gold + '0.9)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(cx, cy, R, 0, 6.2832);
        c.stroke();
      }
      c.globalAlpha = 0.8;
      var tick = Math.floor(t * 1.2) % 12;
      var ta = (tick / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(ta) * Math.min(W, H) * 0.2, cy + Math.sin(ta) * Math.min(W, H) * 0.2);
      c.stroke();
      c.globalAlpha = 1;
    },
    turn: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      var burst = (t % 4) / 4;
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * (0.2 + burst * 0.6));
      g.addColorStop(0, col.gold + (0.5 * (1 - burst)) + ')');
      g.addColorStop(1, col.gold + '0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = col.gold + '0.4)';
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * Math.PI * 2 + t * 0.4;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        c.lineTo(cx + Math.cos(a) * (60 + burst * 220), cy + Math.sin(a) * (60 + burst * 220));
        c.stroke();
      }
    },
    finale: function (c, t, dt, P) {
      var col = colors();
      var glyphs = 'ΑΡΧΗΘΕΟΣΦΩΣΧΑΟΣΨΥΧΗ';
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt;
        if (p.y < -20) {
          p.y = H + 20;
          p.x = rnd(0, W);
        }
        c.globalAlpha = p.a * 0.8;
        c.fillStyle = col.gold + '1)';
        c.font = p.r + 'px Cinzel, serif';
        c.fillText(glyphs[i % glyphs.length], p.x, p.y);
      }
      c.globalAlpha = 1;
    },
  };

  // Act II descent systems: a circuit grid with travelling pulses.
  // Act II bespoke systems: each descent principle gets its own film language
  // (the ascent has sixteen; the descent refuses to share one circuit grid).
  var ACT2 = {
    // Vortex — chaos and the rebel: a slow spiral pulling inward.
    vortex: function (c, t, dt, P) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.p += dt * (0.12 + (i % 5) * 0.02);
        var r = ((p.r * 40 + t * 12) % (Math.min(W, H) * 0.55)) + 20;
        var x = cx + Math.cos(p.p + r * 0.012) * r;
        var y = cy + Math.sin(p.p + r * 0.012) * r * 0.7;
        c.globalAlpha = p.a * 0.7 * (1 - r / (Math.min(W, H) * 0.6));
        c.fillStyle = col.ink + '0.8)';
        c.beginPath();
        c.arc(x, y, 1.4, 0, 6.2832);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    // Skyline — the built vertical world: towers rising from the base.
    skyline: function (c, t) {
      var col = colors();
      var n = 16;
      var base = H * 0.92;
      for (var i = 0; i < n; i++) {
        var bw = W / n;
        var x = i * bw + 2;
        var h = (Math.sin(i * 2.7) * 0.5 + 0.5) * H * 0.4 + H * 0.08;
        var grow = Math.min(1, Math.max(0, (t * 0.25 - i * 0.06) % 2));
        c.globalAlpha = 0.5;
        c.fillStyle = col.ink + '0.5)';
        c.fillRect(x, base - h * grow, bw - 4, h * grow);
        c.globalAlpha = 0.9;
        c.strokeStyle = col.gold + '0.8)';
        c.strokeRect(x, base - h * grow, bw - 4, h * grow);
      }
      c.globalAlpha = 0.25;
      c.strokeStyle = col.ink + '1)';
      c.beginPath();
      c.moveTo(0, base);
      c.lineTo(W, base);
      c.stroke();
      c.globalAlpha = 1;
    },
    // Equalizer — the song as industry: bars pulsing to a silent beat.
    equalizer: function (c, t) {
      var col = colors();
      var n = 24;
      var bw = W / n;
      for (var i = 0; i < n; i++) {
        var h =
          (Math.abs(Math.sin(t * 2.2 + i * 0.7)) * 0.5 + Math.abs(Math.sin(t * 3.7 + i * 1.9)) * 0.5) *
          H *
          0.3;
        c.globalAlpha = 0.5;
        c.fillStyle = col.gold + '0.7)';
        c.fillRect(i * bw + bw * 0.2, H * 0.85 - h, bw * 0.6, h);
      }
      c.globalAlpha = 0.2;
      c.fillStyle = col.ink + '1)';
      c.fillRect(0, H * 0.85, W, 1);
      c.globalAlpha = 1;
    },
    // Pulse — love and the child: soft radiating heartbeats.
    pulse: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      for (var i = 0; i < 4; i++) {
        var phase = (t * 0.5 + i / 4) % 1;
        var beat = phase < 0.12 ? 1.15 : 1;
        var r = phase * Math.min(W, H) * 0.45 * beat;
        c.globalAlpha = (1 - phase) * 0.35;
        c.strokeStyle = col.gold + '0.9)';
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(cx, cy, Math.max(r, 1), 0, 6.2832);
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    // Arcs — thunder as network: electricity jumping between grid nodes.
    arcs: function (c, t, dt, P) {
      var col = colors();
      var nodes = [];
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * Math.PI * 2 + t * 0.05;
        nodes.push({ x: W / 2 + Math.cos(a) * W * 0.32, y: H / 2 + Math.sin(a) * H * 0.3 });
      }
      c.globalAlpha = 0.5;
      c.fillStyle = col.ink + '1)';
      for (var k = 0; k < nodes.length; k++) {
        c.beginPath();
        c.arc(nodes[k].x, nodes[k].y, 2.4, 0, 6.2832);
        c.fill();
      }
      var flash = (t % 1.7) < 0.12;
      if (flash) {
        c.globalAlpha = 0.85;
        c.strokeStyle = col.gold + '1)';
        c.lineWidth = 1.4;
        for (var j = 0; j < 3; j++) {
          var a2 = nodes[(j * 2) % nodes.length];
          var b2 = nodes[(j * 2 + 3) % nodes.length];
          c.beginPath();
          c.moveTo(a2.x, a2.y);
          var segs = 6;
          for (var s2 = 1; s2 < segs; s2++) {
            var f = s2 / segs;
            c.lineTo(a2.x + (b2.x - a2.x) * f + rnd(-14, 14), a2.y + (b2.y - a2.y) * f + rnd(-14, 14));
          }
          c.lineTo(b2.x, b2.y);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
    },
    // Radar — war and the end: a sweep with returning blips.
    radar: function (c, t) {
      var col = colors();
      var cx = W / 2;
      var cy = H / 2;
      var R = Math.min(W, H) * 0.42;
      c.strokeStyle = col.ink + '0.25)';
      c.lineWidth = 1;
      for (var r = 1; r <= 3; r++) {
        c.beginPath();
        c.arc(cx, cy, (R * r) / 3, 0, 6.2832);
        c.stroke();
      }
      var ang = t * 0.9;
      var g = c.createLinearGradient(cx, cy, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      g.addColorStop(0, col.gold + '0.35)');
      g.addColorStop(1, col.gold + '0)');
      c.strokeStyle = g;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
      c.stroke();
      for (var i = 0; i < 4; i++) {
        var ba = i * 1.7 + 0.6;
        var fade = 1 - ((ang - ba) % 6.2832 + 6.2832) % 6.2832 / 6.2832;
        if (fade > 0.55) {
          c.globalAlpha = fade - 0.4;
          c.fillStyle = col.gold + '1)';
          c.beginPath();
          c.arc(cx + Math.cos(ba) * R * 0.6, cy + Math.sin(ba) * R * 0.6, 3, 0, 6.2832);
          c.fill();
        }
      }
      c.globalAlpha = 1;
    },
    // Forge — clay and wisdom: sparks and assembling squares.
    forge: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y -= p.s * dt;
        if (p.y < -8) {
          p.y = H + 8;
          p.x = rnd(0, W);
        }
        var snap = Math.round(p.x / 22) * 22;
        c.globalAlpha = p.a * 0.75;
        c.fillStyle = (i % 4 === 0 ? col.gold : col.ink) + '0.85)';
        c.fillRect(snap, Math.round(p.y / 22) * 22, 3, 3);
      }
      c.globalAlpha = 1;
    },
    // Seeds — the wild and renewal: drifting spores taking root.
    seeds: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.x += Math.sin(t * 0.6 + p.p) * 16 * dt;
        p.y += Math.cos(t * 0.4 + p.p * 2) * 10 * dt;
        if (p.y > H + 10) p.y = -10;
        if (p.y < -10) p.y = H + 10;
        var root = Math.abs(Math.sin(t * 0.5 + p.p));
        c.globalAlpha = p.a * 0.7;
        c.strokeStyle = col.ink + '0.7)';
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x + Math.sin(p.p + t) * 6 * root, p.y - 10 * root);
        c.stroke();
        c.fillStyle = col.gold + '0.9)';
        c.beginPath();
        c.arc(p.x, p.y, 1.6, 0, 6.2832);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    // Settle — death as archive: dust drifting down and filing itself away.
    settle: function (c, t, dt, P) {
      var col = colors();
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.y += p.s * dt * 0.4;
        if (p.y > H + 8) {
          p.y = -8;
          p.x = rnd(0, W);
        }
        var fileX = Math.round(p.x / 30) * 30;
        c.globalAlpha = p.a * 0.5;
        c.fillStyle = col.ink + '0.7)';
        c.fillRect(fileX, p.y, 2.5, 2.5);
      }
      c.globalAlpha = 0.15;
      c.strokeStyle = col.ink + '1)';
      for (var gx = 0; gx < W; gx += 30) {
        c.beginPath();
        c.moveTo(gx, H * 0.75);
        c.lineTo(gx, H);
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    // Shimmer — trickery as media: signboards flickering on and off.
    shimmer: function (c, t) {
      var col = colors();
      var n = 10;
      for (var i = 0; i < n; i++) {
        var on = Math.sin(t * (1.1 + (i % 3) * 0.5) + i * 2.3) > -0.25;
        if (!on) continue;
        var bw = W / n;
        var x = i * bw + bw * 0.15;
        var h = H * (0.08 + (Math.sin(i * 5.1) * 0.5 + 0.5) * 0.1);
        var y = H * 0.75 - h;
        c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + i);
        c.strokeStyle = col.gold + '0.9)';
        c.lineWidth = 1.2;
        c.strokeRect(x, y, bw * 0.7, h);
        c.globalAlpha = 0.2;
        c.fillStyle = col.gold + '0.8)';
        c.fillRect(x, y, bw * 0.7, h);
      }
      c.globalAlpha = 1;
    },
  };

  // Descent scene → bespoke system (fallbacks reuse the ascent language with
  // the inverted Act II palette, which reads as a completely different film).
  var ACT2_MAP = {
    'd-chaos': 'vortex',
    'd-rebel': 'vortex',
    'd-clay': 'forge',
    'd-one': 'skyline',
    'd-separation': 'skyline',
    'd-light': 'pulse',
    'd-water': 'water',
    'd-thunder': 'arcs',
    'd-wild': 'seeds',
    'd-order': 'order',
    'd-wisdom': 'forge',
    'd-song': 'equalizer',
    'd-love': 'pulse',
    'd-child': 'pulse',
    'd-war': 'radar',
    'd-death': 'settle',
    'd-trickery': 'shimmer',
    'd-renewal': 'seeds',
    'd-end': 'radar',
  };

  function act2System(id) {
    var key = ACT2_MAP[id] || 'circuit';
    if (ACT2[key]) {
      return { draw: ACT2[key], spawn: defaultSpawn };
    }
    var sys = SYSTEMS[key];
    if (sys) return { draw: sys, spawn: defaultSpawn };
    return { draw: descentSystem, spawn: descentSpawn };
  }

  function defaultSpawn() {
    return { x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3.2), s: rnd(6, 26), a: rnd(0.2, 0.75), p: rnd(0, 6.28) };
  }

  function descentSpawn() {
    return { path: makePulsePath(), d: rnd(0, 400), s: rnd(0.6, 1.6) };
  }

  function descentSystem(c, t, dt, P) {
    var col = colors();
    var step = 56;
    c.strokeStyle = col.mist + '0.06)';
    c.lineWidth = 1;
    c.beginPath();
    for (var x = step; x < W; x += step) {
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (var y = step; y < H; y += step) {
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      p.d += p.s * dt * 60;
      if (p.d > p.path.length) {
        p.d = 0;
        p.path = makePulsePath();
      }
      var pt = pointAt(p.path, p.d);
      c.globalAlpha = 0.85;
      c.fillStyle = col.gold + '1)';
      c.beginPath();
      c.arc(pt.x, pt.y, 1.6, 0, 6.2832);
      c.fill();
      c.globalAlpha = 0.25;
      c.beginPath();
      c.arc(pt.x, pt.y, 4.5, 0, 6.2832);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  function makePulsePath() {
    var pts = [];
    var x = Math.floor(rnd(0, W / 56)) * 56;
    var y = Math.floor(rnd(0, H / 56)) * 56;
    pts.push({ x: x, y: y });
    for (var i = 0; i < 6; i++) {
      if (Math.random() < 0.5) x += Math.random() < 0.5 ? 56 : -56;
      else y += Math.random() < 0.5 ? 56 : -56;
      pts.push({ x: x, y: y });
    }
    var segs = [];
    var len = 0;
    for (var s = 1; s < pts.length; s++) {
      var l = Math.abs(pts[s].x - pts[s - 1].x) + Math.abs(pts[s].y - pts[s - 1].y);
      segs.push({ a: pts[s - 1], b: pts[s], l: l, start: len });
      len += l;
    }
    return { pts: pts, segs: segs, length: len };
  }

  function pointAt(path, d) {
    for (var i = 0; i < path.segs.length; i++) {
      var s = path.segs[i];
      if (d <= s.start + s.l) {
        var f = (d - s.start) / s.l;
        return { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f };
      }
    }
    return path.pts[path.pts.length - 1];
  }

  // Spawn table: fx id → system + particle factory.
  function fxFor(id) {
    if (id.indexOf('d-') === 0) {
      return act2System(id);
    }
    switch (id) {
      case 'prologue':
        return {
          draw: SYSTEMS.prologue,
          spawn: function () {
            return { x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 1.8), s: rnd(4, 12), a: rnd(0.2, 0.7), p: rnd(0, 6.28) };
          },
        };
      case 'finale':
        return {
          draw: SYSTEMS.finale,
          spawn: function () {
            return { x: rnd(0, W), y: rnd(0, H), r: rnd(10, 22), s: rnd(14, 42), a: rnd(0.25, 0.8), p: rnd(0, 6.28) };
          },
        };
      default:
        break;
    }
    var sys = SYSTEMS[id] || SYSTEMS.chaos;
    return {
      draw: sys,
      spawn: function () {
        return { x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3.2), s: rnd(6, 26), a: rnd(0.2, 0.75), p: rnd(0, 6.28) };
      },
    };
  }

  // ── Scene direction ─────────────────────────────────────────────────────

  var activeScene = scenes[0];
  var activeFx = null;
  var prevFx = null;
  var fxSwapAt = 0;

  function setActive(scene) {
    if (scene === activeScene) return;
    activeScene.classList.remove('is-active');
    activeScene = scene;
    activeScene.classList.add('is-active');
    var id = scene.getAttribute('data-fx') || 'chaos';
    if (activeFx && activeFx.id !== id) {
      prevFx = activeFx;
      fxSwapAt = performance.now();
    }
    activeFx = { id: id, def: fxFor(id), P: null };
    var act = scene.getAttribute('data-act');
    body.classList.toggle('arche-turned', act === '2' || act === '3');
    body.setAttribute('data-fx', id);
    // Journey analytics: which principles the visitor actually reaches.
    try {
      if (window.px && typeof window.px.track === 'function') {
        window.px.track('arche_scene', { scene: id, act: act });
      }
    } catch (e) {}
    var sceneId = scene.id;
    for (var i = 0; i < railDots.length; i++) {
      railDots[i].classList.toggle('is-current', railDots[i].getAttribute('data-goto') === sceneId);
    }
    if (scene.querySelector('[data-tendrils]')) {
      drawTendrils(scene);
      // Fonts/layout settle after activation — redraw so paths land true.
      setTimeout(function () {
        if (activeScene === scene) drawTendrils(scene);
      }, 450);
    }
    if (soundOn) retuneDrone(id);
  }

  // ── Signature transitions: one enter-effect per principle ───────────────

  var TRANSITIONS = {
    thunder: 'flash',
    light: 'flash',
    water: 'wave',
    love: 'bloom',
    'the-end': 'bloom',
    thesong: 'bloom',
    'the-song': 'bloom',
    prologue: 'sweep',
    finale: 'sweep',
    turn: 'sweep',
  };

  function drawTransition(c, id, p) {
    // p: 0 → 1 over the first 700ms of a scene.
    var kind = TRANSITIONS[id] || 'sweep';
    var col = colors();
    if (kind === 'flash') {
      c.globalAlpha = (1 - p) * 0.85;
      c.fillStyle = col.ink + '1)';
      c.fillRect(0, 0, W, H);
    } else if (kind === 'wave') {
      c.globalAlpha = (1 - p) * 0.5;
      c.fillStyle = col.gold + '0.4)';
      var edge = p * (W + 200) - 100;
      c.beginPath();
      c.moveTo(edge - 120, 0);
      for (var y = 0; y <= H; y += 24) {
        c.lineTo(edge - 120 + Math.sin(y * 0.02 + p * 8) * 40, y);
      }
      for (var y2 = H; y2 >= 0; y2 -= 24) {
        c.lineTo(edge + Math.sin(y2 * 0.02 + p * 8) * 40, y2);
      }
      c.fill();
    } else if (kind === 'bloom') {
      var r = p * Math.max(W, H) * 0.8;
      var g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(r, 1));
      g.addColorStop(0, col.gold + (1 - p) * 0.5 + ')');
      g.addColorStop(1, col.gold + '0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    } else {
      // sweep: a vertical curtain of light wipes the frame.
      var x = p * (W + 240) - 120;
      var g2 = c.createLinearGradient(x - 90, 0, x + 90, 0);
      g2.addColorStop(0, col.gold + '0)');
      g2.addColorStop(0.5, col.gold + (1 - p) * 0.4 + ')');
      g2.addColorStop(1, col.gold + '0)');
      c.fillStyle = g2;
      c.fillRect(x - 90, 0, 180, H);
    }
    c.globalAlpha = 1;
  }

  // ── Sound design: one mutable drone per principle (WebAudio) ────────────

  var audioCtx = null;
  var droneNodes = null;
  var soundOn = false;
  var soundBtn = document.querySelector('[data-sound]');

  // Base frequencies (Hz) — low, slow, consonant; the voice of each principle.
  var DRONE_FREQ = {
    prologue: 55, chaos: 41.2, 'the-one': 65.4, 'the-rebel': 46.2, 'the-clay': 58.3,
    separation: 61.7, light: 82.4, water: 49, thunder: 43.7, 'the-wild': 55,
    order: 73.4, wisdom: 77.8, 'the-song': 87.3, love: 98, 'the-child': 110,
    war: 51.9, death: 36.7, trickery: 69.3, renewal: 92.5, 'the-end': 38.9,
    turn: 55, finale: 130.8,
  };

  function ensureAudio() {
    if (audioCtx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      var gain = audioCtx.createGain();
      gain.gain.value = 0;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      droneNodes = { gain: gain, filter: filter, oscs: [] };
      retuneDrone(activeFx ? activeFx.id : 'prologue');
    } catch (e) {
      audioCtx = null;
    }
  }

  function retuneDrone(id) {
    if (!droneNodes || !audioCtx) return;
    var f = DRONE_FREQ[id] || 55;
    for (var i = 0; i < droneNodes.oscs.length; i++) {
      try {
        droneNodes.oscs[i].stop();
      } catch (e) {}
    }
    droneNodes.oscs = [];
    [1, 1.5, 2.02].forEach(function (ratio, idx) {
      var o = audioCtx.createOscillator();
      o.type = idx === 2 ? 'sine' : 'triangle';
      o.frequency.value = f * ratio;
      var og = audioCtx.createGain();
      og.gain.value = idx === 0 ? 0.5 : 0.22;
      o.connect(og);
      og.connect(droneNodes.filter);
      o.start();
      droneNodes.oscs.push(o);
    });
    droneNodes.gain.gain.cancelScheduledValues(audioCtx.currentTime);
    droneNodes.gain.gain.linearRampToValueAtTime(soundOn ? 0.05 : 0, audioCtx.currentTime + 1.2);
  }

  function setSound(on) {
    soundOn = on;
    if (on) ensureAudio();
    if (!audioCtx) {
      soundOn = false;
      on = false;
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (droneNodes) {
      droneNodes.gain.gain.cancelScheduledValues(audioCtx.currentTime);
      droneNodes.gain.gain.linearRampToValueAtTime(on ? 0.05 : 0, audioCtx.currentTime + 0.8);
    }
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = soundBtn.querySelector('.arche-sound-label');
      if (label) label.textContent = on ? 'Sound on' : 'Sound';
    }
  }

  if (soundBtn) {
    soundBtn.hidden = false;
    soundBtn.addEventListener('click', function () {
      setSound(!soundOn);
    });
  }

  // Scene direction: hand the stage to the MOST visible scene. Scenes are
  // content-sized (a tall roster runs several viewports high), so no scene
  // taller than ~2.9 viewports can ever reach a fixed ratio threshold — the
  // old bestRatio > 0.35 gate left those scenes permanently invisible. A
  // challenger must clearly beat the current scene's ratio before the stage
  // swaps, so equal scenes don't thrash the crossfade at their boundary.
  var ratioByScene = new Map();

  var observer = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        ratioByScene.set(entries[i].target, entries[i].intersectionRatio);
      }
      var best = null;
      var bestRatio = 0;
      ratioByScene.forEach(function (ratio, scene) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = scene;
        }
      });
      var current = ratioByScene.get(activeScene) || 0;
      // Small floor: only hand the stage to a scene actually on screen
      // (guards the gaps above the prologue / below the finale).
      if (best && best !== activeScene && bestRatio > 0.08 && bestRatio > current * 1.2 + 0.01) {
        setActive(best);
      }
    },
    { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6, 0.8, 1] }
  );

  for (var si = 0; si < scenes.length; si++) observer.observe(scenes[si]);

  // ── Tendril maps (Act II) ───────────────────────────────────────────────

  var tendrilResizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(tendrilResizeTimer);
    tendrilResizeTimer = setTimeout(resize, 160);
  });

  function buildTendrils() {
    var wrap = stage.querySelectorAll('[data-tendrils]');
    for (var i = 0; i < wrap.length; i++) {
      drawTendrils(wrap[i].closest('.arche-scene'));
    }
  }

  function drawTendrils(scene) {
    var box = scene.querySelector('[data-tendrils]');
    var svg = box && box.querySelector('.arche-tendril-svg');
    if (!box || !svg) return;
    var cards = box.querySelectorAll('.arche-tendril');
    if (!cards.length) return;
    var rect = box.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    var rootX = rect.width / 2;
    var rootY = rect.height + 4;
    var parts = [
      '<circle cx="' + rootX + '" cy="' + Math.min(rootY - 4, rect.height - 4) + '" r="4" fill="rgba(154,127,36,0.7)" />',
    ];
    for (var i = 0; i < cards.length; i++) {
      var cr = cards[i].getBoundingClientRect();
      var x1 = cr.left - rect.left + cr.width / 2;
      var y1 = cr.top - rect.top + cr.height;
      var midY = rootY - (rootY - y1) * 0.45;
      parts.push(
        '<path d="M' + rootX + ',' + (rootY - 4) + ' C' + rootX + ',' + midY + ' ' + x1 + ',' + midY + ' ' + x1 + ',' + (y1 + 4) + '" />'
      );
    }
    svg.innerHTML = parts.join('');
    var paths = svg.querySelectorAll('path');
    for (var j = 0; j < paths.length; j++) {
      var len = paths[j].getTotalLength();
      paths[j].style.strokeDasharray = len;
      paths[j].style.strokeDashoffset = scene.classList.contains('is-active') ? 0 : len;
      paths[j].style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1) ' + j * 0.12 + 's';
    }
  }

  // ── Card parallax (pointer-driven 3D) ───────────────────────────────────

  var fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    stage.addEventListener('pointermove', function (ev) {
      var nx = ev.clientX / W - 0.5;
      var ny = ev.clientY / H - 0.5;
      var grids = activeScene.querySelectorAll('.arche-cards');
      for (var i = 0; i < grids.length; i++) {
        grids[i].style.transform = 'rotateY(' + nx * 5 + 'deg) rotateX(' + -ny * 4 + 'deg)';
      }
    });
    stage.addEventListener('pointerleave', function () {
      var grids = activeScene.querySelectorAll('.arche-cards');
      for (var i = 0; i < grids.length; i++) grids[i].style.transform = '';
    });
  }

  // ── Autoplay (cinematic mode) ───────────────────────────────────────────

  var playing = false;
  var lastFrame = 0;
  var SPEED = 0; // computed per frame from viewport height

  function setPlaying(on) {
    playing = on;
    if (autoplayBtn) {
      autoplayBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var icon = autoplayBtn.querySelector('.arche-autoplay-icon');
      var label = autoplayBtn.querySelector('.arche-autoplay-label');
      if (icon) icon.textContent = on ? '❚❚' : '▶';
      if (label) label.textContent = on ? 'Pause' : 'Cinematic';
    }
  }

  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', function () {
      setPlaying(!playing);
      lastFrame = performance.now();
    });
  }
  window.addEventListener(
    'wheel',
    function () {
      if (playing) setPlaying(false);
    },
    { passive: true }
  );
  window.addEventListener(
    'touchstart',
    function () {
      if (playing) setPlaying(false);
    },
    { passive: true }
  );

  // ── Rail navigation ─────────────────────────────────────────────────────

  for (var ri = 0; ri < railDots.length; ri++) {
    railDots[ri].addEventListener('click', function () {
      var target = document.getElementById(this.getAttribute('data-goto'));
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // ── "Which principle claims you?" — deterministic, shareable ────────────

  var claimForm = document.querySelector('[data-claim-form]');
  var claimResult = document.querySelector('[data-claim-result]');
  if (claimForm && claimResult) {
    var chapters = scenes
      .filter(function (s) {
        return s.getAttribute('data-act') === '1';
      })
      .map(function (s) {
        return { id: s.id.replace(/^scene-/, ''), title: s.querySelector('.arche-title').textContent.trim() };
      });
    var hashName = function (name) {
      var h = 2166136261;
      for (var i = 0; i < name.length; i++) {
        h ^= name.toLowerCase().charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      return h;
    };
    claimForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = (claimForm.who.value || '').trim();
      if (!name) return;
      var h = hashName(name);
      var ch = chapters[h % chapters.length];
      var scene = document.getElementById('scene-' + ch.id);
      var cards = scene ? scene.querySelectorAll('.arche-card-name') : [];
      var deity = cards.length ? cards[h % cards.length].textContent : '';
      var share = 'The Archē claims me: ' + ch.title + (deity ? ' — my deity is ' + deity : '') + '. Discover yours: https://punicodex.com/genesis/';
      claimResult.hidden = false;
      claimResult.innerHTML =
        '<p class="arche-claim-principle">' + ch.title + '</p>' +
        (deity ? '<p class="arche-claim-deity">' + name + ' — your deity in this principle is <a href="/genesis/' + ch.id + '/">' + deity + '</a>.</p>' : '') +
        '<button class="arche-claim-copy" type="button">Copy your claim</button>';
      var copyBtn = claimResult.querySelector('.arche-claim-copy');
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(share).then(function () {
            copyBtn.textContent = 'Copied — share it';
          });
        }
      });
      try {
        if (window.px && typeof window.px.track === 'function') {
          window.px.track('arche_claim', { principle: ch.id });
        }
      } catch (e) {}
    });
  }

  // ── Oracle hand-off ─────────────────────────────────────────────────────

  var oracleForm = document.querySelector('[data-oracle-form]');
  if (oracleForm) {
    oracleForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = (oracleForm.q.value || '').trim();
      if (q) window.location.href = '/oracle/?q=' + encodeURIComponent(q);
    });
  }

  // ── The loop: τέλος is ἀρχή ─────────────────────────────────────────────

  var loopBtn = document.querySelector('[data-loop]');
  if (loopBtn) {
    loopBtn.addEventListener('click', function () {
      var prologue = document.getElementById('prologue');
      if (prologue) prologue.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      try {
        if (window.px && typeof window.px.track === 'function') {
          window.px.track('arche_loop', {});
        }
      } catch (e) {}
    });
  }

  // ── Render loop with quality governor ───────────────────────────────────

  var frames = 0;
  var fpsWindowStart = performance.now();
  var degraded = false;

  function frame(now) {
    var dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;

    if (playing) {
      var sceneH = activeScene ? activeScene.offsetHeight : H;
      window.scrollBy(0, ((sceneH + H * 0.4) / 9000) * dt * 1000 * 0.06);
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) setPlaying(false);
    }

    if (ctx && activeFx) {
      if (!activeFx.P) {
        var count = BUDGET;
        activeFx.P = makeField(count, activeFx.def.spawn);
      }
      ctx.clearRect(0, 0, W, H);
      var t = now / 1000;
      // Crossfade from the previous system for 900ms.
      if (prevFx && now - fxSwapAt < 900 && prevFx.P) {
        ctx.globalAlpha = 1 - (now - fxSwapAt) / 900;
        prevFx.def.draw(ctx, t, dt, prevFx.P);
        ctx.globalAlpha = (now - fxSwapAt) / 900;
      } else {
        prevFx = null;
        ctx.globalAlpha = 1;
      }
      activeFx.def.draw(ctx, t, dt, activeFx.P);
      ctx.globalAlpha = 1;
      // Signature enter-transition for the first 700ms of a new scene.
      if (now - fxSwapAt < 700) drawTransition(ctx, activeFx.id, (now - fxSwapAt) / 700);
    }

    // Quality governor: if we hold under 38 fps for a window, halve the budget.
    frames++;
    if (now - fpsWindowStart > 3000) {
      var fps = (frames * 1000) / (now - fpsWindowStart);
      if (!degraded && fps < 38 && BUDGET > 50) {
        BUDGET = Math.floor(BUDGET / 2);
        degraded = true;
        if (activeFx) activeFx.P = null;
        if (prevFx) prevFx.P = null;
      }
      frames = 0;
      fpsWindowStart = now;
    }

    requestAnimationFrame(frame);
  }

  // ── Boot ────────────────────────────────────────────────────────────────

  resize();
  window.addEventListener('resize', resize);

  if (!reduceMotion) {
    body.classList.add('arche-live');
    activeScene.classList.add('is-active');
    body.setAttribute('data-fx', activeScene.getAttribute('data-fx') || 'prologue');
    activeFx = { id: activeScene.getAttribute('data-fx') || 'prologue', def: fxFor('prologue'), P: null };
    requestAnimationFrame(function (now) {
      lastFrame = now;
      requestAnimationFrame(frame);
    });
  } else {
    // Static mode: draw one calm frame per scene change, no loop.
    body.classList.add('arche-static');
  }
})();
