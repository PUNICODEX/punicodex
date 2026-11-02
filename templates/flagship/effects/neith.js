/**
 * NEITH — The Terrible One, Mother of the Gods
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('weaver-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    
    function hexToRgb(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 212, g: 175, b: 55 };
    }
    function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }

    const env = {
        gold: hexToRgb(canvas.dataset.primary || '#D4AF37'),
        accent: hexToRgb(canvas.dataset.secondary || '#228B22'),
        water: { r: 90, g: 60, b: 50 },
        foam: { r: 205, g: 220, b: 228 },
        deep: { r: 12, g: 10, b: 9 },
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
    }

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
    }

    const scene = [];
    scene.push(makeNet(env, {"nodes":22,"link":0.26}));
    scene.push(makeSilhouette(env, {"kind":"spear","x":0.24,"y":0.7,"size":0.14,"color":"gold","rot":-0.85}));
    scene.push(makeSilhouette(env, {"kind":"spear","x":0.76,"y":0.7,"size":0.14,"color":"gold","rot":0.85}));

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
