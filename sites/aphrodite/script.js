/* =====================================================
   ἈΦΡΟΔΊΤΗ — Beauty Canvas Engine
   Rose petals, golden light rays, doves, hearts,
   sea foam bubbles, pink mist
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       BEAUTY CANVAS
       ===================================================== */
    const canvas = document.getElementById('beauty-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    // Color palette
    const ROSE = { r: 255, g: 182, b: 193 };
    const ROSE_DEEP = { r: 255, g: 105, b: 180 };
    const GOLD = { r: 255, g: 215, b: 0 };
    const GOLD_DIM = { r: 212, g: 175, b: 55 };
    const CREAM = { r: 245, g: 245, b: 220 };
    const BLUSH = { r: 255, g: 240, b: 245 };
    const WHITE = { r: 255, g: 245, b: 240 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Golden Light Rays ---------- */
    const rays = [];
    const RAY_COUNT = 24;

    function initRays() {
        rays.length = 0;
        for (let i = 0; i < RAY_COUNT; i++) {
            rays.push({
                angle: (i / RAY_COUNT) * Math.PI * 2,
                length: Math.random() * 250 + 150,
                width: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.1 + 0.03,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.008 + 0.003,
            });
        }
    }

    /* ---------- LAYER 2: Rose Petals ---------- */
    const petals = [];
    const PETAL_COUNT = 40;

    function initPetals() {
        for (let i = 0; i < PETAL_COUNT; i++) {
            petals.push({
                x: Math.random() * width,
                y: Math.random() * height - height,
                size: Math.random() * 8 + 4,
                speed: Math.random() * 0.8 + 0.3,
                sway: Math.random() * 3 + 1,
                swaySpeed: Math.random() * 0.015 + 0.008,
                swayPhase: Math.random() * Math.PI * 2,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                opacity: Math.random() * 0.4 + 0.15,
                color: Math.random() > 0.6 ? ROSE : (Math.random() > 0.5 ? ROSE_DEEP : BLUSH),
            });
        }
    }

    /* ---------- LAYER 3: Dove Silhouettes ---------- */
    const doves = [];
    const DOVE_COUNT = 4;

    function initDoves() {
        for (let i = 0; i < DOVE_COUNT; i++) {
            doves.push({
                x: -50 - Math.random() * 200,
                y: Math.random() * height * 0.5 + height * 0.1,
                speed: Math.random() * 1.5 + 0.8,
                size: Math.random() * 15 + 10,
                opacity: Math.random() * 0.15 + 0.05,
                wingPhase: Math.random() * Math.PI * 2,
                wingSpeed: Math.random() * 0.08 + 0.04,
            });
        }
    }

    /* ---------- LAYER 4: Heart Particles ---------- */
    const hearts = [];
    const HEART_COUNT = 20;

    function initHearts() {
        for (let i = 0; i < HEART_COUNT; i++) {
            hearts.push({
                x: Math.random() * width,
                y: Math.random() * height + height,
                size: Math.random() * 6 + 3,
                speed: Math.random() * 0.6 + 0.2,
                opacity: Math.random() * 0.3 + 0.1,
                fadePhase: Math.random() * Math.PI * 2,
                fadeSpeed: Math.random() * 0.02 + 0.01,
                color: Math.random() > 0.5 ? ROSE : GOLD_DIM,
            });
        }
    }

    /* ---------- LAYER 5: Sea Foam Bubbles ---------- */
    const bubbles = [];
    const BUBBLE_COUNT = 25;

    function initBubbles() {
        for (let i = 0; i < BUBBLE_COUNT; i++) {
            bubbles.push({
                x: Math.random() * width,
                y: Math.random() * height + height,
                size: Math.random() * 5 + 2,
                speed: Math.random() * 0.5 + 0.2,
                sway: Math.random() * 2 + 0.5,
                swaySpeed: Math.random() * 0.02 + 0.01,
                swayPhase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.25 + 0.08,
            });
        }
    }

    /* ---------- LAYER 6: Pink Mist ---------- */
    const mists = [];
    const MIST_COUNT = 6;

    function initMists() {
        for (let i = 0; i < MIST_COUNT; i++) {
            mists.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 150 + 100,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 7: Sparkle Flashes ---------- */
    const sparkles = [];
    function spawnSparkle() {
        if (Math.random() > 0.015) return;
        sparkles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 30 + 15,
            opacity: 1,
            fadeSpeed: Math.random() * 0.04 + 0.02,
            color: Math.random() > 0.5 ? GOLD : ROSE,
        });
    }

    /* ---------- Update Functions ---------- */
    function updateRays() {
        for (const r of rays) {
            r.pulsePhase += r.pulseSpeed;
            r.currentOpacity = r.opacity * (0.6 + 0.4 * Math.sin(r.pulsePhase));
        }
    }

    function updatePetals() {
        for (const p of petals) {
            p.y += p.speed;
            p.swayPhase += p.swaySpeed;
            p.x += Math.sin(p.swayPhase) * p.sway * 0.3;
            p.rotation += p.rotSpeed;

            if (p.y > height + 20) {
                p.y = -20;
                p.x = Math.random() * width;
            }
        }
    }

    function updateDoves() {
        for (const d of doves) {
            d.x += d.speed;
            d.wingPhase += d.wingSpeed;

            if (d.x > width + 100) {
                d.x = -100;
                d.y = Math.random() * height * 0.5 + height * 0.1;
            }
        }
    }

    function updateHearts() {
        for (const h of hearts) {
            h.y -= h.speed;
            h.fadePhase += h.fadeSpeed;
            h.currentOpacity = h.opacity * (0.5 + 0.5 * Math.sin(h.fadePhase));

            if (h.y < -20) {
                h.y = height + 20;
                h.x = Math.random() * width;
            }
        }
    }

    function updateBubbles() {
        for (const b of bubbles) {
            b.y -= b.speed;
            b.swayPhase += b.swaySpeed;
            b.x += Math.sin(b.swayPhase) * b.sway * 0.3;

            if (b.y < -20) {
                b.y = height + 20;
                b.x = Math.random() * width;
            }
        }
    }

    function updateMists() {
        for (const m of mists) {
            m.x += m.vx;
            m.y += m.vy;
            m.pulsePhase += 0.005;
            m.currentOpacity = m.opacity * (0.5 + 0.5 * Math.sin(m.pulsePhase));

            if (m.x < -200) m.x = width + 200;
            if (m.x > width + 200) m.x = -200;
            if (m.y < -200) m.y = height + 200;
            if (m.y > height + 200) m.y = -200;
        }
    }

    function updateSparkles() {
        for (let i = sparkles.length - 1; i >= 0; i--) {
            const s = sparkles[i];
            s.opacity -= s.fadeSpeed;
            if (s.opacity <= 0) {
                sparkles.splice(i, 1);
            }
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawRays() {
        const cx = width * 0.5;
        const cy = height * 0.3;

        for (const r of rays) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(r.angle + time * 0.0002);
            ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${r.currentOpacity})`;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(r.length, 0);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawPetals() {
        for (const p of petals) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            const r = p.color.r;
            const g = p.color.g;
            const b = p.color.b;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
            ctx.beginPath();
            // Rose petal shape
            ctx.moveTo(0, -p.size);
            ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.8, p.size * 0.5, 0, p.size);
            ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawDoves() {
        for (const d of doves) {
            const wingY = Math.sin(d.wingPhase) * d.size * 0.4;

            ctx.save();
            ctx.translate(d.x, d.y);

            ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${d.opacity})`;

            // Body
            ctx.beginPath();
            ctx.ellipse(0, 0, d.size, d.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Left wing
            ctx.beginPath();
            ctx.moveTo(-d.size * 0.3, 0);
            ctx.quadraticCurveTo(-d.size * 1.2, -d.size * 0.8 + wingY, -d.size * 0.8, wingY);
            ctx.quadraticCurveTo(-d.size * 0.5, -d.size * 0.2 + wingY * 0.5, -d.size * 0.3, 0);
            ctx.fill();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(d.size * 0.3, 0);
            ctx.quadraticCurveTo(d.size * 1.2, -d.size * 0.8 - wingY, d.size * 0.8, -wingY);
            ctx.quadraticCurveTo(d.size * 0.5, -d.size * 0.2 - wingY * 0.5, d.size * 0.3, 0);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawHearts() {
        for (const h of hearts) {
            if (h.currentOpacity <= 0) continue;

            ctx.save();
            ctx.translate(h.x, h.y);

            const r = h.color.r;
            const g = h.color.g;
            const b = h.color.b;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${h.currentOpacity})`;
            ctx.beginPath();
            const s = h.size;
            ctx.moveTo(0, -s * 0.3);
            ctx.bezierCurveTo(-s, -s, -s, s * 0.5, 0, s);
            ctx.bezierCurveTo(s, s * 0.5, s, -s, 0, -s * 0.3);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawBubbles() {
        for (const b of bubbles) {
            ctx.strokeStyle = `rgba(${WHITE.r}, ${WHITE.g}, ${WHITE.b}, ${b.opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.stroke();

            // Highlight
            ctx.fillStyle = `rgba(${WHITE.r}, ${WHITE.g}, ${WHITE.b}, ${b.opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMists() {
        for (const m of mists) {
            const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
            gradient.addColorStop(0, `rgba(${ROSE.r}, ${ROSE.g}, ${ROSE.b}, ${m.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSparkles() {
        for (const s of sparkles) {
            if (s.opacity <= 0) continue;

            // Four-point star
            ctx.save();
            ctx.translate(s.x, s.y);

            const r = s.color.r;
            const g = s.color.g;
            const b = s.color.b;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${s.opacity})`;
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(s.size * 0.15, -s.size * 0.15);
            ctx.lineTo(s.size, 0);
            ctx.lineTo(s.size * 0.15, s.size * 0.15);
            ctx.lineTo(0, s.size);
            ctx.lineTo(-s.size * 0.15, s.size * 0.15);
            ctx.lineTo(-s.size, 0);
            ctx.lineTo(-s.size * 0.15, -s.size * 0.15);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(12, 8, 8, 0)');
        gradient.addColorStop(1, 'rgba(12, 8, 8, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initRays();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(12, 8, 8, 0.15)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateRays();
        updatePetals();
        updateDoves();
        updateHearts();
        updateBubbles();
        updateMists();
        updateSparkles();

        spawnSparkle();

        drawMists();
        drawRays();
        drawBubbles();
        drawHearts();
        drawPetals();
        drawDoves();
        drawSparkles();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initPetals();
    initDoves();
    initHearts();
    initBubbles();
    initMists();
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
