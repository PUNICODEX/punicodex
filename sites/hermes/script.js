/* =====================================================
   ἙΡΜΗΣ — Messenger Canvas Engine
   Swift streaks, caduceus serpents, wing particles,
   mercury droplets, signal pulses, road trails
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       MESSENGER CANVAS
       ===================================================== */
    const canvas = document.getElementById('messenger-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    // Color palette
    const GOLDENROD = { r: 218, g: 165, b: 32 };
    const GREEN = { r: 34, g: 139, b: 34 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const CREAM = { r: 245, g: 245, b: 220 };
    const OLIVE = { r: 85, g: 107, b: 47 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Road Trails ---------- */
    const trails = [];
    const TRAIL_COUNT = 6;

    function initTrails() {
        trails.length = 0;
        for (let i = 0; i < TRAIL_COUNT; i++) {
            trails.push({
                y: Math.random() * height,
                width: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.08 + 0.02,
                speed: Math.random() * 0.5 + 0.2,
                dashOffset: Math.random() * 100,
            });
        }
    }

    /* ---------- LAYER 2: Swift Streaks ---------- */
    const streaks = [];
    function spawnStreak() {
        if (Math.random() > 0.02) return;
        const angle = Math.random() * Math.PI * 2;
        streaks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            angle: angle,
            length: Math.random() * 200 + 100,
            speed: Math.random() * 8 + 5,
            opacity: Math.random() * 0.4 + 0.2,
            width: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.6 ? GOLDENROD : CREAM,
        });
    }

    /* ---------- LAYER 3: Caduceus Serpents ---------- */
    const serpents = [];
    function initSerpents() {
        serpents.length = 0;
        for (let i = 0; i < 2; i++) {
            serpents.push({
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.01 + 0.005,
                amplitude: Math.random() * 40 + 30,
                frequency: Math.random() * 0.008 + 0.004,
                yOffset: height * 0.3 + i * height * 0.3,
                opacity: Math.random() * 0.1 + 0.05,
                color: i === 0 ? GREEN : GOLDENROD,
            });
        }
    }

    /* ---------- LAYER 4: Wing Particles ---------- */
    const wings = [];
    const WING_COUNT = 30;

    function initWings() {
        for (let i = 0; i < WING_COUNT; i++) {
            wings.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 0.8,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.03,
                opacity: Math.random() * 0.25 + 0.08,
                color: Math.random() > 0.5 ? CREAM : GOLDENROD,
            });
        }
    }

    /* ---------- LAYER 5: Mercury Droplets ---------- */
    const droplets = [];
    const DROPLET_COUNT = 15;

    function initDroplets() {
        for (let i = 0; i < DROPLET_COUNT; i++) {
            droplets.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.4 + 0.15,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 6: Signal Pulses ---------- */
    const signals = [];
    function spawnSignal() {
        if (Math.random() > 0.008) return;
        signals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 5,
            maxRadius: Math.random() * 100 + 60,
            opacity: 0.6,
            color: Math.random() > 0.5 ? GOLDENROD : GREEN,
        });
    }

    /* ---------- LAYER 7: Lightning Flashes ---------- */
    const flashes = [];
    function spawnFlash() {
        if (Math.random() > 0.006) return;
        flashes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 60 + 30,
            opacity: 1,
            fadeSpeed: Math.random() * 0.08 + 0.05,
        });
    }

    /* ---------- Update Functions ---------- */
    function updateTrails() {
        for (const t of trails) {
            t.dashOffset += t.speed;
        }
    }

    function updateStreaks() {
        for (let i = streaks.length - 1; i >= 0; i--) {
            const s = streaks[i];
            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
            s.opacity -= 0.015;
            if (s.opacity <= 0 || s.x < -200 || s.x > width + 200 || s.y < -200 || s.y > height + 200) {
                streaks.splice(i, 1);
            }
        }
    }

    function updateSerpents() {
        for (const s of serpents) {
            s.phase += s.speed;
        }
    }

    function updateWings() {
        for (const w of wings) {
            w.x += w.vx;
            w.y += w.vy;
            w.rotation += w.rotSpeed;

            if (w.x < -50) w.x = width + 50;
            if (w.x > width + 50) w.x = -50;
            if (w.y < -50) w.y = height + 50;
            if (w.y > height + 50) w.y = -50;
        }
    }

    function updateDroplets() {
        for (const d of droplets) {
            d.x += d.vx;
            d.y += d.vy;
            d.pulsePhase += 0.05;
            d.currentOpacity = d.opacity * (0.7 + 0.3 * Math.sin(d.pulsePhase));

            // Bounce off edges
            if (d.x < 0 || d.x > width) d.vx *= -1;
            if (d.y < 0 || d.y > height) d.vy *= -1;
        }
    }

    function updateSignals() {
        for (let i = signals.length - 1; i >= 0; i--) {
            const s = signals[i];
            s.radius += 1.2;
            s.opacity = 0.6 * (1 - s.radius / s.maxRadius);
            if (s.radius >= s.maxRadius || s.opacity <= 0) {
                signals.splice(i, 1);
            }
        }
    }

    function updateFlashes() {
        for (let i = flashes.length - 1; i >= 0; i--) {
            const f = flashes[i];
            f.opacity -= f.fadeSpeed;
            if (f.opacity <= 0) {
                flashes.splice(i, 1);
            }
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawTrails() {
        for (const t of trails) {
            ctx.strokeStyle = `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${t.opacity})`;
            ctx.lineWidth = t.width;
            ctx.setLineDash([20, 40]);
            ctx.lineDashOffset = -t.dashOffset;
            ctx.beginPath();
            ctx.moveTo(0, t.y);
            ctx.lineTo(width, t.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawStreaks() {
        for (const s of streaks) {
            const x2 = s.x + Math.cos(s.angle) * s.length;
            const y2 = s.y + Math.sin(s.angle) * s.length;

            // Glow
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.2})`;
            ctx.lineWidth = s.width * 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Core
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    function drawSerpents() {
        for (const s of serpents) {
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x < width; x += 3) {
                const y = s.yOffset + Math.sin(x * s.frequency + s.phase) * s.amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Second intertwined serpent
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x < width; x += 3) {
                const y = s.yOffset + Math.sin(x * s.frequency + s.phase + Math.PI) * s.amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function drawWings() {
        for (const w of wings) {
            ctx.save();
            ctx.translate(w.x, w.y);
            ctx.rotate(w.rotation);

            ctx.fillStyle = `rgba(${w.color.r}, ${w.color.g}, ${w.color.b}, ${w.opacity})`;
            ctx.beginPath();
            // Feather shape
            ctx.moveTo(0, -w.size);
            ctx.quadraticCurveTo(w.size * 0.7, -w.size * 0.3, w.size * 0.5, w.size * 0.5);
            ctx.quadraticCurveTo(0, w.size * 0.3, 0, w.size * 0.5);
            ctx.quadraticCurveTo(-w.size * 0.5, w.size * 0.3, -w.size * 0.5, w.size * 0.5);
            ctx.quadraticCurveTo(-w.size * 0.7, -w.size * 0.3, 0, -w.size);
            ctx.fill();

            // Feather line
            ctx.strokeStyle = `rgba(${w.color.r}, ${w.color.g}, ${w.color.b}, ${w.opacity * 0.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -w.size);
            ctx.lineTo(0, w.size * 0.3);
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawDroplets() {
        for (const d of droplets) {
            // Glow
            const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 3);
            glow.addColorStop(0, `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${d.currentOpacity * 0.3})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${d.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${d.currentOpacity * 0.6})`;
            ctx.beginPath();
            ctx.arc(d.x - d.size * 0.3, d.y - d.size * 0.3, d.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSignals() {
        for (const s of signals) {
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawFlashes() {
        for (const f of flashes) {
            if (f.opacity <= 0) continue;

            const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
            gradient.addColorStop(0, `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${f.opacity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${f.opacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 10, 6, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 6, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initTrails();
        initSerpents();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(10, 10, 6, 0.15)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateTrails();
        updateStreaks();
        updateSerpents();
        updateWings();
        updateDroplets();
        updateSignals();
        updateFlashes();

        spawnStreak();
        spawnSignal();
        spawnFlash();

        drawTrails();
        drawSerpents();
        drawSignals();
        drawWings();
        drawDroplets();
        drawStreaks();
        drawFlashes();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initWings();
    initDroplets();
    animateCanvas();

    /* =====================================================
       SCROLL REVEALS
       ===================================================== */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    /* =====================================================
       NAV SCROLL EFFECT
       ===================================================== */
    const nav = document.getElementById('main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 80) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });

    /* =====================================================
       MOBILE NAV TOGGLE
       ===================================================== */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    /* =====================================================
       MASCOT PARALLAX
       ===================================================== */
    const mascot = document.querySelector('.mascot-img');
    if (mascot) {
        window.addEventListener('mousemove', e => {
            const x = (e.clientX / width - 0.5) * 15;
            const y = (e.clientY / height - 0.5) * 10;
            mascot.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    /* =====================================================
       SMOOTH SCROLL
       ===================================================== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();
