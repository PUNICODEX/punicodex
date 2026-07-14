// Hypnos — drifting dream-mist, breath-pulse moon, poppy petals
(function() {
    const canvas = document.getElementById('hypnos-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    let width, height, dpr, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const P = canvas.dataset.primary ? hexToRgb(canvas.dataset.primary) : { r: 38, g: 28, b: 78 };
    const S = canvas.dataset.secondary ? hexToRgb(canvas.dataset.secondary) : { r: 198, g: 190, b: 255 };

    function resize() {
        dpr = window.devicePixelRatio || 1;
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

    const waves = [
        { y: 0.55, amp: 28, freq: 0.006, speed: 0.0008, alpha: 0.12, offset: 0 },
        { y: 0.65, amp: 36, freq: 0.005, speed: 0.0006, alpha: 0.10, offset: 2 },
        { y: 0.78, amp: 44, freq: 0.004, speed: 0.0004, alpha: 0.08, offset: 4 },
        { y: 0.90, amp: 52, freq: 0.003, speed: 0.0003, alpha: 0.06, offset: 1 }
    ];

    const motes = [];
    for (let i = 0; i < 60; i++) {
        motes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.6 + 0.4,
            vy: Math.random() * 0.25 + 0.08,
            vx: (Math.random() - 0.5) * 0.15,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.35 + 0.15
        });
    }

    const petals = [];
    for (let i = 0; i < 14; i++) {
        petals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 7 + 5,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.02,
            vy: Math.random() * 0.35 + 0.15,
            vx: (Math.random() - 0.5) * 0.4,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.25 + 0.12
        });
    }

    function drawMistWave(wave) {
        const baseY = height * wave.y;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${wave.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
            const y = baseY + Math.sin(x * wave.freq + frame * wave.speed * 60 + wave.offset) * wave.amp;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawBreathOrb() {
        const cx = width * 0.72;
        const cy = height * 0.35;
        const breath = 0.92 + Math.sin(frame * 0.015) * 0.08;
        const r = Math.min(width, height) * 0.18 * breath;

        const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.28)`);
        g.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, 0.08)`);
        g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPetal(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(${Math.min(255, S.r + 40)}, ${S.g}, ${S.b}, ${p.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        // Dark void base, matching the rest of the flagship temples.
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, width, height);

        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.06)`);
        bg.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        drawBreathOrb();

        waves.forEach(drawMistWave);

        motes.forEach(m => {
            m.y -= m.vy;
            m.x += m.vx + Math.sin(frame * 0.01 + m.phase) * 0.03;
            if (m.y < -10) { m.y = height + 10; m.x = Math.random() * width; }
            if (m.x < -10) m.x = width + 10;
            if (m.x > width + 10) m.x = -10;
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${m.alpha})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
        });

        petals.forEach(p => {
            p.y += p.vy;
            p.x += p.vx + Math.sin(frame * 0.008 + p.phase) * 0.08;
            p.rot += p.spin;
            if (p.y > height + 20) { p.y = -20; p.x = Math.random() * width; }
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;
            drawPetal(p);
        });

        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
