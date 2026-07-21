// Śākyamuni — The Wheel Beneath the Bodhi Tree (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('bodhi-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#9A6A2E');
    const S = readColor('data-secondary', '#E0C9A0');
    const GLYPHS = 'शाक्यमुनि';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const leaves = [];
    for (let i = 0; i < 10; i++) leaves.push({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0008, p: Math.random() * 6.28, s: 5 + Math.random() * 6 });
    let t = 0;
    function draw() {
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(13,9,4,0.98)');
        lg.addColorStop(1, 'rgba(19,13,6,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.48, R = Math.min(width, height) * 0.2;
        // The dharma wheel: eight spokes in slow, even turning.
        const rot = t * 0.04;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)';
        ctx.lineWidth = 1.1; ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const a = rot + i * Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * R * 0.18, cy + Math.sin(a) * R * 0.18);
            ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.3)';
            ctx.lineWidth = 1.2; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)';
        ctx.lineWidth = 1.2; ctx.stroke();
        // Serene ripples of the awakening, expanding without haste.
        for (let i = 0; i < 4; i++) {
            const p = ((t * 0.07 + i / 4) % 1);
            ctx.beginPath(); ctx.arc(cx, cy, R + p * R * 1.6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.14 * (1 - p)) + ')';
            ctx.lineWidth = 1; ctx.stroke();
        }
        // Bodhi leaves falling through the still air.
        for (const l of leaves) {
            l.y += l.v; if (l.y > 1.05) { l.y = -0.05; l.x = Math.random(); }
            const x = l.x * width + Math.sin(t * 0.9 + l.p) * 22;
            const y = l.y * height;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.7 + l.p) * 0.5);
            ctx.globalAlpha = 0.14;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -l.s); ctx.quadraticCurveTo(l.s * 0.7, 0, 0, l.s); ctx.quadraticCurveTo(-l.s * 0.7, 0, 0, -l.s); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        // The sage's name below the wheel.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy + R + Math.min(width, height) * 0.09);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
