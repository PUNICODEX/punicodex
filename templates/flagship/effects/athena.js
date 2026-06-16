/* =====================================================
   ἈΘΗΝΑ — War Room Canvas Engine
   Sacred geometry, tactical networks, aegis sonar,
   owl vision sweep, strategic strikes
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       WAR ROOM CANVAS
       ===================================================== */
const canvas = document.getElementById('strategy-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const ROYAL = { r: 65, g: 105, b: 225 };
    const SILVER = { r: 192, g: 192, b: 192 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const DEEP_BLUE = { r: 30, g: 58, b: 95 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Sacred Geometry Tessellation ---------- */
    const tessellations = [];
    const TESS_COUNT = 6;

    function initTessellations() {
        tessellations.length = 0;
        for (let i = 0; i < TESS_COUNT; i++) {
            tessellations.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 180 + 120,
                sides: [3, 4, 6, 8][Math.floor(Math.random() * 4)],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.003,
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
                color: Math.random() > 0.5 ? ROYAL : SILVER,
            });
        }
    }

    /* ---------- LAYER 2: Tactical Network ---------- */
    const nodes = [];
    const NODE_COUNT = 50;
    const CONNECTION_DIST = 140;

    function initNodes() {
        nodes.length = 0;
        for (let i = 0; i < NODE_COUNT; i++) {
            const isCommand = Math.random() > 0.82;
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: isCommand ? Math.random() * 4 + 4 : Math.random() * 2 + 1.5,
                isCommand: isCommand,
                pulsePhase: Math.random() * Math.PI * 2,
                energy: Math.random(),
            });
        }
    }

    // Data pulses traveling along connections
    const pulses = [];
    function spawnPulse() {
        if (pulses.length >= 12) return;
        if (Math.random() > 0.04) return;

        // Find two connected nodes
        const n1 = nodes[Math.floor(Math.random() * nodes.length)];
        const candidates = nodes.filter(n => {
            if (n === n1) return false;
            const d = Math.hypot(n.x - n1.x, n.y - n1.y);
            return d < CONNECTION_DIST;
        });
        if (candidates.length === 0) return;
        const n2 = candidates[Math.floor(Math.random() * candidates.length)];

        pulses.push({
            x1: n1.x, y1: n1.y,
            x2: n2.x, y2: n2.y,
            progress: 0,
            speed: Math.random() * 0.02 + 0.01,
            color: n1.isCommand || n2.isCommand ? GOLD : ROYAL,
            size: n1.isCommand || n2.isCommand ? 3 : 2,
        });
    }

    /* ---------- LAYER 3: Aegis Shield Sonar Rings ---------- */
    const sonarRings = [];
    function spawnSonar() {
        if (Math.random() > 0.008) return;
        sonarRings.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 10,
            maxRadius: Math.random() * 200 + 150,
            opacity: 0.5,
            sides: [6, 8, 12][Math.floor(Math.random() * 3)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.01,
            color: Math.random() > 0.5 ? ROYAL : GOLD,
        });
    }

    /* ---------- LAYER 4: Owl Vision Sweep ---------- */
    const sweeps = [
        { angle: 0, speed: 0.003, width: 60, opacity: 0.08, color: GOLD },
        { angle: Math.PI, speed: 0.002, width: 80, opacity: 0.05, color: SILVER },
    ];

    /* ---------- LAYER 5: Strategic Strike Beams ---------- */
    const strikes = [];
    function spawnStrike() {
        if (Math.random() > 0.012) return;
        if (nodes.length < 2) return;

        const n1 = nodes[Math.floor(Math.random() * nodes.length)];
        const n2 = nodes[Math.floor(Math.random() * nodes.length)];
        if (n1 === n2) return;
        const dist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
        if (dist > 350) return;

        strikes.push({
            x1: n1.x, y1: n1.y,
            x2: n2.x, y2: n2.y,
            progress: 0,
            speed: Math.random() * 0.04 + 0.03,
            opacity: 1,
            trail: [],
            color: dist < 150 ? SILVER : ROYAL,
        });
    }

    /* ---------- LAYER 6: Floating Geometric Fragments ---------- */
    const fragments = [];
    const FRAG_COUNT = 30;

    function initFragments() {
        fragments.length = 0;
        for (let i = 0; i < FRAG_COUNT; i++) {
            fragments.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                type: ['triangle', 'diamond', 'chevron'][Math.floor(Math.random() * 3)],
                opacity: Math.random() * 0.25 + 0.1,
                color: Math.random() > 0.5 ? SILVER : GOLD,
            });
        }
    }

    /* ---------- LAYER 7: Olive Leaves ---------- */
    const leaves = [];
    function initLeaves() {
        for (let i = 0; i < 20; i++) {
            leaves.push({
                x: Math.random() * width,
                y: Math.random() * height - height,
                size: Math.random() * 6 + 3,
                speed: Math.random() * 0.5 + 0.2,
                sway: Math.random() * 2 + 1,
                swaySpeed: Math.random() * 0.02 + 0.01,
                swayPhase: Math.random() * Math.PI * 2,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                opacity: Math.random() * 0.3 + 0.1,
            });
        }
    }

    /* ---------- Update Functions ---------- */
    function updateTessellations() {
        for (const t of tessellations) {
            t.rotation += t.rotSpeed;
            t.pulsePhase += 0.008;
            t.currentOpacity = t.opacity * (0.7 + 0.3 * Math.sin(t.pulsePhase));
        }
    }

    function updateNodes() {
        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            n.pulsePhase += 0.02;

            // Bounce off edges
            if (n.x < 0 || n.x > width) n.vx *= -1;
            if (n.y < 0 || n.y > height) n.vy *= -1;

            // Mouse influence
            const dx = mouseX - n.x;
            const dy = mouseY - n.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 180) {
                const force = (180 - dist) / 180 * 0.6;
                n.x -= (dx / dist) * force;
                n.y -= (dy / dist) * force;
            }
        }
    }

    function updatePulses() {
        for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.progress += p.speed;
            if (p.progress >= 1) {
                pulses.splice(i, 1);
            }
        }
    }

    function updateSonar() {
        for (let i = sonarRings.length - 1; i >= 0; i--) {
            const s = sonarRings[i];
            s.radius += 1.5;
            s.rotation += s.rotSpeed;
            s.opacity = 0.5 * (1 - s.radius / s.maxRadius);
            if (s.radius >= s.maxRadius || s.opacity <= 0) {
                sonarRings.splice(i, 1);
            }
        }
    }

    function updateSweeps() {
        for (const s of sweeps) {
            s.angle += s.speed;
        }
    }

    function updateStrikes() {
        for (let i = strikes.length - 1; i >= 0; i--) {
            const s = strikes[i];
            s.progress += s.speed;

            const cx = s.x1 + (s.x2 - s.x1) * Math.min(s.progress, 1);
            const cy = s.y1 + (s.y2 - s.y1) * Math.min(s.progress, 1);
            s.trail.push({ x: cx, y: cy, life: 1 });

            for (let j = s.trail.length - 1; j >= 0; j--) {
                s.trail[j].life -= 0.08;
                if (s.trail[j].life <= 0) s.trail.splice(j, 1);
            }

            if (s.progress >= 1.2) {
                strikes.splice(i, 1);
            }
        }
    }

    function updateFragments() {
        for (const f of fragments) {
            f.x += f.vx;
            f.y += f.vy;
            f.rotation += f.rotSpeed;

            if (f.x < -50) f.x = width + 50;
            if (f.x > width + 50) f.x = -50;
            if (f.y < -50) f.y = height + 50;
            if (f.y > height + 50) f.y = -50;
        }
    }

    function updateLeaves() {
        for (const leaf of leaves) {
            leaf.y += leaf.speed;
            leaf.swayPhase += leaf.swaySpeed;
            leaf.x += Math.sin(leaf.swayPhase) * leaf.sway * 0.3;
            leaf.rotation += leaf.rotSpeed;

            if (leaf.y > height + 20) {
                leaf.y = -20;
                leaf.x = Math.random() * width;
            }
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawTessellations() {
        for (const t of tessellations) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rotation);

            ctx.strokeStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${t.currentOpacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= t.sides; i++) {
                const angle = (i / t.sides) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * t.size;
                const py = Math.sin(angle) * t.size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner geometry
            ctx.strokeStyle = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${t.currentOpacity * 0.5})`;
            ctx.beginPath();
            for (let i = 0; i <= t.sides; i++) {
                const angle = (i / t.sides) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * (t.size * 0.5);
                const py = Math.sin(angle) * (t.size * 0.5);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawNetwork() {
        // Draw connections
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                const dist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.2;
                    const isStrategic = n1.isCommand && n2.isCommand;
                    ctx.strokeStyle = isStrategic
                        ? `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha * 1.5})`
                        : `rgba(${ROYAL.r}, ${ROYAL.g}, ${ROYAL.b}, ${alpha})`;
                    ctx.lineWidth = isStrategic ? 1.2 : 0.6;
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        for (const n of nodes) {
            const pulse = 0.7 + 0.3 * Math.sin(n.pulsePhase);

            if (n.isCommand) {
                // Command node glow
                const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
                glow.addColorStop(0, `rgba(${ROYAL.r}, ${ROYAL.g}, ${ROYAL.b}, ${0.15 * pulse})`);
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.size * 4, 0, Math.PI * 2);
                ctx.fill();

                // Outer ring
                ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${0.5 * pulse})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.size * 1.8, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Core
            ctx.fillStyle = n.isCommand
                ? `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${pulse})`
                : `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, ${0.6 * pulse})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPulses() {
        for (const p of pulses) {
            const x = p.x1 + (p.x2 - p.x1) * p.progress;
            const y = p.y1 + (p.y2 - p.y1) * p.progress;

            // Glow
            const glow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
            glow.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.3)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.9)`;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSonar() {
        for (const s of sonarRings) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Main ring
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i <= s.sides; i++) {
                const angle = (i / s.sides) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * s.radius;
                const py = Math.sin(angle) * s.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Inner dashed ring
            ctx.setLineDash([8, 12]);
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.4})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let i = 0; i <= s.sides; i++) {
                const angle = (i / s.sides) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * (s.radius * 0.7);
                const py = Math.sin(angle) * (s.radius * 0.7);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);

            // Center marker
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.6})`;
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawSweeps() {
        for (const s of sweeps) {
            const gradient = ctx.createConicalGradient
                ? null // fallback
                : null;

            // Draw sweep as a wedge
            ctx.save();
            ctx.translate(width / 2, height / 2);

            const gradient2 = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height));
            gradient2.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0)`);
            gradient2.addColorStop(0.3, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`);
            gradient2.addColorStop(1, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0)`);

            ctx.fillStyle = gradient2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, Math.max(width, height), s.angle - 0.3, s.angle + 0.3);
            ctx.closePath();
            ctx.fill();

            // Leading edge line
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 2})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(s.angle) * Math.max(width, height),
                Math.sin(s.angle) * Math.max(width, height)
            );
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawStrikes() {
        for (const s of strikes) {
            // Trail
            if (s.trail.length > 1) {
                for (let i = 0; i < s.trail.length - 1; i++) {
                    const t = s.trail[i];
                    const alpha = t.life * 0.4;
                    ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha})`;
                    ctx.lineWidth = t.life * 2;
                    ctx.beginPath();
                    ctx.moveTo(t.x, t.y);
                    if (s.trail[i + 1]) ctx.lineTo(s.trail[i + 1].x, s.trail[i + 1].y);
                    ctx.stroke();
                }
            }

            // Leading head
            const cx = s.x1 + (s.x2 - s.x1) * Math.min(s.progress, 1);
            const cy = s.y1 + (s.y2 - s.y1) * Math.min(s.progress, 1);

            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
            glow.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.6)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.9)`;
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFragments() {
        for (const f of fragments) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rotation);

            ctx.strokeStyle = `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${f.opacity})`;
            ctx.lineWidth = 1;
            ctx.fillStyle = `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${f.opacity * 0.3})`;

            ctx.beginPath();
            if (f.type === 'triangle') {
                ctx.moveTo(0, -f.size);
                ctx.lineTo(-f.size * 0.87, f.size * 0.5);
                ctx.lineTo(f.size * 0.87, f.size * 0.5);
            } else if (f.type === 'diamond') {
                ctx.moveTo(0, -f.size);
                ctx.lineTo(f.size * 0.6, 0);
                ctx.lineTo(0, f.size);
                ctx.lineTo(-f.size * 0.6, 0);
            } else if (f.type === 'chevron') {
                ctx.moveTo(-f.size, -f.size * 0.3);
                ctx.lineTo(0, f.size * 0.7);
                ctx.lineTo(f.size, -f.size * 0.3);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            ctx.restore();
        }
    }

    function drawLeaves() {
        for (const leaf of leaves) {
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(leaf.rotation);

            ctx.fillStyle = `rgba(${SILVER.r - 40}, ${SILVER.g - 30}, ${SILVER.b - 60}, ${leaf.opacity})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawOverlay() {
        // Blue vignette
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(8, 12, 20, 0)');
        gradient.addColorStop(1, 'rgba(8, 12, 20, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initTessellations();
        initNodes();
        initFragments();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(8, 12, 20, 0.15)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateTessellations();
        updateNodes();
        updatePulses();
        updateSonar();
        updateSweeps();
        updateStrikes();
        updateFragments();
        updateLeaves();

        spawnPulse();
        spawnSonar();
        spawnStrike();

        drawTessellations();
        drawNetwork();
        drawPulses();
        drawSonar();
        drawSweeps();
        drawStrikes();
        drawFragments();
        drawLeaves();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initLeaves();
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
