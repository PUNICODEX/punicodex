// Akṣobhya — The Unshakable Mirror (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('stillmirror-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E3A5A');
    const S = readColor('data-secondary', '#8FB8D8');
    const GLYPHS = 'अक्षोभ्य';

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
        lg.addColorStop(0, 'rgba(5,9,14,0.98)');
        lg.addColorStop(1, 'rgba(8,14,21,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, my = height * 0.52, R = Math.min(width, height);
        // The unshakable: rings that do not move.
        for (let i = 1; i <= 7; i++) {
            ctx.beginPath(); ctx.arc(cx, my, R * 0.06 * i, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 - i * 0.03) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // The mirror of wisdom: a still water-line across the world.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.32)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(width * 0.08, my); ctx.lineTo(width * 0.92, my); ctx.stroke();
        // Above: the mountain of the vajra-throne, unmoved.
        const mw = R * 0.22, mh = R * 0.18;
        ctx.beginPath(); ctx.moveTo(cx - mw, my); ctx.lineTo(cx, my - mh); ctx.lineTo(cx + mw, my);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)';
        ctx.lineWidth = 1.3; ctx.stroke();
        // Below: its reflection, exact — save for the faintest tremor of the water.
        const tremor = Math.sin(t * 0.5) * 1.5;
        ctx.beginPath(); ctx.moveTo(cx - mw, my);
        ctx.lineTo(cx + tremor, my + mh);
        ctx.lineTo(cx + mw, my);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.16 + 0.03 * Math.sin(t * 0.5)) + ')';
        ctx.lineWidth = 1.1; ctx.stroke();
        // A single point of blue, breathing so slowly it scarcely moves.
        const glow = ctx.createRadialGradient(cx, my, 0, cx, my, R * 0.12);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.5 + 0.1 * Math.sin(t * 0.4)) + ')');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, my, R * 0.12, 0, Math.PI * 2); ctx.fill();
        // The immovable one's name above the peak.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.03 * Math.sin(t * 0.4);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, my - mh - R * 0.06);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
