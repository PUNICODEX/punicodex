// Xipe — flayed skin of spring, maize, renewal
(function() {
    'use strict';

    const canvas = document.getElementById('xipe-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        canvas.style.display = 'none';
        return;
    }

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const GOLD = hexToRgb('#D4AF37');
    const CRIMSON = hexToRgb('#B22222');
    const GREEN = hexToRgb('#228B22');
    const JADE = hexToRgb('#6B8E23');
    const CREAM = hexToRgb('#F5F5DC');

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const ribbons = [];
    const RIBBON_COUNT = 7;
    for (let i = 0; i < RIBBON_COUNT; i++) {
        ribbons.push({
            x: Math.random() * width,
            y: height * 0.4 + Math.random() * height * 0.3,
            length: Math.random() * 120 + 80,
            width: Math.random() * 18 + 10,
            phase: Math.random() * Math.PI * 2,
            sway: Math.random() * 0.02 + 0.01,
            opacity: Math.random() * 0.12 + 0.06,
            color: Math.random() > 0.5 ? CRIMSON : GOLD
        });
    }

    const shoots = [];
    const SHOOT_COUNT = 40;
    for (let i = 0; i < SHOOT_COUNT; i++) {
        shoots.push({
            x: Math.random() * width,
            baseY: height + Math.random() * 40,
            height: Math.random() * 60 + 20,
            width: Math.random() * 2 + 1,
            phase: Math.random() * Math.PI * 2,
            sway: Math.random() * 0.03 + 0.01,
            opacity: Math.random() * 0.5 + 0.2,
            color: Math.random() > 0.7 ? JADE : GREEN
        });
    }

    const kernels = [];
    const KERNEL_COUNT = 60;
    for (let i = 0; i < KERNEL_COUNT; i++) {
        kernels.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.6 - 0.1,
            size: Math.random() * 2.5 + 0.8,
            alpha: Math.random() * 0.6 + 0.2,
            pulse: Math.random() * Math.PI * 2
        });
    }

    function drawRibbons() {
        for (const r of ribbons) {
            const sway = Math.sin(frame * r.sway + r.phase) * 20;
            ctx.save();
            ctx.translate(r.x + sway, r.y);
            ctx.rotate(Math.sin(frame * 0.005 + r.phase) * 0.15);

            const grad = ctx.createLinearGradient(0, -r.length * 0.5, 0, r.length * 0.5);
            grad.addColorStop(0, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, 0)`);
            grad.addColorStop(0.4, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.opacity})`);
            grad.addColorStop(1, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-r.width * 0.5, -r.length * 0.5);
            ctx.quadraticCurveTo(r.width * 0.5, 0, -r.width * 0.5, r.length * 0.5);
            ctx.quadraticCurveTo(-r.width * 0.8, 0, -r.width * 0.5, -r.length * 0.5);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawShoots() {
        for (const s of shoots) {
            const tipX = s.x + Math.sin(frame * s.sway + s.phase) * 8;
            const tipY = s.baseY - s.height;
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, s.baseY);
            ctx.quadraticCurveTo(s.x + Math.sin(frame * s.sway + s.phase + 1) * 5, s.baseY - s.height * 0.5, tipX, tipY);
            ctx.stroke();

            // maize leaf
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.6})`;
            ctx.beginPath();
            ctx.ellipse(tipX, tipY + 4, s.width * 3, s.width * 1.5, frame * 0.02 + s.phase, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawKernels() {
        for (const k of kernels) {
            k.x += k.vx;
            k.y += k.vy;
            k.pulse += 0.05;
            if (k.y < -10) {
                k.y = height + 10;
                k.x = Math.random() * width;
            }
            if (k.x < -10) k.x = width + 10;
            if (k.x > width + 10) k.x = -10;

            const alpha = k.alpha * (0.7 + 0.3 * Math.sin(k.pulse));
            ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(k.x, k.y, k.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGlow() {
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6);
        grad.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.06)`);
        grad.addColorStop(0.5, `rgba(${GREEN.r}, ${GREEN.g}, ${GREEN.b}, 0.03)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;

        drawGlow();
        drawRibbons();
        drawShoots();
        drawKernels();

        requestAnimationFrame(draw);
    }
    draw();
})();
