// ʾAṯiratu — The Lady Who Walks on the Sea (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('seamother-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E3A5A');
    const S = readColor('data-secondary', '#7FA8C8');
    const GLYPHS = '𐎀𐎘𐎗𐎚';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // The seventy sons — faint motes gathered around the mother-of-gods glow.
    const sons = [];
    for (let i = 0; i < 70; i++) {
        const a = (i / 70) * Math.PI * 2;
        sons.push({ a, r: 0.18 + 0.22 * Math.sin(i * 2.7) + (i % 7) * 0.012, sp: 0.02 + (i % 5) * 0.004, ph: i * 0.9 });
    }

    let t = 0;
    function frame() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);

        // Deep sea gradient
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,10,18,0.98)');
        lg.addColorStop(0.55, 'rgba(8,18,30,0.97)');
        lg.addColorStop(1, 'rgba(10,24,38,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        const horizon = height * 0.42;

        // Distant moon-glow on the water — the light of ʾIlu's court.
        const glow = ctx.createRadialGradient(width * 0.5, horizon, 0, width * 0.5, horizon, height * 0.5);
        glow.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.10 + 0.02 * Math.sin(t * 0.8)) + ')');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // The path of light — her walk upon the sea: a trembling column of
        // reflected light from the horizon down to the viewer.
        const pathW = width * 0.045;
        for (let y = horizon; y < height; y += 6) {
            const k = (y - horizon) / (height - horizon);
            const wob = Math.sin(y * 0.028 + t * 2.2) * (6 + 14 * k) + Math.sin(y * 0.011 - t * 1.4) * 8 * k;
            const alpha = 0.05 + 0.11 * k * (0.75 + 0.25 * Math.sin(t * 1.6 + y * 0.05));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + Math.max(0, alpha) + ')';
            ctx.fillRect(width * 0.5 + wob - pathW * (0.4 + k) / 2, y, pathW * (0.4 + k), 3.5);
        }

        // Layered swell — slow bands below the horizon.
        for (let b = 0; b < 7; b++) {
            const yBase = horizon + 14 + b * (height - horizon) * 0.115;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const y = yBase + Math.sin(x * 0.005 + t * (0.55 + b * 0.1) + b * 1.7) * (5 + b * 1.6);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.06 + b * 0.008) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // The seventy sons, orbiting the mother's glow above the waterline.
        const cx = width * 0.5, cy = horizon * 0.72;
        for (const s of sons) {
            const ang = s.a + t * s.sp;
            const rr = s.r * Math.min(width, height);
            const x = cx + Math.cos(ang) * rr;
            const y = cy + Math.sin(ang) * rr * 0.38;
            const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.ph);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.05 + 0.12 * tw) + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.1 + tw * 0.7, 0, Math.PI * 2); ctx.fill();
        }

        // Her name in the Ugaritic alphabet, drifting faintly over the sea.
        ctx.font = '300 ' + Math.max(34, Math.min(64, width * 0.045)) + 'px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.10 + 0.03 * Math.sin(t)) + ')';
        ctx.fillText(GLYPHS, width * 0.5, horizon * 0.5);

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
