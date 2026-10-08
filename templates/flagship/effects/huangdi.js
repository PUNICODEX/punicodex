/* =====================================================
   黃帝 — Dragon Throne Canvas Engine
   Golden dragon ribbons, auspicious cloud scrolls,
   jade mist, gilded leaf, five-peaked mountain
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       DRAGON THRONE CANVAS
       ===================================================== */
    const canvas = document.getElementById('dragon-throne-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ctx) {
    let time = 0;

    // Color palette — imperial yellow and jade (archetype colors)
    const GOLD = { r: 230, g: 184, b: 0 };        // #E6B800
    const GOLD_PALE = { r: 255, g: 232, b: 140 };
    const JADE = { r: 15, g: 123, b: 108 };       // #0F7B6C
    const JADE_DEEP = { r: 8, g: 70, b: 62 };
    const BRONZE = { r: 160, g: 120, b: 40 };

    /* ---------- LAYER 1: Five-Peaked Mountain Silhouette ---------- */
    // A faint five-peaked ridge (the Five Sacred Peaks) anchoring the base.
    function drawMountains() {
        const base = height * 0.98;
        ctx.save();
        ctx.globalAlpha = 0.55;

        // Far ridge
        ctx.fillStyle = `rgba(${JADE_DEEP.r}, ${JADE_DEEP.g}, ${JADE_DEEP.b}, 0.35)`;
        ctx.beginPath();
        ctx.moveTo(0, base);
        const peaksFar = [
            [0.10, 0.72], [0.22, 0.60], [0.35, 0.75],
            [0.50, 0.55], [0.65, 0.74], [0.78, 0.62], [0.90, 0.76],
        ];
        for (const [px, py] of peaksFar) {
            ctx.lineTo(width * px, height * py);
        }
        ctx.lineTo(width, base);
        ctx.closePath();
        ctx.fill();

        // Near ridge — five principal peaks (center highest, the axial summit)
        ctx.fillStyle = `rgba(${JADE_DEEP.r}, ${JADE_DEEP.g}, ${JADE_DEEP.b}, 0.55)`;
        ctx.beginPath();
        ctx.moveTo(0, height);
        const peaksNear = [
            [0.06, 0.82], [0.20, 0.70], [0.35, 0.80],
            [0.50, 0.62], [0.65, 0.80], [0.80, 0.70], [0.94, 0.82],
        ];
        for (const [px, py] of peaksNear) {
            ctx.lineTo(width * px, height * py);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Gold rim-light on the central summit
        ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.18)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(width * 0.44, height * 0.70);
        ctx.lineTo(width * 0.50, height * 0.62);
        ctx.lineTo(width * 0.56, height * 0.70);
        ctx.stroke();

        ctx.restore();
    }

    /* ---------- LAYER 2: Jade Mist ---------- */
    const mists = [];
    const MIST_COUNT = 14;

    function initMists() {
        mists.length = 0;
        for (let i = 0; i < MIST_COUNT; i++) {
            mists.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.8 + height * 0.1,
                size: Math.random() * 140 + 70,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.12,
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    function updateMists() {
        for (const m of mists) {
            m.x += m.vx;
            m.y += m.vy;
            m.pulsePhase += 0.004;
            m.currentOpacity = m.opacity * (0.6 + 0.4 * Math.sin(m.pulsePhase));
            if (m.x < -180) m.x = width + 180;
            if (m.x > width + 180) m.x = -180;
            if (m.y < -180) m.y = height + 180;
            if (m.y > height + 180) m.y = -180;
        }
    }

    function drawMists() {
        for (const m of mists) {
            const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
            gradient.addColorStop(0, `rgba(${JADE.r}, ${JADE.g}, ${JADE.b}, ${m.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ---------- LAYER 3: Coiling Dragon Ribbons ---------- */
    // Three undulating gold ribbons, phase-offset sine bands crossing the sky.
    const RIBBONS = [
        { baseY: 0.30, amplitude: 46, frequency: 0.0032, speed: 0.00045, thickness: 26, alpha: 0.20 },
        { baseY: 0.48, amplitude: 60, frequency: 0.0024, speed: -0.00032, thickness: 36, alpha: 0.26 },
        { baseY: 0.66, amplitude: 40, frequency: 0.0038, speed: 0.00055, thickness: 20, alpha: 0.16 },
    ];

    function drawRibbons() {
        for (const r of RIBBONS) {
            const phase = time * r.speed;
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0)`);
            gradient.addColorStop(0.15, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${r.alpha})`);
            gradient.addColorStop(0.5, `rgba(${GOLD_PALE.r}, ${GOLD_PALE.g}, ${GOLD_PALE.b}, ${r.alpha * 1.2})`);
            gradient.addColorStop(0.85, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${r.alpha})`);
            gradient.addColorStop(1, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0)`);

            ctx.save();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = r.thickness;
            ctx.lineCap = 'round';
            ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.35)`;
            ctx.shadowBlur = 24;
            ctx.beginPath();
            const step = 14;
            for (let x = -step; x <= width + step; x += step) {
                const y = height * r.baseY
                    + Math.sin(x * r.frequency + phase) * r.amplitude
                    + Math.sin(x * r.frequency * 2.7 + phase * 1.6) * r.amplitude * 0.3;
                if (x === -step) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Spine glint along the ribbon
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${GOLD_PALE.r}, ${GOLD_PALE.g}, ${GOLD_PALE.b}, ${r.alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = -step; x <= width + step; x += step) {
                const y = height * r.baseY
                    + Math.sin(x * r.frequency + phase) * r.amplitude
                    + Math.sin(x * r.frequency * 2.7 + phase * 1.6) * r.amplitude * 0.3;
                if (x === -step) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    /* ---------- LAYER 4: Auspicious Cloud Scrolls ---------- */
    // Stylized ruyi-head cloud scrolls: a spiral head with trailing tails.
    const clouds = [];
    const CLOUD_COUNT = 9;

    function initClouds() {
        clouds.length = 0;
        for (let i = 0; i < CLOUD_COUNT; i++) {
            clouds.push(createCloud(true));
        }
    }

    function createCloud(anywhere) {
        return {
            x: anywhere ? Math.random() * width : -160,
            y: Math.random() * height * 0.6 + height * 0.05,
            size: Math.random() * 40 + 28,
            vx: Math.random() * 0.3 + 0.12,
            bobPhase: Math.random() * Math.PI * 2,
            opacity: Math.random() * 0.12 + 0.07,
            hue: Math.random() > 0.75 ? JADE : GOLD,
        };
    }

    function updateClouds() {
        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            c.x += c.vx;
            c.bobPhase += 0.006;
            c.currentBob = Math.sin(c.bobPhase) * 6;
            if (c.x > width + 180) clouds[i] = createCloud(false);
        }
    }

    function drawCloud(c) {
        const s = c.size;
        const y = c.y + (c.currentBob || 0);
        ctx.save();
        ctx.translate(c.x, y);
        ctx.strokeStyle = `rgba(${c.hue.r}, ${c.hue.g}, ${c.hue.b}, ${c.opacity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Spiral head (double curl)
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, Math.PI * 0.6, Math.PI * 2.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * 0.12, -s * 0.05, s * 0.2, Math.PI * 0.4, Math.PI * 2.2);
        ctx.stroke();

        // Trailing scroll tails
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, s * 0.1);
        ctx.bezierCurveTo(-s * 0.9, s * 0.05, -s * 1.1, -s * 0.25, -s * 1.5, -s * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.42, s * 0.18);
        ctx.bezierCurveTo(s * 0.8, s * 0.3, s * 1.2, s * 0.1, s * 1.55, s * 0.2);
        ctx.stroke();

        // Under-curl
        ctx.beginPath();
        ctx.arc(s * 0.9, s * 0.12, s * 0.18, Math.PI * 1.1, Math.PI * 0.1, true);
        ctx.stroke();

        ctx.restore();
    }

    function drawClouds() {
        for (const c of clouds) drawCloud(c);
    }

    /* ---------- LAYER 5: Gilded Leaf Particles ---------- */
    const leaves = [];
    const LEAF_COUNT = 55;

    function initLeaves() {
        leaves.length = 0;
        for (let i = 0; i < LEAF_COUNT; i++) {
            leaves.push(createLeaf(true));
        }
    }

    function createLeaf(anywhere) {
        return {
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : -20,
            vy: Math.random() * 0.5 + 0.25,
            swayAmplitude: Math.random() * 22 + 8,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.012 + 0.005,
            size: Math.random() * 3.5 + 1.2,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.03,
            opacity: Math.random() * 0.5 + 0.25,
            color: Math.random() > 0.25 ? GOLD : BRONZE,
        };
    }

    function updateLeaves() {
        for (let i = 0; i < leaves.length; i++) {
            const l = leaves[i];
            l.y += l.vy;
            l.swayPhase += l.swaySpeed;
            l.x += Math.sin(l.swayPhase) * 0.6;
            l.rotation += l.rotSpeed;
            if (l.y > height + 20) leaves[i] = createLeaf(false);
        }
    }

    function drawLeaves() {
        for (const l of leaves) {
            const swayX = l.x + Math.cos(l.swayPhase * 0.7) * l.swayAmplitude * 0.15;
            ctx.save();
            ctx.translate(swayX, l.y);
            ctx.rotate(l.rotation);
            ctx.fillStyle = `rgba(${l.color.r}, ${l.color.g}, ${l.color.b}, ${l.opacity})`;
            // Small diamond flake of gold leaf
            ctx.beginPath();
            ctx.moveTo(0, -l.size);
            ctx.lineTo(l.size * 0.6, 0);
            ctx.lineTo(0, l.size);
            ctx.lineTo(-l.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /* ---------- LAYER 6: Vignette Overlay ---------- */
    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(8, 18, 16, 0)');
        gradient.addColorStop(1, 'rgba(8, 18, 16, 0.55)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initMists();
        initClouds();
        initLeaves();
    }

    function drawFrame() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(8, 18, 16, 0.3)';
        ctx.fillRect(0, 0, width, height);

        drawMountains();
        drawMists();
        drawRibbons();
        drawClouds();
        drawLeaves();
        drawOverlay();
    }

    function animateCanvas() {
        time += 16;
        updateMists();
        updateClouds();
        updateLeaves();
        drawFrame();
        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        if (reducedMotion) drawFrame();
    });

    resizeCanvas();
    if (reducedMotion) {
        drawFrame();
    } else {
        animateCanvas();
    }

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
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 10;
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
