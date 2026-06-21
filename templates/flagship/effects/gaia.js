/**
 * GAÎA — Earth, Mother of All
 * Interactive Layer: Organic Roots, Falling Leaves, Pollen, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Organic System
    // ============================
    const canvas = document.getElementById('roots-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let roots = [];
    let leaves = [];
    let pollen = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Helper: Random range
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Helper: Quadratic bezier point
    function bezierPoint(t, p0, p1, p2) {
        const mt = 1 - t;
        return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
    }

    // ---- Root System ----
    class Root {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = height + rand(10, 50);
            this.targetY = rand(height * 0.2, height * 0.7);
            this.progress = 0;
            this.speed = rand(0.0015, 0.004);
            this.maxWidth = rand(0.5, 2.5);
            this.width = this.maxWidth;
            this.color = this.pickColor();
            // Bezier control point for organic curve
            this.cpX = this.x + rand(-120, 120);
            this.cpY = (this.y + this.targetY) * 0.5 + rand(-80, 40);
            this.branches = [];
            this.branchChance = rand(0.3, 0.6);
            this.finished = false;
            this.opacity = rand(0.15, 0.45);
            this.segments = [];
            this.generatePath();
        }

        pickColor() {
            const colors = [
                { r: 61, g: 107, b: 61 },    // moss
                { r: 93, g: 58, b: 30 },      // brown
                { r: 74, g: 154, b: 74 },     // life green
                { r: 26, g: 58, b: 26 },      // forest
                { r: 139, g: 115, b: 85 },    // gold-dim
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        generatePath() {
            this.segments = [];
            const steps = 40;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const bx = bezierPoint(t, this.x, this.cpX, this.x + rand(-20, 20));
                const by = bezierPoint(t, this.y, this.cpY, this.targetY);
                // Add organic jitter
                const jitterX = Math.sin(t * Math.PI * 3 + this.x) * rand(-3, 3);
                this.segments.push({
                    x: bx + jitterX,
                    y: by
                });
            }
        }

        update() {
            if (this.finished) return false;

            this.progress += this.speed;

            // Spawn branches
            if (this.progress > 0.3 && this.progress < 0.8 && this.branches.length < 3 && Math.random() < this.branchChance * 0.02) {
                const idx = Math.floor(this.progress * this.segments.length);
                const seg = this.segments[Math.min(idx, this.segments.length - 1)];
                this.branches.push({
                    x: seg.x,
                    y: seg.y,
                    angle: rand(-Math.PI * 0.4, Math.PI * 0.4) - Math.PI * 0.5,
                    length: rand(20, 60),
                    progress: 0,
                    speed: rand(0.02, 0.05),
                    width: this.maxWidth * rand(0.3, 0.6),
                    color: this.color,
                    points: []
                });
            }

            // Update branches
            this.branches.forEach(branch => {
                if (branch.progress < 1) {
                    branch.progress += branch.speed;
                    const currentLen = branch.length * branch.progress;
                    const endX = branch.x + Math.cos(branch.angle) * currentLen;
                    const endY = branch.y + Math.sin(branch.angle) * currentLen;
                    branch.points = [
                        { x: branch.x, y: branch.y },
                        { x: branch.x + Math.cos(branch.angle + rand(-0.2, 0.2)) * currentLen * 0.5, y: branch.y + Math.sin(branch.angle + rand(-0.2, 0.2)) * currentLen * 0.5 },
                        { x: endX, y: endY }
                    ];
                }
            });

            if (this.progress >= 1) {
                this.finished = true;
                this.fadeOut = 1;
            }
            return true;
        }

        draw(ctx) {
            if (this.segments.length < 2) return;

            const fade = this.finished ? Math.max(0, this.fadeOut -= 0.003) : 1;
            if (fade <= 0) return;

            const alpha = this.opacity * fade;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw main root with tapering width
            const visibleSteps = Math.floor(this.progress * this.segments.length);
            for (let i = 1; i < Math.min(visibleSteps + 1, this.segments.length); i++) {
                const t = i / this.segments.length;
                const w = this.maxWidth * (1 - t * 0.6);
                ctx.lineWidth = w;
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * (1 - t * 0.3)})`;
                ctx.beginPath();
                ctx.moveTo(this.segments[i - 1].x, this.segments[i - 1].y);
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
                ctx.stroke();
            }

            // Draw branches
            this.branches.forEach(branch => {
                if (branch.points.length < 2) return;
                ctx.lineWidth = branch.width;
                ctx.strokeStyle = `rgba(${branch.color.r}, ${branch.color.g}, ${branch.color.b}, ${alpha * 0.7})`;
                ctx.beginPath();
                ctx.moveTo(branch.points[0].x, branch.points[0].y);
                for (let i = 1; i < branch.points.length; i++) {
                    ctx.lineTo(branch.points[i].x, branch.points[i].y);
                }
                ctx.stroke();
            });

            ctx.restore();
        }
    }

    // ---- Leaf System ----
    class Leaf {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = rand(-50, -10);
            this.size = rand(3, 8);
            this.speedY = rand(0.3, 1.2);
            this.speedX = rand(-0.5, 0.5);
            this.rotation = rand(0, Math.PI * 2);
            this.rotSpeed = rand(-0.03, 0.03);
            this.sway = rand(0, Math.PI * 2);
            this.swaySpeed = rand(0.01, 0.03);
            this.color = this.pickColor();
            this.opacity = rand(0.2, 0.5);
            this.shape = Math.random() > 0.5 ? 'oval' : 'pointed';
        }

        pickColor() {
            const colors = [
                { r: 74, g: 154, b: 74 },
                { r: 61, g: 107, b: 61 },
                { r: 107, g: 142, b: 35 },
                { r: 139, g: 115, b: 85 },
                { r: 212, g: 175, b: 55 },
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y += this.speedY;
            this.sway += this.swaySpeed;
            this.x += this.speedX + Math.sin(this.sway) * 0.8;
            this.rotation += this.rotSpeed;

            if (this.y > height + 20) {
                this.reset();
            }
            return true;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;

            if (this.shape === 'oval') {
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.quadraticCurveTo(this.size * 0.6, 0, 0, this.size);
                ctx.quadraticCurveTo(-this.size * 0.6, 0, 0, -this.size);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ---- Pollen System ----
    class Pollen {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = rand(0, height);
            this.size = rand(0.5, 2);
            this.speedX = rand(-0.3, 0.3);
            this.speedY = rand(-0.2, 0.2);
            this.opacity = rand(0.1, 0.4);
            this.pulse = rand(0, Math.PI * 2);
            this.pulseSpeed = rand(0.02, 0.05);
        }

        update() {
            this.x += this.speedX + Math.sin(this.pulse) * 0.2;
            this.y += this.speedY + Math.cos(this.pulse * 0.7) * 0.15;
            this.pulse += this.pulseSpeed;

            // Wrap around
            if (this.x < -10) this.x = width + 10;
            if (this.x > width + 10) this.x = -10;
            if (this.y < -10) this.y = height + 10;
            if (this.y > height + 10) this.y = -10;

            return true;
        }

        draw(ctx) {
            const flicker = 0.7 + Math.sin(this.pulse) * 0.3;
            ctx.save();
            ctx.globalAlpha = this.opacity * flicker;
            ctx.fillStyle = '#D4AF37';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Initialize particles
    const maxRoots = 12;
    const maxLeaves = 18;
    const maxPollen = 40;

    for (let i = 0; i < maxLeaves; i++) {
        leaves.push(new Leaf());
    }
    for (let i = 0; i < maxPollen; i++) {
        pollen.push(new Pollen());
    }

    function spawnRoot() {
        if (roots.length < maxRoots && Math.random() < 0.03) {
            roots.push(new Root());
        }
    }

    function animateOrganic() {
        ctx.clearRect(0, 0, width, height);

        // Draw and update roots
        roots = roots.filter(root => {
            root.update();
            root.draw(ctx);
            return !root.finished || root.fadeOut > 0;
        });

        spawnRoot();

        // Draw and update leaves
        leaves.forEach(leaf => {
            leaf.update();
            leaf.draw(ctx);
        });

        // Draw and update pollen
        pollen.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        requestAnimationFrame(animateOrganic);
    }

    animateOrganic();

    // ============================
    
    } else {
    }
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

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

    // ============================
    // Navigation
    // ============================
    const nav = document.getElementById('main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // ============================
    // Mouse Follow Glow (Desktop)
    // ============================
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            document.querySelectorAll('.name-card, .domain-card, .myth-content').forEach(card => {
                const rect = card.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    card.style.transform = `translateY(-5px) perspective(1000px) rotateX(${-y * 0.3}deg) rotateY(${x * 0.3}deg)`;
                }
            });
        });
    }

    // ============================
    // Prefers Reduced Motion
    // ============================
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach(el => el.classList.add('revealed'));
        if (canvas) canvas.style.display = 'none';
    }

    // ============================
    // Hide canvas on very small screens
    // ============================
    function checkCanvasVisibility() {
        if (!canvas) return;
        if (window.innerWidth < 360) {
            canvas.style.display = 'none';
        } else if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            canvas.style.display = 'block';
        }
    }

    checkCanvasVisibility();
    window.addEventListener('resize', checkCanvasVisibility);

})();
