// Odysseus — the long voyage home: layered swell, a star-route, wake shimmer (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('sea-voyage-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    const GOLD = hexToRgb('#D4AF37');
    const TEAL = hexToRgb('#1D6F6F');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // The voyage route — a sparse constellation of waypoints arcing across the
    // night sky, the path from Troy back to Ithaka read in stars.
    const route = [];
    const ROUTE_COUNT = 9;
    for (let i = 0; i < ROUTE_COUNT; i++) {
        const k = i / (ROUTE_COUNT - 1);
        route.push({
            fx: 0.07 + k * 0.86,
            fy: 0.13 + 0.11 * Math.sin(k * Math.PI * 0.9) + (i % 2) * 0.04,
            r: i % 3 === 0 ? 2.1 : 1.3,
            ph: i * 1.31
        });
    }

    // Wake shimmer — a few slow glints riding the swell lines.
    const glints = [];
    for (let i = 0; i < 7; i++) {
        glints.push({ band: 1 + (i % 5), off: Math.random(), sp: 0.00016 + Math.random() * 0.00022, ph: Math.random() * Math.PI * 2 });
    }

    // Swell line y for band b at horizontal position x, time t.
    function waveY(b, x, t) {
        const baseY = height * (0.55 + b * 0.075);
        return baseY
            + Math.sin(x * 0.0042 + t * (0.5 + b * 0.09) + b * 1.9) * (7 + b * 2.2)
            + Math.cos(x * 0.0019 - t * 0.3 + b * 0.8) * (4 + b * 1.1);
    }

    let t = 0;
    function frame() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);

        // Night sea — obsidian above, deep teal-dark below.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(4,7,10,0.98)');
        lg.addColorStop(0.5, 'rgba(5,11,14,0.97)');
        lg.addColorStop(1, 'rgba(7,19,22,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        // The star-route, drawn first so the sea lies beneath it.
        ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.09)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 9]);
        ctx.beginPath();
        for (let i = 0; i < route.length; i++) {
            const x = route[i].fx * width, y = route[i].fy * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        for (const s of route) {
            const tw = 0.5 + 0.5 * Math.sin(t * 1.1 + s.ph);
            const a = 0.22 + 0.38 * tw;
            const x = s.fx * width, y = s.fy * height;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, s.r * 5);
            glow.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (a * 0.35) + ')');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, s.r * 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
        }

        // Layered swell — slow horizontal sine lines in deep-sea teal.
        for (let b = 0; b < 6; b++) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 9) {
                const y = waveY(b, x, t);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const gold = b === 2; // one faint gold swell among the teal
            const c = gold ? GOLD : TEAL;
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (gold ? 0.07 : 0.06 + b * 0.014) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Wake shimmer — brief bright segments gliding along the swell.
        for (const g of glints) {
            g.off = (g.off + g.sp) % 1;
            const x = g.off * (width + 160) - 80;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.7 + g.ph);
            for (let s = -3; s <= 3; s++) {
                const sx = x + s * 7;
                const fade = 1 - Math.abs(s) / 4;
                ctx.fillStyle = 'rgba(' + TEAL.r + ',' + (TEAL.g + 40) + ',' + (TEAL.b + 40) + ',' + (0.10 * fade * pulse) + ')';
                ctx.fillRect(sx, waveY(g.band, sx, t) - 0.75, 6, 1.5);
            }
        }

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
