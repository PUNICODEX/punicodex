#!/usr/bin/env node
/**
 * PuniCodex — Bespoke hero-effect generator for the 2026-11 ascii-restoration batch.
 *
 * Emits one self-contained canvas IIFE per entry into templates/flagship/effects/{id}.js
 * and registers { canvasId } in effects.json. Each entry's SCENE is bespoke — its own
 * modules, palette roles, silhouette, and motion parameters — composed from shared,
 * battle-tested plumbing (DPR resize, rAF loop, reduced-motion static frame, pointer
 * parallax, visibility pause). Regenerate idempotently: specs are the source of truth.
 *
 * Usage: node scripts/generate-ascii-effects.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EFFECTS_DIR = path.join(ROOT, 'templates', 'flagship', 'effects');
const REGISTRY_PATH = path.join(EFFECTS_DIR, 'effects.json');

/* ─── Scene module catalogue ─────────────────────────────────────────────
   Each module is an { init(ctx2d, W, H, env), draw(t, dt) } factory written
   into the emitted file. `env` carries palette rgb objects and helpers.    */

// Modules referenced by the SPECS table below. Keyed snippets get emitted
// only when used, so every file stays lean.
const MODULES = {
  waves: `
    function makeWaves(env, o) {
      const layers = o.layers || 3;
      return {
        draw(t) {
          for (let l = 0; l < layers; l++) {
            const y0 = H * (o.base + l * 0.08);
            const amp = (o.amp || 14) * (1 - l * 0.22);
            const speed = (o.speed || 0.0006) * (1 + l * 0.5);
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 6) {
              const y = y0 + Math.sin(x * 0.008 + t * speed * (l % 2 ? -1 : 1) + l * 2.1) * amp
                + Math.sin(x * 0.021 - t * speed * 1.7) * amp * 0.4;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fillStyle = rgba(env.water, 0.10 + l * 0.05);
            ctx.fill();
          }
        }
      };
    }`,
  surge: `
    function makeSurge(env, o) {
      let crest = [];
      return {
        draw(t, dt) {
          const cycle = (t * (o.rate || 0.00006)) % 1;
          const rise = Math.sin(cycle * Math.PI);
          if (Math.random() < rise * 0.35) crest.push({ x: Math.random() * W, y: H * (0.55 + Math.random() * 0.3), vy: 0.2 + Math.random() * 0.5, a: 0.5 });
          ctx.fillStyle = rgba(env.water, 0.06 * rise);
          ctx.fillRect(0, H * (1 - rise * (o.height || 0.45)), W, H);
          crest = crest.filter(c => c.a > 0);
          for (const c of crest) {
            c.y -= c.vy; c.a -= 0.004;
            ctx.fillStyle = rgba(env.foam, c.a * rise);
            ctx.fillRect(c.x, c.y, 2.5, 2.5);
          }
        }
      };
    }`,
  rain: `
    function makeRain(env, o) {
      const drops = [];
      const N = o.count || 90;
      for (let i = 0; i < N; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, v: (o.speed || 1.4) * (0.6 + Math.random() * 0.8), s: o.size || 2, drift: (Math.random() - 0.5) * (o.drift || 0.4) });
      return {
        draw(t) {
          ctx.save();
          if (o.shape === 'seed') { ctx.translate(0, 0); }
          for (const d of drops) {
            d.y += d.v; d.x += d.drift + (o.sway ? Math.sin(t * 0.001 + d.y * 0.02) * 0.4 : 0);
            if (d.y > H + 8) { d.y = -8; d.x = Math.random() * W; }
            if (d.x > W + 8) d.x = -8; if (d.x < -8) d.x = W + 8;
            if (o.shape === 'seed') {
              ctx.fillStyle = rgba(env.gold, 0.55);
              ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s * 0.7, d.s * 1.3, Math.sin(t * 0.002 + d.x) * 0.5, 0, Math.PI * 2); ctx.fill();
            } else if (o.shape === 'petal') {
              ctx.fillStyle = rgba(env.accent, 0.5);
              ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s, d.s * 0.6, t * 0.003 + d.x, 0, Math.PI * 2); ctx.fill();
            } else {
              ctx.strokeStyle = rgba(env.accent, 0.4);
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.drift * 3, d.y - d.s * 3); ctx.stroke();
            }
          }
          ctx.restore();
        }
      };
    }`,
  sparks: `
    function makeSparks(env, o) {
      const N = o.count || 120;
      const ps = [];
      for (let i = 0; i < N; i++) ps.push(spawn());
      function spawn() {
        return { x: Math.random() * W, y: H * (o.from === 'base' ? 0.9 + Math.random() * 0.1 : Math.random()), vy: -(0.3 + Math.random() * (o.speed || 1.2)), vx: (Math.random() - 0.5) * 0.5, a: 0.3 + Math.random() * 0.7, r: 0.7 + Math.random() * (o.size || 1.8), w: 0.5 + Math.random() * 2 };
      }
      return {
        draw(t) {
          for (const p of ps) {
            p.y += p.vy; p.x += p.vx + Math.sin(t * 0.001 * p.w + p.r * 7) * 0.35; p.a -= 0.0022;
            if (p.a <= 0 || p.y < -10) Object.assign(p, spawn());
            const tw = 0.75 + Math.sin(t * 0.004 * p.w + p.x) * 0.25;
            ctx.fillStyle = rgba(o.color === 'accent' ? env.accent : env.gold, p.a * tw);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          }
        }
      };
    }`,
  flame: `
    function makeFlame(env, o) {
      const tongues = [];
      for (let i = 0; i < (o.count || 24); i++) tongues.push({ x: Math.random(), ph: Math.random() * 7, h: 0.5 + Math.random() * 0.5, w: 14 + Math.random() * 30 });
      return {
        draw(t) {
          for (const g of tongues) {
            const cx = g.x * W;
            const base = H * (o.base || 0.92);
            const h = H * 0.28 * g.h * (0.85 + Math.sin(t * 0.003 + g.ph) * 0.15);
            const sway = Math.sin(t * 0.0022 + g.ph) * g.w * 0.6;
            const grad = ctx.createLinearGradient(cx, base, cx + sway, base - h);
            grad.addColorStop(0, rgba(env.gold, 0.35));
            grad.addColorStop(0.55, rgba(env.accent, 0.22));
            grad.addColorStop(1, rgba(env.accent, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx - g.w * 0.5, base);
            ctx.quadraticCurveTo(cx - g.w * 0.2 + sway, base - h * 0.6, cx + sway, base - h);
            ctx.quadraticCurveTo(cx + g.w * 0.2 + sway, base - h * 0.6, cx + g.w * 0.5, base);
            ctx.closePath(); ctx.fill();
          }
        }
      };
    }`,
  rays: `
    function makeRays(env, o) {
      const N = o.count || 7;
      return {
        draw(t) {
          const ox = W * (o.x == null ? 0.5 : o.x), oy = H * (o.y == null ? 0.3 : o.y);
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 + (o.spin ? t * 0.00012 : 0) + (o.phase || 0);
            const len = H * (o.len || 0.9);
            const wob = 0.75 + Math.sin(t * 0.0011 + i * 2.4) * 0.25;
            const grad = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
            grad.addColorStop(0, rgba(env.gold, (o.alpha || 0.10) * wob));
            grad.addColorStop(1, rgba(env.gold, 0));
            ctx.strokeStyle = grad;
            ctx.lineWidth = (o.width || 26) * wob;
            ctx.beginPath(); ctx.moveTo(ox, oy);
            ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
            ctx.stroke();
          }
          const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, (o.core || 120));
          core.addColorStop(0, rgba(env.gold, 0.30)); core.addColorStop(1, rgba(env.gold, 0));
          ctx.fillStyle = core;
          const cr = o.core || 120;
          ctx.fillRect(ox - cr, oy - cr, cr * 2, cr * 2);
        }
      };
    }`,
  orbits: `
    function makeOrbits(env, o) {
      const bodies = [];
      for (let i = 0; i < (o.count || 6); i++) bodies.push({ r: 0.12 + i * (0.09 + Math.random() * 0.04), a: Math.random() * 7, s: (0.0002 + Math.random() * 0.0004) * (i % 2 ? -1 : 1), sz: 1.5 + Math.random() * 2.5, ring: i % (o.ringEvery || 3) === 0 });
      return {
        draw(t) {
          const cx = W * 0.5 + (env.px || 0) * 20, cy = H * (o.cy || 0.44) + (env.py || 0) * 14;
          const R = Math.min(W, H) * (o.scale || 0.42);
          for (const b of bodies) {
            b.a += b.s * 16;
            const x = cx + Math.cos(b.a) * R * b.r * 1.9;
            const y = cy + Math.sin(b.a) * R * b.r * 0.62;
            if (b.ring) {
              ctx.strokeStyle = rgba(env.accent, 0.12);
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.ellipse(cx, cy, R * b.r * 1.9, R * b.r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = rgba(env.gold, 0.7);
            ctx.beginPath(); ctx.arc(x, y, b.sz, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = rgba(env.gold, 0.12);
            ctx.beginPath(); ctx.arc(x, y, b.sz * 3.2, 0, Math.PI * 2); ctx.fill();
          }
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.24);
          core.addColorStop(0, rgba(env.gold, 0.34)); core.addColorStop(1, rgba(env.gold, 0));
          ctx.fillStyle = core; ctx.fillRect(cx - R * 0.3, cy - R * 0.3, R * 0.6, R * 0.6);
        }
      };
    }`,
  rings: `
    function makeRings(env, o) {
      const set = [];
      for (let i = 0; i < (o.count || 5); i++) set.push({ r: 0.1 + i * (o.gap || 0.16), ph: Math.random() * 7 });
      return {
        draw(t) {
          const cx = W * 0.5 + (env.px || 0) * 24, cy = H * 0.46 + (env.py || 0) * 18;
          const R = Math.min(W, H) * 0.42;
          for (const g of set) {
            const pulse = 1 + Math.sin(t * 0.0012 + g.ph) * 0.05;
            ctx.strokeStyle = rgba(o.color === 'accent' ? env.accent : env.gold, (o.alpha || 0.16));
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(cx, cy, R * g.r * pulse * 1.15, R * g.r * pulse, 0, 0, Math.PI * 2); ctx.stroke();
          }
          if (o.spokes) for (let i = 0; i < o.spokes; i++) {
            const a = (i / o.spokes) * Math.PI * 2 + t * 0.0001;
            ctx.strokeStyle = rgba(env.accent, 0.10);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
            ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.78);
            ctx.stroke();
          }
        }
      };
    }`,
  net: `
    function makeNet(env, o) {
      const N = o.nodes || 18;
      const nodes = [];
      for (let i = 0; i < N; i++) nodes.push({ x: Math.random(), y: 0.15 + Math.random() * 0.7, ph: Math.random() * 7 });
      return {
        draw(t) {
          const P = nodes.map(n => ({ x: n.x * W + Math.sin(t * 0.0007 + n.ph) * 14 + (env.px || 0) * 26, y: n.y * H + Math.cos(t * 0.0006 + n.ph) * 10 + (env.py || 0) * 20 }));
          const maxD = Math.min(W, H) * (o.link || 0.22);
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
            const d = Math.hypot(dx, dy);
            if (d < maxD) {
              ctx.strokeStyle = rgba(env.accent, 0.14 * (1 - d / maxD));
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke();
            }
          }
          for (const p of P) {
            ctx.fillStyle = rgba(env.gold, 0.6);
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = rgba(env.gold, 0.10);
            ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
          }
        }
      };
    }`,
  ripple: `
    function makeRipple(env, o) {
      const set = [];
      return {
        draw(t, dt) {
          if (Math.random() < (o.rate || 0.03)) set.push({ x: W * (o.x == null ? Math.random() : o.x), y: H * (o.y == null ? (0.4 + Math.random() * 0.4) : o.y), r: 2, a: 0.5 });
          for (const g of set) { g.r += (o.speed || 0.9); g.a -= 0.004; }
          for (let i = set.length - 1; i >= 0; i--) if (set[i].a <= 0) set.splice(i, 1);
          for (const g of set) {
            ctx.strokeStyle = rgba(o.color === 'accent' ? env.accent : env.foam, g.a);
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r * (o.squash || 0.45), 0, 0, Math.PI * 2); ctx.stroke();
          }
        }
      };
    }`,
  lightning: `
    function makeLightning(env, o) {
      let bolts = [], flash = 0;
      function bolt(x1, y1, x2, y2) {
        const pts = [{ x: x1, y: y1 }];
        const segs = 12;
        for (let i = 1; i < segs; i++) {
          const f = i / segs;
          pts.push({ x: x1 + (x2 - x1) * f + (Math.random() - 0.5) * 44, y: y1 + (y2 - y1) * f });
        }
        pts.push({ x: x2, y: y2 });
        return { pts, life: 1 };
      }
      return {
        draw(t, dt) {
          if (Math.random() < (o.rate || 0.012)) {
            const x = W * (0.15 + Math.random() * 0.7);
            bolts.push(bolt(x, H * 0.05, x + (Math.random() - 0.5) * 160, H * (o.to || 0.6)));
            flash = 1;
          }
          flash *= 0.86;
          ctx.fillStyle = rgba(env.foam, flash * 0.05);
          ctx.fillRect(0, 0, W, H);
          bolts = bolts.filter(b => b.life > 0);
          for (const b of bolts) {
            b.life -= 0.06;
            ctx.strokeStyle = rgba(env.foam, b.life * 0.8);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.pts[0].x, b.pts[0].y);
            for (const p of b.pts) ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.strokeStyle = rgba(env.gold, b.life * 0.3);
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        }
      };
    }`,
  silhouette: `
    function makeSilhouette(env, o) {
      const draw = {
        pillar(x, y, s) { // djed / min / obelisk: stacked capital
          ctx.fillRect(x - s * 0.16, y, s * 0.32, s * 1.6);
          for (let i = 0; i < 4; i++) ctx.fillRect(x - s * (0.34 - i * 0.05), y - s * (0.12 + i * 0.11), s * (0.68 - i * 0.1), s * 0.08);
        },
        boat(x, y, s) { // henu barque / ark
          ctx.beginPath();
          ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y + s * 0.55, x + s, y);
          ctx.lineTo(x + s * 0.82, y - s * 0.28); ctx.quadraticCurveTo(x, y + s * 0.1, x - s * 0.82, y - s * 0.28);
          ctx.closePath(); ctx.fill();
          ctx.fillRect(x - s * 0.05, y - s * 0.75, s * 0.1, s * 0.55);
        },
        fish(x, y, s) {
          ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + s * 0.85, y); ctx.lineTo(x + s * 1.35, y - s * 0.4); ctx.lineTo(x + s * 1.35, y + s * 0.4); ctx.closePath(); ctx.fill();
        },
        horse(x, y, s) {
          ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, -0.1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + s * 0.8, y - s * 0.55, s * 0.3, s * 0.42, 0.5, 0, Math.PI * 2); ctx.fill();
          for (const lx of [-0.55, -0.2, 0.25, 0.6]) ctx.fillRect(x + s * lx, y + s * 0.3, s * 0.1, s * 0.7);
          ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.1); ctx.quadraticCurveTo(x - s * 1.5, y + s * 0.2, x - s * 1.3, y + s * 0.6); ctx.lineWidth = s * 0.12; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
        },
        cobra(x, y, s) {
          ctx.beginPath(); ctx.moveTo(x - s * 0.15, y + s * 0.9);
          ctx.quadraticCurveTo(x - s * 0.4, y, x, y - s * 0.1);
          ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s * 0.28, y - s * 0.85);
          ctx.lineWidth = s * 0.16; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x + s * 0.28, y - s * 0.95, s * 0.2, s * 0.3, 0.15, 0, Math.PI * 2); ctx.fill();
        },
        spear(x, y, s, a) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a || -0.7);
          ctx.fillRect(-s * 0.03, -s, s * 0.06, s * 1.6);
          ctx.beginPath(); ctx.moveTo(-s * 0.09, -s); ctx.lineTo(0, -s * 1.35); ctx.lineTo(s * 0.09, -s); ctx.closePath(); ctx.fill();
          ctx.restore();
        },
        wheel(x, y, s) {
          ctx.lineWidth = s * 0.09; ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(x, y, s * 0.18, 0, Math.PI * 2); ctx.fill();
        },
        mountain(x, y, s) {
          ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.3, y - s * 0.9); ctx.lineTo(x, y - s * 0.55); ctx.lineTo(x + s * 0.35, y - s); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
        },
        star(x, y, s, a) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.4 : s, an = i / 8 * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        },
        sword(x, y, s, a) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(a || -0.6);
          ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(s * 0.09, -s * 0.2); ctx.lineTo(s * 0.26, -s * 0.1); ctx.lineTo(-s * 0.26, -s * 0.1); ctx.lineTo(-s * 0.09, -s * 0.2); ctx.closePath(); ctx.fill();
          ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.08);
          ctx.fillRect(-s * 0.045, -s * 0.02, s * 0.09, s * 0.4);
          ctx.restore();
        },
        tree(x, y, s) {
          ctx.fillRect(x - s * 0.04, y - s * 0.4, s * 0.08, s * 1.1);
          ctx.beginPath(); ctx.ellipse(x, y - s * 0.7, s * 0.55, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        },
        barque(x, y, s) {
          ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.5, x - s * 0.6, y - s * 0.25);
          ctx.lineTo(x + s * 0.6, y - s * 0.25); ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.5, x + s, y);
          ctx.quadraticCurveTo(x, y + s * 0.5, x - s, y); ctx.fill();
        },
      }[o.kind || 'pillar'];
      return {
        draw(t) {
          const x = W * (o.x == null ? 0.5 : o.x) + (env.px || 0) * 18;
          const y = H * (o.y == null ? 0.66 : o.y) + (env.py || 0) * 12 + Math.sin(t * 0.0009 + (o.ph || 0)) * (o.bob || 4);
          const s = Math.min(W, H) * (o.size || 0.1);
          ctx.save();
          ctx.fillStyle = rgba(o.color === 'accent' ? env.accent : env.gold, o.alpha || 0.22);
          if (o.shadow) { ctx.shadowColor = rgba(env.gold, 0.5); ctx.shadowBlur = 26; }
          draw(x, y, s, o.rot);
          ctx.restore();
        }
      };
    }`,
  pulse: `
    function makePulse(env, o) {
      let beat = 0, last = -(o.delay || 0);
      return {
        draw(t, dt) {
          if (t - last > (o.interval || 1400)) { last = t; beat = 1; }
          beat *= 0.94;
          const cx = W * 0.5 + (env.px || 0) * 16, cy = H * (o.y || 0.46) + (env.py || 0) * 12;
          const R = Math.min(W, H) * (o.r || 0.2) * (1 + beat * 0.12);
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
          core.addColorStop(0, rgba(env.gold, 0.16 + beat * 0.2));
          core.addColorStop(1, rgba(env.gold, 0));
          ctx.fillStyle = core;
          ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
          ctx.strokeStyle = rgba(env.accent, 0.25 * beat);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, R * (1 + (1 - beat) * 0.5), 0, Math.PI * 2); ctx.stroke();
        }
      };
    }`,
  embers: `
    function makeEmbers(env, o) {
      const N = o.count || 70;
      const ps = [];
      for (let i = 0; i < N; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, v: 0.2 + Math.random() * 0.7, a: Math.random(), r: 0.6 + Math.random() * 1.6, w: Math.random() * 7 });
      return {
        draw(t) {
          for (const p of ps) {
            p.y -= p.v; p.x += Math.sin(t * 0.001 + p.w) * 0.4;
            if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
            const flick = 0.6 + Math.sin(t * 0.005 + p.w * 3) * 0.4;
            ctx.fillStyle = rgba(env.accent, p.a * 0.35 * flick);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          }
        }
      };
    }`,
  veil: `
    function makeVeil(env, o) {
      return {
        draw(t) {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, rgba(env.accent, 0.05));
          g.addColorStop(0.6, rgba(env.deep, 0.12));
          g.addColorStop(1, rgba(env.deep, 0.34));
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
      };
    }`,
};

/* ─── Bespoke scene specs ──────────────────────────────────────────────────
   Each: canvasId, title line, and a composition of modules with parameters.
   Palette roles per effect: gold (primary light), accent (secondary light),
   water/foam (water family), deep (background weight).                    */

const SPECS = [
  // ── Egyptian ──
  { id: 'osiris', canvasId: 'djed-canvas', title: 'The First Mummy, King of the Underworld',
    mods: [ { m: 'silhouette', o: { kind: 'pillar', x: 0.5, y: 0.6, size: 0.13, color: 'gold', shadow: true } },
            { m: 'sparks', o: { count: 110, color: 'gold', speed: 0.5, size: 1.4 } },
            { m: 'rings', o: { count: 4, gap: 0.2, alpha: 0.10 } } ],
    pal: { water: [46, 90, 70] } },
  { id: 'sobek', canvasId: 'inundation-canvas', title: 'The Crocodile Who Rises from the River',
    mods: [ { m: 'waves', o: { layers: 4, base: 0.52, amp: 18, speed: 0.0008 } },
            { m: 'surge', o: { rate: 0.08, height: 0.5 } },
            { m: 'silhouette', o: { kind: 'fish', x: 0.24, y: 0.62, size: 0.07, color: 'accent', alpha: 0.14 } } ],
    pal: { water: [30, 96, 84], foam: [210, 235, 220] } },
  { id: 'nut', canvasId: 'starvault-canvas', title: 'She Who Bends Over the Earth',
    mods: [ { m: 'sparks', o: { count: 220, speed: 0.18, size: 1.1 } },
            { m: 'orbits', o: { count: 5, cy: 0.3, scale: 0.5 } },
            { m: 'silhouette', o: { kind: 'star', x: 0.82, y: 0.2, size: 0.05, color: 'gold', shadow: true } } ],
    pal: { water: [20, 26, 64] } },
  { id: 'geb', canvasId: 'earthtremor-canvas', title: 'The Laughing Earth Beneath the Sky',
    mods: [ { m: 'waves', o: { layers: 3, base: 0.68, amp: 8, speed: 0.0011 } },
            { m: 'pulse', o: { interval: 2600, r: 0.24, y: 0.72 } },
            { m: 'sparks', o: { count: 80, color: 'accent', speed: 0.3, size: 1.2 } } ],
    pal: { water: [58, 84, 44] } },
  { id: 'tefnut', canvasId: 'dew-canvas', title: 'The Spat-Forth One, Sister of the Air',
    mods: [ { m: 'rain', o: { count: 70, shape: 'drop', speed: 0.5, size: 2.4, drift: 0.2, sway: true } },
            { m: 'silhouette', o: { kind: 'star', x: 0.5, y: 0.34, size: 0.06, color: 'gold', shadow: true } },
            { m: 'rings', o: { count: 3, gap: 0.22, alpha: 0.12 } } ],
    pal: { water: [70, 110, 120] } },
  { id: 'serket', canvasId: 'scorpionguard-canvas', title: 'She Who Causes the Throat to Breathe',
    mods: [ { m: 'silhouette', o: { kind: 'cobra', x: 0.5, y: 0.62, size: 0.12, color: 'gold', shadow: true } },
            { m: 'rings', o: { count: 4, gap: 0.18, alpha: 0.13 } },
            { m: 'sparks', o: { count: 90, speed: 0.4, size: 1.3 } } ],
    pal: { water: [110, 70, 90] } },
  { id: 'serapis', canvasId: 'serapeum-canvas', title: 'Osiris-Apis, Lord of the Serapeum',
    mods: [ { m: 'rays', o: { count: 5, x: 0.5, y: 0.26, len: 0.8, alpha: 0.09, spin: true } },
            { m: 'silhouette', o: { kind: 'pillar', x: 0.5, y: 0.62, size: 0.1, color: 'accent', alpha: 0.18 } },
            { m: 'embers', o: { count: 60 } } ],
    pal: { deep: [28, 22, 40] } },
  { id: 'neith', canvasId: 'weaver-canvas', title: 'The Terrible One, Mother of the Gods',
    mods: [ { m: 'net', o: { nodes: 22, link: 0.26 } },
            { m: 'silhouette', o: { kind: 'spear', x: 0.24, y: 0.7, size: 0.14, color: 'gold', rot: -0.85 } },
            { m: 'silhouette', o: { kind: 'spear', x: 0.76, y: 0.7, size: 0.14, color: 'gold', rot: 0.85 } } ],
    pal: { water: [90, 60, 50] } },
  { id: 'min', canvasId: 'harvestfir-canvas', title: 'The Firm One, Lord of the Processions',
    mods: [ { m: 'silhouette', o: { kind: 'pillar', x: 0.5, y: 0.58, size: 0.15, color: 'gold', shadow: true, bob: 1 } },
            { m: 'lightning', o: { rate: 0.006, to: 0.5 } },
            { m: 'rain', o: { count: 60, shape: 'seed', speed: 0.8, sway: true } } ],
    pal: { water: [120, 90, 40] } },
  { id: 'montu', canvasId: 'warfalcon-canvas', title: 'The Falcon of Thebes',
    mods: [ { m: 'silhouette', o: { kind: 'spear', x: 0.7, y: 0.66, size: 0.16, color: 'gold', rot: -0.55 } },
            { m: 'sparks', o: { count: 120, speed: 0.9, size: 1.5 } },
            { m: 'rays', o: { count: 4, x: 0.3, y: 0.24, len: 0.5, alpha: 0.07 } } ],
    pal: { water: [100, 60, 40] } },
  { id: 'nun', canvasId: 'primordial-canvas', title: 'The Inert One, the Flood Before the World',
    mods: [ { m: 'waves', o: { layers: 5, base: 0.4, amp: 10, speed: 0.0004 } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.5, y: 0.72, size: 0.12, color: 'gold', alpha: 0.16 } },
            { m: 'ripple', o: { rate: 0.02, color: 'foam', squash: 0.3 } } ],
    pal: { water: [26, 60, 92], foam: [180, 210, 230] } },
  { id: 'sokar', canvasId: 'henu-canvas', title: 'The Mysterious One, Patron of the Tomb-Makers',
    mods: [ { m: 'silhouette', o: { kind: 'barque', x: 0.5, y: 0.58, size: 0.14, color: 'gold', shadow: true, bob: 6 } },
            { m: 'silhouette', o: { kind: 'pillar', x: 0.82, y: 0.6, size: 0.08, color: 'accent', alpha: 0.16 } },
            { m: 'embers', o: { count: 50 } } ],
    pal: { deep: [26, 22, 18] } },
  { id: 'kebechet', canvasId: 'coolwater-canvas', title: 'The Serpent Daughter of Anubis',
    mods: [ { m: 'ripple', o: { rate: 0.05, color: 'foam', squash: 0.4 } },
            { m: 'silhouette', o: { kind: 'cobra', x: 0.6, y: 0.5, size: 0.1, color: 'accent', alpha: 0.16 } },
            { m: 'rain', o: { count: 50, shape: 'drop', speed: 0.7, size: 2 } } ],
    pal: { water: [60, 110, 120], foam: [200, 230, 235] } },
  { id: 'renenutet', canvasId: 'harvestcobra-canvas', title: 'Lady of the Granary, Mother of the Field',
    mods: [ { m: 'waves', o: { layers: 4, base: 0.62, amp: 10, speed: 0.001 } },
            { m: 'silhouette', o: { kind: 'cobra', x: 0.5, y: 0.56, size: 0.13, color: 'gold', shadow: true } },
            { m: 'rain', o: { count: 60, shape: 'seed', speed: 0.6 } } ],
    pal: { water: [130, 110, 40] } },
  { id: 'onuris', canvasId: 'retrieval-canvas', title: 'He Who Brings Back the Distant One',
    mods: [ { m: 'silhouette', o: { kind: 'spear', x: 0.6, y: 0.66, size: 0.15, color: 'gold', rot: -0.75 } },
            { m: 'silhouette', o: { kind: 'cobra', x: 0.32, y: 0.62, size: 0.08, color: 'accent', alpha: 0.15, bob: 8 } },
            { m: 'rings', o: { count: 3, gap: 0.24, alpha: 0.11 } } ],
    pal: { water: [90, 80, 60] } },
  { id: 'karnak', canvasId: 'hypostyle-canvas', title: 'The Most Select of Places',
    mods: [ { m: 'rays', o: { count: 8, x: 0.5, y: 0.1, len: 1.1, alpha: 0.07, width: 34 } },
            { m: 'silhouette', o: { kind: 'pillar', x: 0.3, y: 0.6, size: 0.1, color: 'gold', alpha: 0.14 } },
            { m: 'silhouette', o: { kind: 'pillar', x: 0.7, y: 0.6, size: 0.1, color: 'gold', alpha: 0.14 } },
            { m: 'embers', o: { count: 40 } } ],
    pal: { deep: [30, 24, 16] } },
  { id: 'luxor', canvasId: 'colonnade-canvas', title: 'The Southern Sanctuary',
    mods: [ { m: 'rays', o: { count: 6, x: 0.5, y: 0.14, len: 0.95, alpha: 0.08, width: 30 } },
            { m: 'silhouette', o: { kind: 'barque', x: 0.5, y: 0.64, size: 0.12, color: 'gold', alpha: 0.2, bob: 4 } },
            { m: 'ripple', o: { rate: 0.015, y: 0.72, color: 'foam' } } ],
    pal: { water: [60, 80, 110] } },
  { id: 'bes', canvasId: 'threshold-canvas', title: 'The Protector of Hearth and Childbirth',
    mods: [ { m: 'pulse', o: { interval: 1800, r: 0.3, y: 0.6 } },
            { m: 'rings', o: { count: 4, gap: 0.2, alpha: 0.15 } },
            { m: 'sparks', o: { count: 100, color: 'accent', speed: 0.7, size: 1.4 } } ],
    pal: { water: [120, 70, 60] } },

  // ── Sanskrit ──
  { id: 'indra', canvasId: 'vajra-canvas', title: 'The Dragon-Slayer of the Rigveda',
    mods: [ { m: 'lightning', o: { rate: 0.02, to: 0.7 } },
            { m: 'rain', o: { count: 110, shape: 'drop', speed: 2.2 } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.5, y: 0.86, size: 0.16, color: 'accent', alpha: 0.13 } } ],
    pal: { water: [40, 50, 90], foam: [230, 235, 250] } },
  { id: 'agni', canvasId: 'triplefire-canvas', title: 'The Priest of the Gods and the Guest of Men',
    mods: [ { m: 'flame', o: { count: 30, base: 0.95 } },
            { m: 'sparks', o: { count: 150, from: 'base', speed: 1.4 } },
            { m: 'rays', o: { count: 3, x: 0.5, y: 0.8, len: 0.5, alpha: 0.06 } } ],
    pal: { water: [120, 50, 30] } },
  { id: 'yama', canvasId: 'noose-canvas', title: 'The First Mortal, Judge of the Dead',
    mods: [ { m: 'rings', o: { count: 5, gap: 0.17, alpha: 0.13, spokes: 8 } },
            { m: 'silhouette', o: { kind: 'wheel', x: 0.5, y: 0.44, size: 0.11, color: 'gold', shadow: true } },
            { m: 'embers', o: { count: 60 } } ],
    pal: { deep: [22, 18, 26] } },
  { id: 'kalki', canvasId: 'whitehorse-canvas', title: 'The Rider Who Comes at the World’s End',
    mods: [ { m: 'silhouette', o: { kind: 'horse', x: 0.42, y: 0.6, size: 0.13, color: 'foam', shadow: true, bob: 6 } },
            { m: 'silhouette', o: { kind: 'sword', x: 0.68, y: 0.5, size: 0.1, color: 'gold', rot: -0.5 } },
            { m: 'embers', o: { count: 90 } },
            { m: 'rays', o: { count: 4, x: 0.5, y: 0.2, len: 0.6, alpha: 0.06 } } ],
    pal: { water: [80, 60, 40], foam: [235, 230, 215], deep: [24, 20, 18] } },
  { id: 'kubera', canvasId: 'treasure-canvas', title: 'Lord of the Yakṣas, Guardian of the North',
    mods: [ { m: 'sparks', o: { count: 200, color: 'gold', speed: 0.35, size: 2 } },
            { m: 'orbits', o: { count: 7, scale: 0.38 } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.5, y: 0.9, size: 0.14, color: 'accent', alpha: 0.12 } } ],
    pal: { water: [70, 60, 90] } },
  { id: 'skanda', canvasId: 'vel-canvas', title: 'The Six-Headed General of the Gods',
    mods: [ { m: 'silhouette', o: { kind: 'spear', x: 0.5, y: 0.6, size: 0.17, color: 'gold', rot: 0, shadow: true } },
            { m: 'rays', o: { count: 6, x: 0.5, y: 0.42, len: 0.7, alpha: 0.08, width: 20 } },
            { m: 'sparks', o: { count: 110, speed: 0.8, size: 1.4 } } ],
    pal: { water: [110, 60, 80] } },
  { id: 'dharma', canvasId: 'bull-canvas', title: 'That Which Holds, Law and Righteousness',
    mods: [ { m: 'silhouette', o: { kind: 'wheel', x: 0.5, y: 0.46, size: 0.13, color: 'gold', shadow: true } },
            { m: 'rings', o: { count: 4, gap: 0.2, alpha: 0.12, spokes: 4 } },
            { m: 'pulse', o: { interval: 3200, r: 0.28 } } ],
    pal: { water: [70, 80, 60] } },
  { id: 'karma', canvasId: 'seed-canvas', title: 'Deed, Action, the Law of Consequence',
    mods: [ { m: 'rain', o: { count: 90, shape: 'seed', speed: 0.7, sway: true } },
            { m: 'rings', o: { count: 5, gap: 0.18, alpha: 0.10, spokes: 8 } },
            { m: 'pulse', o: { interval: 2400, r: 0.22, y: 0.6 } } ],
    pal: { water: [80, 90, 50] } },
  { id: 'yoga', canvasId: 'stillness-canvas', title: 'Union, the Yoking of Self to Divine',
    mods: [ { m: 'pulse', o: { interval: 6000, r: 0.26 } },
            { m: 'rings', o: { count: 6, gap: 0.13, alpha: 0.09 } },
            { m: 'rain', o: { count: 30, shape: 'drop', speed: 0.4, size: 1.6, sway: true } } ],
    pal: { water: [60, 90, 100] } },
  { id: 'aditi', canvasId: 'unbound-canvas', title: 'Boundlessness, Mother of the Ādityas',
    mods: [ { m: 'net', o: { nodes: 20, link: 0.3 } },
            { m: 'orbits', o: { count: 8, scale: 0.46 } },
            { m: 'sparks', o: { count: 120, speed: 0.3, size: 1.5 } } ],
    pal: { water: [60, 80, 120] } },
  { id: 'brahman', canvasId: 'om-canvas', title: 'The Absolute, the World-Ground',
    mods: [ { m: 'rings', o: { count: 7, gap: 0.12, alpha: 0.10 } },
            { m: 'net', o: { nodes: 16, link: 0.24 } },
            { m: 'pulse', o: { interval: 8000, r: 0.3 } } ],
    pal: { water: [70, 70, 110] } },
  { id: 'bhakti', canvasId: 'offering-canvas', title: 'Devotion, Loving Attachment to the Divine',
    mods: [ { m: 'rain', o: { count: 70, shape: 'petal', speed: 0.5, sway: true } },
            { m: 'pulse', o: { interval: 2000, r: 0.24 } },
            { m: 'sparks', o: { count: 80, color: 'accent', speed: 0.5, size: 1.3 } } ],
    pal: { water: [120, 70, 90] } },
  { id: 'chandra', canvasId: 'moon-canvas', title: 'The Glittering Moon',
    mods: [ { m: 'orbits', o: { count: 6, cy: 0.4, scale: 0.4 } },
            { m: 'sparks', o: { count: 180, speed: 0.15, size: 1 } },
            { m: 'silhouette', o: { kind: 'star', x: 0.24, y: 0.24, size: 0.07, color: 'foam', shadow: true } } ],
    pal: { water: [40, 50, 80], foam: [220, 228, 240] } },
  { id: 'diti', canvasId: 'bound-canvas', title: 'The Bound One, Mother of the Anti-Gods',
    mods: [ { m: 'rings', o: { count: 6, gap: 0.14, alpha: 0.14, spokes: 6 } },
            { m: 'embers', o: { count: 80 } },
            { m: 'pulse', o: { interval: 4000, r: 0.2, y: 0.6 } } ],
    pal: { water: [90, 50, 50], deep: [26, 16, 18] } },
  { id: 'duryodhana', canvasId: 'refusal-canvas', title: 'Hard to Conquer in Battle',
    mods: [ { m: 'silhouette', o: { kind: 'wheel', x: 0.3, y: 0.5, size: 0.08, color: 'gold', alpha: 0.2, rot: 0 } },
            { m: 'silhouette', o: { kind: 'sword', x: 0.7, y: 0.56, size: 0.1, color: 'accent', rot: 0.6 } },
            { m: 'embers', o: { count: 70 } } ],
    pal: { water: [100, 70, 40], deep: [26, 20, 14] } },
  { id: 'arjuna', canvasId: 'gandiva-canvas', title: 'The Third Pāṇḍava, the Great Archer',
    mods: [ { m: 'rays', o: { count: 1, x: 0.24, y: 0.2, len: 1.1, alpha: 0.14, width: 10, spin: false } },
            { m: 'silhouette', o: { kind: 'spear', x: 0.24, y: 0.5, size: 0.2, color: 'gold', rot: 1.35 } },
            { m: 'pulse', o: { interval: 5000, r: 0.2 } } ],
    pal: { water: [60, 80, 110] } },
  { id: 'nakula', canvasId: 'twinlight-canvas', title: 'Twin of Sahadeva, Master of Horses',
    mods: [ { m: 'pulse', o: { interval: 2600, r: 0.2, y: 0.5 } },
            { m: 'pulse', o: { interval: 2600, r: 0.2, y: 0.5, delay: 1300 } },
            { m: 'silhouette', o: { kind: 'horse', x: 0.4, y: 0.6, size: 0.09, color: 'gold', alpha: 0.16, bob: 5 } },
            { m: 'silhouette', o: { kind: 'horse', x: 0.62, y: 0.6, size: 0.09, color: 'accent', alpha: 0.16, bob: 5, ph: 3 } } ],
    pal: { water: [80, 90, 70] } },
  { id: 'sahadeva', canvasId: 'starsight-canvas', title: 'The Youngest Pāṇḍava, the Astronomer',
    mods: [ { m: 'net', o: { nodes: 26, link: 0.2 } },
            { m: 'orbits', o: { count: 5, scale: 0.34, cy: 0.36 } },
            { m: 'sparks', o: { count: 90, speed: 0.2, size: 1 } } ],
    pal: { water: [40, 46, 80] } },
  { id: 'mantra', canvasId: 'resonance-canvas', title: 'The Sacred Formula',
    mods: [ { m: 'rings', o: { count: 8, gap: 0.1, alpha: 0.12 } },
            { m: 'sparks', o: { count: 108, speed: 0.25, size: 1.6, color: 'gold' } },
            { m: 'pulse', o: { interval: 4200, r: 0.22 } } ],
    pal: { water: [90, 70, 110] } },
  { id: 'matsya', canvasId: 'deluge-canvas', title: 'The Fish, First Avatāra of Viṣṇu',
    mods: [ { m: 'surge', o: { rate: 0.12, height: 0.6 } },
            { m: 'silhouette', o: { kind: 'fish', x: 0.5, y: 0.5, size: 0.11, color: 'gold', shadow: true, bob: 8 } },
            { m: 'silhouette', o: { kind: 'boat', x: 0.5, y: 0.38, size: 0.07, color: 'foam', alpha: 0.5 } } ],
    pal: { water: [30, 70, 100], foam: [200, 225, 240] } },
  { id: 'meru', canvasId: 'axismount-canvas', title: 'The Centre of the World',
    mods: [ { m: 'orbits', o: { count: 9, scale: 0.5, ringEvery: 2 } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.5, y: 0.78, size: 0.13, color: 'gold', shadow: true } },
            { m: 'rings', o: { count: 3, gap: 0.28, alpha: 0.1 } } ],
    pal: { water: [60, 70, 100] } },
  { id: 'tantra', canvasId: 'union-canvas', title: 'The Loom of Esoteric Doctrine',
    mods: [ { m: 'rings', o: { count: 6, gap: 0.15, alpha: 0.13, spokes: 6 } },
            { m: 'pulse', o: { interval: 3000, r: 0.26 } },
            { m: 'net', o: { nodes: 14, link: 0.22 } } ],
    pal: { water: [100, 50, 80] } },
  { id: 'tapas', canvasId: 'heat-canvas', title: 'Heat, the Generative Austerity',
    mods: [ { m: 'flame', o: { count: 18, base: 1 } },
            { m: 'embers', o: { count: 100 } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.5, y: 0.95, size: 0.1, color: 'accent', alpha: 0.1 } } ],
    pal: { water: [110, 60, 30], deep: [24, 14, 10] } },
  { id: 'yoni', canvasId: 'source-canvas', title: 'The Womb, the Feminine Principle',
    mods: [ { m: 'silhouette', o: { kind: 'pillar', x: 0.5, y: 0.5, size: 0.1, color: 'gold', shadow: true, bob: 2 } },
            { m: 'waves', o: { layers: 4, base: 0.72, amp: 12, speed: 0.0009 } },
            { m: 'pulse', o: { interval: 3600, r: 0.26, y: 0.62 } } ],
    pal: { water: [120, 70, 100] } },

  // ── Norse / Celtic / Chinese / Phoenician / Roman ──
  { id: 'surtr', canvasId: 'worldfire-canvas', title: 'The Black One, the Fire at the End',
    mods: [ { m: 'flame', o: { count: 40, base: 1.02 } },
            { m: 'silhouette', o: { kind: 'sword', x: 0.5, y: 0.42, size: 0.16, color: 'accent', shadow: true, rot: -0.2 } },
            { m: 'embers', o: { count: 120 } } ],
    pal: { water: [140, 60, 30], accent: [255, 120, 40], deep: [20, 10, 8] } },
  { id: 'njord', canvasId: 'seashore-canvas', title: 'The Sea, Wealth, the Vanir Hostage',
    mods: [ { m: 'waves', o: { layers: 4, base: 0.55, amp: 14, speed: 0.0007 } },
            { m: 'silhouette', o: { kind: 'boat', x: 0.6, y: 0.5, size: 0.08, color: 'gold', alpha: 0.2, bob: 6 } },
            { m: 'sparks', o: { count: 70, speed: 0.4, size: 1.3 } } ],
    pal: { water: [40, 80, 110], foam: [215, 230, 235] } },
  { id: 'danu', canvasId: 'rivermother-canvas', title: 'The River-Mother of the Divine Race',
    mods: [ { m: 'waves', o: { layers: 5, base: 0.35, amp: 12, speed: 0.001 } },
            { m: 'net', o: { nodes: 18, link: 0.3 } },
            { m: 'sparks', o: { count: 100, speed: 0.35, size: 1.4 } } ],
    pal: { water: [40, 90, 80], foam: [200, 230, 220] } },
  { id: 'gronwpebr', canvasId: 'spearwall-canvas', title: 'Gronw the Strong',
    mods: [ { m: 'silhouette', o: { kind: 'spear', x: 0.55, y: 0.5, size: 0.2, color: 'gold', rot: -1.1, shadow: true } },
            { m: 'ripple', o: { rate: 0.03, x: 0.5, y: 0.72, color: 'foam' } },
            { m: 'silhouette', o: { kind: 'mountain', x: 0.24, y: 0.8, size: 0.09, color: 'accent', alpha: 0.14 } } ],
    pal: { water: [60, 80, 70], foam: [205, 220, 210] } },
  { id: 'bodhidharma', canvasId: 'wallgaze-canvas', title: 'The Indian Prince Who Carried Zen to China',
    mods: [ { m: 'silhouette', o: { kind: 'pillar', x: 0.5, y: 0.52, size: 0.12, color: 'accent', alpha: 0.2, bob: 0.5 } },
            { m: 'rain', o: { count: 40, shape: 'petal', speed: 0.35, sway: true } },
            { m: 'rings', o: { count: 4, gap: 0.2, alpha: 0.08 } } ],
    pal: { water: [90, 50, 40] } },
  { id: 'yammu', canvasId: 'seacombat-canvas', title: 'The Sea, Rival of Baʿal',
    mods: [ { m: 'waves', o: { layers: 6, base: 0.45, amp: 22, speed: 0.0014 } },
            { m: 'lightning', o: { rate: 0.015, to: 0.5 } },
            { m: 'silhouette', o: { kind: 'spear', x: 0.4, y: 0.5, size: 0.13, color: 'foam', rot: -0.9 } },
            { m: 'silhouette', o: { kind: 'spear', x: 0.6, y: 0.5, size: 0.13, color: 'foam', rot: -0.9, ph: 2 } } ],
    pal: { water: [18, 60, 110], foam: [215, 230, 245] } },
  { id: 'venus', canvasId: 'morningstar-canvas', title: 'Love, Beauty, the Morning and Evening Star',
    mods: [ { m: 'rays', o: { count: 12, x: 0.72, y: 0.26, len: 0.5, alpha: 0.10, spin: true, width: 14 } },
            { m: 'orbits', o: { count: 4, scale: 0.3, cy: 0.5 } },
            { m: 'silhouette', o: { kind: 'star', x: 0.72, y: 0.26, size: 0.07, color: 'gold', shadow: true } } ],
    pal: { water: [90, 70, 100] } },
];

/* ─── Emitter ─────────────────────────────────────────────────────────── */

function hexToRgbFn() {
  return `
    function hexToRgb(hex) {
      const m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 212, g: 175, b: 55 };
    }
    function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }`;
}

function emitFile(spec) {
  const used = [...new Set(spec.mods.map((m) => m.m))];
  const pal = Object.assign({ water: [36, 60, 78], foam: [205, 220, 228], deep: [12, 10, 9] }, spec.pal || {});
  const body = spec.mods
    .map((m) => {
      const cap = m.m[0].toUpperCase() + m.m.slice(1);
      return `    scene.push(make${cap}(env, ${JSON.stringify(m.o)}));`;
    })
    .join('\n');

  return `/**
 * ${spec.id.toUpperCase()} — ${spec.title}
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('${spec.canvasId}');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    ${hexToRgbFn()}

    const env = {
        gold: hexToRgb(canvas.dataset.primary || '#D4AF37'),
        accent: hexToRgb(canvas.dataset.secondary || '#228B22'),
        water: { r: ${pal.water[0]}, g: ${pal.water[1]}, b: ${pal.water[2]} },
        foam: { r: ${pal.foam[0]}, g: ${pal.foam[1]}, b: ${pal.foam[2]} },
        deep: { r: ${pal.deep[0]}, g: ${pal.deep[1]}, b: ${pal.deep[2]} },
        px: 0, py: 0,
    };

    let W = 0, H = 0, dpr = 1;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('pointermove', function (e) {
        env.px = (e.clientX / W - 0.5) * 2;
        env.py = (e.clientY / H - 0.5) * 2;
    }, { passive: true });

${used.map((k) => MODULES[k]).join('\n')}

    const scene = [];
${body}

    function background() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(env.deep, 0.0));
        g.addColorStop(0.55, rgba(env.deep, 0.16));
        g.addColorStop(1, rgba(env.deep, 0.42));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    let raf = 0, last = 0, running = true;
    function frame(t) {
        if (!running) return;
        const dt = Math.min(t - last, 50); last = t;
        ctx.clearRect(0, 0, W, H);
        background();
        for (const m of scene) m.draw(t, dt);
        raf = requestAnimationFrame(frame);
    }

    function still() {
        ctx.clearRect(0, 0, W, H);
        background();
        for (const m of scene) m.draw(1200, 16);
    }

    if (prefersReducedMotion) {
        still();
        window.addEventListener('resize', still);
        return;
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    });

    raf = requestAnimationFrame(frame);
})();
`;
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  let wrote = 0;
  for (const spec of SPECS) {
    const file = path.join(EFFECTS_DIR, `${spec.id}.js`);
    const code = emitFile(spec);
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (existing !== code) {
      fs.writeFileSync(file, code);
      wrote++;
    }
    if (!registry[spec.id]) {
      registry[spec.id] = { canvasId: spec.canvasId };
    }
  }
  // stable key order
  const ordered = {};
  for (const k of Object.keys(registry).sort()) ordered[k] = registry[k];
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(ordered, null, 2) + '\n');
  console.log(`effects: ${wrote} files written/updated, registry now ${Object.keys(ordered).length} entries`);
  const missing = SPECS.filter((s) => !fs.existsSync(path.join(EFFECTS_DIR, `${s.id}.js`)));
  if (missing.length) console.log('MISSING:', missing.map((m) => m.id).join(', '));
}

main();
