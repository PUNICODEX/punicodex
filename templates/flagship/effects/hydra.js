// Hydra — many-headed water serpent, coiling beneath dark water
(function () {
    const canvas = document.getElementById('hydra-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#0B3D4C');   // abyssal teal
    const S = readColor('data-secondary', '#7F2D2D'); // venomous crimson

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); });

    const heads = [];
    const HEAD_COUNT = 7;
    for (let i = 0; i < HEAD_COUNT; i++) {
        heads.push({
            xBase: 0.15 + i * 0.12,
            phase: i * 0.9,
            height: 80 + Math.random() * 90,
            sway: 25 + Math.random() * 20,
            speed: 0.4 + Math.random() * 0.4,
            width: 10 + Math.random() * 6
        });
    }

    const bubbles = [];
    const BUBBLE_COUNT = 40;
    for (let i = 0; i < BUBBLE_COUNT; i++) {
        bubbles.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            r: Math.random() * 2 + 0.5,
            vy: Math.random() * 0.6 + 0.2,
            alpha: Math.random() * 0.35 + 0.1
        });
    }

    let time = 0;

    function drawBody() {
        ctx.save();
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.45)`;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = `rgba(${S.r}, ${S.g}, ${S.b}, 0.25)`;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2; t += 0.05) {
            const r = width * 0.55 + Math.sin(t * 3 + time * 0.2) * 40;
            const x = width * 0.5 + Math.cos(t + time * 0.08) * r;
            const y = height * 0.92 + Math.sin(t * 2 + time * 0.1) * 30;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    function drawHead(h) {
        const rootX = width * h.xBase;
        const rootY = height * 0.92;
        const reach = rootY - h.height - Math.sin(time * h.speed + h.phase) * 15;
        const tipX = rootX + Math.sin(time * h.speed * 0.7 + h.phase) * h.sway;
        const cp1x = rootX + Math.cos(time * h.speed + h.phase) * h.sway * 0.6;
        const cp1y = rootY - h.height * 0.35;
        const cp2x = tipX - Math.sin(time * h.speed * 0.5 + h.phase) * h.sway * 0.4;
        const cp2y = rootY - h.height * 0.75;

        ctx.save();
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.7)`;
        ctx.lineWidth = h.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, reach);
        ctx.stroke();

        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(tipX, reach, h.width * 0.9, h.width * 1.2, Math.atan2(reach - cp2y, tipX - cp2x), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(tipX + h.width * 0.25, reach - h.width * 0.3, h.width * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBubbles() {
        ctx.save();
        bubbles.forEach(b => {
            b.y -= b.vy * (reducedMotion ? 0.2 : 1);
            if (b.y < -10) {
                b.y = height + 10;
                b.x = Math.random() * width;
            }
            ctx.fillStyle = `rgba(200, 230, 255, ${b.alpha})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.05)`);
        grad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0.18)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        drawBody();
        heads.forEach(drawHead);
        drawBubbles();

        time += reducedMotion ? 0.003 : 0.012;
        requestAnimationFrame(draw);
    }

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        reducedMotion = e.matches;
    });

    draw();
})();
