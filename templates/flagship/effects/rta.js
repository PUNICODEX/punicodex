/**
 * ṚTA — Cosmic Order
 * Hero canvas: a precise orbital lattice of nodes that drifts in slow
 * perturbation and periodically snaps into perfect alignment, revealing
 * the hidden geometry of the cosmic order.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Lattice Canvas ──────────────────────────────────────────────────── */
    const canvas = document.getElementById('lattice-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        let width, height;
        let cx, cy, baseRadius;
        let rings = [];
        let dust = [];
        let rafId = 0;
        let cycleT = 0;
        const pointer = { x: -9999, y: -9999 };

        const RING_COUNT = 5;
        const CYCLE_FRAMES = 900; // ~15s per drift → snap cycle
        const DUST_COUNT = 70;

        const PALETTE = {
            node: { r: 226, g: 196, b: 120 },     // Ritual gold
            nodeHot: { r: 255, g: 238, b: 196 },  // Aligned white-gold
            line: { r: 168, g: 154, b: 220 },     // Ordered violet
            orbit: { r: 120, g: 116, b: 180 },    // Faint orbit indigo
            dust: { r: 200, g: 196, b: 232 },
        };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            cx = width / 2;
            cy = height / 2;
            baseRadius = Math.min(width, height) * 0.42;
            buildLattice();
        }

        function buildLattice() {
            rings = [];
            for (let i = 0; i < RING_COUNT; i++) {
                const radius = baseRadius * (0.28 + 0.72 * (i / (RING_COUNT - 1)));
                const nodeCount = 8 + i * 4;
                const nodes = [];
                for (let j = 0; j < nodeCount; j++) {
                    const ideal = (j / nodeCount) * Math.PI * 2 + i * 0.35;
                    nodes.push({
                        ideal: ideal,
                        offset: (Math.random() - 0.5) * 0.5,
                        wobblePhase: Math.random() * Math.PI * 2,
                        wobbleSpeed: 0.004 + Math.random() * 0.008,
                        size: 1.4 + Math.random() * 1.4,
                        repel: 0,
                    });
                }
                rings.push({
                    radius: radius,
                    nodes: nodes,
                    speed: (i % 2 === 0 ? 1 : -1) * (0.0006 + 0.0004 * i),
                    rotation: Math.random() * Math.PI * 2,
                });
            }
        }

        // 0 = fully drifting, 1 = perfectly snapped
        function snapFactor() {
            const t = (cycleT % CYCLE_FRAMES) / CYCLE_FRAMES;
            const snapStart = 0.55;
            const snapFull = 0.75;
            const holdEnd = 0.92;
            if (t < snapStart) return 0;
            if (t < snapFull) {
                const u = (t - snapStart) / (snapFull - snapStart);
                return u * u * (3 - 2 * u);
            }
            if (t < holdEnd) return 1;
            const u = (t - holdEnd) / (1 - holdEnd);
            return 1 - u * u;
        }

        class Dust {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.size = 0.5 + Math.random() * 1.3;
                this.alpha = 0.06 + Math.random() * 0.18;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < -8 || this.x > width + 8 || this.y < -8 || this.y > height + 8) this.reset();
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = `rgb(${PALETTE.dust.r}, ${PALETTE.dust.g}, ${PALETTE.dust.b})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function nodePosition(ring, node, snap) {
            node.wobblePhase += node.wobbleSpeed;
            const wobble = (1 - snap) * (node.offset + Math.sin(node.wobblePhase) * 0.22);
            const angle = node.ideal + wobble + ring.rotation;

            // Pointer repulsion: order recoils from the hand
            let px = cx + Math.cos(angle) * ring.radius;
            let py = cy + Math.sin(angle) * ring.radius;
            const dx = px - pointer.x;
            const dy = py - pointer.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            let target = 0;
            if (d < 140 && d > 1) target = (1 - d / 140) * 18 * (1 - snap * 0.6);
            node.repel += (target - node.repel) * 0.15;
            if (node.repel > 0.01 && d > 1) {
                px += (dx / d) * node.repel;
                py += (dy / d) * node.repel;
            }
            return { x: px, y: py };
        }

        function animate() {
            cycleT++;
            ctx.clearRect(0, 0, width, height);
            const snap = snapFactor();

            // Core radiance — flares when the lattice locks
            const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 1.1);
            coreGlow.addColorStop(0, `rgba(210, 190, 140, ${0.05 + snap * 0.10})`);
            coreGlow.addColorStop(0.6, `rgba(90, 84, 160, ${0.03 + snap * 0.04})`);
            coreGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGlow;
            ctx.fillRect(0, 0, width, height);

            // Orbit guide rings
            rings.forEach(ring => {
                ring.rotation += ring.speed;
                ctx.save();
                ctx.globalAlpha = 0.08 + snap * 0.10;
                ctx.strokeStyle = `rgb(${PALETTE.orbit.r}, ${PALETTE.orbit.g}, ${PALETTE.orbit.b})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            // Resolve node positions once per frame
            const positions = rings.map(ring => ring.nodes.map(node => nodePosition(ring, node, snap)));

            // Lattice connective lines — fade in with the snap
            if (snap > 0.02) {
                ctx.save();
                ctx.strokeStyle = `rgb(${PALETTE.line.r}, ${PALETTE.line.g}, ${PALETTE.line.b})`;
                ctx.lineWidth = 0.7;
                // Around each ring
                positions.forEach((pts) => {
                    ctx.globalAlpha = snap * 0.35;
                    ctx.beginPath();
                    for (let j = 0; j < pts.length; j++) {
                        const a = pts[j];
                        const b = pts[(j + 1) % pts.length];
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                    }
                    ctx.stroke();
                });
                // Radial spokes between adjacent rings (every other node)
                ctx.globalAlpha = snap * 0.22;
                ctx.beginPath();
                for (let i = 0; i < positions.length - 1; i++) {
                    const inner = positions[i];
                    const outer = positions[i + 1];
                    for (let j = 0; j < inner.length; j += 2) {
                        const k = Math.round((j / inner.length) * outer.length) % outer.length;
                        ctx.moveTo(inner[j].x, inner[j].y);
                        ctx.lineTo(outer[k].x, outer[k].y);
                    }
                }
                ctx.stroke();
                ctx.restore();
            }

            // Nodes
            positions.forEach((pts, i) => {
                pts.forEach((p, j) => {
                    const node = rings[i].nodes[j];
                    const heat = snap;
                    const r = Math.round(PALETTE.node.r + (PALETTE.nodeHot.r - PALETTE.node.r) * heat);
                    const g = Math.round(PALETTE.node.g + (PALETTE.nodeHot.g - PALETTE.node.g) * heat);
                    const b = Math.round(PALETTE.node.b + (PALETTE.nodeHot.b - PALETTE.node.b) * heat);
                    ctx.save();
                    ctx.globalAlpha = 0.55 + snap * 0.45;
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.shadowBlur = 6 + snap * 12;
                    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, node.size + snap * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
            });

            // Central bindu pulse on the snap
            ctx.save();
            const binduR = 3 + snap * 4 + Math.sin(cycleT * 0.05) * 0.6;
            ctx.globalAlpha = 0.7 + snap * 0.3;
            ctx.fillStyle = `rgb(${PALETTE.nodeHot.r}, ${PALETTE.nodeHot.g}, ${PALETTE.nodeHot.b})`;
            ctx.shadowBlur = 18 + snap * 26;
            ctx.shadowColor = `rgba(${PALETTE.nodeHot.r}, ${PALETTE.nodeHot.g}, ${PALETTE.nodeHot.b}, 0.9)`;
            ctx.beginPath();
            ctx.arc(cx, cy, binduR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            dust.forEach(d => { d.update(); d.draw(); });

            rafId = requestAnimationFrame(animate);
        }

        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < DUST_COUNT; i++) {
            dust.push(new Dust());
        }

        window.addEventListener('pointermove', (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });
        window.addEventListener('pointerleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
        }, { passive: true });

        rafId = requestAnimationFrame(animate);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            } else if (!rafId) {
                rafId = requestAnimationFrame(animate);
            }
        });
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('visible'));
    }

    /* ── Nav Scroll Effect ────────────────────────────────────────────────── */
    const nav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!nav) return;
        if (window.pageYOffset > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                mascotImg.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();
