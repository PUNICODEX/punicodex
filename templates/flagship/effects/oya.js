// Ọya — swirling wind ribbons, lightning forks, copper/brown dust, dynamic motion
(function() {
    const canvas = document.getElementById('oya-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // copper/gold
    const S = readColor('data-secondary', '#4B0082'); // deep storm

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

    const ribbons = [];
    const RIBBON_COUNT = width < 768 ? 5 : 8;
    for (let i = 0; i < RIBBON_COUNT; i++) {
        ribbons.push({
            y: Math.random() * height,
            amplitude: 20 + Math.random() * 40,
            frequency: 0.005 + Math.random() * 0.01,
            speed: 0.02 + Math.random() * 0.03,
            phase: Math.random() * Math.PI * 2,
            width: 40 + Math.random() * 60,
            alpha: 0.12 + Math.random() * 0.18
        });
    }

    const dust = [];
    const DUST_COUNT = width < 600 ? 60 : 120;
    for (let i = 0; i < DUST_COUNT; i++) {
        dust.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 1 + Math.random() * 2.5,
            vy: (Math.random() - 0.5) * 0.6,
            size: 0.8 + Math.random() * 1.8,
            alpha: 0.15 + Math.random() * 0.25,
            color: Math.random() > 0.6 ? P : { r: 139, g: 90, b: 43 }
        });
    }

    let bolts = [];
    function spawnBolt() {
        if (prefersReduced || Math.random() > 0.02) return;
        const startX = Math.random() * width;
        const startY = Math.random() * height * 0.3;
        const points = [{ x: startX, y: startY }];
        let x = startX, y = startY;
        while (y < height * 0.7) {
            x += (Math.random() - 0.5) * 60;
            y += 20 + Math.random() * 40;
            points.push({ x, y });
        }
        bolts.push({ points, life: 1 });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Stormy gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${S.r * 0.25}, ${S.g * 0.25}, ${S.b * 0.35}, 0.92)`);
        bg.addColorStop(0.6, `rgba(40, 25, 15, 0.85)`);
        bg.addColorStop(1, `rgba(30, 15, 8, 0.92)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Swirling wind ribbons
        ribbons.forEach((r, i) => {
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${r.alpha})`;
            ctx.lineWidth = r.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let x = 0; x <= width; x += 20) {
                const y = r.y + Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Copper/brown dust
        dust.forEach(d => {
            if (!prefersReduced) {
                d.x += d.vx;
                d.y += d.vy + Math.sin(time * 0.01 + d.x * 0.005) * 0.2;
                if (d.x > width + 5) { d.x = -5; d.y = Math.random() * height; }
            }
            ctx.fillStyle = `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${d.alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Lightning forks
        spawnBolt();
        for (let i = bolts.length - 1; i >= 0; i--) {
            const b = bolts[i];
            b.life -= 0.06;
            if (b.life <= 0) { bolts.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = b.life;
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.7)`;
            ctx.beginPath();
            b.points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
            ctx.stroke();
            ctx.restore();
        }

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
