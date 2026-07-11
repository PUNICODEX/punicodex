// Dagan — Phoenician grain/fertility deity: golden wheat field, drifting pollen, fertile-earth horizon
(function() {
    const canvas = document.getElementById('dagan-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr, frame = 0, reduced = false;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const primary = hexToRgb(canvas.dataset.primary || '#D4A843');   // golden grain
    const secondary = hexToRgb(canvas.dataset.secondary || '#5A2450'); // Phoenician purple
    const earth = { r: 139, g: 90, b: 43 };                         // fertile soil
    const cream = { r: 255, g: 248, b: 210 };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rgba(c, a) { return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`; }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, rgba(secondary, 1));
        sky.addColorStop(0.55, rgba(earth, 1));
        sky.addColorStop(1, rgba(earth, 1));
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, height);

        const sx = width * 0.75, sy = height * 0.42;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.45);
        glow.addColorStop(0, rgba(primary, 0.35));
        glow.addColorStop(0.5, rgba(primary, 0.08));
        glow.addColorStop(1, rgba(primary, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    class Stalk {
        constructor(i, total) { this.i = i; this.reset(total); }
        reset(total) {
            const spacing = width / (total + 1);
            this.x = spacing * (this.i + 1) + (Math.random() - 0.5) * spacing * 0.5;
            this.h = height * (0.38 + Math.random() * 0.34);
            this.thick = 1.2 + Math.random() * 1.4;
            this.phase = Math.random() * Math.PI * 2;
            this.speed = 0.004 + Math.random() * 0.003;
            this.amp = 16 + Math.random() * 18;
            this.leaves = [];
            for (let k = 0, n = 2 + Math.floor(Math.random() * 3); k < n; k++) {
                this.leaves.push({ y: 0.35 + Math.random() * 0.35, side: Math.random() > 0.5 ? 1 : -1, len: 18 + Math.random() * 22 });
            }
            this.headGrains = 7 + Math.floor(Math.random() * 5);
        }
        draw(time) {
            const tipX = this.x + Math.sin(time * this.speed + this.phase) * this.amp;
            const tipY = height - this.h;
            const midX = this.x + Math.sin(time * this.speed + this.phase - 0.8) * this.amp * 0.45;

            const grad = ctx.createLinearGradient(this.x, height, tipX, tipY);
            grad.addColorStop(0, rgba(primary, 0.55));
            grad.addColorStop(0.6, rgba(primary, 0.85));
            grad.addColorStop(1, rgba(cream, 0.95));

            ctx.strokeStyle = grad;
            ctx.lineWidth = this.thick;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, height);
            ctx.quadraticCurveTo(midX, height - this.h * 0.55, tipX, tipY);
            ctx.stroke();

            this.leaves.forEach(leaf => {
                const ly = height - this.h * leaf.y;
                const lx = this.x + (tipX - this.x) * leaf.y;
                const la = leaf.side * (0.5 + Math.sin(time * 0.005 + this.phase) * 0.12);
                ctx.strokeStyle = rgba(primary, 0.6);
                ctx.lineWidth = this.thick * 0.7;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.quadraticCurveTo(lx + Math.cos(la) * leaf.len * 0.6, ly - Math.sin(la) * leaf.len * 0.4, lx + Math.cos(la) * leaf.len, ly - Math.sin(la) * leaf.len);
                ctx.stroke();
            });

            ctx.fillStyle = rgba(cream, 0.92);
            for (let g = 0; g < this.headGrains; g++) {
                const gy = tipY + g * 5.5;
                const gx = tipX + Math.sin(time * 0.004 + this.phase + g * 0.7) * (2 + g * 0.4);
                ctx.beginPath();
                ctx.ellipse(gx, gy, 2, 3.2, (gx - tipX) * 0.05, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    class Pollen {
        constructor() { this.reset(true); }
        reset(randomY) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + 8;
            this.vx = (Math.random() - 0.4) * 0.35;
            this.vy = -0.25 - Math.random() * 0.45;
            this.size = 0.8 + Math.random() * 1.6;
            this.alpha = 0.2 + Math.random() * 0.5;
            this.phase = Math.random() * Math.PI * 2;
        }
        update(time) {
            this.x += this.vx + Math.sin(time * 0.002 + this.phase) * 0.2;
            this.y += this.vy;
            if (this.y < -10 || this.x < -10 || this.x > width + 10) this.reset(false);
        }
        draw(time) {
            ctx.fillStyle = rgba(cream, this.alpha * (0.7 + 0.3 * Math.sin(time * 0.004 + this.phase)));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    let stalks = [], pollen = [];

    function initField() {
        stalks = [];
        const count = Math.max(18, Math.floor(width / 42));
        for (let i = 0; i < count; i++) stalks.push(new Stalk(i, count));
        pollen = [];
        const pcount = Math.max(20, Math.floor(width / 28));
        for (let i = 0; i < pcount; i++) pollen.push(new Pollen());
    }

    function drawStatic() {
        stalks.forEach(s => s.draw(0));
        pollen.forEach(p => p.draw(0));
    }

    function draw() {
        frame++;
        const time = frame;
        drawBackground();
        if (reduced) { drawStatic(); return; }
        stalks.forEach(s => s.draw(time));
        pollen.forEach(p => { p.update(time); p.draw(time); });
        requestAnimationFrame(draw);
    }

    function onMotionChange() {
        reduced = motionQuery.matches;
        if (!reduced) draw();
        else { drawBackground(); drawStatic(); }
    }

    resize();
    initField();
    window.addEventListener('resize', () => { resize(); initField(); });
    motionQuery.addEventListener('change', onMotionChange);
    onMotionChange();
})();
