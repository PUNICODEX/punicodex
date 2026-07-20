// Sarasvatī — The River of Eloquence (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('veena-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }
    const P = readColor('data-primary', '#F5F0E1');
    const S = readColor('data-secondary', '#D4AF37');
    const GLYPHS = 'सरस्वतीवाग्देवीॐ';

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

    // Veena strings: 7 horizontal strings vibrating across the hero.
    const STRINGS = 7;
    // River motes: Devanagari glyphs drifting downstream.
    const motes = [];
    for (let i = 0; i < 40; i++) motes.push({
        x: Math.random(), y: Math.random(),
        v: 0.0003 + Math.random() * 0.0009,
        g: Math.random(),
        ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        size: 10 + Math.random() * 16,
    });

    let t = 0;
    function draw() {
        t += 0.016;
        ctx.clearRect(0, 0, width, height);
        // Deep river-night gradient.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(4,6,14,0.96)');
        lg.addColorStop(0.55, 'rgba(8,12,26,0.9)');
        lg.addColorStop(1, 'rgba(10,8,20,0.98)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        // Veena strings with traveling vibration.
        for (let s = 0; s < STRINGS; s++) {
            const yBase = height * (0.2 + (s / (STRINGS - 1)) * 0.6);
            ctx.beginPath();
            const phase = t * (0.6 + s * 0.13);
            for (let x = 0; x <= width; x += 8) {
                const amp = (2 + s) * 0.9 * Math.exp(-Math.abs(x - width / 2) / (width * 0.45));
                const y = yBase + Math.sin(x * 0.012 + phase) * amp;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const glow = 0.12 + 0.1 * Math.sin(phase * 0.7);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.25 + glow) + ')';
            ctx.lineWidth = s === 3 ? 1.4 : 0.8;
            ctx.stroke();
        }

        // River motes drifting left-to-right like syllables on water.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const m of motes) {
            m.x += m.v;
            if (m.x > 1.05) { m.x = -0.05; m.y = Math.random(); }
            const x = m.x * width;
            const y = m.y * height + Math.sin(t * 0.8 + m.g * 6.28) * 12;
            ctx.globalAlpha = 0.08 + m.g * 0.3;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.font = m.size + 'px serif';
            ctx.fillText(m.ch, x, y);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
