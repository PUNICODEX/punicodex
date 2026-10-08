/* =====================================================
   MĀRS — Legion Canvas Engine
   Marching eagle standards, laurel wreaths, glinting
   pilum tips, golden wheat sheaves, the red planet's orbit
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       LEGION CANVAS
       ===================================================== */
    const canvas = document.getElementById('legion-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette — archetype: Roman red + bronze gold
    const ROMAN_RED = { r: 192, g: 57, b: 43 };
    const ROMAN_RED_DEEP = { r: 146, g: 34, b: 26 };
    const BRONZE_GOLD = { r: 212, g: 175, b: 55 };
    const GOLD_BRIGHT = { r: 232, g: 200, b: 110 };
    const WHEAT = { r: 214, g: 178, b: 94 };
    const WHEAT_DARK = { r: 176, g: 138, b: 62 };
    const IRON = { r: 140, g: 132, b: 120 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Marching Eagle Standards (aquilae) ---------- */
    const eagles = [];
    const EAGLE_COUNT = 6;

    function initEagles() {
        eagles.length = 0;
        for (let i = 0; i < EAGLE_COUNT; i++) {
            eagles.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.6,
                size: Math.random() * 60 + 60,
                vx: Math.random() * 0.25 + 0.15,   // the column marches right
                opacity: Math.random() * 0.05 + 0.03,
                bobPhase: Math.random() * Math.PI * 2,
                bobSpeed: Math.random() * 0.008 + 0.004,
                crest: Math.random() > 0.5,
            });
        }
    }

    function drawEagle(e) {
        const s = e.size;
        ctx.save();
        ctx.translate(e.x, e.y + Math.sin(e.bobPhase) * s * 0.04);
        ctx.scale(s / 100, s / 100);

        const col = e.crest ? ROMAN_RED : BRONZE_GOLD;
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${e.currentOpacity})`;
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${e.currentOpacity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Standard pole
        ctx.beginPath();
        ctx.moveTo(0, -70);
        ctx.lineTo(0, 70);
        ctx.stroke();

        // Crossbar of the standard
        ctx.beginPath();
        ctx.moveTo(-18, -58);
        ctx.lineTo(18, -58);
        ctx.stroke();

        // Eagle silhouette: spread wings, body, head
        ctx.beginPath();
        // left wing
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(-38, -52, -46, -34);
        ctx.quadraticCurveTo(-26, -36, -14, -26);
        // tail / lower body
        ctx.quadraticCurveTo(-8, -14, 0, -10);
        ctx.quadraticCurveTo(8, -14, 14, -26);
        // right wing
        ctx.quadraticCurveTo(26, -36, 46, -34);
        ctx.quadraticCurveTo(38, -52, 0, -30);
        ctx.closePath();
        ctx.fill();

        // Head with beak, facing right (the army's direction)
        ctx.beginPath();
        ctx.arc(12, -34, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(16, -35);
        ctx.lineTo(23, -32);
        ctx.lineTo(16, -30);
        ctx.closePath();
        ctx.fill();

        // Wreath hanging from the crossbar
        ctx.beginPath();
        ctx.arc(-26, -40, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /* ---------- LAYER 2: Drifting Laurel Wreaths ---------- */
    const wreaths = [];
    const WREATH_COUNT = 8;

    function initWreaths() {
        wreaths.length = 0;
        for (let i = 0; i < WREATH_COUNT; i++) {
            wreaths.push(createWreath());
        }
    }

    function createWreath() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 30 + 18,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.15 - 0.05,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.004,
            opacity: Math.random() * 0.12 + 0.05,
            pulsePhase: Math.random() * Math.PI * 2,
        };
    }

    function drawWreath(w) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rotation);

        const alpha = w.opacity * (0.6 + 0.4 * Math.sin(w.pulsePhase));
        ctx.strokeStyle = `rgba(${BRONZE_GOLD.r}, ${BRONZE_GOLD.g}, ${BRONZE_GOLD.b}, ${alpha})`;
        ctx.lineWidth = 1.2;

        // Ring
        ctx.beginPath();
        ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Leaves around the ring
        const leafCount = 14;
        ctx.fillStyle = `rgba(${BRONZE_GOLD.r}, ${BRONZE_GOLD.g}, ${BRONZE_GOLD.b}, ${alpha * 1.3})`;
        for (let i = 0; i < leafCount; i++) {
            const a = (Math.PI * 2 / leafCount) * i;
            const lx = Math.cos(a) * w.radius;
            const ly = Math.sin(a) * w.radius;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(a + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, 0, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    /* ---------- LAYER 3: Wheat Sheaves (the agriculture half) ---------- */
    const sheaves = [];
    let SHEAF_COUNT = 0;

    function initSheaves() {
        sheaves.length = 0;
        SHEAF_COUNT = Math.max(14, Math.floor(width / 90));
        for (let i = 0; i < SHEAF_COUNT; i++) {
            sheaves.push({
                x: (width / SHEAF_COUNT) * i + (Math.random() - 0.5) * 40,
                baseY: height + Math.random() * 20,
                height: Math.random() * 70 + 60,
                stalks: 5 + Math.floor(Math.random() * 4),
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.008 + 0.006,
                opacity: Math.random() * 0.2 + 0.12,
            });
        }
    }

    function drawSheaves() {
        for (const sh of sheaves) {
            const sway = Math.sin(sh.swayPhase + time * sh.swaySpeed * 0.06) * 0.09;
            const topX = sh.x + Math.sin(sway) * sh.height;
            const topY = sh.baseY - Math.cos(sway) * sh.height;

            ctx.save();
            ctx.strokeStyle = `rgba(${WHEAT_DARK.r}, ${WHEAT_DARK.g}, ${WHEAT_DARK.b}, ${sh.opacity})`;
            ctx.fillStyle = `rgba(${WHEAT.r}, ${WHEAT.g}, ${WHEAT.b}, ${sh.opacity * 1.2})`;
            ctx.lineWidth = 1;

            // Bundled stalks fanning from the tie
            const spread = 14;
            for (let i = 0; i < sh.stalks; i++) {
                const f = sh.stalks === 1 ? 0 : (i / (sh.stalks - 1)) - 0.5;
                const tipX = topX + f * spread * 2;
                const tipY = topY - Math.abs(f) * 14;

                ctx.beginPath();
                ctx.moveTo(sh.x, sh.baseY - sh.height * 0.45);
                ctx.quadraticCurveTo(
                    sh.x + f * spread, sh.baseY - sh.height * 0.75,
                    tipX, tipY
                );
                ctx.stroke();

                // Grain head
                ctx.beginPath();
                ctx.ellipse(tipX, tipY - 4, 2.2, 6, f * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Binding tie
            ctx.strokeStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, ${sh.opacity * 1.4})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sh.x - 7, sh.baseY - sh.height * 0.45);
            ctx.lineTo(sh.x + 7, sh.baseY - sh.height * 0.45);
            ctx.stroke();

            ctx.restore();
        }
    }

    /* ---------- LAYER 4: Standing Pila with Glinting Tips ---------- */
    const pila = [];
    let PILA_COUNT = 0;

    function initPila() {
        pila.length = 0;
        PILA_COUNT = Math.max(6, Math.floor(width / 220));
        for (let i = 0; i < PILA_COUNT; i++) {
            pila.push({
                x: (width / PILA_COUNT) * i + (Math.random() - 0.5) * 60,
                baseY: height,
                height: Math.random() * 90 + 110,
                lean: (Math.random() - 0.5) * 0.06,
                opacity: Math.random() * 0.12 + 0.08,
                glintPhase: Math.random() * Math.PI * 2,
                glintSpeed: Math.random() * 0.02 + 0.008,
            });
        }
    }

    function drawPila() {
        for (const p of pila) {
            const tipX = p.x + Math.sin(p.lean) * p.height;
            const tipY = p.baseY - Math.cos(p.lean) * p.height;

            // Shaft
            ctx.strokeStyle = `rgba(${IRON.r}, ${IRON.g}, ${IRON.b}, ${p.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.baseY);
            ctx.lineTo(tipX, tipY + 14);
            ctx.stroke();

            // Iron shank below the point
            ctx.strokeStyle = `rgba(${IRON.r}, ${IRON.g}, ${IRON.b}, ${p.opacity * 1.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY + 22);
            ctx.lineTo(tipX, tipY + 12);
            ctx.stroke();

            // Glint — the one bright event on each spear
            const glint = Math.max(0, Math.sin(p.glintPhase + time * p.glintSpeed * 0.06));
            const glintAlpha = glint * glint * 0.9;
            if (glintAlpha > 0.02) {
                // Leaf-shaped point
                ctx.fillStyle = `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${p.opacity * 1.2})`;
                ctx.beginPath();
                ctx.moveTo(tipX, tipY - 12);
                ctx.lineTo(tipX - 3.5, tipY + 14);
                ctx.lineTo(tipX + 3.5, tipY + 14);
                ctx.closePath();
                ctx.fill();

                // Star sparkle at the tip
                const g = ctx.createRadialGradient(tipX, tipY - 6, 0, tipX, tipY - 6, 12);
                g.addColorStop(0, `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${glintAlpha})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(tipX, tipY - 6, 12, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${glintAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tipX - 9, tipY - 6);
                ctx.lineTo(tipX + 9, tipY - 6);
                ctx.moveTo(tipX, tipY - 15);
                ctx.lineTo(tipX, tipY + 3);
                ctx.stroke();
            }
        }
    }

    /* ---------- LAYER 5: The Red Planet's Orbit ---------- */
    const orbit = {
        tilt: -0.32,
        radiusX: 0,
        radiusY: 0,
        cx: 0,
        cy: 0,
        angle: Math.random() * Math.PI * 2,
        speed: 0.0035,
    };

    function initOrbit() {
        orbit.radiusX = Math.min(width, height) * 0.55;
        orbit.radiusY = orbit.radiusX * 0.42;
        orbit.cx = width * 0.5;
        orbit.cy = height * 0.42;
    }

    function drawOrbit() {
        ctx.save();
        ctx.translate(orbit.cx, orbit.cy);
        ctx.rotate(orbit.tilt);

        // Orbit ring — thin red line
        ctx.strokeStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.radiusX, orbit.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Faint second ring — the far ellipse ghost
        ctx.strokeStyle = `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, 0.08)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.radiusX * 1.12, orbit.radiusY * 1.12, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Mars dot
        const dx = Math.cos(orbit.angle) * orbit.radiusX;
        const dy = Math.sin(orbit.angle) * orbit.radiusY;
        const front = Math.sin(orbit.angle) > 0; // nearer half of the tilted orbit

        if (front) {
            // Glow
            const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, 14);
            glow.addColorStop(0, `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.55)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(dx, dy, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.95)`;
            ctx.beginPath();
            ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Polar cap glint — a pale speck on the god's planet
            ctx.fillStyle = `rgba(240, 235, 225, 0.8)`;
            ctx.beginPath();
            ctx.arc(dx - 1.4, dy - 1.6, 1.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Far half — dimmer, behind everything else
            ctx.fillStyle = `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, 0.35)`;
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ---------- LAYER 6: Dust — the red haze of the field ---------- */
    const haze = [];
    const HAZE_COUNT = 18;

    function initHaze() {
        haze.length = 0;
        for (let i = 0; i < HAZE_COUNT; i++) {
            haze.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 120 + 60,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -(Math.random() * 0.15 + 0.05),
                opacity: Math.random() * 0.05 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    function drawHaze() {
        for (const h of haze) {
            h.pulsePhase += 0.004;
            const alpha = h.opacity * (0.5 + 0.5 * Math.sin(h.pulsePhase));
            const gradient = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.size);
            gradient.addColorStop(0, `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ---------- Update Functions ---------- */
    function updateEagles() {
        for (const e of eagles) {
            e.x += e.vx;
            e.bobPhase += e.bobSpeed;
            e.currentOpacity = e.opacity * (0.75 + 0.25 * Math.sin(e.bobPhase * 0.7));
            if (e.x - e.size > width + 80) {
                e.x = -e.size - 80;
                e.y = Math.random() * height * 0.6;
            }
        }
    }

    function updateWreaths() {
        for (let i = 0; i < wreaths.length; i++) {
            const w = wreaths[i];
            w.x += w.vx;
            w.y += w.vy;
            w.rotation += w.rotSpeed;
            w.pulsePhase += 0.006;

            if (w.x < -w.radius - 20) w.x = width + w.radius + 20;
            if (w.x > width + w.radius + 20) w.x = -w.radius - 20;
            if (w.y < -w.radius - 20) wreaths[i] = createWreath(), wreaths[i].y = height + w.radius;
            if (w.y > height + w.radius + 20) wreaths[i] = createWreath(), wreaths[i].y = -w.radius;
        }
    }

    function updateOrbit() {
        orbit.angle += orbit.speed;
    }

    /* ---------- Draw Functions ---------- */
    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(12, 8, 8, 0)');
        gradient.addColorStop(1, 'rgba(12, 8, 8, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initEagles();
        initSheaves();
        initPila();
        initOrbit();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(14, 10, 10, 0.25)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateEagles();
        updateWreaths();
        updateOrbit();

        // Far half of the orbit first (behind the columns)
        drawOrbit();
        drawHaze();
        drawSheaves();
        drawPila();
        drawEagles();
        drawWreaths();

        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initWreaths();
    initHaze();
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
                revealObserver.unobserve(entry);
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
