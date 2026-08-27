// Gná — Frigg's messenger; swan-feather light projection
(function() {
    'use strict';
    const canvas = document.getElementById('gna-featherlight-canvas');
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
    const P = readColor('data-primary', '#E8E8E8');
    const S = readColor('data-secondary', '#6BAED6');

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

    const feathers = [];
    for (let i = 0; i < 18; i++) {
        feathers.push({
            x: Math.random(),
            y: Math.random(),
            size: 16 + Math.random() * 34,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.02,
            drift: 0.001 + Math.random() * 0.003,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawFeather(x, y, size, angle, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
        grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        grad.addColorStop(0.5, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.9)');
        grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.quadraticCurveTo(size / 3, -size / 6, 0, size / 2);
        ctx.quadraticCurveTo(-size / 3, -size / 6, 0, -size / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + alpha * 0.6 + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(0, size / 2);
        ctx.stroke();
        ctx.restore();
    }

    let t = 0;
    function draw() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, 'rgba(8,10,14,0.98)');
        bg.addColorStop(1, 'rgba(12,16,22,0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Projection beams from upper right.
        for (let i = 0; i < 5; i++) {
            const grad = ctx.createLinearGradient(width * 0.8, 0, width * 0.2, height);
            const a = 0.03 + 0.02 * Math.sin(t * 0.7 + i);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(width, 0);
            ctx.lineTo(width * 0.3, height);
            ctx.lineTo(width * 0.5 + Math.sin(t + i) * 80, height);
            ctx.lineTo(width, height * 0.2 + i * 60);
            ctx.fill();
        }

        // Feathers drifting on the message wind.
        feathers.forEach(f => {
            f.y -= f.drift;
            if (f.y < -0.1) f.y = 1.1;
            f.angle += f.spin;
            const x = width * f.x + Math.sin(t + f.phase) * 40;
            const y = height * f.y;
            const alpha = 0.25 + 0.25 * Math.sin(t * 2 + f.phase);
            drawFeather(x, y, f.size, f.angle, alpha);
        });

        // Messenger glints.
        for (let i = 0; i < 20; i++) {
            const seed = i * 0.53;
            const x = ((seed * 947 + t * 0.015) % 1) * width;
            const y = ((seed * 641 + t * 0.02) % 1) * height;
            const a = 0.2 + 0.3 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath();
            ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
