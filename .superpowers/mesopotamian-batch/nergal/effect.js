/**
 * NERGAL — Underworld Furnace
 * Self-executing hero canvas effect for the Mesopotamian lord of war, plague,
 * and the underworld: drifting embers, cuneiform glyphs, pulsing lion eyes,
 * and the slow breath of a subterranean furnace.
 */
(function() {
    'use strict';

    const canvas = document.getElementById('nergal-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fb) {
        const v = canvas.getAttribute(attr);
        return (v && v.startsWith('#')) ? hexToRgb(v) : hexToRgb(fb);
    }

    function rgba(c, a) {
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
    }

    const P = readColor('data-primary', '#C25E00');
    const S = readColor('data-secondary', '#8B2E2E');

    let width, height, dpr;

    const glyphs = ['𒀭', '𒄊', '𒇽', '𒃲', '𒆳', '𒆠'];
    let glyphItems = [];
    let embers = [];
    let smoke = [];

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seedEmbers();
        seedSmoke();
        seedGlyphs();
    }

    function seedEmbers() {
        embers = [];
        const count = Math.max(40, Math.min(100, Math.floor((width * height) / 25000)));
        for (let i = 0; i < count; i++) {
            embers.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 0.6 + Math.random() * 2.2,
                vy: -(0.15 + Math.random() * 0.55),
                vx: (Math.random() - 0.5) * 0.25,
                phase: Math.random() * Math.PI * 2,
                speed: 0.03 + Math.random() * 0.05,
                warm: Math.random() < 0.6
            });
        }
    }

    function seedSmoke() {
        smoke = [];
        const count = Math.max(6, Math.min(14, Math.floor(width / 120)));
        for (let i = 0; i < count; i++) {
            smoke.push({
                xFrac: 0.1 + Math.random() * 0.8,
                yFrac: 0.65 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                speed: 0.002 + Math.random() * 0.003,
                widthFrac: 0.08 + Math.random() * 0.12,
                alpha: 0.03 + Math.random() * 0.04
            });
        }
    }

    function seedGlyphs() {
        glyphItems = [];
        for (let i = 0; i < glyphs.length; i++) {
            glyphItems.push({
                char: glyphs[i],
                x: width * (0.15 + (i / Math.max(glyphs.length - 1, 1)) * 0.7 + (Math.random() - 0.5) * 0.1),
                y: height * (0.2 + Math.random() * 0.5),
                size: Math.min(width, height) * (0.035 + Math.random() * 0.025),
                phase: Math.random() * Math.PI * 2,
                speed: 0.005 + Math.random() * 0.01
            });
        }
    }

    function drawEmbers(t) {
        for (const e of embers) {
            e.phase += e.speed;
            e.x += e.vx + Math.sin(e.phase) * 0.2;
            e.y += e.vy;
            if (e.y < -10) {
                e.y = height + 10;
                e.x = Math.random() * width;
            }
            if (e.x < -10) e.x = width + 10;
            if (e.x > width + 10) e.x = -10;

            const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(e.phase));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = e.warm ? rgba(P, 1) : rgba(S, 1);
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawSmoke(t) {
        for (const s of smoke) {
            s.phase += s.speed;
            const x = width * s.xFrac + Math.sin(s.phase) * width * 0.03;
            const y = height * s.yFrac - (t * 0.05) % (height * 0.4);
            const w = width * s.widthFrac;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, w);
            grad.addColorStop(0, rgba(S, s.alpha));
            grad.addColorStop(0.6, rgba(S, s.alpha * 0.5));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(x, y, w, w * 0.35, Math.sin(s.phase * 0.7) * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawFurnace(t) {
        const cx = width * 0.5;
        const cy = height * 0.72;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.003);
        const r = Math.max(width, height) * 0.7;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, rgba(P, 0.12 + pulse * 0.05));
        grad.addColorStop(0.45, rgba(S, 0.06 + pulse * 0.03));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    function drawLionEyes(t) {
        const cx = width * 0.5;
        const cy = height * 0.42;
        const eyeSpacing = Math.min(width, height) * 0.045;
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.004);

        ctx.save();
        ctx.shadowBlur = 24 + pulse * 16;
        ctx.shadowColor = rgba(P, 0.9);
        ctx.fillStyle = rgba(P, 0.8 + pulse * 0.2);

        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(cx + side * eyeSpacing, cy, 7, 4, side * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(10,5,5,0.55)';
        ctx.beginPath();
        ctx.moveTo(cx - eyeSpacing * 1.6, cy + 18);
        ctx.quadraticCurveTo(cx, cy + 28, cx + eyeSpacing * 1.6, cy + 18);
        ctx.lineTo(cx + eyeSpacing * 1.4, cy + 24);
        ctx.quadraticCurveTo(cx, cy + 36, cx - eyeSpacing * 1.4, cy + 24);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawGlyphs(t) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';

        for (const g of glyphItems) {
            g.phase += g.speed;
            const alpha = 0.06 + 0.06 * (0.5 + 0.5 * Math.sin(g.phase));
            const y = g.y + Math.sin(g.phase * 0.5) * height * 0.015;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = rgba(P, 1);
            ctx.fillText(g.char, g.x, y);
            ctx.restore();
        }
    }

    let t = 0;
    function draw() {
        if (!ctx) return;
        t += 1;
        ctx.clearRect(0, 0, width, height);

        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#120a0c');
        bg.addColorStop(1, '#1a0f14');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        drawFurnace(t);
        drawSmoke(t);
        drawGlyphs(t);
        drawLionEyes(t);
        drawEmbers(t);

        if (!reduced) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
})();
