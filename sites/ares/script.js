/* =====================================================
   ἌΡΗΣ — Battlefield Canvas Engine
   Embers, blood mist, shield walls, sword slashes, fire
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       BATTLEFIELD CANVAS
       ===================================================== */
    const canvas = document.getElementById('battlefield-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    // Color palette
    const CRIMSON = { r: 139, g: 0, b: 0 };
    const CRIMSON_BRIGHT = { r: 179, g: 0, b: 0 };
    const BRONZE = { r: 205, g: 127, b: 50 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const ORANGE = { r: 255, g: 100, b: 30 };
    const ASH = { r: 120, g: 110, b: 100 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Shield Wall Triangles ---------- */
    const shields = [];
    const SHIELD_COUNT = 5;

    function initShields() {
        shields.length = 0;
        for (let i = 0; i < SHIELD_COUNT; i++) {
            shields.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 100 + 80,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.002,
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 2: Embers & Sparks ---------- */
    const embers = [];
    const EMBER_COUNT = 60;

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push(createEmber());
        }
    }

    function createEmber() {
        const isSpark = Math.random() > 0.7;
        return {
            x: Math.random() * width,
            y: Math.random() * height + height * 0.3,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(Math.random() * 1.5 + 0.5),
            size: isSpark ? Math.random() * 2 + 0.5 : Math.random() * 3 + 1,
            opacity: Math.random() * 0.6 + 0.2,
            fadeSpeed: Math.random() * 0.005 + 0.002,
            color: isSpark ? ORANGE : (Math.random() > 0.5 ? CRIMSON_BRIGHT : BRONZE),
            flickerPhase: Math.random() * Math.PI * 2,
        };
    }

    /* ---------- LAYER 3: Blood Mist ---------- */
    const bloodMist = [];
    const MIST_COUNT = 25;

    function initMist() {
        for (let i = 0; i < MIST_COUNT; i++) {
            bloodMist.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 80 + 40,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.08 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 4: Sword Slashes ---------- */
    const slashes = [];
    function spawnSlash() {
        if (Math.random() > 0.015) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200 + 100;
        slashes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            angle: angle,
            length: Math.random() * 150 + 80,
            width: Math.random() * 3 + 1,
            opacity: 1,
            fadeSpeed: Math.random() * 0.03 + 0.02,
            color: Math.random() > 0.5 ? CRIMSON_BRIGHT : BRONZE,
        });
    }

    /* ---------- LAYER 5: Smoke/Dust Clouds ---------- */
    const smoke = [];
    const SMOKE_COUNT = 8;

    function initSmoke() {
        for (let i = 0; i < SMOKE_COUNT; i++) {
            smoke.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 150 + 100,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -(Math.random() * 0.3 + 0.1),
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 6: Fire Flickers (bottom edge) ---------- */
    const fires = [];
    const FIRE_COUNT = 12;

    function initFires() {
        for (let i = 0; i < FIRE_COUNT; i++) {
            fires.push({
                x: (width / FIRE_COUNT) * i + Math.random() * 50,
                baseY: height,
                height: Math.random() * 60 + 30,
                width: Math.random() * 20 + 10,
                flickerPhase: Math.random() * Math.PI * 2,
                flickerSpeed: Math.random() * 0.1 + 0.05,
                opacity: Math.random() * 0.15 + 0.05,
            });
        }
    }

    /* ---------- LAYER 7: Floating Debris ---------- */
    const debris = [];
    const DEBRIS_COUNT = 20;

    function initDebris() {
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            debris.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 4 + 2,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.03,
                opacity: Math.random() * 0.2 + 0.05,
                color: Math.random() > 0.6 ? BRONZE : ASH,
            });
        }
    }

    /* ---------- Update Functions ---------- */
    function updateShields() {
        for (const s of shields) {
            s.rotation += s.rotSpeed;
            s.pulsePhase += 0.008;
            s.currentOpacity = s.opacity * (0.7 + 0.3 * Math.sin(s.pulsePhase));
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.flickerPhase += 0.1;
            e.opacity -= e.fadeSpeed;

            if (e.opacity <= 0 || e.y < -20) {
                embers[i] = createEmber();
                embers[i].y = height + Math.random() * 50;
            }
        }
    }

    function updateMist() {
        for (const m of bloodMist) {
            m.x += m.vx;
            m.y += m.vy;
            m.pulsePhase += 0.005;
            m.currentOpacity = m.opacity * (0.5 + 0.5 * Math.sin(m.pulsePhase));

            if (m.x < -100) m.x = width + 100;
            if (m.x > width + 100) m.x = -100;
            if (m.y < -100) m.y = height + 100;
            if (m.y > height + 100) m.y = -100;
        }
    }

    function updateSlashes() {
        for (let i = slashes.length - 1; i >= 0; i--) {
            const s = slashes[i];
            s.opacity -= s.fadeSpeed;
            if (s.opacity <= 0) {
                slashes.splice(i, 1);
            }
        }
    }

    function updateSmoke() {
        for (const s of smoke) {
            s.x += s.vx;
            s.y += s.vy;
            s.pulsePhase += 0.003;
            s.currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(s.pulsePhase));

            if (s.x < -200) s.x = width + 200;
            if (s.x > width + 200) s.x = -200;
            if (s.y < -200) s.y = height + 200;
            if (s.y > height + 200) s.y = -200;
        }
    }

    function updateFires() {
        for (const f of fires) {
            f.flickerPhase += f.flickerSpeed;
            f.currentOpacity = f.opacity * (0.5 + 0.5 * Math.sin(f.flickerPhase));
            f.currentHeight = f.height * (0.7 + 0.3 * Math.sin(f.flickerPhase * 1.3));
        }
    }

    function updateDebris() {
        for (const d of debris) {
            d.x += d.vx;
            d.y += d.vy;
            d.rotation += d.rotSpeed;

            if (d.x < -50) d.x = width + 50;
            if (d.x > width + 50) d.x = -50;
            if (d.y < -50) d.y = height + 50;
            if (d.y > height + 50) d.y = -50;
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawShields() {
        for (const s of shields) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Outer triangle (shield)
            ctx.strokeStyle = `rgba(${BRONZE.r}, ${BRONZE.g}, ${BRONZE.b}, ${s.currentOpacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(-s.size * 0.87, s.size * 0.5);
            ctx.lineTo(s.size * 0.87, s.size * 0.5);
            ctx.closePath();
            ctx.stroke();

            // Inner V (delta emblem)
            ctx.strokeStyle = `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${s.currentOpacity * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(-s.size * 0.4, s.size * 0.25);
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(s.size * 0.4, s.size * 0.25);
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const flicker = 0.7 + 0.3 * Math.sin(e.flickerPhase);
            const alpha = e.opacity * flicker;

            // Glow
            const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            glow.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.4})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMist() {
        for (const m of bloodMist) {
            const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
            gradient.addColorStop(0, `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${m.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSlashes() {
        for (const s of slashes) {
            if (s.opacity <= 0) continue;

            const x2 = s.x + Math.cos(s.angle) * s.length;
            const y2 = s.y + Math.sin(s.angle) * s.length;

            // Glow trail
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.3})`;
            ctx.lineWidth = s.width * 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Core line
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Spark at tip
            ctx.fillStyle = `rgba(${ORANGE.r}, ${ORANGE.g}, ${ORANGE.b}, ${s.opacity})`;
            ctx.beginPath();
            ctx.arc(x2, y2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSmoke() {
        for (const s of smoke) {
            const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            gradient.addColorStop(0, `rgba(${ASH.r}, ${ASH.g}, ${ASH.b}, ${s.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFires() {
        for (const f of fires) {
            const gradient = ctx.createRadialGradient(f.x, f.baseY, 0, f.x, f.baseY - f.currentHeight, f.width);
            gradient.addColorStop(0, `rgba(${CRIMSON_BRIGHT.r}, ${CRIMSON_BRIGHT.g}, ${CRIMSON_BRIGHT.b}, ${f.currentOpacity})`);
            gradient.addColorStop(0.5, `rgba(${ORANGE.r}, ${ORANGE.g}, ${ORANGE.b}, ${f.currentOpacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width, f.baseY);
            ctx.quadraticCurveTo(f.x - f.width * 0.5, f.baseY - f.currentHeight * 0.5, f.x, f.baseY - f.currentHeight);
            ctx.quadraticCurveTo(f.x + f.width * 0.5, f.baseY - f.currentHeight * 0.5, f.x + f.width, f.baseY);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawDebris() {
        for (const d of debris) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);

            ctx.strokeStyle = `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${d.opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-d.size, 0);
            ctx.lineTo(d.size, 0);
            ctx.moveTo(0, -d.size);
            ctx.lineTo(0, d.size);
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initShields();
        initFires();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateShields();
        updateEmbers();
        updateMist();
        updateSlashes();
        updateSmoke();
        updateFires();
        updateDebris();

        spawnSlash();

        drawSmoke();
        drawShields();
        drawMist();
        drawFires();
        drawEmbers();
        drawSlashes();
        drawDebris();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initEmbers();
    initMist();
    initSmoke();
    initDebris();
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
