/**
 * PUNYCODEX — Flagship Canvas Effects Library
 * Shared ambient canvas effects for flagship temple pages.
 * Auto-initializes on DOMContentLoaded for every <canvas data-effect>.
 * Exposes window.FlagshipCanvas.effects for manual use.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function getColor(canvas, fallback) {
        const attr = canvas.getAttribute('data-' + fallback.name);
        if (attr) return attr;
        const styles = getComputedStyle(document.documentElement);
        const cssVar = styles.getPropertyValue('--' + fallback.name).trim();
        return cssVar || fallback.value;
    }

    function resizeCanvas(canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { width: window.innerWidth, height: window.innerHeight };
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ─── EFFECT: PARTICLES (generic fallback) ────────────────────────────────
    function particles(canvas, ctx, width, height, primary, secondary) {
        const count = Math.min(80, Math.floor((width * height) / 18000));
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                isPrimary: Math.random() > 0.5
            });
        }

        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
                const color = p.isPrimary ? primary : secondary;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity})`;
                ctx.fill();
            });

            if (frame % 2 === 0) {
                ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.04)`;
                ctx.lineWidth = 0.5;
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const dx = particles[i].x - particles[j].x;
                        const dy = particles[i].y - particles[j].y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 100) {
                            ctx.beginPath();
                            ctx.moveTo(particles[i].x, particles[i].y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            ctx.stroke();
                        }
                    }
                }
            }
            frame++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: STARS ───────────────────────────────────────────────────────
    function stars(canvas, ctx, width, height, primary, secondary) {
        const count = Math.min(180, Math.floor((width * height) / 8000));
        const starfield = [];
        for (let i = 0; i < count; i++) {
            starfield.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.3,
                opacity: Math.random(),
                twinkle: Math.random() * 0.03 + 0.005,
                color: Math.random() > 0.8 ? secondary : primary
            });
        }
        function draw() {
            ctx.clearRect(0, 0, width, height);
            starfield.forEach(s => {
                s.opacity += s.twinkle;
                if (s.opacity > 1 || s.opacity < 0.2) s.twinkle *= -1;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
                ctx.fill();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: VOID ────────────────────────────────────────────────────────
    function voidEffect(canvas, ctx, width, height, primary, secondary) {
        const count = Math.min(60, Math.floor((width * height) / 22000));
        const motes = [];
        for (let i = 0; i < count; i++) {
            motes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                angle: Math.random() * Math.PI * 2,
                radius: Math.random() * 150 + 50,
                speed: Math.random() * 0.002 + 0.0005,
                opacity: Math.random() * 0.3 + 0.1,
                color: Math.random() > 0.7 ? secondary : primary
            });
        }
        let t = 0;
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.25)';
            ctx.fillRect(0, 0, width, height);
            motes.forEach(m => {
                const cx = m.x + Math.cos(t * m.speed + m.angle) * m.radius;
                const cy = m.y + Math.sin(t * m.speed + m.angle) * m.radius * 0.4;
                ctx.beginPath();
                ctx.arc(cx, cy, m.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${m.color.r}, ${m.color.g}, ${m.color.b}, ${m.opacity})`;
                ctx.fill();
            });
            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: TIME ────────────────────────────────────────────────────────
    function time(canvas, ctx, width, height, primary, secondary) {
        const grains = [];
        const count = Math.min(120, Math.floor((width * height) / 15000));
        for (let i = 0; i < count; i++) {
            grains.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.5,
                speedY: Math.random() * 1.5 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.85 ? secondary : primary
            });
        }
        function draw() {
            ctx.clearRect(0, 0, width, height);
            grains.forEach(g => {
                g.y += g.speedY;
                g.x += g.speedX;
                if (g.y > height) {
                    g.y = -5;
                    g.x = Math.random() * width;
                }
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity})`;
                ctx.fill();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: LIGHT ───────────────────────────────────────────────────────
    function light(canvas, ctx, width, height, primary, secondary) {
        const rays = [];
        const count = Math.floor(width / 80);
        for (let i = 0; i < count; i++) {
            rays.push({
                x: (i + 0.5) * (width / count) + randomRange(-20, 20),
                width: randomRange(1, 3),
                speed: randomRange(0.3, 1.2),
                opacity: randomRange(0.05, 0.2),
                y: randomRange(0, height),
                height: randomRange(80, 250),
                color: Math.random() > 0.7 ? secondary : primary
            });
        }
        function draw() {
            ctx.clearRect(0, 0, width, height);
            rays.forEach(r => {
                r.y -= r.speed;
                if (r.y + r.height < 0) r.y = height + randomRange(0, 100);
                const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y - r.height);
                grad.addColorStop(0, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, 0)`);
                grad.addColorStop(0.5, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.opacity})`);
                grad.addColorStop(1, `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(r.x - r.width / 2, r.y - r.height, r.width, r.height);
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: WATER ───────────────────────────────────────────────────────
    function water(canvas, ctx, width, height, primary, secondary) {
        const ripples = [];
        const count = Math.min(12, Math.floor(width / 120));
        for (let i = 0; i < count; i++) {
            ripples.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 50 + 20,
                maxRadius: Math.random() * 120 + 80,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.2 + 0.05,
                color: Math.random() > 0.6 ? secondary : primary
            });
        }
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.15)';
            ctx.fillRect(0, 0, width, height);
            ripples.forEach(r => {
                r.radius += r.speed;
                if (r.radius > r.maxRadius) {
                    r.radius = 10;
                    r.x = Math.random() * width;
                    r.y = Math.random() * height;
                }
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.opacity * (1 - r.radius / r.maxRadius)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: STORM ───────────────────────────────────────────────────────
    function storm(canvas, ctx, width, height, primary, secondary) {
        const rain = [];
        const count = Math.min(200, Math.floor((width * height) / 9000));
        for (let i = 0; i < count; i++) {
            rain.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: randomRange(15, 40),
                speed: randomRange(12, 22),
                opacity: randomRange(0.1, 0.4),
                angle: Math.PI / 2 + randomRange(-0.05, 0.05)
            });
        }
        let flash = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            if (Math.random() < 0.005) flash = randomRange(0.3, 0.7);
            if (flash > 0) {
                ctx.fillStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${flash})`;
                ctx.fillRect(0, 0, width, height);
                flash *= 0.9;
            }
            ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.25)`;
            ctx.lineWidth = 1;
            rain.forEach(r => {
                r.x += Math.cos(r.angle) * r.speed;
                r.y += Math.sin(r.angle) * r.speed;
                if (r.y > height || r.x > width || r.x < 0) {
                    r.y = -r.length;
                    r.x = Math.random() * width;
                }
                ctx.beginPath();
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.x - Math.cos(r.angle) * r.length, r.y - Math.sin(r.angle) * r.length);
                ctx.stroke();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: TREE ────────────────────────────────────────────────────────
    function tree(canvas, ctx, width, height, primary, secondary) {
        const branches = [];
        const count = Math.min(18, Math.floor(width / 90));
        for (let i = 0; i < count; i++) {
            branches.push({
                x: randomRange(0, width),
                y: height + randomRange(0, 50),
                angle: -Math.PI / 2 + randomRange(-0.3, 0.3),
                length: randomRange(40, 90),
                depth: Math.floor(randomRange(4, 7)),
                color: Math.random() > 0.6 ? secondary : primary,
                growth: 0,
                speed: randomRange(0.005, 0.015)
            });
        }
        function drawBranch(x, y, angle, length, depth, color) {
            if (depth === 0) return;
            const x2 = x + Math.cos(angle) * length;
            const y2 = y + Math.sin(angle) * length;
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.15 + depth * 0.04})`;
            ctx.lineWidth = Math.max(0.5, depth * 0.5);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            drawBranch(x2, y2, angle - 0.3, length * 0.7, depth - 1, color);
            drawBranch(x2, y2, angle + 0.3, length * 0.7, depth - 1, color);
        }
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
            ctx.fillRect(0, 0, width, height);
            branches.forEach(b => {
                b.growth = Math.min(1, b.growth + b.speed);
                drawBranch(b.x, b.y, b.angle, b.length * b.growth, b.depth, b.color);
                if (b.growth >= 1) {
                    b.growth = 0;
                    b.x = randomRange(0, width);
                    b.angle = -Math.PI / 2 + randomRange(-0.3, 0.3);
                }
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: MOUNTAIN ────────────────────────────────────────────────────
    function mountain(canvas, ctx, width, height, primary, secondary) {
        const peaks = [];
        const count = Math.min(7, Math.floor(width / 200) + 2);
        for (let i = 0; i < count; i++) {
            peaks.push({
                x: (i / count) * width,
                baseY: height * randomRange(0.65, 0.85),
                width: width / count * randomRange(1.2, 2),
                height: height * randomRange(0.15, 0.35),
                color: Math.random() > 0.5 ? secondary : primary,
                drift: randomRange(-0.1, 0.1)
            });
        }
        function draw() {
            ctx.clearRect(0, 0, width, height);
            peaks.forEach(p => {
                p.x += p.drift;
                if (p.x < -p.width) p.x = width;
                if (p.x > width + p.width) p.x = -p.width;
                ctx.beginPath();
                ctx.moveTo(p.x, height);
                ctx.lineTo(p.x + p.width / 2, p.baseY - p.height);
                ctx.lineTo(p.x + p.width, height);
                ctx.closePath();
                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.08)`;
                ctx.fill();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: SUN ─────────────────────────────────────────────────────────
    function sun(canvas, ctx, width, height, primary, secondary) {
        const rays = 36;
        let rotation = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            const cx = width * 0.75;
            const cy = height * 0.25;
            const baseRadius = Math.min(width, height) * 0.18;

            const glow = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 1.8);
            glow.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.25)`);
            glow.addColorStop(0.5, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.08)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            for (let i = 0; i < rays; i++) {
                const angle = (i / rays) * Math.PI * 2;
                const len = baseRadius * (1 + Math.sin(Date.now() * 0.001 + i) * 0.15);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * baseRadius * 0.9, Math.sin(angle) * baseRadius * 0.9);
                ctx.lineTo(Math.cos(angle) * len * 1.8, Math.sin(angle) * len * 1.8);
                ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.12)`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.restore();

            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.2)`;
            ctx.fill();

            rotation += 0.0015;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: FLAME ───────────────────────────────────────────────────────
    function flame(canvas, ctx, width, height, primary, secondary) {
        const sparks = [];
        const count = Math.min(100, Math.floor((width * height) / 18000));
        for (let i = 0; i < count; i++) {
            sparks.push({
                x: Math.random() * width,
                y: height + Math.random() * 50,
                size: Math.random() * 2 + 0.5,
                speedY: Math.random() * 2 + 0.8,
                drift: (Math.random() - 0.5) * 0.8,
                opacity: Math.random() * 0.5 + 0.2,
                life: Math.random(),
                color: Math.random() > 0.6 ? secondary : primary
            });
        }
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.2)';
            ctx.fillRect(0, 0, width, height);
            sparks.forEach(s => {
                s.y -= s.speedY;
                s.x += s.drift;
                s.life -= 0.005;
                if (s.y < 0 || s.life <= 0) {
                    s.y = height + Math.random() * 30;
                    s.x = Math.random() * width;
                    s.life = 1;
                }
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * s.life})`;
                ctx.fill();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: AURORA ──────────────────────────────────────────────────────
    function aurora(canvas, ctx, width, height, primary, secondary) {
        const bands = [];
        const count = Math.min(5, Math.floor(width / 250) + 2);
        for (let i = 0; i < count; i++) {
            bands.push({
                y: height * (0.15 + i * 0.15),
                amplitude: randomRange(40, 90),
                wavelength: randomRange(200, 500),
                speed: randomRange(0.002, 0.006),
                offset: Math.random() * Math.PI * 2,
                opacity: randomRange(0.08, 0.18),
                color: Math.random() > 0.5 ? primary : secondary
            });
        }
        let t = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            bands.forEach(b => {
                const grad = ctx.createLinearGradient(0, b.y - b.amplitude, 0, b.y + b.amplitude);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(0.5, `rgba(${b.color.r}, ${b.color.g}, ${b.color.b}, ${b.opacity})`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                for (let x = 0; x <= width; x += 20) {
                    const y = b.y + Math.sin(x / b.wavelength + t * b.speed + b.offset) * b.amplitude * Math.sin(t * 0.005 + b.offset);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.closePath();
                ctx.fill();
            });
            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: COSMIC NET ──────────────────────────────────────────────────
    function cosmicNet(canvas, ctx, width, height, primary, secondary) {
        const nodes = [];
        const count = Math.min(45, Math.floor((width * height) / 28000));
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 1.5 + 0.5,
                pulse: Math.random() * Math.PI * 2,
                color: Math.random() > 0.6 ? secondary : primary
            });
        }
        let t = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            nodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0) n.x = width;
                if (n.x > width) n.x = 0;
                if (n.y < 0) n.y = height;
                if (n.y > height) n.y = 0;
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.03 + n.pulse);
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.size * (0.7 + 0.5 * pulse), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${0.3 + 0.4 * pulse})`;
                ctx.fill();
            });
            ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.06)`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 160) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }
            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: SANDSTORM ───────────────────────────────────────────────────
    function sandstorm(canvas, ctx, width, height, primary, secondary) {
        const grains = [];
        const count = Math.min(160, Math.floor((width * height) / 11000));
        for (let i = 0; i < count; i++) {
            grains.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.3,
                speedX: randomRange(3, 9),
                speedY: randomRange(-0.5, 0.5),
                opacity: Math.random() * 0.35 + 0.1,
                color: Math.random() > 0.7 ? secondary : primary
            });
        }
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.12)';
            ctx.fillRect(0, 0, width, height);
            grains.forEach(g => {
                g.x += g.speedX;
                g.y += g.speedY;
                if (g.x > width) {
                    g.x = -10;
                    g.y = Math.random() * height;
                }
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity})`;
                ctx.fill();
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: ABYSSAL ─────────────────────────────────────────────────────
    function abyssal(canvas, ctx, width, height, primary, secondary) {
        const motes = [];
        const count = Math.min(90, Math.floor((width * height) / 16000));
        for (let i = 0; i < count; i++) {
            motes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedY: randomRange(-0.4, -1.6),
                drift: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                color: Math.random() > 0.65 ? secondary : primary
            });
        }
        let current = 0;
        function draw() {
            ctx.fillStyle = 'rgba(5, 5, 8, 0.18)';
            ctx.fillRect(0, 0, width, height);
            motes.forEach(m => {
                m.y += m.speedY;
                m.x += m.drift + Math.sin(current * 0.01 + m.y * 0.01) * 0.2;
                if (m.y < -10) {
                    m.y = height + 10;
                    m.x = Math.random() * width;
                }
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${m.color.r}, ${m.color.g}, ${m.color.b}, ${m.opacity})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${m.color.r}, ${m.color.g}, ${m.color.b}, 0.4)`;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            current++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: SOUL ────────────────────────────────────────────────────────
    function soul(canvas, ctx, width, height, primary, secondary) {
        const souls = [];
        const count = Math.min(30, Math.floor((width * height) / 35000));
        for (let i = 0; i < count; i++) {
            souls.push({
                x: Math.random() * width,
                y: height + Math.random() * 100,
                size: randomRange(6, 14),
                speedY: randomRange(0.6, 1.8),
                drift: randomRange(-0.4, 0.4),
                wingPhase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.2,
                color: Math.random() > 0.7 ? secondary : primary
            });
        }
        let t = 0;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            souls.forEach(s => {
                s.y -= s.speedY;
                s.x += s.drift + Math.sin(t * 0.02 + s.wingPhase) * 0.3;
                if (s.y < -30) {
                    s.y = height + 30;
                    s.x = Math.random() * width;
                }
                const wing = Math.sin(t * 0.08 + s.wingPhase) * s.size * 0.6;
                ctx.beginPath();
                ctx.ellipse(s.x - wing * 0.6, s.y, Math.abs(wing), s.size * 0.35, -0.3, 0, Math.PI * 2);
                ctx.ellipse(s.x + wing * 0.6, s.y, Math.abs(wing), s.size * 0.35, 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 1.3})`;
                ctx.fill();
            });
            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: VOLCANIC ────────────────────────────────────────────────────
    function volcanic(canvas, ctx, width, height, primary, secondary) {
        const embers = [];
        const count = Math.min(120, Math.floor((width * height) / 14000));
        for (let i = 0; i < count; i++) {
            embers.push({
                x: Math.random() * width,
                y: height + Math.random() * 60,
                size: Math.random() * 2.5 + 0.5,
                speedY: randomRange(1.5, 4),
                drift: randomRange(-0.8, 0.8),
                opacity: Math.random() * 0.6 + 0.2,
                life: Math.random(),
                color: Math.random() > 0.6 ? secondary : primary
            });
        }
        let flash = 0;
        function draw() {
            ctx.fillStyle = 'rgba(8, 4, 4, 0.2)';
            ctx.fillRect(0, 0, width, height);
            if (Math.random() < 0.008) flash = randomRange(0.25, 0.55);
            if (flash > 0) {
                ctx.fillStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${flash})`;
                ctx.fillRect(0, 0, width, height);
                flash *= 0.88;
            }
            embers.forEach(e => {
                e.y -= e.speedY;
                e.x += e.drift;
                e.life -= 0.003;
                if (e.y < 0 || e.life <= 0) {
                    e.y = height + Math.random() * 30;
                    e.x = Math.random() * width;
                    e.life = 1;
                }
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${e.opacity * e.life})`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, 0.5)`;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: CANAANITE WAR (Anat) ────────────────────────────────────────
    function canaaniteWar(canvas, ctx, width, height, primary, secondary) {
        const grains = [];
        const spears = [];
        const count = Math.min(140, Math.floor((width * height) / 15000));
        for (let i = 0; i < count; i++) {
            grains.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedX: Math.random() * 1.2 + 0.3,
                speedY: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.7 ? secondary : primary
            });
        }
        let flash = 0;
        function draw() {
            ctx.fillStyle = `rgba(${primary.r * 0.08 | 0}, ${primary.g * 0.08 | 0}, ${primary.b * 0.08 | 0}, 0.25)`;
            ctx.fillRect(0, 0, width, height);

            grains.forEach(g => {
                g.x += g.speedX;
                g.y += g.speedY;
                if (g.x > width) g.x = -2;
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity})`;
                ctx.fill();
            });

            if (Math.random() < 0.006) flash = randomRange(0.15, 0.35);
            if (flash > 0.01) {
                ctx.fillStyle = `rgba(255, 245, 220, ${flash})`;
                ctx.fillRect(0, 0, width, height);
                flash *= 0.85;
            }

            if (Math.random() < 0.015) {
                spears.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    length: randomRange(40, 120),
                    angle: randomRange(-Math.PI / 4, Math.PI / 4),
                    life: 1,
                    speed: randomRange(8, 16)
                });
            }
            for (let i = spears.length - 1; i >= 0; i--) {
                const s = spears[i];
                s.x += Math.cos(s.angle) * s.speed;
                s.y += Math.sin(s.angle) * s.speed;
                s.life -= 0.04;
                if (s.life <= 0) {
                    spears.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle);
                ctx.strokeStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${s.life * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-s.length / 2, 0);
                ctx.lineTo(s.length / 2, 0);
                ctx.stroke();
                ctx.restore();
            }

            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: STORM ON ZAPHON (Baal) ──────────────────────────────────────
    function stormOnZaphon(canvas, ctx, width, height, primary, secondary) {
        const rain = [];
        const rainCount = Math.min(200, Math.floor(width / 4));
        for (let i = 0; i < rainCount; i++) {
            rain.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: randomRange(10, 25),
                speed: randomRange(12, 20)
            });
        }
        let lightning = 0;
        function draw() {
            ctx.fillStyle = `rgba(10, 14, 26, 0.35)`;
            ctx.fillRect(0, 0, width, height);

            const cloudGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
            cloudGrad.addColorStop(0, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.35)`);
            cloudGrad.addColorStop(1, 'rgba(10, 14, 26, 0)');
            ctx.fillStyle = cloudGrad;
            ctx.fillRect(0, 0, width, height * 0.45);

            ctx.strokeStyle = `rgba(180, 200, 220, 0.25)`;
            ctx.lineWidth = 1;
            rain.forEach(r => {
                r.y += r.speed;
                r.x -= 0.5;
                if (r.y > height) {
                    r.y = -r.length;
                    r.x = Math.random() * width;
                }
                ctx.beginPath();
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.x - 2, r.y + r.length);
                ctx.stroke();
            });

            if (Math.random() < 0.008) lightning = randomRange(0.3, 0.7);
            if (lightning > 0.01) {
                ctx.strokeStyle = `rgba(255, 250, 220, ${lightning})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 20;
                ctx.shadowColor = `rgba(255, 250, 220, ${lightning})`;
                ctx.beginPath();
                let lx = randomRange(width * 0.3, width * 0.7);
                let ly = 0;
                ctx.moveTo(lx, ly);
                while (ly < height * 0.6) {
                    lx += randomRange(-40, 40);
                    ly += randomRange(20, 50);
                    ctx.lineTo(lx, ly);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
                lightning *= 0.82;
            }

            const mountainGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
            mountainGrad.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.15)`);
            mountainGrad.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.35)`);
            ctx.fillStyle = mountainGrad;
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(width * 0.2, height * 0.62);
            ctx.lineTo(width * 0.5, height * 0.52);
            ctx.lineTo(width * 0.8, height * 0.62);
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();

            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: VINE REVEL (Dionysos) ───────────────────────────────────────
    function vineRevel(canvas, ctx, width, height, primary, secondary) {
        const vines = [];
        const leaves = [];
        const vineCount = Math.min(12, Math.floor(width / 120));
        for (let i = 0; i < vineCount; i++) {
            vines.push({
                x: (i + 0.5) * (width / vineCount) + randomRange(-30, 30),
                y: height + randomRange(20, 80),
                amp: randomRange(20, 50),
                freq: randomRange(0.005, 0.012),
                phase: Math.random() * Math.PI * 2,
                speed: randomRange(0.3, 0.8),
                height: randomRange(height * 0.5, height * 0.85)
            });
        }
        for (let i = 0; i < 60; i++) {
            leaves.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: randomRange(3, 7),
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: randomRange(-0.02, 0.02),
                color: Math.random() > 0.6 ? secondary : primary
            });
        }
        let t = 0;
        function draw() {
            ctx.fillStyle = 'rgba(8, 6, 10, 0.25)';
            ctx.fillRect(0, 0, width, height);

            vines.forEach(v => {
                ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.4)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let y = 0; y < v.height; y += 5) {
                    const x = v.x + Math.sin(y * v.freq + v.phase + t * 0.02) * (v.amp * (y / v.height));
                    if (y === 0) ctx.moveTo(x, height - y);
                    else ctx.lineTo(x, height - y);
                }
                ctx.stroke();
            });

            leaves.forEach(l => {
                l.y -= 0.3;
                l.rotation += l.rotSpeed;
                l.x += Math.sin(t * 0.01 + l.y * 0.01) * 0.3;
                if (l.y < -10) l.y = height + 10;
                ctx.save();
                ctx.translate(l.x, l.y);
                ctx.rotate(l.rotation);
                ctx.fillStyle = `rgba(${l.color.r}, ${l.color.g}, ${l.color.b}, 0.45)`;
                ctx.beginPath();
                ctx.ellipse(0, 0, l.size, l.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: DESCENT GATE (Ishtar) ───────────────────────────────────────
    function descentGate(canvas, ctx, width, height, primary, secondary) {
        const stars = [];
        const lions = [];
        const starCount = Math.min(120, Math.floor((width * height) / 18000));
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.3,
                opacity: Math.random(),
                twinkle: Math.random() * 0.03 + 0.005
            });
        }
        const gateCount = 7;
        const gateWidth = width / (gateCount + 1);
        function draw() {
            ctx.fillStyle = 'rgba(18, 6, 10, 0.3)';
            ctx.fillRect(0, 0, width, height);

            stars.forEach(s => {
                s.opacity += s.twinkle;
                if (s.opacity > 1 || s.opacity < 0.2) s.twinkle *= -1;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${s.opacity * 0.7})`;
                ctx.fill();
            });

            for (let i = 1; i <= gateCount; i++) {
                const x = i * gateWidth;
                const h = height * (0.4 + i * 0.06);
                ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${0.15 + i * 0.04})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x, height);
                ctx.lineTo(x, height - h);
                ctx.arc(x, height - h, gateWidth * 0.45, Math.PI, 0, true);
                ctx.lineTo(x + gateWidth * 0.9, height);
                ctx.stroke();
            }

            if (Math.random() < 0.01) {
                lions.push({
                    x: -60,
                    y: height - randomRange(40, 120),
                    size: randomRange(30, 50),
                    life: 1
                });
            }
            for (let i = lions.length - 1; i >= 0; i--) {
                const l = lions[i];
                l.x += 1.2;
                l.life -= 0.003;
                if (l.life <= 0 || l.x > width + 60) {
                    lions.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.translate(l.x, l.y);
                ctx.fillStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${l.life * 0.35})`;
                ctx.beginPath();
                ctx.arc(0, 0, l.size * 0.5, 0, Math.PI * 2);
                ctx.arc(-l.size * 0.45, -l.size * 0.25, l.size * 0.25, 0, Math.PI * 2);
                ctx.arc(l.size * 0.45, -l.size * 0.25, l.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── EFFECT: COSMIC WATERS (Varuna) ──────────────────────────────────────
    function cosmicWaters(canvas, ctx, width, height, primary, secondary) {
        const waves = [];
        const serpents = [];
        for (let i = 0; i < 5; i++) {
            waves.push({
                y: height * (0.45 + i * 0.12),
                amp: randomRange(15, 35),
                freq: randomRange(0.003, 0.007),
                phase: Math.random() * Math.PI * 2,
                speed: randomRange(0.005, 0.015),
                colorMix: i / 4
            });
        }
        let t = 0;
        function draw() {
            ctx.fillStyle = 'rgba(6, 8, 22, 0.25)';
            ctx.fillRect(0, 0, width, height);

            waves.forEach((w, idx) => {
                const r = Math.round(primary.r * (1 - w.colorMix) + secondary.r * w.colorMix);
                const g = Math.round(primary.g * (1 - w.colorMix) + secondary.g * w.colorMix);
                const b = Math.round(primary.b * (1 - w.colorMix) + secondary.b * w.colorMix);
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.1 + idx * 0.04})`;
                ctx.lineWidth = 2 + idx;
                ctx.beginPath();
                for (let x = 0; x <= width; x += 8) {
                    const y = w.y + Math.sin(x * w.freq + w.phase + t * w.speed) * w.amp;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });

            if (Math.random() < 0.02) {
                serpents.push({
                    x: Math.random() * width,
                    y: height * 0.55 + Math.random() * height * 0.3,
                    amp: randomRange(20, 40),
                    freq: randomRange(0.01, 0.02),
                    phase: Math.random() * Math.PI * 2,
                    life: 1,
                    length: randomRange(80, 180)
                });
            }
            for (let i = serpents.length - 1; i >= 0; i--) {
                const s = serpents[i];
                s.x += 0.8;
                s.life -= 0.005;
                if (s.life <= 0 || s.x > width + s.length) {
                    serpents.splice(i, 1);
                    continue;
                }
                ctx.strokeStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${s.life * 0.35})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let lx = 0; lx < s.length; lx += 5) {
                    const x = s.x - lx;
                    const y = s.y + Math.sin(lx * s.freq + s.phase) * s.amp;
                    if (lx === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            t++;
            canvas.__raf = requestAnimationFrame(draw);
        }
        draw();
    }

    const effects = {
        particles,
        stars,
        void: voidEffect,
        time,
        light,
        water,
        storm,
        tree,
        mountain,
        sun,
        flame,
        aurora,
        cosmicNet,
        sandstorm,
        abyssal,
        soul,
        volcanic,
        canaaniteWar,
        stormOnZaphon,
        vineRevel,
        descentGate,
        cosmicWaters
    };

    function runEffect(canvas) {
        const effectName = canvas.getAttribute('data-effect') || 'particles';
        const effect = effects[effectName] || effects.particles;
        const primaryColor = getColor(canvas, { name: 'primary', value: '#D4AF37' });
        const secondaryColor = getColor(canvas, { name: 'secondary', value: '#4169E1' });
        const primaryRgb = hexToRgb(primaryColor) || { r: 212, g: 175, b: 55 };
        const secondaryRgb = hexToRgb(secondaryColor) || { r: 65, g: 105, b: 225 };

        if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
        const size = resizeCanvas(canvas);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        effect(canvas, ctx, size.width, size.height, primaryRgb, secondaryRgb);

        let resizeTimeout;
        const onResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
                const newSize = resizeCanvas(canvas);
                effect(canvas, ctx, newSize.width, newSize.height, primaryRgb, secondaryRgb);
            }, 150);
        };
        window.addEventListener('resize', onResize);
    }

    function init() {
        if (prefersReducedMotion) return;
        document.querySelectorAll('canvas[data-effect]').forEach(runEffect);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.FlagshipCanvas = {
        effects,
        run: runEffect,
        init
    };
})();
