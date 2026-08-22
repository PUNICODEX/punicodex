/**
 * ASHERAH — Lady of the Sea
 * Interactive Layer: Sea-Wave Currents, Sacred Tree Growth, Reveals, Navigation
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============================
    // Sea & Sacred Tree Canvas
    // ============================
    const canvas = document.getElementById('seatree-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
        let width, height;
        let leafMotes = [];
        let tree = null;
        let cycleFrame = 0;
        let running = true;
        let rafId = null;

        const CYCLE_LENGTH = 1500;
        const FADE_START = CYCLE_LENGTH - 160;
        const LEAF_CAP = 90;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            buildTree();
        }

        function buildTree() {
            const segs = [];
            const tips = [];
            const baseX = width / 2;
            const baseY = height * 0.96;
            const maxDepth = 6;

            function branch(x, y, angle, len, depth, birth) {
                const x2 = x + Math.cos(angle) * len;
                const y2 = y + Math.sin(angle) * len;
                const grow = 90;
                segs.push({ x1: x, y1: y, x2: x2, y2: y2, depth: depth, birth: birth, grow: grow });
                if (depth >= maxDepth || len < 7) {
                    tips.push({ x: x2, y: y2 });
                    return;
                }
                const spread = 0.5 + Math.random() * 0.25;
                const n = depth < 2 ? 2 : (Math.random() < 0.75 ? 2 : 3);
                for (let i = 0; i < n; i++) {
                    const nextAngle =
                        angle + (i - (n - 1) / 2) * spread + (Math.random() - 0.5) * 0.2;
                    branch(
                        x2, y2, nextAngle,
                        len * (0.68 + Math.random() * 0.12),
                        depth + 1,
                        birth + grow * 0.9
                    );
                }
            }

            branch(baseX, baseY, -Math.PI / 2, Math.min(width, height) * 0.16, 0, 0);
            tree = { segs: segs, tips: tips, baseX: baseX, baseY: baseY };
        }

        class LeafMote {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = -(Math.random() * 0.4 + 0.1);
                this.size = Math.random() * 1.8 + 0.6;
                this.phase = Math.random() * Math.PI * 2;
                this.life = Math.random() * 160 + 100;
                this.maxLife = this.life;
            }

            update() {
                this.phase += 0.03;
                this.x += this.vx + Math.sin(this.phase) * 0.4;
                this.y += this.vy;
                this.life--;
            }

            draw() {
                const alpha = (this.life / this.maxLife) * 0.55;
                if (alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#C8D880';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#A8C060';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawWaveLayer(time, layer) {
            const baseY = height * (0.66 + layer * 0.09);
            const amp = 12 + layer * 8;
            const speed = 0.0004 + layer * 0.00016;
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {
                const y = baseY +
                    Math.sin(x * 0.008 + time * speed + layer * 2) * amp +
                    Math.sin(x * 0.021 - time * speed * 1.6 + layer) * amp * 0.35;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, baseY - amp, 0, height);
            g.addColorStop(0, `rgba(32, 140, 138, ${0.10 + layer * 0.02})`);
            g.addColorStop(1, 'rgba(8, 42, 56, 0.04)');
            ctx.fillStyle = g;
            ctx.fill();

            // Current highlight along the crest
            ctx.save();
            ctx.globalAlpha = 0.10 + 0.04 * Math.sin(time * 0.001 + layer);
            ctx.strokeStyle = '#7FD8D0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 12) {
                const y = baseY +
                    Math.sin(x * 0.008 + time * speed + layer * 2) * amp +
                    Math.sin(x * 0.021 - time * speed * 1.6 + layer) * amp * 0.35;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        function drawTree(time, cycleAlpha) {
            if (!tree) return;
            const sway = Math.sin(time * 0.0005) * 0.025;
            ctx.save();
            ctx.translate(tree.baseX, tree.baseY);
            ctx.rotate(sway);
            ctx.translate(-tree.baseX, -tree.baseY);
            ctx.globalAlpha = cycleAlpha;

            tree.segs.forEach(seg => {
                const progress = Math.min(1, Math.max(0, (cycleFrame - seg.birth) / seg.grow));
                if (progress <= 0) return;
                const ex = seg.x1 + (seg.x2 - seg.x1) * progress;
                const ey = seg.y1 + (seg.y2 - seg.y1) * progress;
                const depthT = seg.depth / 6;
                ctx.strokeStyle = depthT < 0.4 ? '#6A5A38' : '#8A9850';
                ctx.lineWidth = Math.max(0.6, (1 - depthT) * 5);
                ctx.lineCap = 'round';
                ctx.shadowBlur = depthT > 0.6 ? 6 : 0;
                ctx.shadowColor = 'rgba(168, 192, 96, 0.5)';
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            });

            ctx.restore();
        }

        function spawnLeafMotes() {
            if (!tree || leafMotes.length >= LEAF_CAP) return;
            if (cycleFrame < 400 || cycleFrame > FADE_START) return;
            if (Math.random() > 0.35) return;
            const tip = tree.tips[Math.floor(Math.random() * tree.tips.length)];
            if (tip) leafMotes.push(new LeafMote(tip.x, tip.y));
        }

        function cycleAlpha() {
            if (cycleFrame < FADE_START) return 1;
            return Math.max(0, 1 - (cycleFrame - FADE_START) / (CYCLE_LENGTH - FADE_START));
        }

        resizeCanvas();

        window.addEventListener('resize', resizeCanvas);

        function animate(time) {
            cycleFrame++;
            if (cycleFrame >= CYCLE_LENGTH) {
                cycleFrame = 0;
                buildTree();
                leafMotes = [];
            }

            ctx.clearRect(0, 0, width, height);

            for (let layer = 0; layer < 4; layer++) {
                drawWaveLayer(time, layer);
            }

            drawTree(time, cycleAlpha());

            spawnLeafMotes();
            leafMotes = leafMotes.filter(m => m.life > 0);
            leafMotes.forEach(m => { m.update(); m.draw(); });

            if (running) rafId = requestAnimationFrame(animate);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(animate);
            }
        });

        rafId = requestAnimationFrame(animate);
        }
    }

    // ============================
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay, 10) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
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
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    // ============================
    // Navigation
    // ============================
    const nav = document.querySelector('.main-nav');

    window.addEventListener('scroll', () => {
        if (!nav) return;
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }, { passive: true });

    // ============================
    // Smooth Scroll for Anchor Links
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================
    // Mascot Parallax
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    if (heroMascot && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero') || document.querySelector('.hero');
            if (!hero) return;
            const scrollY = window.pageYOffset;
            if (scrollY < hero.offsetTop + hero.offsetHeight) {
                heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

})();
