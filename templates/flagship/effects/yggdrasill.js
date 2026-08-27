// Yggdrasill — The World Ash (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('worldash-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8FBF8F');   // ash green
    const S = readColor('data-secondary', '#C8B06A'); // well gold
    const GLYPHS = 'ᚢᚴᚴᛏᚱᛅᛋᛁᛚᛚ';
    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // ---- Tree skeleton: recursive branches, generated once ----
    const branches = [];
    function grow(x, y, angle, len, depth) {
        if (depth > 7 || len < 6) return;
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        branches.push({ x1: x, y1: y, x2: x2, y2: y2, depth: depth, phase: Math.random() * Math.PI * 2 });
        const spread = 0.45 + Math.random() * 0.25;
        grow(x2, y2, angle - spread, len * (0.68 + Math.random() * 0.1), depth + 1);
        grow(x2, y2, angle + spread, len * (0.68 + Math.random() * 0.1), depth + 1);
        if (depth < 3) grow(x2, y2, angle + (Math.random() - 0.5) * 0.3, len * 0.6, depth + 1);
    }
    function buildTree() {
        branches.length = 0;
        grow(width / 2, height * 0.86, -Math.PI / 2, height * 0.16, 0);
    }
    buildTree(); window.addEventListener('resize', buildTree);

    // ---- Falling leaves ----
    const leaves = [];
    for (let i = 0; i < 28; i++) {
        leaves.push({
            x: Math.random(), y: Math.random(),
            sp: 0.0004 + Math.random() * 0.0009,
            sw: Math.random() * Math.PI * 2,
            r: 1.4 + Math.random() * 2.2,
            a: 0.12 + Math.random() * 0.2
        });
    }

    // ---- Rising runes along the trunk ----
    const runes = GLYPHS.split('').map((ch, i) => ({ ch: ch, off: i / GLYPHS.length }));

    let t = 0;
    function draw() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(7,10,9,0.97)');
        lg.addColorStop(1, 'rgba(11,15,12,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        const cx = width / 2, baseY = height * 0.86;

        // Three wells: pulsing glows at the root line
        for (let i = 0; i < 3; i++) {
            const wx = cx + (i - 1) * Math.min(width * 0.22, 220);
            const wy = baseY + height * 0.06;
            const pulse = 0.10 + 0.06 * Math.sin(t * 1.4 + i * 2.1);
            const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 60);
            g.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + pulse + ')');
            g.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(wx, wy, 60, 0, Math.PI * 2); ctx.fill();
            // root line from trunk to well
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cx, baseY);
            ctx.quadraticCurveTo((cx + wx) / 2, baseY + 14, wx, wy);
            ctx.stroke();
        }

        // Branches with wind sway by depth
        ctx.lineCap = 'round';
        for (const b of branches) {
            const sway = Math.sin(t * 0.9 + b.phase) * b.depth * 0.7;
            const alpha = 0.30 - b.depth * 0.028;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + Math.max(alpha, 0.05) + ')';
            ctx.lineWidth = Math.max(3.4 - b.depth * 0.45, 0.5);
            ctx.beginPath();
            ctx.moveTo(b.x1 + sway * 0.3, b.y1);
            ctx.lineTo(b.x2 + sway, b.y2);
            ctx.stroke();
        }

        // Eagle circling the crown
        const ea = t * 0.35;
        const ex = cx + Math.cos(ea) * Math.min(width * 0.18, 160);
        const ey = height * 0.16 + Math.sin(ea * 1.7) * 10;
        ctx.strokeStyle = 'rgba(210,214,208,0.35)';
        ctx.lineWidth = 1.2;
        const wing = 5 + Math.sin(t * 6) * 2;
        ctx.beginPath();
        ctx.moveTo(ex - wing, ey - Math.sin(t * 6) * 2);
        ctx.quadraticCurveTo(ex, ey + 2, ex + wing, ey - Math.sin(t * 6) * 2);
        ctx.stroke();

        // Ratatoskr: a bright dot running the trunk, up and down
        const climb = (t * 0.11) % 2;
        const ry = baseY - (climb < 1 ? climb : 2 - climb) * (baseY - height * 0.22);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.55)';
        ctx.beginPath(); ctx.arc(cx + Math.sin(t * 8) * 2, ry, 2.2, 0, Math.PI * 2); ctx.fill();

        // Runes rising along the trunk
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.028) + 'px serif';
        for (const rn of runes) {
            const z = (t * 0.05 + rn.off) % 1;
            const yy = baseY - z * (baseY - height * 0.2);
            ctx.globalAlpha = 0.30 * Math.sin(z * Math.PI);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(rn.ch, cx + Math.sin(z * 6 + rn.off * 9) * 14, yy);
        }
        ctx.globalAlpha = 1;

        // Falling leaves
        for (const lf of leaves) {
            lf.y += lf.sp; lf.sw += 0.015;
            if (lf.y > 1.02) { lf.y = -0.02; lf.x = Math.random(); }
            ctx.globalAlpha = lf.a;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
            ctx.beginPath();
            ctx.ellipse(lf.x * width + Math.sin(lf.sw) * 18, lf.y * height, lf.r, lf.r * 0.6, lf.sw, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Runic name, faint, above the crown
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.1);
        ctx.globalAlpha = 1;

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
