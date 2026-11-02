/**
 * AGNI — The Priest of the Gods and the Guest of Men
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('triplefire-canvas');
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
        water: { r: 120, g: 50, b: 30 },
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
    }

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
    }

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
    }

    const scene = [];
    scene.push(makeFlame(env, {"count":30,"base":0.95}));
    scene.push(makeSparks(env, {"count":150,"from":"base","speed":1.4}));
    scene.push(makeRays(env, {"count":3,"x":0.5,"y":0.8,"len":0.5,"alpha":0.06}));

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
