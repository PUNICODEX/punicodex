/**
 * PuniCodex — Pantheon landing-page hero effects.
 *
 * Each <canvas class="pc-fx-pantheon" data-pantheon="..." data-color="..."
 * data-emoji="..."> gets a bespoke, deterministic procedural scene chosen from
 * nine visual archetypes. The effect is performant, pauses off-screen / on
 * hidden documents, and respects prefers-reduced-motion by hiding the canvas so
 * the static CSS gradient fallback remains visible.
 */
(function () {
  'use strict';

  // Map every known pantheon id to one of the nine visual archetypes.
  var ARCHETYPE_MAP = {
    greek: 'olympian',
    'greek-location': 'olympian',
    roman: 'olympian',
    norse: 'aurora',
    slavic: 'aurora',
    baltic: 'aurora',
    celtic: 'aurora',
    egyptian: 'desert',
    mesopotamian: 'desert',
    canaanite: 'desert',
    phoenician: 'desert',
    hittite: 'desert',
    chinese: 'ink',
    japanese: 'ink',
    korean: 'ink',
    taoist: 'ink',
    buddhist: 'ink',
    nahuatl: 'jungle',
    incan: 'jungle',
    mapuche: 'jungle',
    aboriginal: 'dreamtime',
    polynesian: 'dreamtime',
    sanskrit: 'mandala',
    yoruba: 'yoruba',
    zoroastrian: 'fire'
  };

  var INIT = {};
  var DRAW = {};

  function hashString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) || 1;
  }

  function seededRandom(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function hexToRgb(hex) {
    var m = String(hex).replace('#', '');
    if (m.length === 3) {
      m = m.split('').map(function (c) { return c + c; }).join('');
    }
    var bigint = parseInt(m, 16);
    if (isNaN(bigint)) return { r: 212, g: 175, b: 55 };
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function hsla(h, s, l, a) {
    return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function fitCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    return { w: w, h: h, dpr: dpr };
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // --------------------------------------------------------------------------
  // 1. Olympian — Greek / Roman classical sky
  // --------------------------------------------------------------------------
  INIT.olympian = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.columns = [];
    var nCol = 4 + Math.floor(rng() * 3);
    for (var i = 0; i < nCol; i++) {
      s.columns.push({
        x: rng() * s.w,
        y: rng() * s.h,
        w: 22 + rng() * 26,
        h: 120 + rng() * 180,
        speed: 6 + rng() * 8
      });
    }
    s.leaves = [];
    for (var i = 0; i < 24; i++) {
      s.leaves.push({
        x: rng() * s.w,
        y: rng() * s.h,
        r: 3 + rng() * 5,
        speedY: 8 + rng() * 14,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.04
      });
    }
    s.lightning = { next: 0, active: 0, x: 0, y: 0, segs: [] };
    s.marble = [];
    for (var i = 0; i < 8; i++) {
      s.marble.push({ x: rng() * s.w, w: 24 + rng() * 70, a: 0.02 + rng() * 0.04 });
    }
  };

  DRAW.olympian = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;
    var rng = s.rng;

    // Subtle marble wash.
    for (var i = 0; i < s.marble.length; i++) {
      var m = s.marble[i];
      var grad = ctx.createLinearGradient(m.x - m.w / 2, 0, m.x + m.w / 2, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,' + m.a + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(m.x - m.w / 2, 0, m.w, s.h);
    }

    // Ionic columns drifting upward.
    ctx.fillStyle = rgba(c, 0.14);
    for (var i = 0; i < s.columns.length; i++) {
      var col = s.columns[i];
      col.y -= col.speed * dt;
      if (col.y + col.h < -30) col.y = s.h + 30;
      // Base.
      ctx.fillRect(col.x - col.w * 0.7, col.y + col.h, col.w * 1.4, 6);
      // Shaft.
      ctx.fillRect(col.x - col.w * 0.35, col.y, col.w * 0.7, col.h);
      // Capital.
      ctx.fillRect(col.x - col.w * 0.8, col.y - 6, col.w * 1.6, 8);
      // Ionic scrolls.
      ctx.beginPath();
      ctx.arc(col.x - col.w * 0.35, col.y - 6, col.w * 0.24, 0, Math.PI * 2);
      ctx.arc(col.x + col.w * 0.35, col.y - 6, col.w * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lightning forks from column tops.
    var l = s.lightning;
    if (now > l.next) {
      l.active = now + 120 + rng() * 220;
      l.next = now + 700 + rng() * 2200;
      var col = s.columns[Math.floor(rng() * s.columns.length)];
      l.x = col.x;
      l.y = col.y - 10;
      l.segs = [];
      var x = l.x;
      var y = l.y;
      while (y > -20) {
        x += (rng() - 0.5) * 36;
        y -= 14 + rng() * 26;
        l.segs.push({ x: x, y: y });
        if (rng() > 0.65) {
          l.segs.push({ x: x + (rng() - 0.5) * 50, y: y - (12 + rng() * 24) });
        }
      }
    }
    if (now < l.active) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(255,250,220,0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = rgba(c, 0.95);
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      for (var i = 0; i < l.segs.length; i++) ctx.lineTo(l.segs[i].x, l.segs[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // Laurel leaf particles.
    ctx.fillStyle = rgba(c, 0.4);
    for (var i = 0; i < s.leaves.length; i++) {
      var p = s.leaves[i];
      p.y -= p.speedY * dt;
      p.rot += p.rotSpeed;
      if (p.y < -20) p.y = s.h + 20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // --------------------------------------------------------------------------
  // 2. Aurora — Northern / Slavic / Baltic / Celtic skies
  // --------------------------------------------------------------------------
  INIT.aurora = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.ribbons = [];
    var hues = [130, 170, 270];
    for (var i = 0; i < 4; i++) {
      s.ribbons.push({
        yBase: s.h * (0.18 + rng() * 0.5),
        amp: 24 + rng() * 50,
        speed: 0.25 + rng() * 0.35,
        phase: rng() * Math.PI * 2,
        hue: hues[i % 3] + rng() * 20,
        width: 34 + rng() * 55
      });
    }
    s.glyphs = [];
    var runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛈᛇᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (var i = 0; i < 18; i++) {
      s.glyphs.push({
        x: rng() * s.w,
        y: rng() * s.h,
        ch: runes.charAt(Math.floor(rng() * runes.length)),
        size: 12 + rng() * 18,
        speedY: 6 + rng() * 14,
        alpha: 0.1 + rng() * 0.25,
        phase: rng() * Math.PI * 2
      });
    }
  };

  DRAW.aurora = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;

    for (var i = 0; i < s.ribbons.length; i++) {
      var r = s.ribbons[i];
      ctx.beginPath();
      for (var x = 0; x <= s.w; x += 20) {
        var yy = r.yBase + Math.sin(x * 0.004 + r.phase + t * r.speed) * r.amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      for (var x = s.w; x >= 0; x -= 20) {
        var yy = r.yBase + Math.sin(x * 0.004 + r.phase + t * r.speed) * r.amp + r.width;
        ctx.lineTo(x, yy);
      }
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, r.yBase - r.amp, 0, r.yBase + r.amp + r.width);
      grad.addColorStop(0, hsla(r.hue, 80, 60, 0));
      grad.addColorStop(0.5, hsla(r.hue, 90, 68, 0.28));
      grad.addColorStop(1, hsla(r.hue, 80, 60, 0));
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < s.glyphs.length; i++) {
      var g = s.glyphs[i];
      g.y += g.speedY * dt;
      if (g.y > s.h + 20) g.y = -20;
      var a = g.alpha * (0.7 + 0.3 * Math.sin(t + g.phase));
      ctx.fillStyle = 'rgba(220,245,255,' + a + ')';
      ctx.font = g.size + 'px serif';
      ctx.fillText(g.ch, g.x, g.y);
    }
  };

  // --------------------------------------------------------------------------
  // 3. Desert — Egyptian / Mesopotamian / Canaanite / Phoenician / Hittite
  // --------------------------------------------------------------------------
  INIT.desert = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.dunes = [];
    for (var i = 0; i < 3; i++) {
      s.dunes.push({
        y: s.h * (0.62 + i * 0.09),
        amp: 22 + rng() * 42,
        freq: 0.0025 + rng() * 0.003,
        phase: rng() * Math.PI * 2,
        color: rgba(s.rgb, 0.2 - i * 0.05)
      });
    }
    s.sun = { x: s.w * 0.75, y: s.h * 0.42, r: 36 + rng() * 20 };
    s.shimmer = [];
    for (var i = 0; i < 5; i++) {
      s.shimmer.push({
        y: s.h * (0.38 + rng() * 0.2),
        amp: 2 + rng() * 5,
        speed: 1 + rng() * 2,
        phase: rng() * Math.PI * 2
      });
    }
    var shapes = ['ankh', 'eye', 'wedjat', 'cuneiform'];
    s.glyphs = [];
    for (var i = 0; i < 14; i++) {
      s.glyphs.push({
        x: rng() * s.w,
        y: s.h * (0.28 + rng() * 0.55),
        type: shapes[Math.floor(rng() * shapes.length)],
        size: 14 + rng() * 24,
        speedX: 16 + rng() * 28,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.025,
        alpha: 0.12 + rng() * 0.18
      });
    }
  };

  DRAW.desert = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;

    // Low sun.
    var sunGrad = ctx.createRadialGradient(s.sun.x, s.sun.y, 0, s.sun.x, s.sun.y, s.sun.r * 2.2);
    sunGrad.addColorStop(0, rgba({ r: 255, g: 245, b: 190 }, 0.55));
    sunGrad.addColorStop(0.5, rgba(c, 0.28));
    sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(s.sun.x, s.sun.y, s.sun.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.55)';
    ctx.beginPath();
    ctx.arc(s.sun.x, s.sun.y, s.sun.r, 0, Math.PI * 2);
    ctx.fill();

    // Heat shimmer.
    ctx.strokeStyle = 'rgba(255,200,120,0.14)';
    ctx.lineWidth = 1;
    for (var i = 0; i < s.shimmer.length; i++) {
      var sh = s.shimmer[i];
      ctx.beginPath();
      for (var x = 0; x <= s.w; x += 16) {
        var y = sh.y + Math.sin(x * 0.018 + t * sh.speed + sh.phase) * sh.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Glyphs drifting right-to-left like sand.
    ctx.lineWidth = 2;
    for (var i = 0; i < s.glyphs.length; i++) {
      var g = s.glyphs[i];
      g.x -= g.speedX * dt;
      g.rot += g.rotSpeed;
      if (g.x < -40) g.x = s.w + 40;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.globalAlpha = g.alpha;
      if (g.type === 'ankh') {
        ctx.strokeStyle = rgba(c, 0.35);
        ctx.beginPath();
        ctx.arc(0, -g.size * 0.25, g.size * 0.25, Math.PI, 0);
        ctx.moveTo(0, -g.size * 0.52);
        ctx.lineTo(0, g.size * 0.5);
        ctx.moveTo(-g.size * 0.28, 0);
        ctx.lineTo(g.size * 0.28, 0);
        ctx.stroke();
      } else if (g.type === 'eye') {
        ctx.strokeStyle = rgba(c, 0.35);
        ctx.beginPath();
        ctx.ellipse(0, 0, g.size * 0.5, g.size * 0.26, 0, 0, Math.PI * 2);
        ctx.moveTo(-g.size * 0.5, 0);
        ctx.lineTo(g.size * 0.5, 0);
        ctx.stroke();
      } else if (g.type === 'wedjat') {
        ctx.strokeStyle = rgba(c, 0.35);
        ctx.beginPath();
        ctx.moveTo(-g.size * 0.5, 0);
        ctx.lineTo(g.size * 0.5, 0);
        ctx.lineTo(0, g.size * 0.5);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(c, 0.3);
        for (var k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(-g.size * 0.2, g.size * 0.2 * k - g.size * 0.2);
          ctx.lineTo(g.size * 0.22, g.size * 0.2 * k - g.size * 0.12);
          ctx.lineTo(-g.size * 0.18, g.size * 0.2 * k + g.size * 0.06);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Dune silhouettes.
    for (var i = 0; i < s.dunes.length; i++) {
      var d = s.dunes[i];
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(0, s.h);
      for (var x = 0; x <= s.w; x += 30) {
        var y = d.y + Math.sin(x * d.freq + d.phase + t * 0.18) * d.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(s.w, s.h);
      ctx.closePath();
      ctx.fill();
    }
  };

  // --------------------------------------------------------------------------
  // 4. Ink — Chinese / Japanese / Korean / Taoist / Buddhist
  // --------------------------------------------------------------------------
  INIT.ink = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.strokes = [];
    for (var i = 0; i < 5; i++) {
      s.strokes.push({
        x: rng() * s.w,
        y: rng() * s.h,
        len: 90 + rng() * 160,
        angle: -Math.PI / 4 + (rng() - 0.5) * 0.9,
        width: 22 + rng() * 55,
        period: 4 + rng() * 6,
        phase: rng() * Math.PI * 2
      });
    }
    s.petals = [];
    for (var i = 0; i < 22; i++) {
      s.petals.push({
        x: rng() * s.w,
        y: rng() * s.h,
        r: 3 + rng() * 6,
        speedX: -8 + rng() * 16,
        speedY: 8 + rng() * 18,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.04,
        alpha: 0.2 + rng() * 0.3
      });
    }
    var chars = ['道', '佛', '神', '禅', '龍', '水', '山'];
    s.glyphs = [];
    for (var i = 0; i < 5; i++) {
      s.glyphs.push({
        x: rng() * s.w,
        y: rng() * s.h,
        ch: chars[Math.floor(rng() * chars.length)],
        size: 44 + rng() * 64,
        phase: rng() * Math.PI * 2,
        period: 5 + rng() * 5
      });
    }
  };

  DRAW.ink = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;

    for (var i = 0; i < s.strokes.length; i++) {
      var st = s.strokes[i];
      var life = 0.5 + 0.5 * Math.sin(t * (2 * Math.PI) / st.period + st.phase);
      var a = Math.max(0, life) * 0.28;
      var x2 = st.x + Math.cos(st.angle) * st.len;
      var y2 = st.y + Math.sin(st.angle) * st.len;
      var cp1x = st.x + Math.cos(st.angle + 0.35) * st.len * 0.5;
      var cp1y = st.y + Math.sin(st.angle + 0.35) * st.len * 0.5;
      var cp2x = st.x + Math.cos(st.angle - 0.25) * st.len * 0.8;
      var cp2y = st.y + Math.sin(st.angle - 0.25) * st.len * 0.8;
      var grad = ctx.createLinearGradient(st.x, st.y, x2, y2);
      grad.addColorStop(0, rgba(c, 0));
      grad.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
      grad.addColorStop(1, rgba(c, 0));
      ctx.lineCap = 'round';
      ctx.lineWidth = st.width * (0.55 + 0.45 * life);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < s.glyphs.length; i++) {
      var g = s.glyphs[i];
      var a = 0.07 + 0.07 * Math.sin(t * (2 * Math.PI) / g.period + g.phase);
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.font = g.size + 'px serif';
      ctx.fillText(g.ch, g.x, g.y);
    }

    ctx.fillStyle = rgba(c, 0.38);
    for (var i = 0; i < s.petals.length; i++) {
      var p = s.petals[i];
      p.x += p.speedX * dt;
      p.y += p.speedY * dt;
      p.rot += p.rotSpeed;
      if (p.x < -20) p.x = s.w + 20;
      if (p.x > s.w + 20) p.x = -20;
      if (p.y > s.h + 20) p.y = -20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  // --------------------------------------------------------------------------
  // 5. Jungle — Nahuatl / Incan / Mapuche
  // --------------------------------------------------------------------------
  INIT.jungle = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.sun = { x: s.w * 0.82, y: s.h * 0.2, r: 32 + rng() * 16, rayLen: 55 + rng() * 35 };
    s.feathers = [];
    for (var i = 0; i < 22; i++) {
      s.feathers.push({ t: i / 21 });
    }
    s.leaves = [];
    for (var i = 0; i < 18; i++) {
      s.leaves.push({
        x: rng() * s.w,
        y: rng() * s.h,
        size: 12 + rng() * 20,
        speedY: 5 + rng() * 12,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.05
      });
    }
    s.spots = [];
    for (var i = 0; i < 10; i++) {
      s.spots.push({
        x: rng() * s.w,
        y: rng() * s.h,
        r: 4 + rng() * 9,
        speedY: 7 + rng() * 14
      });
    }
  };

  DRAW.jungle = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;

    // Gold sun disc with radiating rays.
    ctx.save();
    ctx.translate(s.sun.x, s.sun.y);
    ctx.rotate(t * 0.05);
    ctx.strokeStyle = 'rgba(255,215,80,0.45)';
    ctx.lineWidth = 2;
    var rays = 18;
    for (var i = 0; i < rays; i++) {
      var a = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s.sun.r, Math.sin(a) * s.sun.r);
      ctx.lineTo(Math.cos(a) * (s.sun.r + s.sun.rayLen), Math.sin(a) * (s.sun.r + s.sun.rayLen));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,200,60,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, s.sun.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Coiling feathered serpent path.
    var serpentY = s.h * 0.76;
    ctx.strokeStyle = rgba(c, 0.38);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var x = 0; x <= s.w; x += 12) {
      var y = serpentY + Math.sin(x * 0.008 + t * 0.45) * 32;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,140,30,0.48)';
    for (var i = 0; i < s.feathers.length; i++) {
      var f = s.feathers[i];
      var x = f.t * s.w;
      var y = serpentY + Math.sin(x * 0.008 + t * 0.45) * 32;
      var a = Math.atan2(Math.cos(x * 0.008 + t * 0.45) * 32 * 0.008, 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-7, -20);
      ctx.lineTo(7, -20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Tropical leaves.
    ctx.fillStyle = 'rgba(34,139,34,0.38)';
    for (var i = 0; i < s.leaves.length; i++) {
      var p = s.leaves[i];
      p.y += p.speedY * dt;
      p.rot += p.rotSpeed;
      if (p.y > s.h + 20) p.y = -20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Jaguar spots.
    ctx.strokeStyle = 'rgba(20,20,20,0.35)';
    ctx.lineWidth = 2;
    for (var i = 0; i < s.spots.length; i++) {
      var p = s.spots[i];
      p.y += p.speedY * dt;
      if (p.y > s.h + 20) p.y = -20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,20,20,0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // --------------------------------------------------------------------------
  // 6. Dreamtime — Aboriginal / Polynesian
  // --------------------------------------------------------------------------
  INIT.dreamtime = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.constellations = [];
    for (var i = 0; i < 4; i++) {
      var dots = [];
      var n = 5 + Math.floor(rng() * 5);
      var cx = rng() * s.w;
      var cy = rng() * s.h;
      for (var j = 0; j < n; j++) {
        dots.push({
          x: cx + (rng() - 0.5) * s.w * 0.32,
          y: cy + (rng() - 0.5) * s.h * 0.32
        });
      }
      s.constellations.push({
        dots: dots,
        cx: cx,
        cy: cy,
        rotSpeed: (rng() - 0.5) * 0.025,
        rot: rng() * Math.PI * 2
      });
    }
    s.glyphs = [];
    for (var i = 0; i < 8; i++) {
      s.glyphs.push({
        x: rng() * s.w,
        y: rng() * s.h,
        type: Math.floor(rng() * 3),
        size: 22 + rng() * 34,
        phase: rng() * Math.PI * 2
      });
    }
    s.embers = [];
    for (var i = 0; i < 22; i++) {
      s.embers.push({
        x: rng() * s.w,
        y: rng() * s.h,
        r: 1 + rng() * 2.5,
        speedY: 5 + rng() * 12,
        alpha: 0.3 + rng() * 0.5
      });
    }
  };

  DRAW.dreamtime = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;

    // Dot-art constellations.
    ctx.fillStyle = 'rgba(255,200,120,0.6)';
    ctx.strokeStyle = rgba(c, 0.28);
    ctx.lineWidth = 1;
    for (var i = 0; i < s.constellations.length; i++) {
      var con = s.constellations[i];
      con.rot += con.rotSpeed * dt;
      ctx.save();
      ctx.translate(con.cx, con.cy);
      ctx.rotate(con.rot);
      for (var j = 0; j < con.dots.length; j++) {
        var d = con.dots[j];
        ctx.beginPath();
        ctx.arc(d.x - con.cx, d.y - con.cy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      for (var j = 0; j < con.dots.length; j++) {
        var dx = con.dots[j].x - con.cx;
        var dy = con.dots[j].y - con.cy;
        if (j === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Petroglyph / wave glyphs.
    ctx.strokeStyle = rgba({ r: 210, g: 105, b: 30 }, 0.35);
    ctx.lineWidth = 2;
    for (var i = 0; i < s.glyphs.length; i++) {
      var g = s.glyphs[i];
      var a = 0.22 + 0.18 * Math.sin(t + g.phase);
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.beginPath();
      if (g.type === 0) {
        ctx.arc(0, 0, g.size * 0.5, 0, Math.PI * 2);
        ctx.arc(0, 0, g.size * 0.2, 0, Math.PI * 2);
      } else if (g.type === 1) {
        for (var x = -g.size * 0.5; x <= g.size * 0.5; x += 6) {
          var y = Math.sin(x * 0.18 + t + g.phase) * g.size * 0.16;
          if (x === -g.size * 0.5) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        var sz = g.size * 0.5;
        ctx.moveTo(-sz, -sz);
        ctx.lineTo(-sz, sz);
        ctx.lineTo(0, sz);
        ctx.lineTo(0, -sz);
        ctx.lineTo(sz, -sz);
        ctx.lineTo(sz, sz);
      }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Slow ember trails.
    for (var i = 0; i < s.embers.length; i++) {
      var e = s.embers[i];
      e.y -= e.speedY * dt;
      if (e.y < -10) e.y = s.h + 10;
      var a = e.alpha * (0.7 + 0.3 * Math.sin(t * 3 + e.y * 0.05));
      ctx.fillStyle = rgba({ r: 255, g: 100, b: 40 }, a);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // --------------------------------------------------------------------------
  // 7. Mandala — Sanskrit
  // --------------------------------------------------------------------------
  INIT.mandala = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.rings = [];
    for (var i = 0; i < 4; i++) {
      s.rings.push({
        r: 48 + i * 48 + rng() * 24,
        petals: 6 + Math.floor(rng() * 10),
        speed: (rng() - 0.5) * 0.18,
        width: 14 + rng() * 16,
        angle: rng() * Math.PI * 2
      });
    }
    var chars = ['ॐ', 'अ', 'भ', 'ग', 'शि', 'न', 'म', 'स', 'र'];
    s.glyphs = [];
    for (var i = 0; i < chars.length; i++) {
      s.glyphs.push({
        ch: chars[i],
        ring: i % s.rings.length,
        angle: rng() * Math.PI * 2,
        speed: 0.2 + rng() * 0.35
      });
    }
  };

  DRAW.mandala = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;
    var cx = s.w / 2;
    var cy = s.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    for (var i = 0; i < s.rings.length; i++) {
      var r = s.rings[i];
      r.angle += r.speed * dt;
      ctx.save();
      ctx.rotate(r.angle);
      ctx.fillStyle = rgba(c, 0.2 - i * 0.035);
      for (var p = 0; p < r.petals; p++) {
        var a = (p / r.petals) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, r.r, r.width, r.width * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < s.glyphs.length; i++) {
      var g = s.glyphs[i];
      var ring = s.rings[g.ring];
      g.angle += g.speed * dt;
      var x = Math.cos(g.angle) * ring.r;
      var y = Math.sin(g.angle) * ring.r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(g.angle + Math.PI / 2);
      ctx.fillStyle = 'rgba(255,248,220,0.42)';
      ctx.font = (ring.width * 1.35) + 'px serif';
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  // 8. Yoruba — drum pulses, cowrie shells, indigo and gold
  // --------------------------------------------------------------------------
  INIT.yoruba = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.rings = [];
    for (var i = 0; i < 5; i++) {
      s.rings.push({ r: 40 + i * 48, speed: 22 + rng() * 22, phase: rng() * Math.PI * 2 });
    }
    s.cowries = [];
    for (var i = 0; i < 20; i++) {
      s.cowries.push({
        x: rng() * s.w,
        y: rng() * s.h,
        size: 6 + rng() * 11,
        speedY: 6 + rng() * 14,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 0.04
      });
    }
    s.flashPeriod = 0.55 + rng() * 0.45;
  };

  DRAW.yoruba = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;
    var cx = s.w / 2;
    var cy = s.h / 2;

    var flash = 0.5 + 0.5 * Math.sin(t * (2 * Math.PI) / s.flashPeriod);
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(s.w, s.h) * 0.65);
    grad.addColorStop(0, rgba({ r: 75, g: 0, b: 130 }, 0.1 * flash));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s.w, s.h);

    ctx.strokeStyle = rgba(c, 0.28);
    ctx.lineWidth = 2;
    var maxR = Math.max(s.w, s.h) * 0.75;
    for (var i = 0; i < s.rings.length; i++) {
      var r = s.rings[i];
      var rad = (t * r.speed + r.phase) % 240;
      if (rad < 0) rad += 240;
      rad = (rad / 240) * maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,245,220,0.48)';
    ctx.strokeStyle = 'rgba(80,50,30,0.4)';
    ctx.lineWidth = 1;
    for (var i = 0; i < s.cowries.length; i++) {
      var p = s.cowries[i];
      p.y += p.speedY * dt;
      p.rot += p.rotSpeed;
      if (p.y > s.h + 20) p.y = -20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.65, 0);
      ctx.lineTo(p.size * 0.65, 0);
      ctx.stroke();
      ctx.restore();
    }
  };

  // --------------------------------------------------------------------------
  // 9. Fire — Zoroastrian / Abrahamic eternal flames
  // --------------------------------------------------------------------------
  INIT.fire = function (s) {
    s.rng = seededRandom(s.seed);
    var rng = s.rng;
    s.stars = [];
    for (var i = 0; i < 70; i++) {
      s.stars.push({ x: rng() * s.w, y: rng() * s.h, r: 0.5 + rng() * 1.5, twinkle: rng() * Math.PI * 2 });
    }
    s.pillars = [];
    for (var i = 0; i < 5; i++) {
      s.pillars.push({
        x: (i + 1) * s.w / 6,
        baseW: 28 + rng() * 32,
        height: s.h * 0.5 + rng() * s.h * 0.28,
        speed: 2 + rng() * 4,
        phase: rng() * Math.PI * 2
      });
    }
  };

  DRAW.fire = function (ctx, s, now) {
    var t = now / 1000;
    var dt = (now - s.last) / 1000;
    s.last = now;
    var c = s.rgb;

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (var i = 0; i < s.stars.length; i++) {
      var st = s.stars[i];
      var a = 0.25 + 0.75 * Math.sin(t + st.twinkle);
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var i = 0; i < s.pillars.length; i++) {
      var p = s.pillars[i];
      var grad = ctx.createLinearGradient(0, s.h - p.height, 0, s.h);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.2, 'rgba(255,210,80,0.35)');
      grad.addColorStop(0.55, rgba(c, 0.48));
      grad.addColorStop(1, 'rgba(255,40,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      var x = p.x;
      ctx.moveTo(x - p.baseW * 0.3, s.h);
      var y = s.h;
      while (y >= s.h - p.height) {
        var wave = Math.sin(y * 0.035 + t * p.speed + p.phase) * p.baseW * 0.28 * (1 - (s.h - y) / p.height);
        ctx.lineTo(x - p.baseW * 0.3 + wave, y);
        y -= 10;
      }
      while (y <= s.h) {
        var wave = Math.sin(y * 0.035 + t * p.speed + p.phase) * p.baseW * 0.28 * (1 - (s.h - y) / p.height);
        ctx.lineTo(x + p.baseW * 0.3 + wave, y);
        y += 10;
      }
      ctx.closePath();
      ctx.fill();
    }

    // Faravahar-inspired wing arcs.
    ctx.save();
    ctx.translate(s.w / 2, s.h * 0.32);
    ctx.rotate(Math.sin(t * 0.04) * 0.04);
    ctx.strokeStyle = 'rgba(255,215,120,0.38)';
    ctx.lineWidth = 3;
    for (var side = -1; side <= 1; side += 2) {
      for (var f = 0; f < 5; f++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          side * (40 + f * 26),
          -35 - f * 12,
          side * (60 + f * 32),
          35 + f * 16
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // --------------------------------------------------------------------------
  // Bootstrap and lifecycle
  // --------------------------------------------------------------------------
  function attach(canvas) {
    var pantheon = canvas.dataset.pantheon || 'pantheon';
    var color = canvas.dataset.color || '#D4AF37';
    var emoji = canvas.dataset.emoji || '✦';

    if (prefersReducedMotion()) {
      canvas.style.display = 'none';
      return;
    }

    var dims = fitCanvas(canvas);
    var rgb = hexToRgb(color);
    var archetype = ARCHETYPE_MAP[pantheon] || 'olympian';
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var initFn = INIT[archetype];
    var drawFn = DRAW[archetype];
    if (!initFn || !drawFn) return;

    var state = {
      name: archetype,
      seed: hashString(pantheon),
      rgb: rgb,
      emoji: emoji,
      w: dims.w,
      h: dims.h,
      last: performance.now()
    };
    initFn(state);

    var raf = null;
    var visible = true;
    var lastFrame = 0;
    var frameInterval = 1000 / 30;

    function frame(now) {
      if (!visible) return;
      if (now - lastFrame < frameInterval) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrame = now;
      ctx.setTransform(dims.dpr, 0, 0, dims.dpr, 0, 0);
      ctx.clearRect(0, 0, state.w, state.h);
      drawFn(ctx, state, now);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      dims = fitCanvas(canvas);
      state.w = dims.w;
      state.h = dims.h;
      state.last = performance.now();
      initFn(state);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 200);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!document.hidden && visible && !raf) {
        raf = requestAnimationFrame(frame);
      }
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !raf && !document.hidden) {
          raf = requestAnimationFrame(frame);
        } else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }, { threshold: 0 });
      io.observe(canvas);
    }

    raf = requestAnimationFrame(frame);
  }

  function init() {
    var canvases = document.querySelectorAll('canvas.pc-fx-pantheon');
    for (var i = 0; i < canvases.length; i++) {
      attach(canvases[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.pcFxPantheon = { init: init };
})();
