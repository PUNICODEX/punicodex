/**
 * DANU — The River-Mother of the Divine Race
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('rivermother-canvas');
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
        water: { r: 40, g: 90, b: 80 },
        foam: { r: 200, g: 230, b: 220 },
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
    }

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

    const scene = [];
    scene.push(makeWaves(env, {"layers":5,"base":0.35,"amp":12,"speed":0.001}));
    scene.push(makeNet(env, {"nodes":18,"link":0.3}));
    scene.push(makeSparks(env, {"count":100,"speed":0.35,"size":1.4}));

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
