// Vǫr — wisps of knowledge and careful seeing
(function() {
    'use strict';
    const canvas = document.getElementById('vor-wispknowledge-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fb) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
    }
    const P = readColor('data-primary', '#A8C8EC');
    const S = readColor('data-secondary', '#4B6FA6');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const wisps = [];
    const WISP_COUNT = width < 768 ? 16 : 28;
    for (let i = 0; i < WISP_COUNT; i++) {
        wisps.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 2 + Math.random() * 4,
            vx: (Math.random() - 0.5) * 0.35,
            vy: -0.15 - Math.random() * 0.35,
            pulse: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.03,
            alpha: 0.25 + Math.random() * 0.35
        });
    }

    const runes = [];
    function spawnRune() {
        if (reduced || Math.random() > 0.018) return;
        runes.push({
            x: Math.random() * width,
            y: height * (0.2 + Math.random() * 0.6),
            glyph: ['ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛇ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ'][Math.floor(Math.random() * 20)],
            size: 14 + Math.random() * 16,
            life: 1,
            max: 90 + Math.random() * 60
        });
    }

    const beams = [];
    for (let i = 0; i < 3; i++) {
        beams.push({
            x: width * (0.2 + i * 0.3),
            angle: -0.4 + Math.random() * 0.8,
            width: 60 + Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
            speed: 0.01 + Math.random() * 0.01
        });
    }

    const eyes = [];
    for (let i = 0; i < 4; i++) {
        eyes.push({
            x: width * (0.2 + Math.random() * 0.6),
            y: height * (0.2 + Math.random() * 0.6),
            r: 20 + Math.random() * 30,
            phase: Math.random() * Math.PI * 2,
            speed: 0.015 + Math.random() * 0.015
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const t = frame * 0.015;

        // deep library gloom
        const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.55);
        bg.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.22)`);
        bg.addColorStop(1, 'rgba(8, 12, 20, 0.94)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // soft searchlight beams
        beams.forEach(b => {
            const a = 0.04 + 0.03 * Math.sin(t * 30 + b.phase);
            ctx.save();
            ctx.translate(b.x, height * 0.05);
            ctx.rotate(b.angle + 0.1 * Math.sin(t * 10 + b.phase));
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-b.width * 0.5, 0);
            ctx.lineTo(b.width * 0.5, 0);
            ctx.lineTo(b.width * 1.2, height);
            ctx.lineTo(-b.width * 1.2, height);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        // seeing-eye rings
        eyes.forEach(e => {
            const a = 0.08 + 0.06 * Math.sin(t * 25 + e.phase);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * 0.4, 0 + t + e.phase, Math.PI + t + e.phase);
            ctx.stroke();
        });

        // drifting knowledge wisps
        wisps.forEach(w => {
            if (!reduced) {
                w.x += w.vx + Math.sin(t + w.pulse) * 0.2;
                w.y += w.vy;
                if (w.y < -20) { w.y = height + 20; w.x = Math.random() * width; }
                if (w.x < -20) w.x = width + 20;
                if (w.x > width + 20) w.x = -20;
            }
            const pulse = 0.7 + 0.3 * Math.sin(t * 40 + w.pulse);
            ctx.save();
            ctx.globalAlpha = w.alpha * pulse;
            const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r * 4);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 1)`);
            g.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.r * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // fleeting runes
        spawnRune();
        for (let i = runes.length - 1; i >= 0; i--) {
            const r = runes[i];
            if (!reduced) r.life -= 1 / r.max;
            if (r.life <= 0) { runes.splice(i, 1); continue; }
            const a = Math.sin(r.life * Math.PI);
            ctx.save();
            ctx.globalAlpha = a * 0.55;
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
            ctx.font = `${r.size}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(r.glyph, r.x, r.y);
            ctx.restore();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
