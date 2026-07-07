/* =====================================================
   ἈΠΌΛΛΩΝ — Solar Canvas Engine
   Sun radiance, lyre strings, laurel leaves, oracle mist
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       SOLAR CANVAS
       ===================================================== */
const canvas = document.getElementById('solar-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const SOLAR = { r: 255, g: 215, b: 0 };
    const CREAM = { r: 245, g: 245, b: 220 };
    const LAUREL = { r: 34, g: 139, b: 34 };
    const ORANGE = { r: 255, g: 165, b: 0 };
    const GOLD = { r: 212, g: 175, b: 55 };

    // Sun center (behind mascot area, upper right)
    let sunX, sunY;

    // Sun rays
    const rays = [];
    const RAY_COUNT = 36;

    // Lyre strings
    const strings = [];
    const STRING_COUNT = 8;

    // Laurel leaves
    const leaves = [];

    // Oracle particles
    const oracles = [];

    // Sun flares
    const flares = [];

    // Python curves
    const pythons = [];

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        sunX = width * 0.7;
        sunY = height * 0.3;
        initRays();
        initStrings();
    }

    function initRays() {
        rays.length = 0;
        for (let i = 0; i < RAY_COUNT; i++) {
            rays.push({
                angle: (i / RAY_COUNT) * Math.PI * 2,
                length: Math.random() * 300 + 200,
                width: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.15 + 0.05,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.01 + 0.005,
            });
        }
    }

    function initStrings() {
        strings.length = 0;
        for (let i = 0; i < STRING_COUNT; i++) {
            strings.push({
                y: height * 0.2 + (i / STRING_COUNT) * height * 0.6,
                amplitude: Math.random() * 8 + 4,
                frequency: Math.random() * 0.02 + 0.01,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.03 + 0.02,
                opacity: Math.random() * 0.2 + 0.05,
            });
        }
    }

    function initLeaves() {
        for (let i = 0; i < 20; i++) {
            leaves.push(createLeaf());
        }
    }

    function createLeaf() {
        const isLaurel = Math.random() > 0.4;
        return {
            x: Math.random() * width,
            y: Math.random() * height + height,
            size: Math.random() * 5 + 3,
            speed: Math.random() * 0.8 + 0.3,
            sway: Math.random() * 2 + 1,
            swaySpeed: Math.random() * 0.015 + 0.008,
            swayPhase: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.015,
            opacity: Math.random() * 0.35 + 0.1,
            color: isLaurel ? LAUREL : GOLD,
        };
    }

    function initOracles() {
        for (let i = 0; i < 40; i++) {
            oracles.push({
                x: Math.random() * width,
                y: Math.random() * height + height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.4 + 0.1,
                opacity: Math.random() * 0.5 + 0.1,
                fadePhase: Math.random() * Math.PI * 2,
                fadeSpeed: Math.random() * 0.02 + 0.01,
            });
        }
    }

    function spawnFlare() {
        if (Math.random() > 0.005) return;
        flares.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 80 + 40,
            opacity: 0,
            targetOpacity: Math.random() * 0.3 + 0.1,
            state: 'fading-in',
            life: 0,
            maxLife: Math.random() * 200 + 100,
        });
    }

    function initPythons() {
        for (let i = 0; i < 3; i++) {
            pythons.push({
                points: [],
                yBase: height * 0.3 + i * height * 0.2,
                amplitude: Math.random() * 30 + 20,
                frequency: Math.random() * 0.005 + 0.002,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.01 + 0.005,
                opacity: Math.random() * 0.08 + 0.03,
                segments: 50,
            });
        }
    }

    function updateRays() {
        for (const ray of rays) {
            ray.pulsePhase += ray.pulseSpeed;
            ray.currentOpacity = ray.opacity * (0.6 + 0.4 * Math.sin(ray.pulsePhase));
        }
    }

    function updateStrings() {
        for (const s of strings) {
            s.phase += s.speed;
        }
    }

    function updateLeaves() {
        for (const leaf of leaves) {
            leaf.y -= leaf.speed;
            leaf.swayPhase += leaf.swaySpeed;
            leaf.x += Math.sin(leaf.swayPhase) * leaf.sway * 0.3;
            leaf.rotation += leaf.rotSpeed;

            if (leaf.y < -20) {
                leaf.y = height + 20;
                leaf.x = Math.random() * width;
            }
        }
    }

    function updateOracles() {
        for (const o of oracles) {
            o.y -= o.speed;
            o.fadePhase += o.fadeSpeed;
            o.currentOpacity = o.opacity * (0.5 + 0.5 * Math.sin(o.fadePhase));

            if (o.y < -10) {
                o.y = height + 10;
                o.x = Math.random() * width;
            }
        }
    }

    function updateFlares() {
        for (let i = flares.length - 1; i >= 0; i--) {
            const f = flares[i];
            f.life++;

            if (f.state === 'fading-in') {
                f.opacity += 0.008;
                if (f.opacity >= f.targetOpacity) {
                    f.opacity = f.targetOpacity;
                    f.state = 'active';
                }
            } else if (f.state === 'active') {
                if (f.life > f.maxLife) {
                    f.state = 'fading-out';
                }
            } else if (f.state === 'fading-out') {
                f.opacity -= 0.008;
                if (f.opacity <= 0) {
                    flares.splice(i, 1);
                    continue;
                }
            }
        }
    }

    function updatePythons() {
        for (const p of pythons) {
            p.phase += p.speed;
            p.points = [];
            for (let i = 0; i <= p.segments; i++) {
                const x = (i / p.segments) * width;
                const y = p.yBase + Math.sin(x * p.frequency + p.phase) * p.amplitude;
                p.points.push({ x, y });
            }
        }
    }

    function drawSunCore() {
        // Warm glow behind sun center
        const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 250);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
        gradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.04)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function drawRays() {
        ctx.save();
        ctx.translate(sunX, sunY);
        for (const ray of rays) {
            ctx.rotate(ray.angle + time * 0.0003);
            ctx.strokeStyle = `rgba(${SOLAR.r}, ${SOLAR.g}, ${SOLAR.b}, ${ray.currentOpacity})`;
            ctx.lineWidth = ray.width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(ray.length, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawStrings() {
        for (const s of strings) {
            ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${s.opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let x = 0; x < width; x += 3) {
                const y = s.y + Math.sin(x * s.frequency + s.phase) * s.amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function drawLeaves() {
        for (const leaf of leaves) {
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(leaf.rotation);

            const r = leaf.color.r;
            const g = leaf.color.g;
            const b = leaf.color.b;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${leaf.opacity})`;
            ctx.beginPath();
            // Laurel leaf shape (elongated ellipse)
            ctx.ellipse(0, 0, leaf.size, leaf.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawOracles() {
        for (const o of oracles) {
            ctx.fillStyle = `rgba(${SOLAR.r}, ${SOLAR.g}, ${SOLAR.b}, ${o.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFlares() {
        for (const f of flares) {
            if (f.opacity <= 0) continue;

            const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
            gradient.addColorStop(0, `rgba(${SOLAR.r}, ${SOLAR.g}, ${SOLAR.b}, ${f.opacity})`);
            gradient.addColorStop(0.4, `rgba(${ORANGE.r}, ${ORANGE.g}, ${ORANGE.b}, ${f.opacity * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPythons() {
        for (const p of pythons) {
            if (p.points.length < 2) continue;

            ctx.strokeStyle = `rgba(${LAUREL.r}, ${LAUREL.g}, ${LAUREL.b}, ${p.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.points[0].x, p.points[0].y);
            for (let i = 1; i < p.points.length; i++) {
                ctx.lineTo(p.points[i].x, p.points[i].y);
            }
            ctx.stroke();

            // Dotted follow line
            ctx.strokeStyle = `rgba(${LAUREL.r}, ${LAUREL.g}, ${LAUREL.b}, ${p.opacity * 0.3})`;
            ctx.setLineDash([5, 15]);
            ctx.beginPath();
            ctx.moveTo(p.points[0].x, p.points[0].y + 8);
            for (let i = 1; i < p.points.length; i++) {
                ctx.lineTo(p.points[i].x, p.points[i].y + 8);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawOverlay() {
        // Warm vignette
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 8, 4, 0)');
        gradient.addColorStop(1, 'rgba(10, 8, 4, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        // Background tint
        ctx.fillStyle = 'rgba(10, 8, 4, 0.2)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateRays();
        updateStrings();
        updateLeaves();
        updateOracles();
        updateFlares();
        updatePythons();

        spawnFlare();

        drawPythons();
        drawSunCore();
        drawRays();
        drawStrings();
        drawFlares();
        drawLeaves();
        drawOracles();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initLeaves();
    initOracles();
    initPythons();
    animateCanvas();

    } else {
    }
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
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
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
