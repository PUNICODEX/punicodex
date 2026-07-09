/* =====================================================
   ἌΤΛΑΣ — Celestial Canvas Engine
   Stars, celestial sphere, mountain silhouettes, cosmic dust
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       CELESTIAL CANVAS
       ===================================================== */
const canvas = document.getElementById('celestial-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const BRONZE = { r: 184, g: 115, b: 51 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const CELESTIAL = { r: 91, g: 155, b: 213 };
    const STONE = { r: 232, g: 224, b: 213 };
    const SILVER = { r: 192, g: 192, b: 192 };

    // Sphere center (behind mascot area, upper right)
    let sphereX, sphereY;
    let sphereRadius = 120;

    // Stars
    const stars = [];
    const STAR_COUNT = 150;

    // Constellation lines
    const constellations = [];

    // Shooting stars
    const shootingStars = [];

    // Cosmic dust
    const dust = [];

    // Mountain ridges
    const ridges = [];

    // Celestial rings
    let ringAngle = 0;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        sphereX = width * 0.72;
        sphereY = height * 0.32;
        sphereRadius = Math.min(width, height) * 0.14;
        initStars();
        initConstellations();
        initRidges();
    }

    function initStars() {
        stars.length = 0;
        for (let i = 0; i < STAR_COUNT; i++) {
            const isBright = Math.random() > 0.85;
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.75,
                size: isBright ? Math.random() * 2 + 1.5 : Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.6 + 0.2,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                color: isBright ? GOLD : (Math.random() > 0.7 ? BRONZE : STONE),
            });
        }
    }

    function initConstellations() {
        constellations.length = 0;
        // Create a few constellation patterns
        for (let c = 0; c < 4; c++) {
            const cx = Math.random() * width * 0.6 + width * 0.1;
            const cy = Math.random() * height * 0.4 + height * 0.05;
            const points = [];
            const numPoints = Math.floor(Math.random() * 4) + 4;
            for (let p = 0; p < numPoints; p++) {
                points.push({
                    x: cx + (Math.random() - 0.5) * 120,
                    y: cy + (Math.random() - 0.5) * 80,
                });
            }
            constellations.push({
                points,
                opacity: Math.random() * 0.15 + 0.05,
            });
        }
    }

    function initRidges() {
        ridges.length = 0;
        for (let r = 0; r < 3; r++) {
            const points = [];
            const segments = 30;
            for (let i = 0; i <= segments; i++) {
                const x = (i / segments) * width;
                const baseY = height * (0.82 + r * 0.06);
                const noise = Math.sin(i * 0.5 + r * 2) * 15 + Math.sin(i * 1.2 + r) * 8;
                points.push({ x, y: baseY + noise });
            }
            ridges.push({
                points,
                opacity: 0.15 - r * 0.04,
            });
        }
    }

    function initDust() {
        for (let i = 0; i < 60; i++) {
            dust.push(createDust());
        }
    }

    function createDust() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.15 + 0.05,
            drift: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.3 + 0.05,
            fadePhase: Math.random() * Math.PI * 2,
            fadeSpeed: Math.random() * 0.01 + 0.003,
        };
    }

    function spawnShootingStar() {
        if (Math.random() > 0.003) return;
        const startX = Math.random() * width * 0.7;
        const startY = Math.random() * height * 0.3;
        shootingStars.push({
            x: startX,
            y: startY,
            vx: Math.random() * 3 + 2,
            vy: Math.random() * 1.5 + 0.5,
            length: Math.random() * 40 + 20,
            opacity: 1,
            life: 0,
            maxLife: Math.random() * 40 + 30,
        });
    }

    function updateStars() {
        for (const s of stars) {
            s.twinklePhase += s.twinkleSpeed;
            s.currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(s.twinklePhase));
        }
    }

    function updateDust() {
        for (const d of dust) {
            d.y += d.speed;
            d.x += d.drift + Math.sin(time * 0.001 + d.y * 0.01) * 0.1;
            d.fadePhase += d.fadeSpeed;
            d.currentOpacity = d.opacity * (0.5 + 0.5 * Math.sin(d.fadePhase));

            if (d.y > height + 10) {
                d.y = -10;
                d.x = Math.random() * width;
            }
        }
    }

    function updateShootingStars() {
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life++;
            s.opacity = 1 - (s.life / s.maxLife);

            if (s.life >= s.maxLife || s.x > width + 50 || s.y > height + 50) {
                shootingStars.splice(i, 1);
            }
        }
    }

    function updateRidges() {
        for (const r of ridges) {
            for (const p of r.points) {
                p.y += Math.sin(time * 0.0005 + p.x * 0.01) * 0.02;
            }
        }
    }

    function drawBackground() {
        // Deep mountain night sky
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0D1318');
        grad.addColorStop(0.4, '#141B21');
        grad.addColorStop(0.75, '#1C252C');
        grad.addColorStop(1, '#1A2028');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawCelestialSphere() {
        // Sphere glow
        const glow = ctx.createRadialGradient(sphereX, sphereY, 0, sphereX, sphereY, sphereRadius * 2.5);
        glow.addColorStop(0, 'rgba(184, 115, 51, 0.06)');
        glow.addColorStop(0.5, 'rgba(91, 155, 213, 0.03)');
        glow.addColorStop(1, 'rgba(184, 115, 51, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Sphere body
        const sphereGrad = ctx.createRadialGradient(
            sphereX - sphereRadius * 0.3, sphereY - sphereRadius * 0.3, 0,
            sphereX, sphereY, sphereRadius
        );
        sphereGrad.addColorStop(0, 'rgba(91, 155, 213, 0.12)');
        sphereGrad.addColorStop(0.6, 'rgba(184, 115, 51, 0.06)');
        sphereGrad.addColorStop(1, 'rgba(20, 27, 33, 0.3)');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sphere outline
        ctx.strokeStyle = 'rgba(184, 115, 51, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating rings
        ringAngle += 0.002;
        for (let r = 0; r < 3; r++) {
            const rx = sphereRadius * (1.1 + r * 0.25);
            const ry = rx * 0.3;
            ctx.save();
            ctx.translate(sphereX, sphereY);
            ctx.rotate(ringAngle + r * 1.2);
            ctx.strokeStyle = `rgba(184, 115, 51, ${0.08 - r * 0.02})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Grid lines on sphere
        ctx.save();
        ctx.translate(sphereX, sphereY);
        ctx.strokeStyle = 'rgba(91, 155, 213, 0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + ringAngle * 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * sphereRadius * 0.2, Math.sin(angle) * sphereRadius * 0.2);
            ctx.lineTo(Math.cos(angle) * sphereRadius * 0.9, Math.sin(angle) * sphereRadius * 0.9);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawConstellations() {
        for (const c of constellations) {
            ctx.strokeStyle = `rgba(212, 175, 55, ${c.opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let i = 0; i < c.points.length - 1; i++) {
                ctx.moveTo(c.points[i].x, c.points[i].y);
                ctx.lineTo(c.points[i + 1].x, c.points[i + 1].y);
            }
            ctx.stroke();

            // Draw constellation points
            for (const p of c.points) {
                ctx.fillStyle = `rgba(212, 175, 55, ${c.opacity * 2})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawStars() {
        for (const s of stars) {
            const r = s.color.r;
            const g = s.color.g;
            const b = s.color.b;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${s.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();

            // Bright stars get a glow
            if (s.size > 2) {
                const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
                glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${s.currentOpacity * 0.3})`);
                glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawShootingStars() {
        for (const s of shootingStars) {
            if (s.opacity <= 0) continue;

            const tailX = s.x - s.vx * (s.length / 5);
            const tailY = s.y - s.vy * (s.length / 5);

            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
            grad.addColorStop(0.5, `rgba(212, 175, 55, ${s.opacity * 0.6})`);
            grad.addColorStop(1, `rgba(184, 115, 51, 0)`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            // Head glow
            const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 6);
            headGlow.addColorStop(0, `rgba(255, 255, 255, ${s.opacity * 0.8})`);
            headGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.fillStyle = headGlow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawDust() {
        for (const d of dust) {
            ctx.fillStyle = `rgba(232, 224, 213, ${d.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawRidges() {
        for (const r of ridges) {
            if (r.points.length < 2) continue;

            ctx.strokeStyle = `rgba(20, 27, 33, ${r.opacity + 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(r.points[0].x, r.points[0].y);
            for (let i = 1; i < r.points.length; i++) {
                ctx.lineTo(r.points[i].x, r.points[i].y);
            }
            ctx.stroke();

            // Fill below ridge
            ctx.fillStyle = `rgba(20, 27, 33, ${r.opacity + 0.5})`;
            ctx.beginPath();
            ctx.moveTo(r.points[0].x, r.points[0].y);
            for (let i = 1; i < r.points.length; i++) {
                ctx.lineTo(r.points[i].x, r.points[i].y);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawOverlay() {
        // Cool vignette
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(20, 27, 33, 0)');
        gradient.addColorStop(1, 'rgba(20, 27, 33, 0.45)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        drawBackground();

        time += 16;

        updateStars();
        updateDust();
        updateShootingStars();
        updateRidges();

        spawnShootingStar();

        drawCelestialSphere();
        drawConstellations();
        drawStars();
        drawShootingStars();
        drawDust();
        drawRidges();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initDust();
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
