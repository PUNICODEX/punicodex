// Midas — the golden touch: a drifting line that gilds what it passes (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('golden-touch-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    const GOLD = hexToRgb('#D4AF37');
    const GREY = hexToRgb('#6E6E72');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // Ordinary things awaiting the touch — small grey polygons at rest.
    const stones = [];
    const STONE_COUNT = 38;
    for (let i = 0; i < STONE_COUNT; i++) {
        stones.push({
            fx: 0.06 + Math.random() * 0.88,
            fy: 0.12 + Math.random() * 0.76,
            r: 5 + Math.random() * 9,
            n: 3 + Math.floor(Math.random() * 4),  // triangle..hexagon
            rot: Math.random() * Math.PI * 2,
            gild: 0,                                // 0 = grey, 1 = radiant gold
            ripple: 0                               // 1 at the moment of touch
        });
    }

    function polygonPath(x, y, r, n, rot) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const a = rot + (i / n) * Math.PI * 2;
            const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    let t = 0;
    let trail = [];
    function frame() {
        t += 0.005;
        ctx.clearRect(0, 0, width, height);

        // Obsidian field.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(6,6,8,0.98)');
        lg.addColorStop(1, 'rgba(10,9,7,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        // The touch — a point wandering on slow, unequal rhythms so its course
        // never quite repeats; its wake is the fine polygonal line.
        const tx = width * (0.5 + 0.36 * Math.sin(t * 0.23 + 1.7) + 0.09 * Math.sin(t * 0.071));
        const ty = height * (0.5 + 0.30 * Math.sin(t * 0.17 + 0.4) + 0.08 * Math.cos(t * 0.113));
        trail.push({ x: tx, y: ty });
        if (trail.length > 90) trail.shift();

        if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
                const k = i / trail.length;
                ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (0.05 + 0.22 * k) + ')';
                ctx.lineWidth = 0.8 + k * 0.6;
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(trail[i].x, trail[i].y);
                ctx.stroke();
            }
        }

        // The stones — grey at rest, gilding as the touch passes, fading back.
        for (const s of stones) {
            const x = s.fx * width, y = s.fy * height;
            const d = Math.hypot(tx - x, ty - y);
            if (d < s.r + 46) {
                if (s.gild < 0.35) s.ripple = 1;      // first contact ripples
                s.gild = Math.min(1, s.gild + 0.05);
            } else {
                s.gild = Math.max(0, s.gild - 0.0022); // gold slowly leaves
            }
            s.ripple = Math.max(0, s.ripple - 0.006);

            const cr = Math.round(GREY.r + (GOLD.r - GREY.r) * s.gild);
            const cg = Math.round(GREY.g + (GOLD.g - GREY.g) * s.gild);
            const cb = Math.round(GREY.b + (GOLD.b - GREY.b) * s.gild);
            const alpha = 0.14 + 0.5 * s.gild;

            if (s.gild > 0.02) {
                const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 3.2);
                halo.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (0.16 * s.gild) + ')');
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = halo;
                ctx.beginPath(); ctx.arc(x, y, s.r * 3.2, 0, Math.PI * 2); ctx.fill();
            }

            polygonPath(x, y, s.r, s.n, s.rot);
            ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
            if (s.gild > 0.4) {
                polygonPath(x, y, s.r * 0.5, s.n, s.rot);
                ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (alpha * 0.5) + ')';
                ctx.stroke();
            }

            if (s.ripple > 0) {
                ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (0.20 * s.ripple) + ')';
                ctx.beginPath();
                ctx.arc(x, y, s.r + (1 - s.ripple) * 46, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // The point of contact itself — a quiet mote of gold.
        const head = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14);
        head.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.5)');
        head.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = head;
        ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.85)';
        ctx.beginPath(); ctx.arc(tx, ty, 1.8, 0, Math.PI * 2); ctx.fill();

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
