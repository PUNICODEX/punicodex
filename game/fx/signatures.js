/**
 * Mythic Duel — The Signature Moves
 *
 * Bespoke attack sequences for the flagship gods. An archetype says "war";
 * a signature says "Arēs". Each builder mirrors the archetype-builder
 * contract: function (o) → { duration, shake, update(t, ctx, W, H) } with
 * o = { from, to, colors, power }. Registration is by lexicon entryId and
 * beats the archetype fallback inside Sequences.attack().
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sequences.js'));
  } else {
    factory(root.Sequences);
  }
})(typeof self !== 'undefined' ? self : this, function (Sequences) {
  'use strict';
  if (!Sequences || !Sequences._fx) return;
  var H = Sequences._fx;
  var P = H.P, step = H.step, drawParts = H.drawParts, jitter = H.jitter, lerp = H.lerp, easeOut = H.easeOut;

  function dur(x) {
    return H.reduced() ? Math.min(0.3, x * 0.4) : x;
  }

  // Jagged lightning path from (x0,y0) to (x1,y1).
  function boltPath(ctx, x0, y0, x1, y1, jag) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    var steps = 7;
    for (var s = 1; s < steps; s++) {
      var p = s / steps;
      ctx.lineTo(lerp(x0, x1, p) + jitter(jag), lerp(y0, y1, p) + jitter(jag * 0.6));
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function impactBurst(parts, x, y, n, speed, life, size, color, kind) {
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + jitter(0.6);
      parts.push(P(x, y, Math.cos(a) * speed * (0.5 + Math.random()), Math.sin(a) * speed * (0.5 + Math.random()), life, size, color, kind));
    }
  }

  function projectile(o, p, curve) {
    var mx = (o.from.x + o.to.x) / 2 + (curve || 0);
    var my = Math.min(o.from.y, o.to.y) - Math.abs(o.to.x - o.from.x) * 0.18;
    var q = 1 - p;
    return {
      x: q * q * o.from.x + 2 * q * p * mx + p * p * o.to.x,
      y: q * q * o.from.y + 2 * q * p * my + p * p * o.to.y,
    };
  }

  var MOVES = {
    /* ── Zeús — the triple thunderbolt, sky-splitting ───────────────────── */
    'zeus': function (o) {
      var parts = [];
      var d = dur(0.8);
      return {
        duration: d,
        shake: 9,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          ctx.save();
          ctx.strokeStyle = '#eaf4ff';
          ctx.shadowColor = '#bcd6ff';
          ctx.shadowBlur = 18;
          if (p > 0.1) { ctx.lineWidth = 4; boltPath(ctx, o.from.x, o.from.y - 40, o.to.x, o.to.y, 34); }
          if (p > 0.35) { ctx.lineWidth = 2.4; boltPath(ctx, o.from.x - 30, o.from.y - 20, o.to.x - 18, o.to.y + 6, 28); }
          if (p > 0.55) { ctx.lineWidth = 2.4; boltPath(ctx, o.from.x + 30, o.from.y - 20, o.to.x + 18, o.to.y + 6, 28); }
          ctx.restore();
          if (p > 0.6 && parts.length < 30) impactBurst(parts, o.to.x, o.to.y, 3, 240, 0.45, 2.4, '#e8f2ff');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Poseidôn — the tidal crash ─────────────────────────────────────── */
    'poseidon': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 7,
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / (d * 0.7)));
          var crestX = lerp(o.from.x, o.to.x, p);
          ctx.save();
          ctx.fillStyle = 'rgba(56,150,220,0.4)';
          ctx.beginPath();
          ctx.moveTo(0, H);
          var baseY = o.to.y + 50 - p * 34;
          ctx.lineTo(0, baseY);
          for (var x = 0; x <= W; x += 9) {
            ctx.lineTo(x, baseY + Math.sin(x / 26 + t * 10) * 8 + (x < crestX ? -14 : 6));
          }
          ctx.lineTo(W, H);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(220,240,255,0.75)'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (var cx = Math.max(0, crestX - 70); cx <= Math.min(W, crestX + 70); cx += 7) {
            ctx.lineTo(cx, baseY - 12 + Math.sin(cx / 12 + t * 16) * 5);
          }
          ctx.stroke();
          ctx.restore();
          if (p >= 1 && parts.length < 40) impactBurst(parts, o.to.x, o.to.y, 4, 200, 0.6, 2.6, '#cfeaff');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Hadēs — the soul tithe ─────────────────────────────────────────── */
    hades: function (o) {
      var parts = [];
      var d = dur(1.0);
      return {
        duration: d,
        shake: 5,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          // Wisps rise from the target toward the attacker — life leaving.
          if (parts.length < 34 && p < 0.85) {
            parts.push(P(o.to.x + jitter(36), o.to.y + 20, lerp(0, o.from.x - o.to.x, 0.9) + jitter(30), -60 - Math.random() * 90, 0.8, 3, 'rgba(150,230,170,0.85)'));
          }
          ctx.save();
          ctx.strokeStyle = 'rgba(120,220,150,0.5)'; ctx.lineWidth = 2;
          ctx.shadowColor = '#7ee2a0'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 10 + p * 34, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Apóllōn — the solar lance ──────────────────────────────────────── */
    'apollon': function (o) {
      var parts = [];
      var d = dur(0.7);
      return {
        duration: d,
        shake: 6,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.55)));
          var x = lerp(o.from.x, o.to.x, p), y = lerp(o.from.y, o.to.y, p);
          ctx.save();
          ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 5;
          ctx.shadowColor = '#ffd97a'; ctx.shadowBlur = 24;
          ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y); ctx.lineTo(x, y); ctx.stroke();
          ctx.restore();
          if (p >= 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,220,130,0.9)'; ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd97a'; ctx.shadowBlur = 20;
            for (var i = 0; i < 8; i++) {
              var a = (Math.PI * 2 * i) / 8 + t * 2;
              ctx.beginPath();
              ctx.moveTo(o.to.x + Math.cos(a) * 14, o.to.y + Math.sin(a) * 14);
              ctx.lineTo(o.to.x + Math.cos(a) * (30 + 16 * Math.sin(t * 8)), o.to.y + Math.sin(a) * (30 + 16 * Math.sin(t * 8)));
              ctx.stroke();
            }
            ctx.restore();
            if (parts.length < 24) impactBurst(parts, o.to.x, o.to.y, 2, 160, 0.5, 2, '#ffe9a8');
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Ártemis — the moon arrow ───────────────────────────────────────── */
    artemis: function (o) {
      var parts = [];
      var d = dur(0.75);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.6)));
          var pos = projectile(o, p, 0);
          ctx.save();
          ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 2.4;
          ctx.shadowColor = '#c9d8ff'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.4, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pos.x - 16, pos.y + 8); ctx.lineTo(pos.x, pos.y); ctx.stroke();
          // Crescent at the target on impact.
          if (p >= 1) {
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y - 6, 15, Math.PI * 0.25, Math.PI * 1.5); ctx.stroke();
            if (parts.length < 20) impactBurst(parts, o.to.x, o.to.y, 2, 120, 0.55, 2, '#dfe8ff');
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Athēnā — spear and aegis ───────────────────────────────────────── */
    'athena': function (o) {
      var parts = [];
      var d = dur(0.65);
      return {
        duration: d,
        shake: 6,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.5)));
          var x = lerp(o.from.x, o.to.x, p), y = lerp(o.from.y, o.to.y, p);
          ctx.save();
          ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 3.4;
          ctx.shadowColor = '#d4c58a'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y); ctx.lineTo(x, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y - 4); ctx.lineTo(x - 4, y - 12); ctx.closePath(); ctx.stroke();
          if (p >= 1) {
            ctx.strokeStyle = 'rgba(230,220,180,0.85)'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 18 + 10 * Math.sin(t * 6), 0, Math.PI * 2); ctx.stroke();
            if (parts.length < 18) impactBurst(parts, o.to.x, o.to.y, 2, 150, 0.4, 2, '#e8e0c8');
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Arēs — the crimson flurry ──────────────────────────────────────── */
    'ares': function (o) {
      var parts = [];
      var d = dur(0.7);
      return {
        duration: d,
        shake: 8,
        update: function (t, ctx) {
          ctx.save();
          ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 4;
          ctx.shadowColor = '#ff2a1a'; ctx.shadowBlur = 14;
          for (var i = 0; i < 3; i++) {
            var start = i * 0.18;
            var p = Math.min(1, Math.max(0, (t - start) / 0.22));
            if (p <= 0) continue;
            var ang = -0.7 + i * 0.7;
            var r = 14 + p * 58;
            ctx.beginPath();
            ctx.arc(o.to.x, o.to.y, r, ang, ang + 0.7 * p);
            ctx.stroke();
          }
          ctx.restore();
          if (t > 0.3 && parts.length < 34) impactBurst(parts, o.to.x + jitter(30), o.to.y + jitter(24), 3, 170, 0.5, 2.2, '#ff8a7a');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Níkē — the winged rush ─────────────────────────────────────────── */
    'nike': function (o) {
      var parts = [];
      var d = dur(0.7);
      return {
        duration: d,
        shake: 5,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.6)));
          var x = lerp(o.from.x, o.to.x, p), y = lerp(o.from.y, o.to.y, p);
          ctx.save();
          ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 3;
          ctx.shadowColor = '#ffd97a'; ctx.shadowBlur = 16;
          for (var w = 0; w < 2; w++) {
            var off = (w === 0 ? -1 : 1) * (10 + p * 22);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x - off * 0.4, y - 26, x + off, y - 34);
            ctx.stroke();
          }
          ctx.restore();
          if (p >= 1 && parts.length < 26) impactBurst(parts, o.to.x, o.to.y, 3, 190, 0.6, 2.2, '#ffe9b0', 'feather');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Hermês — the afterimage dash ───────────────────────────────────── */
    'hermes': function (o) {
      var parts = [];
      var d = dur(0.55);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.55)));
          ctx.save();
          ctx.strokeStyle = '#b8e6ff'; ctx.lineWidth = 3;
          ctx.shadowColor = '#8ad0ff'; ctx.shadowBlur = 12;
          for (var g = 0; g < 3; g++) {
            var gp = Math.max(0, p - g * 0.14);
            if (gp <= 0) continue;
            ctx.globalAlpha = 0.9 - g * 0.3;
            var x = lerp(o.from.x, o.to.x, gp), y = lerp(o.from.y, o.to.y, gp);
            ctx.beginPath(); ctx.moveTo(x - 18, y + 6); ctx.lineTo(x + 10, y - 6); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + 10, y - 6, 3, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
          if (p >= 1 && parts.length < 20) impactBurst(parts, o.to.x, o.to.y, 2, 150, 0.45, 2, '#b8e6ff');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Hēphaistos — the forge slam ────────────────────────────────────── */
    'hephaistos': function (o) {
      var parts = [];
      var d = dur(0.8);
      return {
        duration: d,
        shake: 10,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.5)));
          ctx.save();
          // The hammer falls, then the anvil rings.
          var hx = lerp(o.from.x, o.to.x, p), hy = lerp(o.from.y - 60, o.to.y, p * p);
          ctx.fillStyle = '#c9ccd6';
          ctx.shadowColor = '#ffb060'; ctx.shadowBlur = 12;
          ctx.fillRect(hx - 12, hy - 8, 24, 14);
          ctx.fillRect(hx - 2, hy + 6, 4, 16);
          if (p >= 1) {
            ctx.strokeStyle = 'rgba(255,170,80,0.9)'; ctx.lineWidth = 3;
            var rr = (t - d * 0.5) * 260;
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y, rr, 0, Math.PI * 2); ctx.stroke();
            if (parts.length < 36) impactBurst(parts, o.to.x, o.to.y - 6, 4, 230, 0.7, 2.4, '#ffb060', 'ember');
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Aphrodítē — the rose charm ─────────────────────────────────────── */
    'aphrodite': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 2,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          if (parts.length < 40 && p < 0.8) {
            var a = t * 5 + parts.length;
            parts.push(P(o.from.x + Math.cos(a) * 20, o.from.y + Math.sin(a) * 14, (o.to.x - o.from.x) * 0.9, (o.to.y - o.from.y) * 0.9 + jitter(30), 0.7, 3.2, '#ff9dc0', 'petal'));
          }
          if (p > 0.6) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,150,190,0.9)';
            ctx.shadowColor = '#ff8ab0'; ctx.shadowBlur = 12;
            var s = 8 + 4 * Math.sin(t * 7);
            ctx.beginPath();
            ctx.moveTo(o.to.x, o.to.y + s * 0.8);
            ctx.bezierCurveTo(o.to.x - s * 1.6, o.to.y - s * 0.4, o.to.x - s * 0.5, o.to.y - s * 1.4, o.to.x, o.to.y - s * 0.4);
            ctx.bezierCurveTo(o.to.x + s * 0.5, o.to.y - s * 1.4, o.to.x + s * 1.6, o.to.y - s * 0.4, o.to.x, o.to.y + s * 0.8);
            ctx.fill();
            ctx.restore();
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Dēmēter — the harvest tide ─────────────────────────────────────── */
    'demeter': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 3,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.7)));
          ctx.save();
          ctx.strokeStyle = '#e8c85a'; ctx.lineWidth = 2.2;
          ctx.shadowColor = '#d4af37'; ctx.shadowBlur = 8;
          // Wheat rises along the path.
          for (var i = 0; i < 7; i++) {
            var wp = Math.max(0, Math.min(1, p * 1.4 - i * 0.08));
            if (wp <= 0) continue;
            var x = lerp(o.from.x, o.to.x, i / 6);
            var y = lerp(o.from.y, o.to.y, i / 6);
            var h = 26 * wp;
            ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y + 14 - h); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(x, y + 12 - h, 3.4, 6 * wp, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
          if (p >= 1 && parts.length < 24) impactBurst(parts, o.to.x, o.to.y, 3, 130, 0.6, 2.4, '#e8c85a', 'petal');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Diónysos — the revel ───────────────────────────────────────────── */
    'dionysos': function (o) {
      var parts = [];
      var d = dur(0.85);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          ctx.save();
          ctx.strokeStyle = '#c98ae8'; ctx.lineWidth = 2.6;
          ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12;
          // Vines crawl to the target, then the revel pops.
          var vp = easeOut(Math.min(1, p * 1.5));
          var x = lerp(o.from.x, o.to.x, vp), y = lerp(o.from.y, o.to.y, vp);
          ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y);
          ctx.quadraticCurveTo((o.from.x + o.to.x) / 2 + Math.sin(t * 6) * 22, (o.from.y + o.to.y) / 2 + Math.cos(t * 5) * 18, x, y);
          ctx.stroke();
          if (p > 0.62 && parts.length < 34) {
            parts.push(P(o.to.x + jitter(44), o.to.y + 12, jitter(40), -70 - Math.random() * 90, 0.7, 3, '#e0b0ff'));
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Óðinn — ravens and Gungnir ─────────────────────────────────────── */
    'odinn': function (o) {
      var parts = [];
      var d = dur(0.85);
      return {
        duration: d,
        shake: 6,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.6)));
          ctx.save();
          // Twin ravens carve dark arcs.
          ctx.strokeStyle = '#3a3f52'; ctx.lineWidth = 3.4;
          for (var r = 0; r < 2; r++) {
            var rp = Math.max(0, Math.min(1, p - r * 0.16));
            if (rp <= 0) continue;
            var pos = projectile(o, rp, (r === 0 ? -60 : 60));
            ctx.beginPath(); ctx.moveTo(pos.x - 12, pos.y);
            ctx.quadraticCurveTo(pos.x, pos.y - 10, pos.x + 12, pos.y);
            ctx.stroke();
          }
          // Gungnir: the unerring blue spear.
          if (p > 0.4) {
            var sp = Math.min(1, (p - 0.4) / 0.35);
            var x = lerp(o.from.x, o.to.x, sp), y = lerp(o.from.y, o.to.y, sp);
            ctx.strokeStyle = '#9fc8ff'; ctx.lineWidth = 3;
            ctx.shadowColor = '#7ab0ff'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y); ctx.lineTo(x, y); ctx.stroke();
          }
          ctx.restore();
          if (p >= 1 && parts.length < 22) impactBurst(parts, o.to.x, o.to.y, 3, 160, 0.5, 2.2, '#9fc8ff', 'feather');
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Þórr — Mjölnir's answer ────────────────────────────────────────── */
    'thor': function (o) {
      var parts = [];
      var d = dur(0.8);
      return {
        duration: d,
        shake: 10,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.5)));
          ctx.save();
          var hx = lerp(o.from.x, o.to.x, p), hy = lerp(o.from.y - 50, o.to.y, p * p);
          ctx.fillStyle = '#aeb6c6';
          ctx.shadowColor = '#bcd6ff'; ctx.shadowBlur = 14;
          ctx.fillRect(hx - 10, hy - 10, 20, 16);
          if (p >= 1) {
            ctx.strokeStyle = '#eaf4ff'; ctx.lineWidth = 3;
            boltPath(ctx, o.to.x, o.to.y - 90, o.to.x, o.to.y, 26);
            var rr = (t - d * 0.5) * 300;
            ctx.strokeStyle = 'rgba(190,215,255,0.8)'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y, rr, 0, Math.PI * 2); ctx.stroke();
            if (parts.length < 34) impactBurst(parts, o.to.x, o.to.y, 4, 240, 0.6, 2.4, '#cfe2ff');
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Loki — the kind lie ────────────────────────────────────────────── */

    /* ── Hel — the creeping chill ───────────────────────────────────────── */
    helheimr: function (o) {
      var parts = [];
      var d = dur(1.0);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          ctx.save();
          // Frost creeps from the target outward.
          ctx.strokeStyle = 'rgba(180,220,255,0.85)'; ctx.lineWidth = 2;
          ctx.shadowColor = '#a8d0ff'; ctx.shadowBlur = 10;
          for (var i = 0; i < 6; i++) {
            var a = (Math.PI * 2 * i) / 6;
            var len = 34 * easeOut(p);
            ctx.beginPath();
            ctx.moveTo(o.to.x, o.to.y);
            ctx.lineTo(o.to.x + Math.cos(a) * len, o.to.y + Math.sin(a) * len);
            ctx.moveTo(o.to.x + Math.cos(a) * len * 0.6, o.to.y + Math.sin(a) * len * 0.6);
            ctx.lineTo(o.to.x + Math.cos(a + 0.5) * len * 0.85, o.to.y + Math.sin(a + 0.5) * len * 0.85);
            ctx.stroke();
          }
          ctx.restore();
          if (parts.length < 26) parts.push(P(o.to.x + jitter(50), o.to.y + 16, jitter(16), -14 - Math.random() * 20, 1.1, 2.4, '#d0e8ff'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Rā — the zenith beam ───────────────────────────────────────────── */
    'ra': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 7,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / d);
          ctx.save();
          // The sun disk descends, then speaks.
          var dy = lerp(-40, o.to.y - 120, easeOut(Math.min(1, p * 1.6)));
          ctx.fillStyle = '#ffd97a';
          ctx.shadowColor = '#ffb840'; ctx.shadowBlur = 26;
          ctx.beginPath(); ctx.arc(o.to.x, dy, 16, 0, Math.PI * 2); ctx.fill();
          if (p > 0.5) {
            var bp = (p - 0.5) / 0.5;
            ctx.fillStyle = 'rgba(255,215,120,' + 0.4 * bp + ')';
            ctx.beginPath();
            ctx.moveTo(o.to.x - 14, dy);
            ctx.lineTo(o.to.x + 14, dy);
            ctx.lineTo(o.to.x + 30 * bp, o.to.y + 40);
            ctx.lineTo(o.to.x - 30 * bp, o.to.y + 40);
            ctx.closePath(); ctx.fill();
            if (parts.length < 26) impactBurst(parts, o.to.x, o.to.y, 2, 170, 0.5, 2.2, '#ffe0a0', 'ember');
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Anūbis — the weighing ──────────────────────────────────────────── */
    'anubis': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx) {
          var p = Math.min(1, t / d);
          ctx.save();
          ctx.strokeStyle = '#d8c890'; ctx.lineWidth = 2.4;
          ctx.shadowColor = '#c8b060'; ctx.shadowBlur = 10;
          // The scales tip, the feather falls.
          var tip = Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) * 0.24;
          ctx.beginPath(); ctx.moveTo(o.to.x, o.to.y - 34); ctx.lineTo(o.to.x, o.to.y + 6); ctx.stroke();
          ctx.save();
          ctx.translate(o.to.x, o.to.y - 34); ctx.rotate(tip);
          ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26, 12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(26, 12); ctx.stroke();
          ctx.restore();
          ctx.restore();
          if (p > 0.5 && parts.length < 10) parts.push(P(o.to.x + 26, o.to.y - 22, -8, 16, 1.4, 3.4, '#f0e6c0', 'feather'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Amaterasu — the risen sun ──────────────────────────────────────── */

    /* ── Susanoo — the storm kata ───────────────────────────────────────── */

    /* ── Gaṅgā — the river remembers ────────────────────────────────────── */
    'ganga': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 4,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / d);
          ctx.save();
          ctx.strokeStyle = 'rgba(150,210,255,0.8)'; ctx.lineWidth = 3;
          ctx.shadowColor = '#8ac8ff'; ctx.shadowBlur = 10;
          for (var w = 0; w < 3; w++) {
            ctx.globalAlpha = 0.85 - w * 0.25;
            ctx.beginPath();
            for (var x = 0; x <= W; x += 10) {
              var yy = o.to.y + w * 12 + Math.sin(x / 40 + t * 5 + w) * 8 * p;
              if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
            }
            ctx.stroke();
          }
          ctx.restore();
          if (parts.length < 24) parts.push(P(o.to.x + jitter(70), o.to.y + 8, jitter(50), -50 - Math.random() * 60, 0.6, 2.4, '#bfe0ff'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Sarasvatī — the veena chord ────────────────────────────────────── */
    'saraswati': function (o) {
      var parts = [];
      var d = dur(0.85);
      return {
        duration: d,
        shake: 2,
        update: function (t, ctx) {
          ctx.save();
          ctx.strokeStyle = '#f0e0b8'; ctx.lineWidth = 2;
          ctx.shadowColor = '#e8d090'; ctx.shadowBlur = 10;
          for (var i = 0; i < 4; i++) {
            var r = (t * 180 + i * 52) % 208;
            ctx.globalAlpha = Math.max(0, 1 - r / 208);
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y, r, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
          if (parts.length < 16) parts.push(P(o.to.x + jitter(46), o.to.y - 8, jitter(24), -30 - Math.random() * 30, 0.9, 7, '#f0e0b8', 'note'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    /* ── Guānyīn — the mercy ────────────────────────────────────────────── */
    'guanyin': function (o) {
      var parts = [];
      var d = dur(0.9);
      return {
        duration: d,
        shake: 2,
        update: function (t, ctx) {
          var p = easeOut(Math.min(1, t / (d * 0.8)));
          ctx.save();
          ctx.fillStyle = 'rgba(240,250,255,0.9)';
          ctx.shadowColor = '#cfe8ff'; ctx.shadowBlur = 16;
          // A lotus opens at the target.
          for (var i = 0; i < 6; i++) {
            var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            ctx.beginPath();
            ctx.ellipse(o.to.x + Math.cos(a) * 10 * p, o.to.y + Math.sin(a) * 10 * p, 5 * p, 11 * p, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          if (parts.length < 18) parts.push(P(o.to.x + jitter(40), o.to.y + 10, jitter(16), -22 - Math.random() * 22, 1.0, 2.6, '#e8f4ff', 'petal'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },
  };

  var count = 0;
  for (var id in MOVES) {
    if (Object.prototype.hasOwnProperty.call(MOVES, id)) {
      Sequences.registerSignature(id, MOVES[id]);
      count++;
    }
  }
  return { count: count, ids: Object.keys(MOVES) };
});
