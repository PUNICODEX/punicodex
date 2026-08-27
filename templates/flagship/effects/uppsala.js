// Uppsala — The Golden Temple and the Sacred Grove (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('temple-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8B96A');
    const S = readColor('data-secondary', '#5E7A5E');
    const GLYPHS = 'ᚢᛒᛒᛋᛅᛚᛅ';
    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);
    const embers = [];
    for (let i = 0; i < 50; i++) {
        embers.push({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: 0.6 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2 });
    }
    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(9,11,13,0.97)');
        lg.addColorStop(1, 'rgba(13,16,14,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.52;
        // Temple silhouette on the ridge — pediment and columns in gold
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.4);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + 0.03 * Math.sin(t * 0.8)) + ')');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.4 + 0.12 * Math.sin(t * 1.1)) + ')';
        ctx.lineWidth = 2;
        const tw = Math.min(width * 0.16, 120), th = Math.min(height * 0.1, 60);
        ctx.beginPath();
        ctx.moveTo(cx - tw, cy); ctx.lineTo(cx, cy - th); ctx.lineTo(cx + tw, cy);
        ctx.moveTo(cx - tw, cy); ctx.lineTo(cx + tw, cy);
        ctx.stroke();
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * (tw * 0.35), cy); ctx.lineTo(cx + i * (tw * 0.35), cy + th * 0.9);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - tw, cy + th * 0.9); ctx.lineTo(cx + tw, cy + th * 0.9);
        ctx.stroke();
        // The sacred grove — nine hanging lights among the branches
        for (let i = 0; i < 9; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const bx = cx + side * (tw + 40 + (i * 17) % 140);
            const by = height * 0.3 + (i * 23) % (height * 0.28);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.28)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(bx, by - 26); ctx.lineTo(bx, by);
            ctx.moveTo(bx, by - 26); ctx.lineTo(bx - 12, by - 38);
            ctx.moveTo(bx, by - 26); ctx.lineTo(bx + 12, by - 36);
            ctx.stroke();
            const a = 0.35 + 0.25 * Math.sin(t * 1.6 + i * 1.3);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI * 2); ctx.fill();
        }
        // Drifting embers rising from the offering fires
        for (let i = 0; i < embers.length; i++) {
            const e = embers[i];
            e.y -= e.v * 0.01;
            if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
            const ex = e.x * width + Math.sin(t + e.ph) * 12;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + 0.08 * Math.sin(t * 2 + e.ph)) + ')';
            ctx.beginPath(); ctx.arc(ex, e.y * height, e.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.2);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
