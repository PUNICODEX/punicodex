/* =====================================================
   ΠΕΡΣΕΦΌΝΗ — Threshold Canvas Engine
   Spring above. Underworld below. The six seeds. The wilt.
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       THRESHOLD CANVAS
       ===================================================== */
const canvas = document.getElementById('seasonal-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // The threshold — where spring ends and underworld begins
    let thresholdY;

    // === SPRING REALM (above threshold) ===
    const narcissus = [];
    const NARCISSUS_COUNT = 12;
    const petals = [];
    const PETAL_COUNT = 20;
    const pollens = [];
    const POLLEN_COUNT = 30;

    // === THE SIX SEEDS ===
    const sixSeeds = [];

    // === UNDERWORLD REALM (below threshold) ===
    const underworldVines = [];
    const VINE_COUNT = 5;
    const ashMotes = [];
    const MOTE_COUNT = 40;

    // === THE POMEGRANATE HEART ===
    let heartPulse = 0;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        thresholdY = height * 0.52;
        initNarcissus();
        initPetals();
        initPollens();
        initSixSeeds();
        initVines();
        initAshMotes();
    }

    // === SPRING INITIALIZERS ===
    function initNarcissus() {
        narcissus.length = 0;
        for (let i = 0; i < NARCISSUS_COUNT; i++) {
            narcissus.push(createNarcissus());
        }
    }

    function createNarcissus() {
        return {
            x: Math.random() * width,
            y: Math.random() * thresholdY * 0.8,
            size: Math.random() * 8 + 5,
            speed: Math.random() * 0.4 + 0.15,
            sway: Math.random() * 2 + 1,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.008 + 0.003,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.008,
            opacity: Math.random() * 0.5 + 0.3,
            wilt: 0, // 0 = fresh, 1 = fully wilted
            color: { r: 255, g: 250, b: 220 }, // creamy white-yellow
        };
    }

    function initPetals() {
        petals.length = 0;
        for (let i = 0; i < PETAL_COUNT; i++) {
            petals.push(createPetal());
        }
    }

    function createPetal() {
        const isPink = Math.random() > 0.4;
        return {
            x: Math.random() * width,
            y: Math.random() * thresholdY * 0.6,
            size: Math.random() * 5 + 3,
            speed: Math.random() * 0.5 + 0.2,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.01 + 0.004,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.01,
            opacity: Math.random() * 0.35 + 0.15,
            color: isPink ? { r: 240, g: 190, b: 190 } : { r: 255, g: 230, b: 230 },
        };
    }

    function initPollens() {
        pollens.length = 0;
        for (let i = 0; i < POLLEN_COUNT; i++) {
            pollens.push({
                x: Math.random() * width,
                y: Math.random() * thresholdY,
                size: Math.random() * 1.5 + 0.3,
                speed: Math.random() * 0.2 + 0.05,
                drift: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.1,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.015 + 0.005,
            });
        }
    }

    // === THE SIX SEEDS ===
    function initSixSeeds() {
        sixSeeds.length = 0;
        for (let i = 0; i < 6; i++) {
            sixSeeds.push({
                x: width * 0.3 + (i / 5) * width * 0.4 + (Math.random() - 0.5) * 40,
                y: -Math.random() * 200 - i * 80,
                size: 5 + Math.random() * 2,
                speed: Math.random() * 0.8 + 0.5,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01,
                glowPhase: Math.random() * Math.PI * 2,
                glowSpeed: 0.02 + Math.random() * 0.015,
                settled: false,
                settleY: thresholdY + 40 + Math.random() * (height - thresholdY - 80),
            });
        }
    }

    // === UNDERWORLD INITIALIZERS ===
    function initVines() {
        underworldVines.length = 0;
        for (let i = 0; i < VINE_COUNT; i++) {
            underworldVines.push({
                points: [],
                xBase: (width / (VINE_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 80,
                amplitude: Math.random() * 30 + 15,
                frequency: Math.random() * 0.005 + 0.002,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.006 + 0.002,
                opacity: Math.random() * 0.1 + 0.04,
                segments: 35,
            });
        }
    }

    function initAshMotes() {
        ashMotes.length = 0;
        for (let i = 0; i < MOTE_COUNT; i++) {
            ashMotes.push({
                x: Math.random() * width,
                y: thresholdY + Math.random() * (height - thresholdY),
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                drift: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.2 + 0.05,
                fadePhase: Math.random() * Math.PI * 2,
                fadeSpeed: Math.random() * 0.008 + 0.003,
            });
        }
    }

    // === UPDATE FUNCTIONS ===
    function updateNarcissus() {
        for (const n of narcissus) {
            n.y += n.speed;
            n.swayPhase += n.swaySpeed;
            n.x += Math.sin(n.swayPhase) * n.sway * 0.2;
            n.rotation += n.rotSpeed;

            // Wilt as they approach threshold
            const distToThreshold = thresholdY - n.y;
            if (distToThreshold < 80) {
                n.wilt = Math.min(1, (80 - distToThreshold) / 80);
            }

            if (n.y > thresholdY + 20) {
                // Reset as a fresh flower at top
                n.y = -20;
                n.x = Math.random() * width;
                n.wilt = 0;
                n.opacity = Math.random() * 0.5 + 0.3;
            }
        }
    }

    function updatePetals() {
        for (const p of petals) {
            p.y += p.speed;
            p.swayPhase += p.swaySpeed;
            p.x += Math.sin(p.swayPhase) * 0.5;
            p.rotation += p.rotSpeed;

            if (p.y > thresholdY + 30) {
                p.y = -15;
                p.x = Math.random() * width;
            }
        }
    }

    function updatePollens() {
        for (const p of pollens) {
            p.y += p.speed;
            p.x += p.drift;
            p.twinklePhase += p.twinkleSpeed;
            p.currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.twinklePhase));

            if (p.y > thresholdY) {
                p.y = 0;
                p.x = Math.random() * width;
            }
        }
    }

    function updateSixSeeds() {
        for (const s of sixSeeds) {
            if (s.settled) {
                s.glowPhase += s.glowSpeed;
                continue;
            }

            s.y += s.speed;
            s.wobblePhase += s.wobbleSpeed;
            s.x += Math.sin(s.wobblePhase) * 0.8;
            s.glowPhase += s.glowSpeed;

            if (s.y >= s.settleY) {
                s.settled = true;
                s.y = s.settleY;
            }
        }
    }

    function updateVines() {
        for (const v of underworldVines) {
            v.phase += v.speed;
            v.points = [];
            for (let i = 0; i <= v.segments; i++) {
                const y = height - (i / v.segments) * (height - thresholdY + 40);
                const x = v.xBase + Math.sin((height - y) * v.frequency + v.phase) * v.amplitude * (i / v.segments);
                v.points.push({ x, y });
            }
        }
    }

    function updateAshMotes() {
        for (const a of ashMotes) {
            a.y += a.speed;
            a.x += a.drift + Math.sin(time * 0.001 + a.y * 0.01) * 0.1;
            a.fadePhase += a.fadeSpeed;
            a.currentOpacity = a.opacity * (0.4 + 0.6 * Math.sin(a.fadePhase));

            if (a.y > height + 10) {
                a.y = thresholdY;
                a.x = Math.random() * width;
            }
        }
    }

    // === DRAW FUNCTIONS ===
    function drawBackground() {
        // Three-zone gradient: spring → pomegranate threshold → underworld
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#F5EDE8');
        grad.addColorStop(0.25, '#F0E0E0');
        grad.addColorStop(thresholdY / height - 0.05, '#E8D0D0');
        grad.addColorStop(thresholdY / height, '#8B1538');
        grad.addColorStop(thresholdY / height + 0.08, '#3D0514');
        grad.addColorStop(0.7, '#1A0A12');
        grad.addColorStop(1, '#0D0408');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawThreshold() {
        // The pomegranate line — where worlds divide
        ctx.save();
        ctx.strokeStyle = 'rgba(196, 30, 58, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(width, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Faint pulse along the threshold
        const pulse = 0.1 + 0.1 * Math.sin(time * 0.002);
        ctx.strokeStyle = `rgba(196, 30, 58, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(width, thresholdY);
        ctx.stroke();
        ctx.restore();
    }

    function drawPomegranateHeart() {
        // Deep pulsing glow in the underworld center
        heartPulse += 0.015;
        const pulseIntensity = 0.06 + 0.04 * Math.sin(heartPulse);
        const glow = ctx.createRadialGradient(width * 0.5, height * 0.72, 0, width * 0.5, height * 0.72, Math.max(width, height) * 0.35);
        glow.addColorStop(0, `rgba(196, 30, 58, ${pulseIntensity})`);
        glow.addColorStop(0.4, `rgba(139, 21, 56, ${pulseIntensity * 0.5})`);
        glow.addColorStop(1, 'rgba(196, 30, 58, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawNarcissus() {
        for (const n of narcissus) {
            if (n.y > thresholdY + 10) continue;

            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.rotate(n.rotation);

            // Wilt color shift: creamy white → gray-purple
            const wiltR = n.color.r * (1 - n.wilt * 0.6) + 80 * n.wilt;
            const wiltG = n.color.g * (1 - n.wilt * 0.6) + 60 * n.wilt;
            const wiltB = n.color.b * (1 - n.wilt * 0.5) + 90 * n.wilt;
            const op = n.opacity * (1 - n.wilt * 0.5);

            // Narcissus shape — six white petals around a yellow cup
            ctx.fillStyle = `rgba(${wiltR}, ${wiltG}, ${wiltB}, ${op})`;
            for (let p = 0; p < 6; p++) {
                const angle = (p / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(
                    Math.cos(angle) * n.size * 0.5,
                    Math.sin(angle) * n.size * 0.5,
                    n.size * 0.35,
                    n.size * 0.2,
                    angle,
                    0, Math.PI * 2
                );
                ctx.fill();
            }

            // Yellow cup center
            const cupR = 255 * (1 - n.wilt * 0.7) + 60 * n.wilt;
            const cupG = 220 * (1 - n.wilt * 0.6) + 50 * n.wilt;
            const cupB = 80 * (1 - n.wilt * 0.5) + 70 * n.wilt;
            ctx.fillStyle = `rgba(${cupR}, ${cupG}, ${cupB}, ${op})`;
            ctx.beginPath();
            ctx.arc(0, 0, n.size * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawPetals() {
        for (const p of petals) {
            if (p.y > thresholdY) continue;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.bezierCurveTo(p.size * 0.5, -p.size * 0.3, p.size * 0.5, p.size * 0.3, 0, p.size);
            ctx.bezierCurveTo(-p.size * 0.5, p.size * 0.3, -p.size * 0.5, -p.size * 0.3, 0, -p.size);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawPollens() {
        for (const p of pollens) {
            ctx.fillStyle = `rgba(212, 175, 55, ${p.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSixSeeds() {
        for (let i = 0; i < sixSeeds.length; i++) {
            const s = sixSeeds[i];
            const glowIntensity = 0.5 + 0.5 * Math.sin(s.glowPhase);

            // Deep ruby glow
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 5);
            glow.addColorStop(0, `rgba(196, 30, 58, ${glowIntensity * 0.35})`);
            glow.addColorStop(0.5, `rgba(139, 21, 56, ${glowIntensity * 0.15})`);
            glow.addColorStop(1, 'rgba(196, 30, 58, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 5, 0, Math.PI * 2);
            ctx.fill();

            // Seed body — jewel-like
            ctx.fillStyle = `rgba(180, 20, 50, ${0.85 + glowIntensity * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.size * 0.8, s.size, Math.sin(s.wobblePhase) * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Seed highlight — wet/jewel look
            ctx.fillStyle = `rgba(255, 180, 180, ${0.4 + glowIntensity * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(s.x - s.size * 0.2, s.y - s.size * 0.25, s.size * 0.3, s.size * 0.2, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Number indicator for the six seeds (subtle)
            if (s.settled) {
                ctx.fillStyle = `rgba(255, 200, 200, ${0.2 * glowIntensity})`;
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(String(i + 1), s.x, s.y + s.size + 12);
            }
        }
    }

    function drawVines() {
        for (const v of underworldVines) {
            if (v.points.length < 2) continue;

            ctx.strokeStyle = `rgba(60, 10, 35, ${v.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(v.points[0].x, v.points[0].y);
            for (let i = 1; i < v.points.length; i++) {
                ctx.lineTo(v.points[i].x, v.points[i].y);
            }
            ctx.stroke();

            // Thorns
            for (let i = 3; i < v.points.length; i += 6) {
                const p = v.points[i];
                const prev = v.points[i - 1];
                const angle = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
                ctx.strokeStyle = `rgba(80, 15, 45, ${v.opacity * 1.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(angle) * 5, p.y + Math.sin(angle) * 5);
                ctx.stroke();
            }

            // Dark leaves
            for (let i = 4; i < v.points.length; i += 8) {
                const p = v.points[i];
                ctx.fillStyle = `rgba(40, 20, 40, ${v.opacity * 2})`;
                ctx.beginPath();
                ctx.ellipse(p.x + 5, p.y, 5, 3, 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawAshMotes() {
        for (const a of ashMotes) {
            ctx.fillStyle = `rgba(160, 140, 150, ${a.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(26, 10, 18, 0)');
        gradient.addColorStop(1, 'rgba(13, 4, 8, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // === MAIN LOOP ===
    function animateCanvas() {
        drawBackground();

        time += 16;

        updateNarcissus();
        updatePetals();
        updatePollens();
        updateSixSeeds();
        updateVines();
        updateAshMotes();

        drawPomegranateHeart();
        drawThreshold();
        drawVines();
        drawAshMotes();
        drawNarcissus();
        drawPetals();
        drawPollens();
        drawSixSeeds();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
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
