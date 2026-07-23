// Argos Panoptes — the hundred eyes, opening and closing in slow vigil (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('watcher-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    const GOLD = hexToRgb('#D4AF37');
    const TEAL = hexToRgb('#2E8B8B');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    // Phyllotaxis — the eyes sown on the golden angle, as on Hera's peacock.
    const eyes = [];
    const EYE_COUNT = 100;
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < EYE_COUNT; i++) {
        const k = i + 0.5;
        eyes.push({
            angle: k * GOLDEN_ANGLE,
            radius: Math.sqrt(k / EYE_COUNT),      // 0..1, scaled at draw time
            size: 6 + 5 * (1 - k / EYE_COUNT),      // inner eyes slightly larger
            open: 1,                                 // 1 = open, 0 = shut
            blink: -1,                               // blink progress, -1 = idle
            blinkDur: 70 + Math.random() * 50,       // frames for one slow blink
            nextBlink: Math.random() * 4000          // frames until first blink
        });
    }
    let blinkBudget = 3; // never more than a few eyes moving at once
    let frameNo = 0;

    // One almond-shaped eye: teal outline, gold pupil, lid as vertical scale.
    function drawEye(x, y, size, rot, open) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, Math.max(0.04, open));

        ctx.strokeStyle = 'rgba(' + TEAL.r + ',' + TEAL.g + ',' + TEAL.b + ',' + (0.14 + 0.16 * open) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(0, -size * 0.72, size, 0);
        ctx.quadraticCurveTo(0, size * 0.72, -size, 0);
        ctx.closePath();
        ctx.stroke();

        if (open > 0.25) {
            const pupilA = 0.30 * (open - 0.25) / 0.75;
            const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
            halo.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + (pupilA * 0.55) + ')');
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',' + pupilA + ')';
            ctx.beginPath(); ctx.arc(0, 0, size * 0.20, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    let t = 0;
    function frame() {
        t += 0.004;
        frameNo++;
        ctx.clearRect(0, 0, width, height);

        // Obsidian field with a faint peacock-teal breath at the core.
        const cx = width * 0.5, cy = height * 0.46;
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(4,7,9,0.98)');
        lg.addColorStop(1, 'rgba(6,12,13,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.5);
        core.addColorStop(0, 'rgba(' + TEAL.r + ',' + TEAL.g + ',' + TEAL.b + ',' + (0.045 + 0.015 * Math.sin(t * 0.6)) + ')');
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, width, height);

        // The hundred eyes — the whole arrangement turning almost still.
        const spread = Math.min(width, height) * 0.46;
        const drift = t * 0.03; // one full turn in many minutes
        let active = 0;
        for (const e of eyes) if (e.blink >= 0) active++;

        for (const e of eyes) {
            // Blink lifecycle — rare, and never more than the budget allows.
            if (e.blink < 0) {
                if (frameNo > e.nextBlink && active < blinkBudget) {
                    e.blink = 0; active++;
                }
            } else {
                e.blink++;
                const p = e.blink / e.blinkDur;         // 0..1
                e.open = 1 - Math.sin(Math.min(p, 1) * Math.PI);
                if (p >= 1) {
                    e.blink = -1; e.open = 1;
                    e.nextBlink = frameNo + 900 + Math.random() * 2600;
                    active--;
                }
            }

            const ang = e.angle + drift;
            const x = cx + Math.cos(ang) * e.radius * spread;
            const y = cy + Math.sin(ang) * e.radius * spread * 0.82;
            drawEye(x, y, e.size, ang + Math.PI / 2, e.open);
        }

        if (!reduced) requestAnimationFrame(frame);
    }
    frame();
})();
