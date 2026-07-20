// Yamunā — The Confluence (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('confluence-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#2E3A59');
    const S = readColor('data-secondary', '#8C93A8');
    const GLYPHS = 'यमुनाॐ';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    let t = 0;
    // Two braided currents meeting at the triveni point.
    function braid(cx, y, phase, spread) {
        return cx + Math.sin(y * 0.008 + phase + t * 0.5) * spread * (1 - y / (height * 1.4));
    }
    function draw() {
        t += 0.011;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,7,14,0.97)'); lg.addColorStop(1, 'rgba(10,14,24,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, meet = height * 0.62;
        // Left current (Yamunā) and right current (Gaṅgā) converging.
        for (const [ox, col, phase] of [[-width * 0.22, S, 0], [width * 0.22, P, 2.1]]) {
            for (let s = -2; s <= 2; s++) {
                ctx.beginPath();
                for (let y = 0; y <= meet + height * 0.2; y += 8) {
                    const prog = Math.min(1, y / meet);
                    const x = cx + ox * (1 - prog) + braid(0, y, phase + s * 0.7, width * 0.03) + s * 7;
                    if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (0.10 + 0.04 * Math.sin(t + s)) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        // The sangam glow where they meet.
        const glow = ctx.createRadialGradient(cx, meet, 0, cx, meet, width * 0.18);
        glow.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.22 + 0.08 * Math.sin(t)) + ')');
        glow.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, meet, width * 0.18, 0, Math.PI * 2); ctx.fill();
        // Merged current continuing downward.
        for (let s = -2; s <= 2; s++) {
            ctx.beginPath();
            for (let y = meet; y <= height; y += 8) {
                const x = cx + braid(0, y, s, width * 0.04);
                if (y === meet) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.12 + 0.04 * Math.sin(t + s * 2)) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';
        for (let i = 0; i < GLYPHS.length; i++) {
            ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.6 + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(GLYPHS[i], width * (0.34 + i * 0.11), height * 0.12);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
