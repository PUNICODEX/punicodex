// Iason — the Argonauts' star-chart and the Golden Fleece glow (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('argonaut-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    const GOLD = hexToRgb('#D4AF37');
    const BRONZE = hexToRgb('#B08D57');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // The chart — waypoints of the Argo's course across the sky, from Iolkos
    // to Colchis, joined by fine bronze lines.
    const chart = [
        [0.10, 0.30], [0.19, 0.22], [0.29, 0.27], [0.38, 0.18], [0.47, 0.24],
        [0.57, 0.15], [0.66, 0.22], [0.75, 0.16], [0.84, 0.21], [0.91, 0.14]
    ].map((p, i) => ({ fx: p[0], fy: p[1], r: i === 0 || i === 9 ? 2.2 : 1.4, ph: i * 0.93 }));

    // Faint background field — the unnamed stars around the chart.
    const field = [];
    for (let i = 0; i < 45; i++) {
        field.push({
            fx: Math.random(), fy: Math.random() * 0.55,
            r: Math.random() * 0.9 + 0.4,
            ph: Math.random() * Math.PI * 2
        });
    }

    // Ram's-horn volutes — paired Archimedean spirals curled about the Fleece.
    function drawHorn(cx, cy, mirror, rot, alpha) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(mirror, 1);
        ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const turns = 2.6, steps = 90;
        for (let i = 0; i <= steps; i++) {
            const th = (i / steps) * turns * Math.PI * 2;
            const r = 3 + th * 3.1;
            const x = Math.cos(th) * r, y = Math.sin(th) * r * 0.86;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    let t = 0;
    function frame() {
        t += 0.005;
        ctx.clearRect(0, 0, width, height);

        // Night over the Black Sea — obsidian with a bronze-deep base.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,6,9,0.98)');
        lg.addColorStop(0.6, 'rgba(8,8,10,0.97)');
        lg.addColorStop(1, 'rgba(14,11,7,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        // Background field.
        for (const s of field) {
            const tw = 0.5 + 0.5 * Math.sin(t * 0.9 + s.ph);
            ctx.fillStyle = 'rgba(' + BRONZE.r + ',' + BRONZE.g + ',' + BRONZE.b + ',' + (0.05 + 0.10 * tw) + ')';
            ctx.beginPath(); ctx.arc(s.fx * width, s.fy * height, s.r, 0, Math.PI * 2); ctx.fill();
        }

        // The Fleece — one soft golden glow low in the frame, breathing slowly.
        const fx = width * 0.5, fy = height * 0.76;
        const fr = Math.min(width, height) * 0.34;
        const breathe = 0.06 + 0.025 * Math.sin(t * 0.7);
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        glow.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + breathe + ')');
        glow.addColorStop(0.55, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (breathe * 0.4) + ')');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);

        // Ram's-horn volutes turning within the glow, fine gold lines.
        const hornA = 0.13 + 0.03 * Math.sin(t * 0.5);
        drawHorn(fx - 30, fy, 1, t * 0.05, hornA);
        drawHorn(fx + 30, fy, -1, -t * 0.05, hornA);

        // Chart lines between waypoints.
        ctx.strokeStyle = 'rgba(' + BRONZE.r + ',' + BRONZE.g + ',' + BRONZE.b + ',0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < chart.length; i++) {
            const x = chart[i].fx * width, y = chart[i].fy * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Waypoints — bronze stars; origin and destination burn gold.
        for (let i = 0; i < chart.length; i++) {
            const s = chart[i];
            const x = s.fx * width, y = s.fy * height;
            const tw = 0.5 + 0.5 * Math.sin(t * 1.2 + s.ph);
            const endpoint = i === 0 || i === chart.length - 1;
            const c = endpoint ? GOLD : BRONZE;
            const a = endpoint ? 0.45 + 0.35 * tw : 0.25 + 0.30 * tw;
            const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4.5);
            halo.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a * 0.4) + ')');
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(x, y, s.r * 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
        }

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
