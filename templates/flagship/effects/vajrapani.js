// Vajrapāṇi — The Bearer of the Thunderbolt (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('vajra-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E2E4A');
    const S = readColor('data-secondary', '#7F9AB8');
    const GLYPHS = 'वज्रपाणि';

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
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(6,9,15,0.98)');
        lg.addColorStop(1, 'rgba(10,14,22,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.52, R = Math.min(width, height);
        // The fivefold symmetry: two pentagons turning slowly behind the vajra.
        for (let q = 0; q < 2; q++) {
            const rot = t * 0.05 + q * Math.PI / 5;
            ctx.beginPath();
            for (let k = 0; k <= 5; k++) {
                const a = rot + k * Math.PI * 2 / 5;
                const x = cx + Math.cos(a) * R * 0.2, y = cy + Math.sin(a) * R * 0.2;
                if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.16 + 0.04 * Math.sin(t * 0.8)) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // The vajra: central rod, hub, grip rings, and the prongs that curve home.
        const L = R * 0.3;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - L, cy); ctx.lineTo(cx + L, cy); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.035, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx - L * 0.45, cy, R * 0.018, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + L * 0.45, cy, R * 0.018, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)';
        ctx.lineWidth = 1.2;
        for (let si = 0; si < 2; si++) {
            const s = si === 0 ? -1 : 1;
            for (let k = 0; k < 5; k++) {
                const spread = (k - 2) * R * 0.028;
                ctx.beginPath();
                ctx.moveTo(cx + s * L * 0.5, cy);
                ctx.quadraticCurveTo(cx + s * L * 0.92, cy + spread * 2.2, cx + s * L, cy);
                ctx.stroke();
            }
        }
        // Lightning in the indigo sky: rare, precise arcs.
        for (let i = 0; i < 3; i++) {
            const flash = Math.sin(t * 0.7 + i * 2.1);
            if (flash > 0.86) {
                const a = Math.min((flash - 0.86) * 4, 0.5);
                let lx = width * (0.15 + i * 0.3), ly = height * 0.08;
                ctx.beginPath(); ctx.moveTo(lx, ly);
                for (let k = 0; k < 6; k++) {
                    lx += Math.sin(i * 7 + k * 3.3) * width * 0.03;
                    ly += height * 0.07;
                    ctx.lineTo(lx, ly);
                }
                ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
                ctx.lineWidth = 1.1; ctx.stroke();
            }
        }
        // The bearer's name beneath the vajra.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy + R * 0.3);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
