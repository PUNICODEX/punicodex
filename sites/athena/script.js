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

// ========== BOOKING SYSTEM ==========
const API_BASE = window.PUNICODEX_API_BASE || ''; // Set window.PUNICODEX_API_BASE in HTML if needed

// Only initialize on pages with the booking modal
if (!document.getElementById('booking-modal')) {
  // Skip booking system on pages without modal (lore, gallery, etc.)
} else {

let slotsData = [];
let currentSlotId = null;
let currentBooking = null;

// DOM refs
const modal = document.getElementById('booking-modal');
const modalClose = document.getElementById('booking-modal-close');
const steps = {
  1: document.getElementById('booking-step-1'),
  verify: document.getElementById('booking-step-verify'),
  2: document.getElementById('booking-step-2'),
  3: document.getElementById('booking-step-3'),
  rejected: document.getElementById('booking-step-rejected'),
  loading: document.getElementById('booking-step-loading'),
};

const els = {
  slotName: document.getElementById('booking-slot-name'),
  slotDims: document.getElementById('booking-slot-dims'),
  price: document.getElementById('booking-price'),
  priceOriginal: document.getElementById('booking-price-original'),
  discount: document.getElementById('booking-discount'),
  discountNote: document.getElementById('booking-discount-note'),
  email: document.getElementById('booking-email'),
  company: document.getElementById('booking-company'),
  website: document.getElementById('booking-website'),
  heading: document.getElementById('booking-heading'),
  subtitle: document.getElementById('booking-subtitle'),
  headingLimit: document.getElementById('booking-heading-limit'),
  subtitleLimit: document.getElementById('booking-subtitle-limit'),
  headingCount: document.getElementById('booking-heading-count'),
  subtitleCount: document.getElementById('booking-subtitle-count'),
  sendCode: document.getElementById('booking-send-code'),
  verifyBtn: document.getElementById('booking-verify-btn'),
  resendCode: document.getElementById('booking-resend-code'),
  leaseMonthly: document.getElementById('lease-monthly'),
  leaseYearly: document.getElementById('lease-yearly'),
  codeInput: document.getElementById('booking-code'),
  verifyEmail: document.getElementById('booking-verify-email'),
  verifyError: document.getElementById('booking-verify-error'),
  uploadZone: document.getElementById('booking-upload-zone'),
  uploadInput: document.getElementById('booking-upload-input'),
  uploadPreview: document.getElementById('booking-upload-preview'),
  uploadPrompt: document.querySelector('.booking-upload-prompt'),
  uploadActions: document.getElementById('booking-upload-actions'),
  submitUpload: document.getElementById('booking-submit-upload'),
  changeFile: document.getElementById('booking-change-file'),
  uploadDims: document.getElementById('booking-upload-dims'),
  livePreview: document.getElementById('booking-live-preview'),
  livePreviewFrame: document.getElementById('booking-live-preview-frame'),
  dashboardLink: document.getElementById('booking-dashboard-link'),
  doneBtn: document.getElementById('booking-done'),
  rejectReason: document.getElementById('booking-reject-reason'),
  reuploadBtn: document.getElementById('booking-reupload'),
  rejectedClose: document.getElementById('booking-rejected-close'),
  applySlotName: document.getElementById('booking-apply-slot-name'),
  applicationNote: document.getElementById('booking-application-note'),
  submitApplication: document.getElementById('booking-submit-application'),
  applyError: document.getElementById('booking-apply-error'),
};

let selectedFile = null;
let selectedFileBase64 = null;
let verificationToken = '';
let isBundleApplication = false;
let currentDiscount = null;
let discountTimer = null;
let currentUploadSlot = null;

// Fetch slots and update UI
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots/?site=athena`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {
    console.error('[PUNICODEX] loadSlots failed:', err);
  }
}

function trackViewability(container, token, slotSlug) {
  if (!('IntersectionObserver' in window)) return;
  let timer = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (timer) return;
        timer = setTimeout(() => {
          fetch(`${API_BASE}/api/analytics/viewability/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              visibleSeconds: 1,
              visiblePercent: Math.round(entry.intersectionRatio * 100),
              slotSlug: slotSlug || undefined,
            }),
          }).catch(() => {});
          observer.disconnect();
        }, 1000);
      } else {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    });
  }, { threshold: [0, 0.5, 1] });
  observer.observe(container);
}

function updateSlotUI() {
  const orderedSlots = [...slotsData].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  document.querySelectorAll('.space-slot').forEach(slotEl => {
    let slot;
    if (slotEl.dataset.bundle === '1') {
      // The full-page takeover maps to the bundle slot in the database.
      slot = orderedSlots.find(s => s.is_bundle === 1);
    } else {
      const spaceNum = slotEl.dataset.space;
      const sortOrder = parseInt(spaceNum, 10);
      slot = orderedSlots.find(s => s.sort_order === sortOrder);
    }
    if (!slot) return;

    const frame = slotEl.querySelector('.space-frame');
    const meta = slotEl.querySelector('.space-meta');
    if (!frame) return;

    // Remove any existing dynamic overlays
    const existingOverlay = frame.querySelector('.space-frame-overlay');
    if (existingOverlay) existingOverlay.remove();
    const existingPixel = frame.querySelector('.space-pixel');
    if (existingPixel) existingPixel.remove();

    // Handle custom meta text for live slots
    if (slot.status === 'live' && meta) {
      const hasCustom = slot.custom_heading || slot.custom_subtitle;
      if (hasCustom) {
        meta.style.display = 'flex';
        const nameEl = meta.querySelector('.space-name');
        const dimsEl = meta.querySelector('.space-dims');
        if (nameEl) nameEl.textContent = slot.custom_heading || slot.name;
        if (dimsEl) dimsEl.textContent = slot.custom_subtitle || `${slot.width} × ${slot.height} px`;
      } else {
        meta.style.display = 'none';
      }
    } else if (meta) {
      // Reset to default for available/reserved slots
      meta.style.display = 'flex';
      const nameEl = meta.querySelector('.space-name');
      const dimsEl = meta.querySelector('.space-dims');
      if (nameEl) nameEl.textContent = slot.name;
      if (dimsEl) dimsEl.textContent = `${slot.width} × ${slot.height} px`;
    }

    // Determine if this slot should render its own creative
    // Bundle members need a per-slot creative; the bundle slot itself uses main creative
    const bundleSlot = slotsData.find(s => s.is_bundle === 1);
    const isBundleMember = bundleSlot && slot.id !== bundleSlot.id && slot.booking_id && bundleSlot.current_booking_id === slot.booking_id;
    const hasOwnCreative = isBundleMember ? slot.has_slot_creative : !!slot.creative_path;

    if (slot.status === 'live' && hasOwnCreative) {
      // LIVE: render actual creative with click tracking. slot.public_id is a
      // write-only tracking identifier; the secret management token is never
      // shipped to the browser. The slot slug rides along on every tracker so
      // bundle/takeover bookings (one token across member placements) can be
      // split per placement in the analytics pipeline.
      const slotParam = slot.slug ? `&slot=${encodeURIComponent(slot.slug)}` : '';
      const pixelUrl = `${API_BASE}/api/analytics/pixel.gif/?b=${slot.public_id}${slotParam}`;
      const clickUrl = `${API_BASE}/api/analytics/click/?b=${slot.public_id}&url=${encodeURIComponent(slot.website_url || '#')}${slotParam}`;
      // Built with DOM calls, not an HTML string: company_name is
      // sponsor-supplied and reaches this page before any payment clears, so
      // interpolating it into markup (even inside an alt="") is a stored-XSS
      // sink in the same origin as the admin portal. Property assignment
      // cannot break out of its attribute.
      const link = document.createElement('a');
      link.href = clickUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'space-live-ad';
      link.style.cssText = 'display:block;width:100%;height:100%;position:relative;z-index:2;';

      const adImg = document.createElement('img');
      // creative_path may be a site-relative /uploads/ path or an absolute
      // blob URL — resolve either.
      adImg.src = /^https?:\/\//.test(slot.creative_path)
        ? slot.creative_path
        : `${API_BASE}${slot.creative_path}`;
      adImg.alt = slot.company_name || 'Advertisement';
      adImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

      if (slot.creative_webp_path) {
        const picture = document.createElement('picture');
        const source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = `${API_BASE}${slot.creative_webp_path}`;
        picture.appendChild(source);
        picture.appendChild(adImg);
        link.appendChild(picture);
      } else {
        link.appendChild(adImg);
      }

      const pixel = document.createElement('img');
      pixel.className = 'space-pixel';
      pixel.src = pixelUrl;
      pixel.width = 1;
      pixel.height = 1;
      pixel.alt = '';
      pixel.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';

      frame.innerHTML = '';
      frame.appendChild(link);
      frame.appendChild(pixel);
      // Re-add glow if it was removed
      if (!frame.querySelector('.space-frame-glow')) {
        const glow = document.createElement('div');
        glow.className = 'space-frame-glow';
        frame.appendChild(glow);
      }

      // Fire viewability beacon after 1s at ≥50% visibility
      trackViewability(frame, slot.public_id, slot.slug);
    } else if (slot.status !== 'available') {
      // RESERVED: hide button, show overlay inside frame
      const overlay = document.createElement('div');
      overlay.className = 'space-frame-overlay';
      // textContent, not innerHTML: a sponsor controls company_name and this
      // overlay renders while the booking is still merely 'reserved'.
      const overlayText = document.createElement('span');
      overlayText.className = 'space-frame-overlay-text';
      overlayText.textContent = slot.status === 'live' ? 'LIVE' : 'RESERVED';
      const overlaySub = document.createElement('span');
      overlaySub.className = 'space-frame-overlay-sub';
      overlaySub.textContent = slot.company_name || '';
      overlay.appendChild(overlayText);
      overlay.appendChild(overlaySub);
      frame.appendChild(overlay);

      if (!slotEl.querySelector('.space-reserved-badge')) {
        const badge = document.createElement('span');
        badge.className = `space-reserved-badge ${slot.status === 'live' ? '' : 'space-reserved-badge--reserved'}`;
        badge.textContent = slot.status === 'live' ? 'Live' : 'Reserved';
        const footer = slotEl.querySelector('.space-footer');
        if (footer) footer.appendChild(badge);
      }
    } else {
      // AVAILABLE: show button, remove overlays, restore placeholder
      const badge = slotEl.querySelector('.space-reserved-badge');
      if (badge) badge.remove();
      // Restore default placeholder content if it was replaced
      if (!frame.querySelector('.space-frame-content')) {
        frame.innerHTML = `
          <div class="space-frame-glow"></div>
          <div class="space-frame-content">
            <span class="space-placeholder-logo">◆</span>
            <span class="space-placeholder-text">Available</span>
            <span class="space-placeholder-dims">Select to reserve</span>
          </div>
        `;
      }
    }
  });

  // Full-page takeover is an exclusive first-tenant offer:
  // hide it as soon as any individual slot is no longer available,
  // or if the bundle slot itself has been claimed.
  const bundleSlot = orderedSlots.find(s => s.is_bundle === 1);
  const anyIndividualClaimed = orderedSlots.some(s => !s.is_bundle && s.status !== 'available');
  const bundleClaimed = bundleSlot && bundleSlot.status !== 'available';
  const takeoverEl = document.querySelector('.space-slot[data-bundle="1"]');
  if (takeoverEl) {
    if (anyIndividualClaimed || bundleClaimed) {
      takeoverEl.classList.add('takeover-hidden');
    } else {
      takeoverEl.classList.remove('takeover-hidden');
    }
  }
}

// Modal helpers
function showStep(name) {
  Object.values(steps).forEach(el => el.style.display = 'none');
  if (steps[name]) steps[name].style.display = 'block';
}

function showBookingError(msg) {
  const errEl = document.getElementById('booking-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}
function clearBookingError() {
  const errEl = document.getElementById('booking-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
}

function getCharLimits(width) {
  // New marketplace layout has two slot shapes:
  // - Banners: 1200 × 400 px
  // - Boxes: 600 × 600 px
  if (width >= 1000) return { heading: 60, subtitle: 100 };
  if (width >= 500)  return { heading: 36, subtitle: 60 };
  if (width >= 300)  return { heading: 24, subtitle: 40 };
  return { heading: 12, subtitle: 20 };
}

function updateCharCounter(input, countEl, max) {
  const len = input.value.length;
  countEl.textContent = `${len} / ${max}`;
  countEl.classList.remove('booking-char-count--near', 'booking-char-count--over');
  if (len > max) countEl.classList.add('booking-char-count--over');
  else if (len >= max - 3) countEl.classList.add('booking-char-count--near');
}

function applyCharLimits(width) {
  const limits = getCharLimits(width);
  els.heading.maxLength = limits.heading;
  els.subtitle.maxLength = limits.subtitle;
  if (els.headingLimit) els.headingLimit.textContent = `(max ${limits.heading} chars)`;
  if (els.subtitleLimit) els.subtitleLimit.textContent = `(max ${limits.subtitle} chars)`;
  updateCharCounter(els.heading, els.headingCount, limits.heading);
  updateCharCounter(els.subtitle, els.subtitleCount, limits.subtitle);
}

function openModal(slotOrId) {

  try {
    let slot;
    let slotId;
    if (slotOrId && typeof slotOrId === 'object' && slotOrId.id !== undefined) {
      slot = slotOrId;
      slotId = slot.id;
    } else {
      slotId = slotOrId;
      // Robust ID comparison (handles string vs number IDs from API)
      slot = slotsData.find(s => String(s.id) === String(slotId));
    }
    currentSlotId = slotId;

    // Fallback to DOM if slotsData hasn't loaded yet (only when caller passed a slot object with sort_order)
    if (!slot && typeof slotOrId === 'object' && slotOrId.sort_order) {
      const sortOrder = slotOrId.sort_order;
      const slotEl = document.querySelector(`.space-slot[data-space="${String(sortOrder).padStart(2, '0')}"]`);
      if (!slotEl) return;
      const nameEl = slotEl.querySelector('.space-name');
      const dimsEl = slotEl.querySelector('.space-dims');
      const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
      slot = {
        name: nameEl ? nameEl.textContent : 'Slot',
        width: dimsMatch ? parseInt(dimsMatch[1], 10) : 0,
        height: dimsMatch ? parseInt(dimsMatch[2], 10) : 0,
        price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
        is_bundle: parseInt(slotEl.dataset.bundle, 10) || 0,
      };
    }
    if (!slot) return;

    currentSlotPriceCents = slot.price_cents || 0;
    currentLeaseMonths = 1;
    isBundleApplication = Boolean(slot.is_bundle) || false;
    currentDiscount = null;
    if (els.discount) els.discount.value = '';
    if (els.discountNote) els.discountNote.style.display = 'none';
    if (els.leaseMonthly) els.leaseMonthly.classList.add('active');
    if (els.leaseYearly) els.leaseYearly.classList.remove('active');
    updatePriceDisplay();
    els.slotName.textContent = slot.name;
    els.slotDims.textContent = `${slot.width} × ${slot.height} px`;
    applyCharLimits(slot.width || 0);
    if (isBundleApplication) {
      els.slotDims.textContent = 'All 13 ad spaces · One unified campaign';
    }

    clearBookingError();
    showStep('1');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

  } catch (err) {
    console.error('[PUNICODEX] openModal failed:', err);
  }
}

function discountBaseCents() {
  return currentLeaseMonths === 12
    ? Math.round(currentSlotPriceCents * 12 * 0.9)
    : currentSlotPriceCents * currentLeaseMonths;
}

// Mirrors discount-service.computePrice for the display: what we show is
// what the server will charge (same base, same math).
function computeDisplayPrice(baseCents, terms) {
  if (!terms) return baseCents;
  if (terms.kind === 'percent_off') return Math.round(baseCents * (1 - Number(terms.percent) / 100));
  if (terms.kind === 'fixed_off') return Math.max(0, baseCents - Math.round(Number(terms.fixedCents) || 0));
  return baseCents; // free-month kinds adjust the trial, not the sticker price
}

function updatePriceDisplay() {
  const base = discountBaseCents();
  const label = currentLeaseMonths === 12 ? '/yr' : '/mo';
  if (currentDiscount && currentDiscount.valid) {
    const final = computeDisplayPrice(base, currentDiscount.terms);
    if (final !== base) {
      els.priceOriginal.style.display = '';
      els.priceOriginal.textContent = `$${(base / 100).toLocaleString()}`;
      els.price.innerHTML = final === 0
        ? `$0<span> · complimentary</span>`
        : `$${(final / 100).toLocaleString()}<span>${label}</span>`;
      return;
    }
  }
  els.priceOriginal.style.display = 'none';
  els.price.innerHTML = `$${(base / 100).toLocaleString()}<span>${label}</span>`;
}

function discountTermsText() {
  const t = currentDiscount.terms;
  const code = currentDiscount.code;
  if (currentDiscount.complimentary) {
    return `${code} — complimentary placement: no card, no checkout, no auto-renewal.`;
  }
  if (t.kind === 'percent_off') return `${code} — ${t.percent}% off applied.`;
  if (t.kind === 'fixed_off') return `${code} — $${(t.fixedCents / 100).toLocaleString()} off applied.`;
  if (t.kind === 'free_months') {
    return `${code} — ${t.freeMonths} month${t.freeMonths === 1 ? '' : 's'} complimentary: no card, no checkout, then the placement ends.`;
  }
  if (t.kind === 'trial_extension') return `${code} — trial extended by ${t.freeMonths} month${t.freeMonths === 1 ? '' : 's'}.`;
  if (t.kind === 'free_months_then_price') {
    return `${code} — ${t.freeMonths} months free, then $${(t.thenPriceCents / 100).toLocaleString()}/mo.`;
  }
  return `${code} applied.`;
}

async function validateDiscountCode() {
  const code = els.discount ? els.discount.value.trim() : '';
  currentDiscount = null;
  if (!code) {
    if (els.discountNote) els.discountNote.style.display = 'none';
    syncVerifyButtonLabel();
    updatePriceDisplay();
    return;
  }
  try {
    const payload = { code, temple: 'athena', leaseMonths: currentLeaseMonths };
    if (currentSlotId != null && Number.isInteger(Number(currentSlotId))) {
      payload.slotId = Number(currentSlotId);
    }
    const res = await fetch(`${API_BASE}/api/discount/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.valid) {
      currentDiscount = data;
      if (els.discountNote) {
        els.discountNote.textContent = discountTermsText();
        els.discountNote.style.color = '#7ee2a0';
        els.discountNote.style.display = 'block';
      }
    } else if (els.discountNote) {
      els.discountNote.textContent = "That code doesn't apply to this frame.";
      els.discountNote.style.color = '#f28b8b';
      els.discountNote.style.display = 'block';
    }
  } catch {
    // Validation is advisory; the server re-validates authoritatively at booking.
    if (els.discountNote) els.discountNote.style.display = 'none';
  }
  syncVerifyButtonLabel();
  updatePriceDisplay();
}

// The verify button must never promise payment for a complimentary term.
function syncVerifyButtonLabel() {
  if (!els.verifyBtn) return;
  els.verifyBtn.textContent =
    currentDiscount && currentDiscount.complimentary
      ? 'Verify & Continue'
      : 'Verify & Proceed to Payment';
}

if (els.discount) {
  els.discount.addEventListener('input', () => {
    clearTimeout(discountTimer);
    discountTimer = setTimeout(validateDiscountCode, 450);
  });
  els.discount.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(discountTimer);
      validateDiscountCode();
    }
  });
}
const discountApplyBtn = document.getElementById('booking-discount-apply');
if (discountApplyBtn) {
  discountApplyBtn.addEventListener('click', () => {
    clearTimeout(discountTimer);
    validateDiscountCode();
  });
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  currentSlotId = null;
  currentBooking = null;
  selectedFile = null;
  selectedFileBase64 = null;
  resetUpload();
}

function resetUpload() {
  els.uploadPreview.style.display = 'none';
  els.uploadPrompt.style.display = 'block';
  els.uploadActions.style.display = 'none';
  els.livePreview.style.display = 'none';
  els.livePreviewFrame.innerHTML = '';
  els.uploadInput.value = '';
  const warn = document.getElementById('booking-upload-warning');
  if (warn) warn.remove();
}

function buildSlotFromDom(slotEl) {
  const nameEl = slotEl.querySelector('.space-name');
  const dimsEl = slotEl.querySelector('.space-dims');
  const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
  const isBundle = slotEl.dataset.bundle === '1';
  const sortOrder = parseInt(slotEl.dataset.space, 10) || 0;
  return {
    id: isBundle ? 'bundle' : sortOrder,
    name: nameEl ? nameEl.textContent.trim() : 'Ad Space',
    width: dimsMatch ? parseInt(dimsMatch[1], 10) : 0,
    height: dimsMatch ? parseInt(dimsMatch[2], 10) : 0,
    price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
    is_bundle: isBundle ? 1 : 0,
    sort_order: sortOrder,
  };
}

// Event: Click anywhere on an available frame to open booking
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;

  let slot;
  if (slotEl.dataset.bundle === '1') {
    // Full-page takeover maps to the bundle slot.
    slot = slotsData.find(s => s.is_bundle === 1);
  } else {
    const sortOrder = parseInt(slotEl.dataset.space, 10);
    slot = slotsData.find(s => s.sort_order === sortOrder);
  }

  // Fallback to DOM data when API slots are not loaded/available.
  if (!slot) {
    slot = buildSlotFromDom(slotEl);
  }

  openModal(slot);
});

modalClose.addEventListener('click', closeModal);
modal.querySelector('.booking-modal-backdrop').addEventListener('click', closeModal);

// Real-time character counters
els.heading.addEventListener('input', () => {
  const max = parseInt(els.heading.maxLength, 10) || 0;
  updateCharCounter(els.heading, els.headingCount, max);
});
els.subtitle.addEventListener('input', () => {
  const max = parseInt(els.subtitle.maxLength, 10) || 0;
  updateCharCounter(els.subtitle, els.subtitleCount, max);
});

// Lease period toggle
if (els.leaseMonthly) {
  els.leaseMonthly.addEventListener('click', () => {
    currentLeaseMonths = 1;
    els.leaseMonthly.classList.add('active');
    if (els.leaseYearly) els.leaseYearly.classList.remove('active');
    updatePriceDisplay();
    validateDiscountCode();
  });
}
if (els.leaseYearly) {
  els.leaseYearly.addEventListener('click', () => {
    currentLeaseMonths = 12;
    els.leaseYearly.classList.add('active');
    if (els.leaseMonthly) els.leaseMonthly.classList.remove('active');
    updatePriceDisplay();
    validateDiscountCode();
  });
}

// Step 1: Send verification code
async function sendVerificationCode() {
  const email = els.email.value.trim();
  if (!email || !email.includes('@')) {
    showBookingError('Please enter a valid email');
    return;
  }
  clearBookingError();
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/verify/send/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.sent) {
      els.verifyEmail.textContent = email;
      showStep('verify');
    } else {
      showBookingError(data.error || 'Failed to send code');
      showStep('1');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('1');
  }
}

els.sendCode.addEventListener('click', sendVerificationCode);
els.resendCode.addEventListener('click', sendVerificationCode);

// Step 1b: Verify code & proceed to Stripe
els.submitApplication.addEventListener('click', async () => {
  const note = els.applicationNote ? els.applicationNote.value.trim() : '';
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/bookings/apply/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: currentSlotId,
        email: els.email.value.trim(),
        companyName: els.company.value.trim(),
        websiteUrl: els.website.value.trim(),
        customHeading: els.heading ? els.heading.value.trim() : '',
        customSubtitle: els.subtitle ? els.subtitle.value.trim() : '',
        leaseMonths: currentLeaseMonths,
        verificationToken,
        applicationNote: note,
      }),
    });
    const data = await res.json();
    if (data.status === 'pending_application') {
      showStep('3');
      if (els.dashboardLink) {
        els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${data.token}`;
      }
    } else {
      showBookingError(data.error || 'Application failed');
      showStep('apply');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('apply');
  }
});

els.verifyBtn.addEventListener('click', async () => {
  const email = els.email.value.trim();
  const code = els.codeInput.value.trim();
  if (!code || code.length !== 6) {
    if (els.verifyError) {
      els.verifyError.textContent = 'Please enter the 6-digit code';
      els.verifyError.style.display = 'block';
    }
    return;
  }
  if (els.verifyError) els.verifyError.style.display = 'none';
  showStep('loading');
  try {
    const verifyRes = await fetch(`${API_BASE}/api/verify/check/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const verifyData = await verifyRes.json();
    if (verifyData.verified && verifyData.verificationToken) {
      verificationToken = verifyData.verificationToken;
    }
    if (!verifyData.verified) {
      if (els.verifyError) {
        els.verifyError.textContent = verifyData.error || 'Invalid code';
        els.verifyError.style.display = 'block';
      }
      showStep('verify');
      return;
    }

    if (isBundleApplication) {
      const slot = slotsData.find((s) => s.id === currentSlotId) || {};
      if (els.applySlotName) els.applySlotName.textContent = slot.name || 'Full Page Takeover';
      showStep('apply');
      return;
    }

    // Code verified — create booking and redirect to Stripe
    const discountCode = els.discount ? els.discount.value.trim() : '';
    const res = await fetch(`${API_BASE}/api/bookings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: currentSlotId,
        email,
        companyName: els.company.value.trim(),
        websiteUrl: els.website.value.trim(),
        customHeading: els.heading ? els.heading.value.trim() : '',
        customSubtitle: els.subtitle ? els.subtitle.value.trim() : '',
        leaseMonths: currentLeaseMonths,
        discountCode: discountCode || undefined,
        verificationToken,
      }),
    });
    const data = await res.json();
    if (data.stripeUrl) {
      window.location.href = data.stripeUrl;
    } else if (data.complimentary) {
      // Complimentary term: no Stripe at all — the placement is approved;
      // the sponsor goes straight to the creative upload.
      currentBooking = { token: data.token, analytics_token: data.token, slot_id: currentSlotId };
      const slot = slotsData.find((s) => String(s.id) === String(currentSlotId));
      if (slot) setupUploadStep(slot);
      showStep('2');
    } else {
      showBookingError(data.error || 'Something went wrong');
      showStep('1');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('verify');
  }
});

// Handle return from Stripe
async function handleReturnFromStripe() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('booking');
  const paid = params.get('paid');
  const canceled = params.get('canceled');
  const renewed = params.get('renewed');

  if (!token) return;

  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    // First check/update payment status with Stripe directly
    const checkRes = await fetch(`${API_BASE}/api/bookings/${token}/check-payment`);
    const checkData = await checkRes.json();
    const booking = checkData.booking;
    if (!booking || checkData.error) return;

    currentBooking = booking;
    const slot = slotsData.find(s => s.id === booking.slot_id);
    currentSlotId = booking.slot_id;

    if (canceled) {
      showBookingError('Payment was canceled. You can try again anytime.');
      return;
    }

    if (renewed && booking.status === 'live') {
      openModal(slot);
      showStep('3');
      const titleEl = document.querySelector('#booking-step-3 .booking-modal-title');
      if (titleEl) titleEl.textContent = 'Renewal Complete';
      const subtitleEl = document.querySelector('#booking-step-3 .booking-modal-subtitle');
      if (subtitleEl) subtitleEl.textContent = 'Your lease has been extended. Thank you for continuing with us.';
      els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/athena/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {
    console.error('[PUNICODEX] handleReturnFromStripe failed:', err);
  }
}

function setupUploadStep(slot) {
  currentUploadSlot = slot;
  els.uploadDims.innerHTML = `Recommended size: <strong style="color:var(--classic-gold);">${slot.width} × ${slot.height} px</strong>`;
  els.uploadDims.className = 'booking-modal-subtitle booking-upload-dims';
  resetUpload();
}

function showRejected(booking) {
  els.rejectReason.textContent = booking.admin_note || 'Does not meet our guidelines.';
  showStep('rejected');
}

els.reuploadBtn.addEventListener('click', () => {
  const slot = slotsData.find(s => s.id === currentSlotId);
  setupUploadStep(slot);
  showStep('2');
});
els.rejectedClose.addEventListener('click', closeModal);

// Upload handling
els.uploadZone.addEventListener('click', () => els.uploadInput.click());
els.uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.uploadZone.classList.add('dragover');
});
els.uploadZone.addEventListener('dragleave', () => {
  els.uploadZone.classList.remove('dragover');
});
els.uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.uploadZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) handleFileSelect(files[0]);
});
els.uploadInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFileSelect(e.target.files[0]);
});
els.changeFile.addEventListener('click', resetUpload);

async function handleFileSelect(file) {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showBookingError('Please upload PNG, JPG, or WebP');
    return;
  }
  selectedFile = file;

  // Normalize client-side (center-crop to the slot's frame, downscale to
  // 2×). The preview shows exactly what will run — and the server performs
  // the same normalization again, so the two can never disagree.
  const warn = (() => {
    let el = document.getElementById('booking-upload-warning');
    if (!el) {
      el = document.createElement('p');
      el.id = 'booking-upload-warning';
      el.style.cssText = 'margin-top:0.75rem;font-size:0.8rem;color:#e8c860;text-align:center;';
      els.uploadZone.parentNode.insertBefore(el, els.uploadZone.nextSibling);
    }
    return el;
  })();

  try {
    if (typeof CreativeNormalize === 'undefined' || !currentUploadSlot) {
      throw new Error('normalizer unavailable');
    }
    warn.textContent = 'Preparing your creative…';
    const n = await CreativeNormalize.normalizeCreative(
      file,
      currentUploadSlot.width,
      currentUploadSlot.height
    );
    selectedFileBase64 = n.dataUrl;
    if (n.tooSmall) {
      warn.textContent = `Your image is ${n.originalWidth}x${n.originalHeight} — smaller than the slot's ${currentUploadSlot.width}x${currentUploadSlot.height}. It will run, but may print soft; a larger original is better.`;
    } else if (n.cropped) {
      warn.textContent = `Framed to ${n.width}x${n.height} from your ${n.originalWidth}x${n.originalHeight} original — the preview below is exactly what will run.`;
    } else {
      warn.remove();
    }
  } catch (err) {
    // Fall back to the raw file: the server normalizes regardless, so this
    // path only matters when the browser cannot decode the image at all.
    if (file.size > 20 * 1024 * 1024) {
      showBookingError(err.message || 'This file is too large to process');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedFileBase64 = e.target.result;
      finishPreview();
    };
    reader.readAsDataURL(file);
    return;
  }
  finishPreview();

  function finishPreview() {
    els.uploadPreview.src = selectedFileBase64;
    els.uploadPreview.style.display = 'block';
    els.uploadPrompt.style.display = 'none';
    els.uploadActions.style.display = 'flex';

    // Live preview in frame
    els.livePreview.style.display = 'block';
    els.livePreviewFrame.innerHTML = `<img src="${selectedFileBase64}" alt="Preview">`;
  }
}

els.submitUpload.addEventListener('click', async () => {
  if (!selectedFileBase64 || !currentBooking) return;
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${currentBooking.analytics_token}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: selectedFileBase64,
        filename: selectedFile.name,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/athena/dashboard/?token=${currentBooking.analytics_token}`;
    } else {
      showBookingError(data.error || 'Upload failed');
      showStep('2');
    }
  } catch (err) {
    showBookingError('Upload error. Please try again.');
    showStep('2');
  }
});

els.doneBtn.addEventListener('click', closeModal);

// Change Creative button (from Under Review step)
const changeCreativeBtn = document.getElementById('booking-change-creative');
if (changeCreativeBtn) {
  changeCreativeBtn.addEventListener('click', () => {
    if (!currentBooking) return;
    const slot = slotsData.find(s => s.id === currentBooking.slot_id);
    setupUploadStep(slot);
    showStep('2');
  });
}

// ========== MY BOOKINGS MODAL ==========
const myBookingsModal = document.getElementById('my-bookings-modal');
const myBookingsNav = document.getElementById('my-bookings-nav');
const myBookingsFooter = document.getElementById('my-bookings-footer');
const myBookingsClose = document.getElementById('my-bookings-close');
const myBookingsBackdrop = document.getElementById('my-bookings-backdrop');
const myBookingsSubmit = document.getElementById('my-bookings-submit');
const myBookingsEmail = document.getElementById('my-bookings-email');
const myBookingsStepEmail = document.getElementById('my-bookings-step-email');
const myBookingsStepSent = document.getElementById('my-bookings-step-sent');

function openMyBookings() {
  if (!myBookingsModal) return;
  myBookingsModal.style.display = 'flex';
  myBookingsStepEmail.style.display = 'block';
  myBookingsStepSent.style.display = 'none';
  if (myBookingsEmail) myBookingsEmail.value = '';
}
function closeMyBookings() {
  if (!myBookingsModal) return;
  myBookingsModal.style.display = 'none';
}

if (myBookingsNav) myBookingsNav.addEventListener('click', openMyBookings);
if (myBookingsFooter) myBookingsFooter.addEventListener('click', openMyBookings);
if (myBookingsClose) myBookingsClose.addEventListener('click', closeMyBookings);
if (myBookingsBackdrop) myBookingsBackdrop.addEventListener('click', closeMyBookings);

if (myBookingsSubmit) {
  myBookingsSubmit.addEventListener('click', async () => {
    const email = myBookingsEmail.value.trim();
    if (!email || !email.includes('@')) {
      showBookingError('Please enter a valid email');
      return;
    }
    myBookingsSubmit.textContent = 'Sending...';
    try {
      const res = await fetch(`${API_BASE}/api/bookings/recover/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      myBookingsStepEmail.style.display = 'none';
      myBookingsStepSent.style.display = 'block';
    } catch (err) {
      myBookingsSubmit.textContent = 'Send My Links';
      showBookingError('Failed to send email. Please try again.');
    }
  });
}

// Init
loadSlots();
handleReturnFromStripe();

} // end else (booking modal exists)

// ─── PATRON SYSTEM ───
(function initPatronSystem() {
  const modal = document.getElementById('patron-modal');
  const grid = document.getElementById('patron-grid');
  const joinCard = document.getElementById('patron-join-card');
  const ctaBtn = document.getElementById('patron-cta-btn');
  if (!modal || !grid) return;

  const templeId = 'athena';
  const siteName = 'Athēnâ';
  let selectedCents = 700;

  const els = {
    close: document.getElementById('patron-modal-close'),
    backdrop: document.getElementById('patron-modal-backdrop'),
    stepForm: document.getElementById('patron-step-form'),
    stepLoading: document.getElementById('patron-step-loading'),
    stepSuccess: document.getElementById('patron-step-success'),
    displayName: document.getElementById('patron-display-name'),
    title: document.getElementById('patron-title'),
    message: document.getElementById('patron-message'),
    email: document.getElementById('patron-email'),
    error: document.getElementById('patron-error'),
    submit: document.getElementById('patron-submit'),
    successClose: document.getElementById('patron-success-close'),
    amountToggle: document.getElementById('patron-amount-toggle'),
  };

  function showStep(name) {
    if (els.stepForm) els.stepForm.style.display = name === 'form' ? 'block' : 'none';
    if (els.stepLoading) els.stepLoading.style.display = name === 'loading' ? 'block' : 'none';
    if (els.stepSuccess) els.stepSuccess.style.display = name === 'success' ? 'block' : 'none';
  }

  function showError(msg) {
    if (els.error) {
      els.error.textContent = msg;
      els.error.style.display = 'block';
    }
  }

  function clearError() {
    if (els.error) {
      els.error.textContent = '';
      els.error.style.display = 'none';
    }
  }

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showStep('form');
    clearError();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (ctaBtn) ctaBtn.addEventListener('click', openModal);
  if (joinCard) joinCard.addEventListener('click', openModal);
  if (els.close) els.close.addEventListener('click', closeModal);
  if (els.backdrop) els.backdrop.addEventListener('click', closeModal);
  if (els.successClose) els.successClose.addEventListener('click', closeModal);

  if (els.amountToggle) {
    els.amountToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.patron-amount-btn');
      if (!btn) return;
      selectedCents = parseInt(btn.dataset.cents, 10);
      els.amountToggle.querySelectorAll('.patron-amount-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  if (els.submit) {
    els.submit.addEventListener('click', async () => {
      clearError();
      const displayName = els.displayName?.value.trim();
      const title = els.title?.value.trim() || null;
      const message = els.message?.value.trim() || null;
      const email = els.email?.value.trim().toLowerCase();

      if (!displayName) return showError('Please enter the name or title to display.');
      if (!email || !email.includes('@')) return showError('Please enter a valid email address.');

      showStep('loading');
      try {
        const res = await fetch(`${API_BASE}/api/patrons/checkout/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templeId,
            email,
            displayName,
            title,
            message,
            amountCents: selectedCents,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (err) {
        showStep('form');
        showError(err.message || 'Unable to start checkout. Please try again.');
      }
    });
  }

  function renderPatron(patron) {
    const card = document.createElement('div');
    card.className = 'patron-card';
    card.innerHTML = `
      <div class="patron-badge-seal">&#10022;</div>
      <h3 class="patron-badge-name">${escapeHtml(patron.display_name)}</h3>
      ${patron.title ? `<p class="patron-badge-title">${escapeHtml(patron.title)}</p>` : ''}
      ${patron.message ? `<p class="patron-badge-message">“${escapeHtml(patron.message)}”</p>` : ''}
    `;
    return card;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function loadPatrons() {
    try {
      const res = await fetch(`${API_BASE}/api/patrons/${encodeURIComponent(templeId)}`);
      const data = await res.json();
      const patrons = data.patrons || [];

      // Remove existing patron cards except the join card
      grid.querySelectorAll('.patron-card:not(.patron-card--join)').forEach((el) => el.remove());

      patrons.forEach((patron) => {
        grid.insertBefore(renderPatron(patron), joinCard);
      });
    } catch (err) {
      console.error('[PUNICODEX] loadPatrons failed:', err);
    }
  }

  function handleReturnFromPatronStripe() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('patron') === 'success') {
      openModal();
      showStep('success');
      loadPatrons();
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    } else if (params.get('patron') === 'canceled') {
      openModal();
      showStep('form');
      showError('Checkout was canceled. You can try again whenever you like.');
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      window.history.replaceState({}, '', url.toString());
    }
  }

  loadPatrons();
  handleReturnFromPatronStripe();
})();

// ─── Original Script Provenance Toggle (lore pages) ───
(function initProvenanceToggle() {
  const toggle = document.getElementById('provenance-toggle');
  const panel = document.getElementById('provenance-content');
  if (!toggle || !panel) return;

  const label = toggle.querySelector('.provenance-toggle-label');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setOpen(isOpen) {
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (label) label.textContent = isOpen ? 'Hide scholarly provenance' : 'Show scholarly provenance';

    if (isOpen) {
      panel.hidden = false;
      // Force a reflow so the transition fires when the class is added.
      void panel.offsetWidth;
      panel.classList.add('is-open');
    } else {
      panel.classList.remove('is-open');
      if (prefersReducedMotion) {
        panel.hidden = true;
      } else {
        const onTransitionEnd = () => {
          panel.removeEventListener('transitionend', onTransitionEnd);
          if (toggle.getAttribute('aria-expanded') !== 'true') panel.hidden = true;
        };
        panel.addEventListener('transitionend', onTransitionEnd);
      }
    }
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!expanded);
  });

  toggle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle.click();
    }
  });
})();
