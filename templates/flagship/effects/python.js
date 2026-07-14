// Pýthōn — coiling serpent silhouette, earth vapors, Delphi mist, golden fumes, slithering motion
(function() {
    const canvas = document.getElementById('python-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#D4AF37');   // golden fumes
    const S = readColor('data-secondary', '#4169E1'); // Delphi mist/earth

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

    const coils = [];
    const COIL_COUNT = width < 768 ? 40 : 80;
    const cx = width * 0.5;
    const cy = height * 0.55;
    for (let i = 0; i < COIL_COUNT; i++) {
        const t = i / COIL_COUNT;
        coils.push({
            t,
            radius: 40 + t * Math.min(width, height) * 0.35,
            angleOffset: t * Math.PI * 4,
            size: 6 - t * 4,
            alpha: 0.2 + (1 - t) * 0.3
        });
    }

    const vapors = [];
    const VAPOR_COUNT = width < 600 ? 30 : 60;
    for (let i = 0; i < VAPOR_COUNT; i++) {
        vapors.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.2 - Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.3,
            r: 8 + Math.random() * 24,
            alpha: 0.05 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    const sparks = [];
    const SPARK_COUNT = width < 600 ? 15 : 30;
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.1 - Math.random() * 0.3,
            size: 0.8 + Math.random() * 1.4,
            alpha: 0.2 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Earthy Delphi background
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${S.r * 0.2}, ${S.g * 0.2}, ${S.b * 0.25}, 0.75)`);
        bg.addColorStop(0.6, `rgba(25, 35, 25, 0.9)`);
        bg.addColorStop(1, `rgba(10, 14, 10, 0.97)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Coiling serpent silhouette
        const baseAngle = prefersReduced ? 0 : time * 0.003;
        coils.forEach((c, i) => {
            const a = c.angleOffset + baseAngle + Math.sin(time * 0.01 + c.t * 5) * 0.1;
            const x = cx + Math.cos(a) * c.radius;
            const y = cy + Math.sin(a) * c.radius * 0.55;
            ctx.fillStyle = `rgba(12, 16, 12, ${c.alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, c.size + Math.sin(time * 0.02 + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Golden eye
        const headIdx = coils.length - 1;
        const headA = coils[headIdx].angleOffset + baseAngle;
        const headX = cx + Math.cos(headA) * coils[headIdx].radius;
        const headY = cy + Math.sin(headA) * coils[headIdx].radius * 0.55;
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.85)`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.5)`;
        ctx.beginPath();
        ctx.ellipse(headX, headY, 5, 8, headA + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Earth vapors
        vapors.forEach(v => {
            if (!prefersReduced) {
                v.y += v.vy;
                v.x += v.vx + Math.sin(time * 0.005 + v.phase) * 0.2;
                if (v.y < -30) { v.y = height + 30; v.x = Math.random() * width; }
            }
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.01 + v.phase);
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${v.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Golden fumes/sparks
        sparks.forEach(s => {
            if (!prefersReduced) {
                s.y += s.vy;
                if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.04 + s.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
