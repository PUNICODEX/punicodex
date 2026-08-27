// Ereshkigal — underworld gates; cuneiform glyphs burn cold; ghost-wind drifts
(function() {
    'use strict';
    const canvas = document.getElementById('ereshkigal-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#CD7F32');
    const S = readColor('data-secondary', '#C2B280');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const glyphs = ['𒀭', '𒊏', '𒆠', '𒂗', '𒆳', '𒄀'];
    const fires = [];
    for (let i = 0; i < 12; i++) fires.push({x: Math.random(), y: Math.random(), phase: i});
    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(8,10,14,0.98)');
        lg.addColorStop(1, 'rgba(12,14,22,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Underworld gates.
        const gx = width / 2, gh = height * 0.55;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.2)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(gx - 140, height); ctx.lineTo(gx - 140, height - gh);
        ctx.arc(gx, height - gh, 140, Math.PI, 0);
        ctx.lineTo(gx + 140, height); ctx.stroke();
        ctx.fillStyle = 'rgba(4,6,10,0.5)'; ctx.fill();
        // Cuneiform glyphs burning cold on the gate.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        for (let i = 0; i < glyphs.length; i++) {
            const x = gx - 90 + i * 36;
            const y = height - gh + 55 + i * 42;
            const a = 0.1 + 0.15 * Math.abs(Math.sin(t * 0.7 + i));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.fillText(glyphs[i], x, y);
        }
        // Cold torches at the threshold.
        for (let side of [-1, 1]) {
            const tx = gx + side * 160;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.25)';
            ctx.beginPath(); ctx.arc(tx, height * 0.62, 35 + 8 * Math.sin(t * 2), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(140,210,255,0.35)';
            ctx.beginPath(); ctx.arc(tx, height * 0.62, 8, 0, Math.PI * 2); ctx.fill();
        }
        // Ghost-wind drifts.
        for (let i = 0; i < 6; i++) {
            const y = height * (0.3 + i * 0.12);
            const grad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.03 + 0.02 * Math.sin(t + i)) + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += 50) ctx.lineTo(x, y + Math.sin(x * 0.006 + t * (0.5 + i * 0.1) + i) * 30);
            ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
