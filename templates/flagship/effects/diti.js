/**
 * DITI — The Bound One, Mother of the Anti-Gods
 * Bespoke hero effect (ascii-restoration batch 2026-11). Regenerate via
 * scripts/generate-ascii-effects.js — do not hand-edit.
 * Interactive Layer: canvas atmosphere, pointer parallax, reduced-motion safe.
 */

(function () {
    'use strict';

    const canvas = document.getElementById('bound-canvas');
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
        water: { r: 90, g: 50, b: 50 },
        foam: { r: 205, g: 220, b: 228 },
        deep: { r: 26, g: 16, b: 18 },
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
    }

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

    const scene = [];
    scene.push(makeRings(env, {"count":6,"gap":0.14,"alpha":0.14,"spokes":6}));
    scene.push(makeEmbers(env, {"count":80}));
    scene.push(makePulse(env, {"interval":4000,"r":0.2,"y":0.6}));

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
