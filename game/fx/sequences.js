/**
 * Mythic Duel v2 — attack-sequence engine ("The Spectacle Layer")
 *
 * A canvas overlay that plays parameterized attack sequences for the 14
 * archetypes (docs/mythic-duel-v2-design.md §3.1). The rules engine stays
 * the authority; this layer only watches state transitions and paints.
 *
 * Usage:
 *   const seq = Sequences.attach(canvasEl);
 *   seq.attack({ archetype, from: {x,y}, to: {x,y}, colors, power, onImpact })
 *   seq.floatText({ x, y, text, kind: 'damage'|'heal'|'ink' })
 *   seq.shake(weight)
 *   seq.banner(text, sub?)
 *
 * Everything self-expires; the rAF loop runs only while effects are live
 * (plus a short tail). Honors prefers-reduced-motion (sequences become
 * instant flashes).
 */
(function (root, factory) {
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  root.Sequences = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  // ── Archetype assignment (deterministic: pantheon + domain keywords) ────
  var ARCHETYPE_BY_PANTHEON = {
    greek: 'bolt', norse: 'storm', egyptian: 'radiance', mesopotamian: 'quake',
    sanskrit: 'song', japanese: 'gale', chinese: 'bloom', taoist: 'bloom',
    yoruba: 'storm', nahuatl: 'flame', roman: 'warhorn', buddhist: 'song',
    zoroastrian: 'radiance', abrahamic: 'veil', polynesian: 'flood',
    celtic: 'veil', slavic: 'bolt', baltic: 'bolt', canaanite: 'storm',
    phoenician: 'gale',
  };
  var ARCHETYPE_BY_DOMAIN = [
    [/sea|ocean|water|river|flood|rain/i, 'flood'],
    [/fire|flame|forge|sun|ember/i, 'flame'],
    [/death|underworld|shadow|night|dark|void|afterlife/i, 'shadow'],
    [/war|battle|sword|blade|warrior|courage/i, 'blade'],
    [/thunder|lightning|storm|sky|wind/i, 'bolt'],
    [/earth|mountain|quake|stone|land/i, 'quake'],
    [/nature|harvest|forest|growth|fertility|spring/i, 'bloom'],
    [/music|song|poetry|art|word|voice|wisdom|knowledge|speech/i, 'song'],
    [/disease|decay|plague|rot|serpent|chaos/i, 'decay'],
    [/light|dawn|day|truth|order|law|sun/i, 'radiance'],
    [/magic|mystery|moon|crossroads|mist|dream|fate|sleep/i, 'veil'],
    [/army|shield|protect|guard|honor/i, 'warhorn'],
  ];
  function archetypeFor(card) {
    var domain = String((card && card.domain) || '').toLowerCase();
    for (var i = 0; i < ARCHETYPE_BY_DOMAIN.length; i++) {
      if (ARCHETYPE_BY_DOMAIN[i][0].test(domain)) return ARCHETYPE_BY_DOMAIN[i][1];
    }
    return ARCHETYPE_BY_PANTHEON[(card && card.pantheon) || ''] || 'warhorn';
  }

  // ── Particle primitives ──────────────────────────────────────────────────
  function P(x, y, vx, vy, life, size, color, kind) {
    return { x: x, y: y, vx: vx || 0, vy: vy || 0, life: life, maxLife: life, size: size, color: color, kind: kind || 'dot', rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.2 };
  }
  function step(parts, dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vrot * dt;
      if (p.kind === 'ember' || p.kind === 'ash') p.vy += 240 * dt;
      if (p.kind === 'petal') { p.vy -= 12 * dt; p.vx *= 0.99; }
    }
  }
  function drawParts(ctx, parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'feather') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.quadraticCurveTo(0, -p.size * 0.6, p.size, 0); ctx.quadraticCurveTo(0, p.size * 0.6, -p.size, 0); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'note') {
        ctx.font = p.size * 2.2 + 'px serif';
        ctx.fillText('♪', p.x, p.y);
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function jitter(n) { return (Math.random() - 0.5) * n; }

  // Each builder returns { duration, shake, update(t, ctx, W, H, parts) }
  var BUILDERS = {
    bolt: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.25 : 0.7;
      return {
        duration: dur, shake: 6 + Math.min(6, o.power / 12),
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / dur));
          var x = lerp(o.from.x, o.to.x, p), y = lerp(o.from.y, o.to.y, p);
          if (t > dur * 0.25) {
            for (var b = 0; b < 2; b++) {
              var steps = 9;
              ctx.save();
              ctx.strokeStyle = b === 0 ? '#cfe6ff' : '#8ab4ff';
              ctx.lineWidth = b === 0 ? 3 : 1.2;
              ctx.shadowColor = '#bcd6ff'; ctx.shadowBlur = 14;
              ctx.beginPath();
              ctx.moveTo(x, o.from.y);
              var px = x, py = o.from.y;
              for (var s = 1; s <= steps; s++) {
                var ny = o.from.y + (y - o.from.y) * (s / steps);
                var nx = x + jitter(26 * (1 - s / (steps + 1)) + 6);
                ctx.lineTo(nx, ny); px = nx; py = ny;
              }
              ctx.lineTo(o.to.x, o.to.y);
              ctx.stroke();
              ctx.restore();
            }
          }
          if (t > dur * 0.55 && parts.length < 26) {
            parts.push(P(o.to.x, o.to.y, jitter(220), jitter(220), 0.4, 2.5, '#e8f2ff', 'dot'));
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    blade: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.25 : 0.55;
      return {
        duration: dur, shake: 4 + Math.min(4, o.power / 16),
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / dur));
          ctx.save();
          ctx.translate(o.to.x, o.to.y);
          ctx.rotate(-0.9 + p * 1.8);
          var r = 20 + p * 66;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.shadowColor = o.colors.glow || '#ffd97a'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(0, 0, r, -0.4, 0.7);
          ctx.stroke();
          ctx.restore();
          if (t > dur * 0.6 && parts.length < 14) {
            parts.push(P(o.to.x + jitter(50), o.to.y + jitter(30), jitter(60), -60 - Math.random() * 80, 0.5, 2, '#ffe9b0', 'dot'));
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    flood: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.85;
      return {
        duration: dur, shake: 3,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.fillStyle = 'rgba(64,140,220,0.35)';
          ctx.beginPath();
          var baseY = o.to.y + 46 - p * 60;
          ctx.moveTo(0, H);
          ctx.lineTo(0, baseY);
          for (var x = 0; x <= W; x += 8) {
            ctx.lineTo(x, baseY + Math.sin(x / 34 + t * 14) * 9 * p);
          }
          ctx.lineTo(W, H);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          if (parts.length < 30) parts.push(P(o.to.x + jitter(70), baseY, jitter(90), -80 - Math.random() * 120, 0.6, 2.5, '#bfe4ff', 'dot'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    flame: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.75;
      return {
        duration: dur, shake: 5 + Math.min(5, o.power / 14),
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / (dur * 0.7)));
          var x = lerp(o.from.x, o.to.x, p), y = lerp(o.from.y, o.to.y, p);
          parts.push(P(x + jitter(8), y + jitter(8), jitter(30), -20 - Math.random() * 40, 0.5, 3 + Math.random() * 3, p < 1 ? '#ff9d3c' : '#ff5722', 'ember'));
          if (p >= 1 && parts.length < 46) {
            for (var i = 0; i < 3; i++) parts.push(P(o.to.x, o.to.y, jitter(320), -Math.random() * 260, 0.55, 3.5, '#ffb14e', 'ember'));
          }
          ctx.save();
          ctx.fillStyle = '#ff7a1a'; ctx.shadowColor = '#ffb14e'; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(x, y, 7 + p * 3, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    shadow: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.85;
      return {
        duration: dur, shake: 3,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.strokeStyle = 'rgba(120,80,180,0.5)'; ctx.lineWidth = 3;
          for (var i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(o.from.x, o.from.y);
            ctx.quadraticCurveTo(
              lerp(o.from.x, o.to.x, 0.5) + Math.sin(t * 10 + i * 2) * 26,
              lerp(o.from.y, o.to.y, 0.5) + Math.cos(t * 8 + i * 2) * 20,
              o.from.x + (o.to.x - o.from.x) * Math.min(1, p * 1.2),
              o.from.y + (o.to.y - o.from.y) * Math.min(1, p * 1.2)
            );
            ctx.stroke();
          }
          ctx.restore();
          if (p > 0.5 && parts.length < 22) {
            parts.push(P(o.to.x + jitter(40), o.to.y + jitter(26), (o.from.x - o.to.x) * 0.6 + jitter(40), (o.from.y - o.to.y) * 0.6 + jitter(40), 0.6, 2.5, '#b48cff', 'dot'));
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    bloom: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.8;
      return {
        duration: dur, shake: 1,
        update: function (t, ctx, W, H) {
          if (parts.length < 24) {
            parts.push(P(o.to.x + jitter(56), o.to.y + 20, jitter(46), -40 - Math.random() * 60, 1.2, 4, ['#ffd1e8', '#ffe9a8', '#b8ffb8'][parts.length % 3], 'petal'));
          }
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.strokeStyle = 'rgba(140,230,160,0.6)'; ctx.lineWidth = 2;
          for (var i = 0; i < 3; i++) {
            ctx.globalAlpha = Math.max(0, 1 - p) * 0.8;
            ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 8 + (((p * 60 + i * 16) % 84) + 84) % 84, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    storm: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.9;
      for (var i = 0; i < 30; i++) parts.push(P(o.to.x, o.to.y, 0, 0, 0.9, 2.5, '#cfe0ff', 'dot'));
      return {
        duration: dur, shake: 4,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / dur);
          for (var i = 0; i < parts.length; i++) {
            var a = (i / parts.length) * Math.PI * 2 + t * 10;
            var r = (12 + i * 2.2) * (0.6 + p * 0.6);
            parts[i].x = o.to.x + Math.cos(a) * r;
            parts[i].y = o.to.y + Math.sin(a) * r * 0.55 - p * 26;
            parts[i].life = parts[i].maxLife;
          }
          drawParts(ctx, parts);
        },
      };
    },

    decay: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.8;
      return {
        duration: dur, shake: 2,
        update: function (t, ctx, W, H) {
          if (parts.length < 26) parts.push(P(o.to.x + jitter(56), o.to.y - 20 + jitter(16), jitter(24), 40 + Math.random() * 90, 0.8, 2.5, '#9aa39b', 'ash'));
          step(parts, 1 / 60); drawParts(ctx, parts);
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.fillStyle = 'rgba(90,96,90,' + 0.22 * Math.sin(p * Math.PI) + ')';
          ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 34 + p * 12, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        },
      };
    },

    radiance: function (o) {
      var dur = REDUCED ? 0.25 : 0.6;
      return {
        duration: dur, shake: 3,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / dur);
          ctx.save();
          var g = ctx.createLinearGradient(o.from.x, o.from.y, o.to.x, o.to.y);
          g.addColorStop(0, 'rgba(255,240,190,0)');
          g.addColorStop(Math.max(0, p - 0.25), 'rgba(255,236,170,0.9)');
          g.addColorStop(Math.min(1, p + 0.05), 'rgba(255,240,190,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 7;
          ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 22;
          ctx.beginPath(); ctx.moveTo(o.from.x, o.from.y); ctx.lineTo(o.to.x, o.to.y); ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(255,240,190,' + (0.8 * (1 - p)) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 12 + p * 46, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        },
      };
    },

    song: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.85;
      return {
        duration: dur, shake: 1,
        update: function (t, ctx, W, H) {
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.strokeStyle = 'rgba(212,175,55,' + (0.7 * (1 - p)) + ')'; ctx.lineWidth = 2;
          for (var i = 0; i < 3; i++) {
            var r = (((t * 220 + i * 46) % 160) + 160) % 160;
            ctx.globalAlpha = Math.max(0, 1 - r / 160);
            ctx.beginPath(); ctx.arc(o.from.x, o.from.y, r, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
          if (parts.length < 14) parts.push(P(o.from.x + jitter(30), o.from.y - 10, jitter(50), -60 - Math.random() * 60, 0.9, 8, '#ffd97a', 'note'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    quake: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.8;
      return {
        duration: dur, shake: 8,
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / (dur * 0.6)));
          ctx.save();
          ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(o.to.x - 90 * p, o.to.y + 44);
          ctx.lineTo(o.to.x - 30 * p, o.to.y + 52);
          ctx.lineTo(o.to.x + 8 * p, o.to.y + 40);
          ctx.lineTo(o.to.x + 90 * p, o.to.y + 50);
          ctx.stroke();
          ctx.restore();
          if (parts.length < 24) parts.push(P(o.to.x + jitter(80), o.to.y + 44, jitter(160), -80 - Math.random() * 180, 0.7, 3, '#b09060', 'ember'));
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    gale: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.7;
      return {
        duration: dur, shake: 2,
        update: function (t, ctx, W, H) {
          if (parts.length < 20) {
            parts.push(P(o.from.x + jitter(20), o.from.y + jitter(30), (o.to.x - o.from.x) * 1.6 + jitter(60), (o.to.y - o.from.y) * 1.6 + jitter(60), 0.6, 6, '#e8f4ff', 'feather'));
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
        },
      };
    },

    veil: function (o) {
      var parts = [];
      var dur = REDUCED ? 0.3 : 0.9;
      return {
        duration: dur, shake: 2,
        update: function (t, ctx, W, H) {
          if (parts.length < 24) {
            var a = Math.random() * Math.PI * 2;
            parts.push(P(o.to.x + Math.cos(a) * 44, o.to.y + Math.sin(a) * 44, -Math.cos(a) * 44 + jitter(16), -Math.sin(a) * 44 + jitter(16), 0.8, 3, 'rgba(180,160,220,0.7)', 'dot'));
          }
          step(parts, 1 / 60); drawParts(ctx, parts);
          var p = Math.min(1, t / dur);
          ctx.save();
          ctx.fillStyle = 'rgba(120,100,170,' + 0.2 * Math.sin(p * Math.PI) + ')';
          ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 30 + p * 16, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        },
      };
    },

    warhorn: function (o) {
      var dur = REDUCED ? 0.25 : 0.6;
      return {
        duration: dur, shake: 5,
        update: function (t, ctx, W, H) {
          var p = easeOut(Math.min(1, t / dur));
          ctx.save();
          ctx.translate(o.to.x, o.to.y);
          ctx.fillStyle = o.colors.primary || '#D4AF37';
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(-30 - p * 8, -34); ctx.lineTo(4 + p * 26, -20); ctx.lineTo(-30 - p * 8, -6);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(o.to.x, o.to.y, 14 + p * 60, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        },
      };
    },
  };

  // ── The engine ───────────────────────────────────────────────────────────
  function attach(canvas) {
    var ctx = canvas.getContext('2d');
    var live = [];      // active sequences
    var floats = [];    // floating texts
    var shakeAmt = 0;
    var bannerState = null;
    var raf = null;
    var lastT = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
    }

    function loop(t) {
      resize();
      var dt = Math.max(0, Math.min(0.05, (t - lastT) / 1000 || 0.016));
      lastT = t;
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      if (shakeAmt > 0.2) {
        ctx.translate(jitter(shakeAmt), jitter(shakeAmt));
        shakeAmt *= 0.86;
      } else {
        shakeAmt = 0;
      }

      for (var i = live.length - 1; i >= 0; i--) {
        var s = live[i];
        s.t += dt;
        if (s.t >= s.duration) {
          if (!s.impacted) { s.impacted = true; if (s.onImpact) s.onImpact(); }
          if (s.t >= s.duration + 0.35) { live.splice(i, 1); continue; }
        }
        s.update(s.t, ctx, W, H);
      }

      // Floating texts
      ctx.textAlign = 'center';
      for (var f = floats.length - 1; f >= 0; f--) {
        var fl = floats[f];
        fl.life -= dt;
        if (fl.life <= 0) { floats.splice(f, 1); continue; }
        var fp = 1 - fl.life / fl.maxLife;
        ctx.globalAlpha = Math.min(1, fl.life * 2.4);
        ctx.font = '700 ' + fl.size + 'px Cinzel, serif';
        ctx.fillStyle = fl.color;
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
        ctx.fillText(fl.text, fl.x, fl.y - fp * 46);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Turn banner
      if (bannerState) {
        bannerState.life -= dt;
        var bp = Math.min(1, bannerState.life / bannerState.maxLife);
        if (bannerState.life <= 0) bannerState = null;
        else {
          var ba = Math.min(1, bannerState.life * 2.2);
          ctx.globalAlpha = ba;
          ctx.fillStyle = 'rgba(8,8,12,0.72)';
          ctx.fillRect(0, H * 0.4 - 44, W, 88);
          ctx.font = '700 30px Cinzel, serif';
          ctx.fillStyle = '#D4AF37';
          ctx.fillText(bannerState.text, W / 2, H * 0.4 + 4);
          if (bannerState.sub) {
            ctx.font = '15px Spectral, serif';
            ctx.fillStyle = '#E8E4DC';
            ctx.fillText(bannerState.sub, W / 2, H * 0.4 + 30);
          }
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();

      if (live.length || floats.length || bannerState || shakeAmt > 0) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
        ctx.clearRect(0, 0, W, H);
      }
    }

    function wake() {
      if (!raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }

    return {
      archetypeFor: archetypeFor,
      attack: function (opts) {
        var builder = BUILDERS[opts.archetype] || BUILDERS.warhorn;
        var seq = builder(opts);
        seq.t = 0;
        seq.onImpact = opts.onImpact;
        live.push(seq);
        shakeAmt = Math.max(shakeAmt, seq.shake || 0);
        wake();
        return seq;
      },
      floatText: function (opts) {
        floats.push({
          x: opts.x, y: opts.y,
          text: opts.text,
          color: opts.kind === 'heal' ? '#7ee2a0' : opts.kind === 'ink' ? '#ffd97a' : '#ff9d8a',
          size: opts.size || 22,
          life: 1.1, maxLife: 1.1,
        });
        wake();
      },
      shake: function (w) {
        shakeAmt = Math.max(shakeAmt, w || 4);
        wake();
      },
      banner: function (text, sub) {
        bannerState = { text: text, sub: sub, life: 1.5, maxLife: 1.5 };
        wake();
      },
      stop: function () {
        live = []; floats = []; bannerState = null; shakeAmt = 0;
      },
    };
  }

  return { attach: attach, archetypeFor: archetypeFor };
});
