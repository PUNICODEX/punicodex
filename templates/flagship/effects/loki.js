// Loki — The Flame That Shifts (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('flameshift-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E2592A');
    const S = readColor('data-secondary', '#8FA3B8');
    const GLYPHS = 'ᛚᛟᚲᛁ';

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
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,10,10,0.97)');
        lg.addColorStop(1, 'rgba(18,12,10,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const base = height * 0.92;
        // Flame tongues — never the same shape twice, the fire that is also not fire.
        const tongues = 11;
        for (let i = 0; i < tongues; i++) {
            const x = width * (0.08 + 0.84 * (i / (tongues - 1)));
            const h0 = height * (0.16 + 0.09 * Math.sin(t * 2.1 + i * 2.3) + 0.05 * Math.sin(t * 5.7 + i));
            const lean = 24 * Math.sin(t * 1.3 + i * 1.1);
            const a = 0.16 + 0.1 * Math.abs(Math.sin(t * 2.4 + i * 0.9));
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 5 + 3 * Math.sin(t * 3 + i);
            ctx.beginPath();
            ctx.moveTo(x, base);
            ctx.bezierCurveTo(x + lean * 0.3, base - h0 * 0.4, x + lean, base - h0 * 0.7, x + lean * 1.2, base - h0);
            ctx.stroke();
            // Inner brighter core of each tongue.
            ctx.strokeStyle = 'rgba(255,214,140,' + (a * 0.5) + ')';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(x, base);
            ctx.bezierCurveTo(x + lean * 0.3, base - h0 * 0.35, x + lean * 0.8, base - h0 * 0.6, x + lean, base - h0 * 0.85);
            ctx.stroke();
        }
        // The serpent above — the drip of venom toward the bound god's face, Sigyn's bowl never full.
        const sy = height * 0.2;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.3)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 12) {
            const y = sy + Math.sin(x * 0.012 + t * 0.8) * 10;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        const dripX = width * 0.5 + Math.sin(t * 0.8) * 30;
        const dripY = sy + 12 + ((t * 60) % (height * 0.5));
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        ctx.beginPath(); ctx.arc(dripX, dripY, 2.2, 0, Math.PI * 2); ctx.fill();
        // Smoke wisps curling through the flame.
        for (let i = 0; i < 16; i++) {
            const seed = i * 0.618;
            const x = ((seed * 577 + t * 0.02 * (1 + (i % 3) * 0.4)) % 1) * width;
            const y = height * 0.7 - ((seed * 311 + t * 0.05) % 1) * height * 0.5;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.03 + 0.03 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 8 + 4 * Math.sin(t * 0.7 + i);
            ctx.beginPath(); ctx.arc(x, y, 10 + 8 * Math.sin(t * 0.5 + i), 0, Math.PI * 1.2); ctx.stroke();
        }
        // The trickster's name in runes.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 1.1);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.36);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
