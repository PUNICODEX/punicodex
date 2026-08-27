// Ullr — The Yew-Dales (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('ydalir-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8D8E8');
    const S = readColor('data-secondary', '#5E7A6A');
    const GLYPHS = 'ᚢᛚᛚᚱ';
    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);
    // Snowfall over the yew-dales
    const flakes = [];
    for (let i = 0; i < 160; i++) {
        flakes.push({
            x: Math.random(), y: Math.random(),
            r: 0.7 + Math.random() * 1.7,
            v: 0.0004 + Math.random() * 0.0009,
            sway: Math.random() * Math.PI * 2,
            amp: 0.2 + Math.random() * 0.5,
            a: 0.25 + Math.random() * 0.45
        });
    }
    // Yew silhouettes along the treeline (deterministic heights)
    const trees = [];
    for (let i = 0; i < 26; i++) {
        trees.push({ x: i / 25, h: 0.05 + ((i * 7919) % 13) / 13 * 0.09, w: 0.014 + ((i * 104729) % 7) / 7 * 0.012 });
    }
    // Arrows arcing through the frame
    const arrows = [];
    function spawnArrow() {
        const fromLeft = Math.random() < 0.5;
        arrows.push({
            x: fromLeft ? -30 : width + 30,
            y: height * (0.18 + Math.random() * 0.3),
            vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 4),
            vy: 0.4 + Math.random() * 0.8,
            trail: []
        });
    }
    let t = 0, arrowTimer = 0;
    function draw() {
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        // Winter-night sky
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(8,11,15,0.97)');
        lg.addColorStop(1, 'rgba(12,17,20,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Low moon-haze over the dales
        const hg = ctx.createRadialGradient(width * 0.7, height * 0.3, 0, width * 0.7, height * 0.3, height * 0.45);
        hg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.06)');
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(0, 0, width, height);
        // Rune row
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        // Yew treeline
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.55)';
        trees.forEach(function(tr) {
            const tx = tr.x * width, th = tr.h * height, tw = tr.w * width, base = height * 0.82;
            ctx.beginPath();
            ctx.moveTo(tx, base - th);
            ctx.lineTo(tx + tw, base);
            ctx.lineTo(tx - tw, base);
            ctx.closePath();
            ctx.fill();
        });
        // Ground snowline
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, height * 0.82); ctx.lineTo(width, height * 0.82); ctx.stroke();
        // Arrows
        arrowTimer--;
        if (!reduced && arrowTimer <= 0 && arrows.length < 2) { spawnArrow(); arrowTimer = 300 + Math.random() * 260; }
        for (let i = arrows.length - 1; i >= 0; i--) {
            const a = arrows[i];
            a.x += a.vx; a.y += a.vy;
            a.trail.push({ x: a.x, y: a.y, life: 26 });
            if (a.trail.length > 26) a.trail.shift();
            a.trail.forEach(function(tp) {
                tp.life--;
                ctx.globalAlpha = Math.max(0, tp.life / 26) * 0.4;
                ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
                ctx.beginPath(); ctx.arc(tp.x, tp.y, 1.1, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
            ctx.beginPath(); ctx.arc(a.x, a.y, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            if (a.x < -60 || a.x > width + 60 || a.y > height) arrows.splice(i, 1);
        }
        // Snow
        flakes.forEach(function(f) {
            f.sway += 0.015;
            f.y += f.v; f.x += Math.sin(f.sway) * f.amp * 0.0006;
            if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
            if (f.x > 1.02) f.x = -0.02; if (f.x < -0.02) f.x = 1.02;
            ctx.globalAlpha = f.a;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
            ctx.beginPath(); ctx.arc(f.x * width, f.y * height, f.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
