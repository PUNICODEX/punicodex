// Sigyn — The Venom Basin (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('venombasin-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A9C39A');
    const S = readColor('data-secondary', '#8A8272');
    const GLYPHS = 'ᛋᛁᚴᚢᚾ';

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
    function draw() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(9,11,10,0.97)');
        lg.addColorStop(1, 'rgba(14,16,14,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, snakeY = height * 0.14, basinY = height * 0.52, faceY = height * 0.82;
        // The basin's cycle: it fills, she turns away to empty it, and it returns.
        const cycle = (t * 0.11) % 1;
        const away = cycle > 0.82 && cycle < 0.95;
        const fill = Math.min(cycle / 0.82, 1);
        // The tremor while the bowl is lifted — Loki's writhing, the shaking earth.
        const tremor = away ? 3.5 * Math.sin(t * 90) : 0;
        ctx.save();
        ctx.translate(tremor, away ? 2 * Math.sin(t * 73) : 0);
        // Skaði's snake above, a cold fixed arc.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 + 0.08 * Math.sin(t * 0.9)) + ')';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx - height * 0.16, snakeY);
        ctx.quadraticCurveTo(cx - 10, snakeY - 26, cx + 6, snakeY - 6);
        ctx.quadraticCurveTo(cx + 14, snakeY + 4, cx + 2, snakeY + 12);
        ctx.stroke();
        // Venom drops falling from the fang — caught while the bowl is held, unchecked when it is away.
        for (let i = 0; i < 7; i++) {
            const fall = ((t * 0.16 + i / 7) % 1);
            const y = snakeY + 14 + fall * (faceY - snakeY - 14);
            const caught = !away && y > basinY - 8;
            if (caught) continue;
            const a = 0.16 + 0.22 * (1 - fall) + 0.05 * Math.sin(t * 2 + i);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(cx + 2, y, 1.6 + fall * 0.9, 0, Math.PI * 2); ctx.fill();
        }
        // The basin itself, held over him — sliding aside only to be emptied.
        const bx = cx + (away ? -height * 0.22 : 0);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (away ? 0.35 : 0.6) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(bx - 34, basinY);
        ctx.quadraticCurveTo(bx, basinY + 30, bx + 34, basinY);
        ctx.stroke();
        // The gathered venom rising toward the brim as the basin fills.
        if (!away) {
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + fill * 0.22) + ')';
            ctx.beginPath();
            ctx.ellipse(bx, basinY + 10 - fill * 4, 26 * (0.5 + fill * 0.5), 4 + fill * 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // The faint presence below the bowl — the bound one, never shown, only lit.
        const glow = ctx.createRadialGradient(cx, faceY, 2, cx, faceY, 60);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (away ? 0.12 : 0.05) + ')');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, faceY, 60, 0, Math.PI * 2); ctx.fill();
        // The name in runes, above the snake.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, cx, height * 0.07);
        ctx.globalAlpha = 1;
        ctx.restore();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
