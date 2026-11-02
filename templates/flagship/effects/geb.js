/**
 * GEB — The Laughing Earth Beneath the Sky
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('earthtremor-canvas');
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
        water: { r: 58, g: 84, b: 44 },
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
    scene.push(makeWaves(env, {"layers":3,"base":0.68,"amp":8,"speed":0.0011}));
    scene.push(makePulse(env, {"interval":2600,"r":0.24,"y":0.72}));
    scene.push(makeSparks(env, {"count":80,"color":"accent","speed":0.3,"size":1.2}));

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
