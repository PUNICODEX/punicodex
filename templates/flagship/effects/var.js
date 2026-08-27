// Vár — golden oath-threads and binding vows
(function() {
    'use strict';
    const canvas = document.getElementById('var-goldthread-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fb) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
    }
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#8B4A6B');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const threads = [];
    const THREADS = width < 768 ? 9 : 14;
    for (let i = 0; i < THREADS; i++) {
        threads.push({
            y: height * (0.15 + (i / THREADS) * 0.7),
            amplitude: 18 + Math.random() * 30,
            frequency: 0.004 + Math.random() * 0.005,
            speed: 0.004 + Math.random() * 0.006,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.18 + Math.random() * 0.22,
            width: 1 + Math.random() * 1.5
        });
    }

    const knots = [];
    function spawnKnot() {
        if (reduced || Math.random() > 0.015) return;
        knots.push({
            x: Math.random() * width,
            y: height * (0.2 + Math.random() * 0.6),
            r: 8 + Math.random() * 12,
            life: 1,
            decay: 0.008 + Math.random() * 0.008
        });
    }

    const rings = [];
    for (let i = 0; i < 5; i++) {
        rings.push({
            x: width * (0.15 + Math.random() * 0.7),
            y: height * (0.2 + Math.random() * 0.6),
            r: 25 + Math.random() * 45,
            phase: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.02
        });
    }

    const vows = [];
    function spawnVow() {
        if (reduced || Math.random() > 0.02) return;
        vows.push({
            x: Math.random() * width,
            y: height + 20,
            vy: -0.4 - Math.random() * 0.4,
            size: 10 + Math.random() * 10,
            life: 1,
            glyph: Math.random() > 0.5 ? 'ᚹ' : '✦'
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const t = frame * 0.015;

        // warm twilight background
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${Math.floor(S.r * 0.25)}, ${Math.floor(S.g * 0.18)}, ${Math.floor(S.b * 0.22)}, 0.85)`);
        bg.addColorStop(1, `rgba(${Math.floor(P.r * 0.08)}, ${Math.floor(P.g * 0.08)}, ${Math.floor(P.b * 0.06)}, 0.92)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // oath rings
        rings.forEach(r => {
            const pulse = 0.35 + 0.25 * Math.sin(t * 40 + r.phase);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * (1 + 0.08 * Math.sin(t * 30 + r.phase)), 0, Math.PI * 2);
            ctx.stroke();
        });

        // golden threads
        threads.forEach(th => {
            const yBase = th.y + Math.sin(t * 10 + th.phase) * 4;
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${th.alpha})`;
            ctx.lineWidth = th.width;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 12) {
                const y = yBase + Math.sin(x * th.frequency + t * 30 + th.phase) * th.amplitude;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // sealing knots
        spawnKnot();
        for (let i = knots.length - 1; i >= 0; i--) {
            const k = knots[i];
            k.life -= k.decay;
            if (k.life <= 0) { knots.splice(i, 1); continue; }
            const a = Math.sin(k.life * Math.PI);
            ctx.save();
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = `rgb(${P.r}, ${P.g}, ${P.b})`;
            ctx.lineWidth = 2;
            ctx.translate(k.x, k.y);
            ctx.beginPath();
            for (let n = 0; n < 8; n++) {
                const ang = (n / 8) * Math.PI * 2;
                const rr = k.r * (0.6 + 0.4 * Math.sin(ang * 3 + t * 4));
                const px = Math.cos(ang) * rr;
                const py = Math.sin(ang) * rr;
                if (n === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // rising vow glyphs
        spawnVow();
        for (let i = vows.length - 1; i >= 0; i--) {
            const v = vows[i];
            if (!reduced) { v.y += v.vy; v.life -= 0.006; }
            if (v.life <= 0 || v.y < -30) { vows.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = Math.max(0, v.life * 0.6);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.85)`;
            ctx.font = `${v.size}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(v.glyph, v.x, v.y);
            ctx.restore();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
