// Gilgamesh — the Cedar Forest and the wedge-written epic (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('cedar-epic-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    const GOLD = hexToRgb('#D4AF37');
    const CEDAR = hexToRgb('#2F4F3E');
    const LAPIS = hexToRgb('#2E4E8F');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const HORIZON = 0.74; // fraction of height — the low desert line

    // The cedars of the forest — tall tapered columns in the relief style,
    // tiered like the trees on Assyrian stone.
    const cedars = [];
    const CEDAR_COUNT = 11;
    for (let i = 0; i < CEDAR_COUNT; i++) {
        cedars.push({
            fx: 0.05 + (i / (CEDAR_COUNT - 1)) * 0.9 + (Math.random() - 0.5) * 0.04,
            h: 0.24 + Math.random() * 0.26,          // fraction of height
            w: 7 + Math.random() * 9,
            tiers: 3 + Math.floor(Math.random() * 2)
        });
    }

    // Cuneiform wedges — small gold triangles adrift like loosened script.
    const wedges = [];
    const WEDGE_COUNT = 24;
    for (let i = 0; i < WEDGE_COUNT; i++) {
        wedges.push({
            x: Math.random(), y: Math.random(),
            size: 2 + Math.random() * 2.4,
            vx: (Math.random() - 0.5) * 0.00008,
            vy: -(0.00006 + Math.random() * 0.00012),
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.001,
            ph: Math.random() * Math.PI * 2
        });
    }

    function drawCedar(x, baseY, h, w, tiers) {
        ctx.fillStyle = 'rgba(' + CEDAR.r + ',' + CEDAR.g + ',' + CEDAR.b + ',0.55)';
        // Trunk — a slim tapered column.
        ctx.beginPath();
        ctx.moveTo(x - w * 0.28, baseY);
        ctx.lineTo(x - w * 0.16, baseY - h * 0.55);
        ctx.lineTo(x + w * 0.16, baseY - h * 0.55);
        ctx.lineTo(x + w * 0.28, baseY);
        ctx.closePath();
        ctx.fill();
        // Tiered crown — stacked wedges narrowing to the tip.
        for (let i = 0; i < tiers; i++) {
            const k = i / tiers;
            const y0 = baseY - h * (0.45 + k * 0.5);
            const ww = w * (1 - k * 0.62);
            const hh = h * (0.30 - k * 0.06);
            ctx.beginPath();
            ctx.moveTo(x - ww, y0);
            ctx.lineTo(x, y0 - hh);
            ctx.lineTo(x + ww, y0);
            ctx.closePath();
            ctx.fill();
        }
    }

    let t = 0;
    function frame() {
        t += 0.005;
        ctx.clearRect(0, 0, width, height);

        // Obsidian sky over the plain.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,6,8,0.98)');
        lg.addColorStop(0.7, 'rgba(7,8,10,0.97)');
        lg.addColorStop(1, 'rgba(9,9,10,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        const horizonY = height * HORIZON;

        // Lapis haze lying along the low desert horizon.
        const haze = ctx.createLinearGradient(0, horizonY - height * 0.16, 0, horizonY + height * 0.05);
        haze.addColorStop(0, 'rgba(' + LAPIS.r + ',' + LAPIS.g + ',' + LAPIS.b + ',0)');
        haze.addColorStop(0.75, 'rgba(' + LAPIS.r + ',' + LAPIS.g + ',' + LAPIS.b + ',' + (0.09 + 0.02 * Math.sin(t * 0.5)) + ')');
        haze.addColorStop(1, 'rgba(' + LAPIS.r + ',' + LAPIS.g + ',' + LAPIS.b + ',0.03)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, horizonY - height * 0.16, width, height * 0.21);

        // The horizon line itself — one fine lapis stroke.
        ctx.strokeStyle = 'rgba(' + LAPIS.r + ',' + LAPIS.g + ',' + LAPIS.b + ',0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();

        // The Cedar Forest standing against the sky.
        for (const c of cedars) {
            drawCedar(c.fx * width, horizonY, c.h * height, c.w, c.tiers);
        }

        // Wedges of the epic drifting up from the tablet-dark.
        for (const wd of wedges) {
            wd.x = (wd.x + wd.vx + 1) % 1;
            wd.y = (wd.y + wd.vy + 1) % 1;
            wd.rot += wd.vr;
            const x = wd.x * width, y = wd.y * height;
            const tw = 0.5 + 0.5 * Math.sin(t * 0.8 + wd.ph);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(wd.rot);
            ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (0.08 + 0.16 * tw) + ')';
            ctx.beginPath();
            ctx.moveTo(0, -wd.size);
            ctx.lineTo(wd.size * 0.8, wd.size * 0.6);
            ctx.lineTo(-wd.size * 0.8, wd.size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
