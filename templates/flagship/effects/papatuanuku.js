// Papatūānuku — Earth Mother; breathing hills, unfurling koru, rising seeds
(function() {
    const canvas = document.getElementById('papatuanuku-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const fallbackPrimary = '#5D3A1A';
    const fallbackSecondary = '#7A9E4A';
    const primaryHex = canvas.dataset.primary || fallbackPrimary;
    const secondaryHex = canvas.dataset.secondary || fallbackSecondary;
    const P = hexToRgb(primaryHex);
    const S = hexToRgb(secondaryHex);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const hills = [
        { color: `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`, speed: 0.0004, amp: 0.12, yOff: 0.72, phase: 0 },
        { color: `rgba(${P.r}, ${P.g}, ${P.b}, 0.5)`, speed: 0.0007, amp: 0.09, yOff: 0.8, phase: 1.5 },
        { color: `rgba(${S.r}, ${S.g}, ${S.b}, 0.25)`, speed: 0.001, amp: 0.06, yOff: 0.88, phase: 3 }
    ];

    const koru = [];
    const KORU_COUNT = 7;
    for (let i = 0; i < KORU_COUNT; i++) {
        koru.push({
            x: 0.1 + (i / (KORU_COUNT - 1)) * 0.8 + (Math.random() - 0.5) * 0.06,
            y: 0.82 + Math.random() * 0.08,
            scale: 0.4 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
            speed: 0.0006 + Math.random() * 0.0008,
            handed: Math.random() > 0.5 ? 1 : -1
        });
    }

    const seeds = [];
    const SEED_COUNT = 45;
    for (let i = 0; i < SEED_COUNT; i++) {
        seeds.push({
            x: Math.random(),
            y: 0.5 + Math.random() * 0.5,
            vy: 0.0003 + Math.random() * 0.0005,
            vx: (Math.random() - 0.5) * 0.0002,
            size: 0.8 + Math.random() * 1.6,
            alpha: 0.15 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.6 ? S : P
        });
    }

    let time = 0;

    function drawHill(hill) {
        ctx.beginPath();
        const baseline = height * hill.yOff;
        for (let px = 0; px <= width; px += 4) {
            const nx = px / width;
            const wave = Math.sin(nx * Math.PI * 2 + hill.phase + time * hill.speed) * height * hill.amp;
            const breath = Math.sin(time * 0.0008 + hill.phase) * height * 0.015;
            const y = baseline + wave + breath;
            if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = hill.color;
        ctx.fill();
    }

    function drawKoru(k) {
        const cx = k.x * width;
        const cy = k.y * height;
        const breath = 1 + Math.sin(time * 0.001 + k.phase) * 0.06;
        const s = Math.min(width, height) * 0.035 * k.scale * breath;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(k.handed * breath, breath);
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.7)`;
        ctx.lineWidth = Math.max(1.2, s * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const coils = 2.2;
        for (let a = 0; a <= coils * Math.PI; a += 0.08) {
            const r = (a / (coils * Math.PI)) * s;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r * 0.85;
            if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawSeeds() {
        seeds.forEach(p => {
            const sway = Math.sin(time * 0.0015 + p.phase) * 12;
            const x = (p.x * width + sway + width) % width;
            const y = ((p.y - time * p.vy) % 1.2 + 0.1) * height;
            const alpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.002 + p.phase));
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawGlow() {
        const g = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.35, width * 0.7);
        g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.14)`);
        g.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.06)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawGlow();
        hills.forEach(drawHill);
        koru.forEach(drawKoru);
        drawSeeds();
        if (!reduced) time += 1;
        requestAnimationFrame(draw);
    }

    draw();
})();
