/* =====================================================
   ἙΣΤΊᾹ — Hearth Canvas Engine
   Warm embers, floating sparks, steady flame glow
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       HEARTH CANVAS
       ===================================================== */
const canvas = document.getElementById('hearth-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const AMBER = { r: 212, g: 160, b: 23 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const FLAME = { r: 255, g: 140, b: 66 };
    const EMBER = { r: 232, g: 93, b: 4 };
    const CREAM = { r: 255, g: 248, b: 240 };

    // Fire center (lower center, like a hearth)
    let fireX, fireY;

    // Flame tongues
    const flames = [];
    const FLAME_COUNT = 12;

    // Sparks
    const sparks = [];
    const SPARK_COUNT = 50;

    // Embers (glowing dots at bottom)
    const embers = [];
    const EMBER_COUNT = 30;

    // Heat shimmer
    let shimmerTime = 0;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        fireX = width * 0.5;
        fireY = height * 0.85;
        initFlames();
        initEmbers();
    }

    function initFlames() {
        flames.length = 0;
        for (let i = 0; i < FLAME_COUNT; i++) {
            flames.push({
                x: fireX + (Math.random() - 0.5) * 120,
                y: fireY,
                height: Math.random() * 80 + 40,
                width: Math.random() * 20 + 10,
                speed: Math.random() * 0.03 + 0.02,
                phase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.3 + 0.1,
            });
        }
    }

    function initSparks() {
        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push(createSpark());
        }
    }

    function createSpark() {
        return {
            x: fireX + (Math.random() - 0.5) * 100,
            y: fireY - Math.random() * 60,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 1.5 + 0.5,
            drift: (Math.random() - 0.5) * 0.8,
            opacity: Math.random() * 0.6 + 0.2,
            life: Math.random() * 100 + 50,
            maxLife: 150,
            color: Math.random() > 0.5 ? AMBER : (Math.random() > 0.5 ? FLAME : CREAM),
        };
    }

    function initEmbers() {
        embers.length = 0;
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push({
                x: fireX + (Math.random() - 0.5) * 200,
                y: fireY + Math.random() * 30 - 10,
                size: Math.random() * 4 + 2,
                glowPhase: Math.random() * Math.PI * 2,
                glowSpeed: Math.random() * 0.03 + 0.01,
                opacity: Math.random() * 0.4 + 0.2,
            });
        }
    }

    function updateFlames() {
        for (const f of flames) {
            f.phase += f.speed;
            f.currentHeight = f.height * (0.7 + 0.3 * Math.sin(f.phase));
            f.currentOpacity = f.opacity * (0.6 + 0.4 * Math.sin(f.phase * 1.3));
        }
    }

    function updateSparks() {
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.y -= s.speed;
            s.x += s.drift + Math.sin(time * 0.002 + s.y * 0.01) * 0.3;
            s.life--;
            s.currentOpacity = s.opacity * (s.life / s.maxLife);

            if (s.life <= 0 || s.y < fireY - 300) {
                sparks[i] = createSpark();
            }
        }
    }

    function updateEmbers() {
        for (const e of embers) {
            e.glowPhase += e.glowSpeed;
            e.currentOpacity = e.opacity * (0.5 + 0.5 * Math.sin(e.glowPhase));
        }
    }

    function drawBackground() {
        // Warm hearth gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1A0F0A');
        grad.addColorStop(0.5, '#2E1A0A');
        grad.addColorStop(0.85, '#3D200C');
        grad.addColorStop(1, '#120A06');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawFireGlow() {
        // Warm ambient glow from fire
        const glow = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, Math.max(width, height) * 0.5);
        glow.addColorStop(0, 'rgba(212, 160, 23, 0.06)');
        glow.addColorStop(0.3, 'rgba(255, 140, 66, 0.03)');
        glow.addColorStop(1, 'rgba(26, 15, 10, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawFlames() {
        for (const f of flames) {
            const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y - f.currentHeight);
            grad.addColorStop(0, `rgba(232, 93, 4, ${f.currentOpacity})`);
            grad.addColorStop(0.3, `rgba(255, 140, 66, ${f.currentOpacity * 0.7})`);
            grad.addColorStop(0.7, `rgba(212, 160, 23, ${f.currentOpacity * 0.3})`);
            grad.addColorStop(1, 'rgba(212, 160, 23, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width * 0.5, f.y);
            ctx.quadraticCurveTo(
                f.x - f.width * 0.3, f.y - f.currentHeight * 0.5,
                f.x + Math.sin(f.phase) * f.width * 0.3, f.y - f.currentHeight
            );
            ctx.quadraticCurveTo(
                f.x + f.width * 0.3, f.y - f.currentHeight * 0.5,
                f.x + f.width * 0.5, f.y
            );
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            // Ember glow
            const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            glow.addColorStop(0, `rgba(232, 93, 4, ${e.currentOpacity * 0.5})`);
            glow.addColorStop(1, `rgba(232, 93, 4, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Ember body
            ctx.fillStyle = `rgba(255, 140, 66, ${e.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSparks() {
        for (const s of sparks) {
            if (s.currentOpacity <= 0) continue;

            const r = s.color.r;
            const g = s.color.g;
            const b = s.color.b;

            // Spark glow
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
            glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${s.currentOpacity * 0.4})`);
            glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Spark body
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${s.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawOverlay() {
        // Warm vignette
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(26, 15, 10, 0)');
        gradient.addColorStop(1, 'rgba(18, 10, 6, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        drawBackground();

        time += 16;

        updateFlames();
        updateSparks();
        updateEmbers();

        drawFireGlow();
        drawEmbers();
        drawFlames();
        drawSparks();
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
