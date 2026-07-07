/* =====================================================
   ΠΡΟΜΗΘΕΎΣ — Firebringer Canvas Engine
   Stolen flame, chains from above, storm, eagle, lightning
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       FIREBRINGER CANVAS
       ===================================================== */
const canvas = document.getElementById('firebringer-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const FLAME = { r: 232, g: 93, b: 4 };
    const EMBER = { r: 255, g: 140, b: 66 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const CHAIN = { r: 160, g: 160, b: 160 };
    const STORM = { r: 74, g: 111, b: 165 };

    // Fire at bottom center
    let fireX, fireY;

    // Flame tongues
    const flames = [];
    const FLAME_COUNT = 15;

    // Rising embers
    const embers = [];
    const EMBER_COUNT = 40;

    // Chains
    const chains = [];
    const CHAIN_COUNT = 3;

    // Lightning
    let lightning = null;
    let lightningTimer = 0;

    // Eagle
    let eagle = null;
    let eagleTimer = 0;

    // Storm clouds
    const clouds = [];

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        fireX = width * 0.5;
        fireY = height * 0.88;
        initFlames();
        initChains();
        initClouds();
    }

    function initFlames() {
        flames.length = 0;
        for (let i = 0; i < FLAME_COUNT; i++) {
            flames.push({
                x: fireX + (Math.random() - 0.5) * 80,
                y: fireY,
                height: Math.random() * 100 + 60,
                width: Math.random() * 16 + 8,
                speed: Math.random() * 0.04 + 0.02,
                phase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.15,
            });
        }
    }

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push(createEmber());
        }
    }

    function createEmber() {
        return {
            x: fireX + (Math.random() - 0.5) * 100,
            y: fireY - Math.random() * 40,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 1.5 + 0.4,
            drift: (Math.random() - 0.5) * 0.6,
            opacity: Math.random() * 0.6 + 0.2,
            life: Math.random() * 120 + 60,
            maxLife: 180,
            color: Math.random() > 0.6 ? FLAME : (Math.random() > 0.5 ? EMBER : GOLD),
        };
    }

    function initChains() {
        chains.length = 0;
        for (let i = 0; i < CHAIN_COUNT; i++) {
            const anchorX = width * 0.3 + i * width * 0.2;
            chains.push({
                anchorX: anchorX,
                anchorY: -20,
                length: height * 0.75 + Math.random() * height * 0.15,
                swingPhase: Math.random() * Math.PI * 2,
                swingSpeed: Math.random() * 0.005 + 0.002,
                swingAmp: Math.random() * 8 + 3,
                links: 25,
            });
        }
    }

    function initClouds() {
        clouds.length = 0;
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.25,
                size: Math.random() * 80 + 60,
                speed: Math.random() * 0.1 + 0.05,
                opacity: Math.random() * 0.08 + 0.03,
            });
        }
    }

    function spawnLightning() {
        lightningTimer++;
        if (lightningTimer < 200 + Math.random() * 300) return;
        lightningTimer = 0;

        const startX = Math.random() * width;
        const points = [{ x: startX, y: 0 }];
        let cx = startX;
        let cy = 0;
        while (cy < height * 0.5) {
            cx += (Math.random() - 0.5) * 60;
            cy += Math.random() * 40 + 20;
            points.push({ x: cx, y: cy });
        }

        lightning = {
            points,
            opacity: 1,
            life: 0,
            maxLife: Math.random() * 8 + 4,
        };
    }

    function spawnEagle() {
        eagleTimer++;
        if (eagleTimer < 400 + Math.random() * 400) return;
        eagleTimer = 0;

        const fromLeft = Math.random() > 0.5;
        eagle = {
            x: fromLeft ? -60 : width + 60,
            y: height * 0.15 + Math.random() * height * 0.2,
            vx: fromLeft ? 2.5 : -2.5,
            vy: Math.random() * 0.4 - 0.2,
            size: 30,
            wingPhase: 0,
            opacity: 0.7,
        };
    }

    function updateFlames() {
        for (const f of flames) {
            f.phase += f.speed;
            f.currentHeight = f.height * (0.6 + 0.4 * Math.sin(f.phase));
            f.currentOpacity = Math.max(0, f.opacity * (0.5 + 0.5 * Math.sin(f.phase * 1.2)));
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.y -= e.speed;
            e.x += e.drift + Math.sin(time * 0.002 + e.y * 0.01) * 0.3;
            e.life++;
            e.currentOpacity = Math.max(0, e.opacity * (1 - e.life / e.maxLife));

            if (e.life >= e.maxLife || e.y < 0 || isNaN(e.currentOpacity)) {
                embers[i] = createEmber();
            }
        }
    }

    function updateChains() {
        for (const c of chains) {
            c.swingPhase += c.swingSpeed;
            c.currentSwing = Math.sin(c.swingPhase) * c.swingAmp;
        }
    }

    function updateClouds() {
        for (const c of clouds) {
            c.x += c.speed;
            if (c.x > width + c.size) {
                c.x = -c.size;
                c.y = Math.random() * height * 0.25;
            }
        }
    }

    function updateLightning() {
        if (!lightning) return;
        lightning.life++;
        lightning.opacity = 1 - (lightning.life / lightning.maxLife);
        if (lightning.life >= lightning.maxLife) {
            lightning = null;
        }
    }

    function updateEagle() {
        if (!eagle) return;
        eagle.x += eagle.vx;
        eagle.y += eagle.vy;
        eagle.wingPhase += 0.15;

        if (eagle.x < -80 || eagle.x > width + 80) {
            eagle = null;
        }
    }

    function drawBackground() {
        // Stormy dark sky with fire glow at bottom
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#151515');
        grad.addColorStop(0.3, '#1C1815');
        grad.addColorStop(0.6, '#201810');
        grad.addColorStop(0.85, '#2A1A0A');
        grad.addColorStop(1, '#111111');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawClouds() {
        for (const c of clouds) {
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
            grad.addColorStop(0, `rgba(40, 40, 45, ${c.opacity})`);
            grad.addColorStop(1, 'rgba(40, 40, 45, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFireGlow() {
        // Warm fire glow rising from bottom
        const glow = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, Math.max(width, height) * 0.5);
        glow.addColorStop(0, 'rgba(232, 93, 4, 0.08)');
        glow.addColorStop(0.3, 'rgba(255, 107, 53, 0.04)');
        glow.addColorStop(1, 'rgba(232, 93, 4, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawChains() {
        for (const c of chains) {
            const bottomX = c.anchorX + c.currentSwing;

            ctx.strokeStyle = 'rgba(100, 100, 100, 0.25)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(c.anchorX, c.anchorY);
            ctx.quadraticCurveTo(
                c.anchorX + c.currentSwing * 0.5, c.anchorY + c.length * 0.5,
                bottomX, c.anchorY + c.length
            );
            ctx.stroke();

            // Chain links
            for (let i = 1; i < c.links; i++) {
                const t = i / c.links;
                const lx = c.anchorX + (bottomX - c.anchorX) * t + Math.sin(c.swingPhase + i * 0.5) * 2;
                const ly = c.anchorY + c.length * t;
                ctx.strokeStyle = 'rgba(120, 120, 120, 0.2)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(lx - 4, ly);
                ctx.lineTo(lx + 4, ly);
                ctx.stroke();
            }
        }
    }

    function drawFlames() {
        for (const f of flames) {
            const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y - f.currentHeight);
            grad.addColorStop(0, `rgba(232, 93, 4, ${f.currentOpacity || 0})`);
            grad.addColorStop(0.3, `rgba(255, 107, 53, ${(f.currentOpacity || 0) * 0.7})`);
            grad.addColorStop(0.7, `rgba(255, 140, 66, ${(f.currentOpacity || 0) * 0.3})`);
            grad.addColorStop(1, 'rgba(255, 200, 100, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width * 0.5, f.y);
            ctx.quadraticCurveTo(
                f.x - f.width * 0.2, f.y - f.currentHeight * 0.5,
                f.x + Math.sin(f.phase) * f.width * 0.4, f.y - f.currentHeight
            );
            ctx.quadraticCurveTo(
                f.x + f.width * 0.2, f.y - f.currentHeight * 0.5,
                f.x + f.width * 0.5, f.y
            );
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const op = e.currentOpacity || 0;
            if (op <= 0) continue;

            const r = e.color.r;
            const g = e.color.g;
            const b = e.color.b;

            const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${op * 0.3})`);
            glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawLightning() {
        if (!lightning || lightning.opacity <= 0) return;

        ctx.strokeStyle = `rgba(200, 210, 230, ${lightning.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
        for (let i = 1; i < lightning.points.length; i++) {
            ctx.lineTo(lightning.points[i].x, lightning.points[i].y);
        }
        ctx.stroke();

        // Flash effect
        ctx.fillStyle = `rgba(200, 210, 230, ${lightning.opacity * 0.08})`;
        ctx.fillRect(0, 0, width, height);
    }

    function drawEagle() {
        if (!eagle) return;

        ctx.save();
        ctx.translate(eagle.x, eagle.y);
        ctx.globalAlpha = eagle.opacity;

        // Eagle body
        ctx.fillStyle = '#2A2A2A';
        ctx.beginPath();
        ctx.ellipse(0, 0, eagle.size * 0.4, eagle.size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        const wingY = Math.sin(eagle.wingPhase) * 12;
        ctx.strokeStyle = '#2A2A2A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-20, -15 + wingY, -35, -5 + wingY * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.quadraticCurveTo(20, -15 + wingY, 35, -5 + wingY * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(20, 20, 20, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        drawBackground();

        time += 16;

        updateFlames();
        updateEmbers();
        updateChains();
        updateClouds();
        updateLightning();
        updateEagle();

        spawnLightning();
        spawnEagle();

        drawClouds();
        drawFireGlow();
        drawChains();
        drawFlames();
        drawEmbers();
        drawLightning();
        drawEagle();
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
