// Óneiros — dream-mist; shape-shifting visions
(function() {
    'use strict';
    const canvas = document.getElementById('oneiros-dreammist-canvas');
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
    const P = readColor('data-primary', '#CDB4F7');
    const S = readColor('data-secondary', '#4B0082');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const blobs = [];
    for (let i = 0; i < 8; i++) {
        blobs.push({
            x: Math.random(),
            y: Math.random(),
            r: 40 + Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
            speed: 0.0005 + Math.random() * 0.0015,
            hueShift: Math.random()
        });
    }

    let t = 0;
    function draw() {
        t += 0.004;
        ctx.clearRect(0, 0, width, height);
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, 'rgba(10,8,16,0.98)');
        bg.addColorStop(1, 'rgba(18,12,28,0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Drifting dream-mist layers.
        for (let i = 0; i < 5; i++) {
            const y = height * (0.25 + i * 0.15) + Math.sin(t * 0.2 + i) * 30;
            const grad = ctx.createLinearGradient(0, y - 60, 0, y + 60);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.04 + 0.03 * Math.sin(t + i)) + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, y - 60, width, 120);
        }

        // Morphing dream shapes.
        blobs.forEach(b => {
            b.x += Math.sin(t * 0.5 + b.phase) * b.speed;
            b.y += Math.cos(t * 0.3 + b.phase) * b.speed;
            const x = width * b.x;
            const y = height * b.y;
            const r = b.r * (1 + 0.15 * Math.sin(t + b.phase));
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
            grad.addColorStop(0.6, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += 0.3) {
                const nr = r * (0.8 + 0.2 * Math.sin(a * 3 + t + b.phase));
                const px = x + Math.cos(a) * nr;
                const py = y + Math.sin(a) * nr;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        });

        // Dream dust and faint sparks.
        for (let i = 0; i < 40; i++) {
            const seed = i * 0.61;
            const x = ((seed * 823 + t * 0.01) % 1) * width;
            const y = ((seed * 457 + t * 0.012) % 1) * height;
            const a = 0.15 + 0.35 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath();
            ctx.arc(x, y, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
