/* =====================================================
   ΜΈΔΟΥΣΑ — Gorgon Canvas Engine
   Writhing serpents, petrification, stone cracks, mirror flashes
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       GORGON CANVAS
       ===================================================== */
const canvas = document.getElementById('gorgon-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const SERPENT = { r: 90, g: 122, b: 58 };
    const STONE = { r: 120, g: 120, b: 120 };
    const MIRROR = { r: 200, g: 200, b: 210 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const CRIMSON = { r: 139, g: 26, b: 43 };

    // Serpents
    const serpents = [];
    const SERPENT_COUNT = 8;

    // Petrification particles
    const particles = [];
    const PARTICLE_COUNT = 60;

    // Stone cracks
    const cracks = [];

    // Mirror flashes
    let flash = null;
    let flashTimer = 0;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initSerpents();
        initParticles();
    }

    function initSerpents() {
        serpents.length = 0;
        for (let i = 0; i < SERPENT_COUNT; i++) {
            serpents.push({
                xBase: Math.random() * width,
                yBase: Math.random() * height * 0.3,
                length: Math.random() * 150 + 80,
                segments: 30,
                amplitude: Math.random() * 20 + 10,
                frequency: Math.random() * 0.008 + 0.004,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01,
                thickness: Math.random() * 4 + 2,
                opacity: Math.random() * 0.35 + 0.15,
                color: Math.random() > 0.3 ? SERPENT : { r: 70, g: 100, b: 45 },
            });
        }
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }
    }

    function createParticle() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            opacity: Math.random() * 0.5 + 0.2,
            frozen: false,
            freezeProgress: 0,
            color: {
                r: 180 + Math.random() * 60,
                g: 160 + Math.random() * 50,
                b: 150 + Math.random() * 40,
            },
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.02 + 0.005,
        };
    }

    function spawnCrack(x, y) {
        const branches = [];
        const numBranches = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numBranches; i++) {
            const angle = Math.random() * Math.PI * 2;
            const length = Math.random() * 40 + 20;
            const points = [{ x, y }];
            let cx = x;
            let cy = y;
            const segments = Math.floor(Math.random() * 4) + 3;
            for (let j = 0; j < segments; j++) {
                cx += Math.cos(angle + (Math.random() - 0.5) * 0.8) * (length / segments);
                cy += Math.sin(angle + (Math.random() - 0.5) * 0.8) * (length / segments);
                points.push({ x: cx, y: cy });
            }
            branches.push({ points });
        }
        cracks.push({
            branches,
            opacity: 0.6,
            life: 0,
            maxLife: Math.random() * 120 + 80,
        });
    }

    function spawnFlash() {
        flashTimer++;
        if (flashTimer < 300 + Math.random() * 400) return;
        flashTimer = 0;

        flash = {
            x: Math.random() * width * 0.6 + width * 0.2,
            y: Math.random() * height * 0.4 + height * 0.1,
            size: Math.random() * 150 + 100,
            opacity: 0.8,
            life: 0,
            maxLife: 12,
        };
    }

    function updateSerpents() {
        for (const s of serpents) {
            s.phase += s.speed;
        }
    }

    function updateParticles() {
        for (const p of particles) {
            if (p.frozen) {
                p.freezeProgress = Math.min(1, p.freezeProgress + 0.02);
                p.twinklePhase += p.twinkleSpeed;
                p.currentOpacity = p.opacity * (0.3 + 0.2 * Math.sin(p.twinklePhase)) * (1 - p.freezeProgress * 0.5);
                continue;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.twinklePhase += p.twinkleSpeed;
            p.currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.twinklePhase));

            // Random petrification
            if (Math.random() < 0.002) {
                p.frozen = true;
                spawnCrack(p.x, p.y);
            }

            // Wrap around
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;
        }
    }

    function updateCracks() {
        for (let i = cracks.length - 1; i >= 0; i--) {
            const c = cracks[i];
            c.life++;
            c.opacity = 0.6 * (1 - c.life / c.maxLife);
            if (c.life >= c.maxLife) {
                cracks.splice(i, 1);
            }
        }
    }

    function updateFlash() {
        if (!flash) return;
        flash.life++;
        flash.opacity = 0.8 * (1 - flash.life / flash.maxLife);
        if (flash.life >= flash.maxLife) {
            flash = null;
        }
    }

    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1A1515');
        grad.addColorStop(0.4, '#242020');
        grad.addColorStop(0.7, '#1C1818');
        grad.addColorStop(1, '#151010');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawSerpents() {
        for (const s of serpents) {
            const points = [];
            for (let i = 0; i <= s.segments; i++) {
                const t = i / s.segments;
                const x = s.xBase + Math.sin(s.phase + t * s.length * s.frequency) * s.amplitude * t;
                const y = s.yBase + t * s.length;
                points.push({ x, y });
            }

            // Draw serpent body
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = s.thickness;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();

            // Serpent scales (dots along body)
            for (let i = 2; i < points.length - 1; i += 2) {
                ctx.fillStyle = `rgba(${s.color.r + 20}, ${s.color.g + 20}, ${s.color.b + 10}, ${s.opacity * 0.6})`;
                ctx.beginPath();
                ctx.arc(points[i].x, points[i].y, s.thickness * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Serpent eye
            const head = points[points.length - 1];
            ctx.fillStyle = `rgba(212, 175, 55, ${s.opacity * 1.5})`;
            ctx.beginPath();
            ctx.arc(head.x, head.y, s.thickness * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            const op = p.currentOpacity || 0;
            if (op <= 0) continue;

            let r, g, b;
            if (p.frozen) {
                // Interpolate to stone color
                const stoneR = 120, stoneG = 120, stoneB = 120;
                r = p.color.r * (1 - p.freezeProgress) + stoneR * p.freezeProgress;
                g = p.color.g * (1 - p.freezeProgress) + stoneG * p.freezeProgress;
                b = p.color.b * (1 - p.freezeProgress) + stoneB * p.freezeProgress;
            } else {
                r = p.color.r;
                g = p.color.g;
                b = p.color.b;
            }

            // Glow
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${op * 0.3})`);
            glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCracks() {
        for (const c of cracks) {
            if (c.opacity <= 0) continue;
            ctx.strokeStyle = `rgba(160, 160, 160, ${c.opacity})`;
            ctx.lineWidth = 1;
            for (const branch of c.branches) {
                if (branch.points.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(branch.points[0].x, branch.points[0].y);
                for (let i = 1; i < branch.points.length; i++) {
                    ctx.lineTo(branch.points[i].x, branch.points[i].y);
                }
                ctx.stroke();
            }
        }
    }

    function drawFlash() {
        if (!flash || flash.opacity <= 0) return;

        const grad = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.size);
        grad.addColorStop(0, `rgba(220, 220, 230, ${flash.opacity * 0.3})`);
        grad.addColorStop(0.3, `rgba(200, 200, 210, ${flash.opacity * 0.15})`);
        grad.addColorStop(1, `rgba(200, 200, 210, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Sharp center
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(26, 21, 21, 0)');
        gradient.addColorStop(1, 'rgba(17, 14, 14, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        drawBackground();

        time += 16;

        updateSerpents();
        updateParticles();
        updateCracks();
        updateFlash();

        spawnFlash();

        drawSerpents();
        drawParticles();
        drawCracks();
        drawFlash();
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
