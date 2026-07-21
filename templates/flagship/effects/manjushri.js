// Mañjuśrī — The Flaming Sword of Wisdom (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('wisdomsword-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8A4A1E');
    const S = readColor('data-secondary', '#D8A87F');
    const GLYPHS = 'मञ्जुश्री';
    const SYLLABLES = ['अ', 'र', 'प', 'त्स', 'न'];

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
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, width, height);
        lg.addColorStop(0, 'rgba(14,8,5,0.98)');
        lg.addColorStop(1, 'rgba(20,11,6,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.52, R = Math.min(width, height);
        // The blade: a single diagonal from lower-left hilt to upper-right point.
        const hx = cx - R * 0.22, hy = cy + R * 0.18, tx = cx + R * 0.26, ty = cy - R * 0.24;
        const bx = tx - hx, by = ty - hy, bl = Math.sqrt(bx * bx + by * by);
        const ux = bx / bl, uy = by / bl, nx = -uy, ny = ux;
        const hw = R * 0.012;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(hx + nx * hw, hy + ny * hw); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - nx * hw, hy - ny * hw); ctx.lineTo(tx, ty); ctx.stroke();
        // The fuller, running the length of the blade.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx - ux * R * 0.03, ty - uy * R * 0.03); ctx.stroke();
        // The crossguard, hilt, and pommel.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hx + nx * hw * 3.2, hy + ny * hw * 3.2);
        ctx.lineTo(hx - nx * hw * 3.2, hy - ny * hw * 3.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - ux * R * 0.05, hy - uy * R * 0.05);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(hx - ux * R * 0.06, hy - uy * R * 0.06, R * 0.008, 0, Math.PI * 2); ctx.stroke();
        // The flame on the edge: motes burning along the blade.
        for (let i = 0; i < 22; i++) {
            const p = i / 22;
            const jx = Math.sin(i * 12.9898) * 43758.5453;
            const jr = jx - Math.floor(jx);
            const side = i % 2 === 0 ? 1 : -1;
            const fx = hx + bx * p + nx * side * (hw + jr * R * 0.01) + Math.sin(t * 3 + i) * 1.5;
            const fy = hy + by * p + ny * side * (hw + jr * R * 0.01) + Math.cos(t * 2.6 + i) * 1.5;
            ctx.globalAlpha = 0.15 + 0.3 * Math.abs(Math.sin(t * 2 + i * 1.7));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(fx, fy, 0.8 + jr * 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // The mantra turning about the blade: A RA PA TSA NA.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.035) + 'px serif';
        for (let i = 0; i < SYLLABLES.length; i++) {
            const a = -t * 0.06 + i * Math.PI * 2 / SYLLABLES.length;
            const sx = cx + Math.cos(a) * R * 0.34, sy = cy + Math.sin(a) * R * 0.3;
            ctx.globalAlpha = 0.22 + 0.1 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(SYLLABLES[i], sx, sy);
        }
        // His name below the hilt.
        ctx.font = Math.round(R * 0.05) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.7);
        ctx.fillText(GLYPHS, cx, cy + R * 0.36);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
