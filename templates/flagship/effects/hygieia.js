// Hygieia — serpent coiled around a ritual bowl, rising steam, gentle pulse
(function() {
    const canvas = document.getElementById('hygieia-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        if (typeof hex !== 'string' || hex[0] !== '#') return null;
        let c = hex.slice(1);
        if (c.length === 3) c = c.split('').map(function(ch) { return ch + ch; }).join('');
        if (c.length !== 6) return null;
        const n = parseInt(c, 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function colorFromData(name, fallback) {
        return hexToRgb(canvas.getAttribute('data-' + name)) || fallback;
    }

    const P = colorFromData('primary', hexToRgb('#5BA8A0'));
    const S = colorFromData('secondary', hexToRgb('#D4AF37'));

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

    const particles = [];
    const count = Math.min(80, Math.floor((width * height) / 25000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.25 - Math.random() * 0.4,
            size: Math.random() * 2 + 0.6,
            alpha: Math.random() * 0.35 + 0.1,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.35 ? P : S
        });
    }

    let time = 0;

    function drawBowl(cx, cy, scale) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.ellipse(0, 0, 130 * scale, 38 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.10)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.40)';
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -4 * scale, 100 * scale, 26 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)';
        ctx.fill();
        ctx.restore();
    }

    function drawSerpent(cx, cy, scale) {
        const coils = 5;
        const steps = 140;
        const points = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * coils * Math.PI + time * 0.6;
            const radius = (90 + 35 * Math.sin(t * Math.PI * 3 + time)) * scale * (0.8 + 0.2 * Math.sin(t * Math.PI));
            const x = cx + Math.cos(angle) * radius;
            const y = cy + 70 * scale - t * 150 * scale;
            points.push({ x: x, y: y, thickness: (6 + 5 * Math.sin(t * Math.PI)) * scale });
        }
        for (let i = 0; i < points.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i + 1].x, points[i + 1].y);
            ctx.lineWidth = points[i].thickness;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.55)';
            ctx.stroke();
        }
        const head = points[points.length - 1];
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5;
        const cy = height * 0.55;
        const scale = Math.min(width, height) * 0.0011;

        const pulse = 1 + Math.sin(time * 0.8) * 0.08;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260 * scale * pulse);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        drawSerpent(cx, cy, scale);
        drawBowl(cx, cy, scale);

        particles.forEach(function(p) {
            p.y += reduced ? 0 : p.vy;
            p.x += reduced ? 0 : Math.sin(time + p.phase) * 0.15;
            p.alpha += reduced ? 0 : Math.sin(time * 1.5 + p.phase) * 0.002;
            if (p.alpha < 0.05) p.alpha = 0.05;
            if (p.alpha > 0.5) p.alpha = 0.5;
            if (p.y < -20) {
                p.y = cy - 20 * scale + (Math.random() - 0.5) * 40 * scale;
                p.x = cx + (Math.random() - 0.5) * 160 * scale;
            }
            ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        time += reduced ? 0 : 0.006;
    }

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }

    if (reduced) draw(); else loop();
})();
