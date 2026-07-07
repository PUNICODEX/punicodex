/* =====================================================
   ἭΦΑΙΣΤΟΣ — Forge Canvas Engine
   Sparks, molten flows, hammer strikes, heat shimmer,
   forge glow, embers, mechanical gears
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       FORGE CANVAS
       ===================================================== */
const canvas = document.getElementById('forge-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const FLAME = { r: 255, g: 69, b: 0 };
    const FLAME_BRIGHT = { r: 255, g: 140, b: 50 };
    const BRONZE = { r: 205, g: 127, b: 50 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const IRON = { r: 74, g: 74, b: 74 };
    const ASH = { r: 120, g: 110, b: 100 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Forge Glow (bottom) ---------- */
    let forgeGlow = { intensity: 0.15, pulsePhase: 0 };

    /* ---------- LAYER 2: Sparks ---------- */
    const sparks = [];
    const SPARK_COUNT = 80;

    function initSparks() {
        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push(createSpark());
        }
    }

    function createSpark() {
        return {
            x: width * 0.5 + (Math.random() - 0.5) * 300,
            y: height + Math.random() * 50,
            vx: (Math.random() - 0.5) * 3,
            vy: -(Math.random() * 4 + 2),
            size: Math.random() * 2.5 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            fadeSpeed: Math.random() * 0.008 + 0.003,
            color: Math.random() > 0.3 ? FLAME_BRIGHT : (Math.random() > 0.5 ? FLAME : GOLD),
            flickerPhase: Math.random() * Math.PI * 2,
        };
    }

    /* ---------- LAYER 3: Molten Flows ---------- */
    const flows = [];
    const FLOW_COUNT = 4;

    function initFlows() {
        for (let i = 0; i < FLOW_COUNT; i++) {
            flows.push({
                x: Math.random() * width,
                y: Math.random() * height,
                width: Math.random() * 3 + 1,
                length: Math.random() * 100 + 50,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.15 + 0.05,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 4: Hammer Strikes ---------- */
    const strikes = [];
    function spawnStrike() {
        if (Math.random() > 0.012) return;
        strikes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 40 + 20,
            opacity: 1,
            fadeSpeed: Math.random() * 0.05 + 0.03,
            rings: Math.floor(Math.random() * 2) + 2,
        });
    }

    /* ---------- LAYER 5: Heat Shimmer ---------- */
    const shimmers = [];
    const SHIMMER_COUNT = 6;

    function initShimmers() {
        for (let i = 0; i < SHIMMER_COUNT; i++) {
            shimmers.push({
                x: Math.random() * width,
                y: Math.random() * height,
                width: Math.random() * 200 + 100,
                amplitude: Math.random() * 3 + 1,
                frequency: Math.random() * 0.02 + 0.01,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.06 + 0.02,
            });
        }
    }

    /* ---------- LAYER 6: Embers ---------- */
    const embers = [];
    const EMBER_COUNT = 30;

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push({
                x: Math.random() * width,
                y: Math.random() * height + height * 0.5,
                vx: (Math.random() - 0.5) * 1,
                vy: -(Math.random() * 1.5 + 0.5),
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.4 + 0.1,
                fadeSpeed: Math.random() * 0.004 + 0.002,
                flickerPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 7: Mechanical Gears ---------- */
    const gears = [];
    const GEAR_COUNT = 3;

    function initGears() {
        for (let i = 0; i < GEAR_COUNT; i++) {
            gears.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 60 + 40,
                teeth: Math.floor(Math.random() * 8) + 8,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008,
                opacity: Math.random() * 0.08 + 0.03,
                color: Math.random() > 0.5 ? IRON : BRONZE,
            });
        }
    }

    /* ---------- Update Functions ---------- */
    function updateForgeGlow() {
        forgeGlow.pulsePhase += 0.03;
        forgeGlow.currentIntensity = forgeGlow.intensity * (0.8 + 0.2 * Math.sin(forgeGlow.pulsePhase));
    }

    function updateSparks() {
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.05; // gravity
            s.flickerPhase += 0.15;
            s.opacity -= s.fadeSpeed;

            if (s.opacity <= 0 || s.y > height + 20) {
                sparks[i] = createSpark();
            }
        }
    }

    function updateFlows() {
        for (const f of flows) {
            f.x += Math.cos(f.angle) * f.speed;
            f.y += Math.sin(f.angle) * f.speed;
            f.pulsePhase += 0.02;
            f.currentOpacity = f.opacity * (0.6 + 0.4 * Math.sin(f.pulsePhase));

            if (f.x < -100) f.x = width + 100;
            if (f.x > width + 100) f.x = -100;
            if (f.y < -100) f.y = height + 100;
            if (f.y > height + 100) f.y = -100;
        }
    }

    function updateStrikes() {
        for (let i = strikes.length - 1; i >= 0; i--) {
            const s = strikes[i];
            s.opacity -= s.fadeSpeed;
            if (s.opacity <= 0) {
                strikes.splice(i, 1);
            }
        }
    }

    function updateShimmers() {
        for (const s of shimmers) {
            s.phase += s.speed * 0.01;
            s.x += s.speed;
            if (s.x > width + s.width) s.x = -s.width;
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.flickerPhase += 0.08;
            e.opacity -= e.fadeSpeed;

            if (e.opacity <= 0 || e.y < -20) {
                e.x = Math.random() * width;
                e.y = height + Math.random() * 50;
                e.opacity = Math.random() * 0.4 + 0.1;
            }
        }
    }

    function updateGears() {
        for (const g of gears) {
            g.rotation += g.rotSpeed;
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawForgeGlow() {
        const gradient = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, height * 0.6);
        gradient.addColorStop(0, `rgba(${FLAME.r}, ${FLAME.g}, ${FLAME.b}, ${forgeGlow.currentIntensity})`);
        gradient.addColorStop(0.4, `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${forgeGlow.currentIntensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function drawSparks() {
        for (const s of sparks) {
            const flicker = 0.7 + 0.3 * Math.sin(s.flickerPhase);
            const alpha = s.opacity * flicker;

            // Glow
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
            glow.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha * 0.4})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFlows() {
        for (const f of flows) {
            ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${f.currentOpacity})`;
            ctx.lineWidth = f.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const x2 = f.x + Math.cos(f.angle) * f.length;
            const y2 = f.y + Math.sin(f.angle) * f.length;
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    function drawStrikes() {
        for (const s of strikes) {
            if (s.opacity <= 0) continue;

            for (let r = 0; r < s.rings; r++) {
                const ringSize = s.size * (r + 1) / s.rings;
                ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity * (1 - r / s.rings) * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(s.x, s.y, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Center flash
            const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 0.5);
            gradient.addColorStop(0, `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawShimmers() {
        for (const s of shimmers) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(s.x, s.y - 20, s.width, 40);
            ctx.clip();

            for (let y = s.y - 20; y < s.y + 20; y += 2) {
                const offset = Math.sin(y * s.frequency + s.phase) * s.amplitude;
                ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(s.x, y);
                ctx.lineTo(s.x + s.width, y + offset);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const flicker = 0.7 + 0.3 * Math.sin(e.flickerPhase);
            const alpha = e.opacity * flicker;

            ctx.fillStyle = `rgba(${FLAME.r}, ${FLAME.g}, ${FLAME.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGears() {
        for (const g of gears) {
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.rotation);

            // Outer ring
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, g.size, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, g.size * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // Center
            ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.7})`;
            ctx.beginPath();
            ctx.arc(0, 0, g.size * 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Spokes
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.4})`;
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * g.size * 0.6, Math.sin(angle) * g.size * 0.6);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initFlows();
        initShimmers();
        initGears();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateForgeGlow();
        updateSparks();
        updateFlows();
        updateStrikes();
        updateShimmers();
        updateEmbers();
        updateGears();

        spawnStrike();

        drawForgeGlow();
        drawGears();
        drawShimmers();
        drawFlows();
        drawEmbers();
        drawSparks();
        drawStrikes();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initSparks();
    initEmbers();
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
