/**
 * PÚNYCODEX — Homepage JavaScript (Performance Optimized)
 * Multi-layer cosmic hero, constellation pantheon, scroll journey
 */

(function() {
    'use strict';

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ═══════════════════════════════════════════════════════════
    // MULTI-LAYER COSMIC HERO
    // ═══════════════════════════════════════════════════════════

    const canvas = document.getElementById('hero-canvas');
    if (canvas && !prefersReducedMotion) {
        const ctx = canvas.getContext('2d');
        let animationId;
        let isActive = true;
        let width, height;
        let mouse = { x: null, y: null, vx: 0, vy: 0 };
        let time = 0;

        // Layers
        const stars = [];
        const particles = [];
        const nebulaClouds = [];
        let shootingStars = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Re-cache nebula clouds on resize
            nebulaClouds.forEach(c => c.cache());
        }
        resize();

        // Debounced resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resize, 150);
        });

        // Mouse tracking — no getBoundingClientRect, canvas fills viewport
        let lastMouseX = null, lastMouseY = null;
        canvas.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            if (lastMouseX !== null) {
                mouse.vx = (x - lastMouseX) * 0.1;
                mouse.vy = (y - lastMouseY) * 0.1;
            }
            mouse.x = x;
            mouse.y = y;
            lastMouseX = x;
            lastMouseY = y;
        });

        canvas.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
            lastMouseX = null;
            lastMouseY = null;
        });

        // ─── NEBULA LAYER (cached to offscreen canvas) ───
        class NebulaCloud {
            constructor() {
                this.cacheCanvas = document.createElement('canvas');
                this.cacheCtx = this.cacheCanvas.getContext('2d');
                this.reset();
                this.cache();
            }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 300 + 200;
                this.vx = (Math.random() - 0.5) * 0.1;
                this.vy = (Math.random() - 0.5) * 0.05;
                this.hue = Math.random() * 20 + 35;
                this.sat = Math.random() * 30 + 20;
                this.light = Math.random() * 10 + 5;
                this.alpha = Math.random() * 0.03 + 0.01;
                this.pulseSpeed = Math.random() * 0.001 + 0.0005;
                this.pulseOffset = Math.random() * Math.PI * 2;
            }
            cache() {
                // Pre-render the radial gradient to an offscreen canvas
                const r = Math.ceil(this.radius);
                this.cacheCanvas.width = r * 2;
                this.cacheCanvas.height = r * 2;
                const c = this.cacheCtx;
                const grad = c.createRadialGradient(r, r, 0, r, r, r);
                grad.addColorStop(0, `hsla(${this.hue}, ${this.sat}%, ${this.light}%, 1)`);
                grad.addColorStop(0.5, `hsla(${this.hue}, ${this.sat}%, ${this.light}%, 0.5)`);
                grad.addColorStop(1, `hsla(${this.hue}, ${this.sat}%, ${this.light}%, 0)`);
                c.fillStyle = grad;
                c.fillRect(0, 0, r * 2, r * 2);
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < -this.radius) this.x = width + this.radius;
                if (this.x > width + this.radius) this.x = -this.radius;
                if (this.y < -this.radius) this.y = height + this.radius;
                if (this.y > height + this.radius) this.y = -this.radius;
            }
            draw(ctx) {
                const pulse = Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.5 + 0.5;
                const alpha = this.alpha * (0.5 + pulse * 0.5);
                ctx.globalAlpha = alpha;
                ctx.drawImage(this.cacheCanvas, this.x - this.radius, this.y - this.radius);
                ctx.globalAlpha = 1;
            }
        }

        for (let i = 0; i < 4; i++) {
            nebulaClouds.push(new NebulaCloud());
        }

        // ─── STARFIELD LAYER ───
        class Star {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 2 + 0.5;
                this.size = Math.random() * 1.5 + 0.3;
                this.baseAlpha = Math.random() * 0.6 + 0.2;
                this.twinkleSpeed = Math.random() * 0.003 + 0.001;
                this.twinkleOffset = Math.random() * Math.PI * 2;
                this.color = Math.random() < 0.9 ? [212, 175, 55] : [200, 200, 220];
            }
            update() {
                if (mouse.x !== null) {
                    const parallaxStrength = 0.02 * this.z;
                    this.x += (width / 2 - mouse.x) * parallaxStrength * 0.01;
                    this.y += (height / 2 - mouse.y) * parallaxStrength * 0.01;
                }
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
            draw(ctx) {
                const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.5 + 0.5;
                const alpha = this.baseAlpha * (0.6 + twinkle * 0.4);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * this.z, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha})`;
                ctx.fill();
                if (this.baseAlpha > 0.6 && twinkle > 0.7) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size * this.z * 4, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha * 0.1})`;
                    ctx.fill();
                }
            }
        }

        const starCount = isTouchDevice ? 50 : 100;
        for (let i = 0; i < starCount; i++) {
            stars.push(new Star());
        }

        // ─── PARTICLE LAYER ───
        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.size = Math.random() * 2 + 0.5;
                this.baseAlpha = Math.random() * 0.5 + 0.3;
                this.flickerSpeed = Math.random() * 0.02 + 0.005;
                this.flickerOffset = Math.random() * Math.PI * 2;
                this.isGold = Math.random() < 0.85;
            }
            update() {
                this.vx += Math.sin(time * 0.0005 + this.flickerOffset) * 0.0005;
                this.vy += Math.cos(time * 0.0005 + this.flickerOffset * 1.3) * 0.0005;

                if (mouse.x !== null && mouse.y !== null && this.isGold) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 90000 && distSq > 100) {
                        const dist = Math.sqrt(distSq);
                        const force = (300 - dist) / 300 * 0.02;
                        this.vx += (dx / dist) * force;
                        this.vy += (dy / dist) * force;
                    }
                }

                this.vx *= 0.99;
                this.vy *= 0.99;
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
            draw(ctx) {
                const flicker = Math.sin(time * this.flickerSpeed + this.flickerOffset) * 0.3 + 0.7;
                const alpha = this.baseAlpha * flicker;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                if (this.isGold) {
                    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
                } else {
                    ctx.fillStyle = `rgba(180, 180, 200, ${alpha * 0.5})`;
                }
                ctx.fill();
            }
        }

        const particleCount = isTouchDevice ? 30 : 50;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // ─── SHOOTING STARS ───
        class ShootingStar {
            constructor() {
                this.reset(true);
            }
            reset(initial = false) {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5;
                this.length = Math.random() * 80 + 40;
                this.speed = Math.random() * 8 + 4;
                this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
                this.alpha = 0;
                this.life = 0;
                this.maxLife = Math.random() * 60 + 30;
                this.active = false;
                this.nextSpawn = initial ? Math.random() * 300 : time + Math.random() * 600 + 300;
            }
            update() {
                if (!this.active) {
                    if (time > this.nextSpawn) {
                        this.active = true;
                        this.life = 0;
                        this.alpha = 1;
                    }
                    return;
                }
                this.x += this.vx;
                this.y += this.vy;
                this.life++;
                if (this.life < 10) {
                    this.alpha = this.life / 10;
                } else if (this.life > this.maxLife - 15) {
                    this.alpha = (this.maxLife - this.life) / 15;
                }
                if (this.life >= this.maxLife || this.x > width + this.length || this.y > height + this.length) {
                    this.active = false;
                    this.nextSpawn = time + Math.random() * 800 + 400;
                }
            }
            draw(ctx) {
                if (!this.active) return;
                const tailX = this.x - this.vx * (this.length / this.speed);
                const tailY = this.y - this.vy * (this.length / this.speed);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `rgba(212, 175, 55, ${this.alpha * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < 2; i++) {
            shootingStars.push(new ShootingStar());
        }

        // ─── CONSTELLATION LINES (optimized: only nearest neighbors) ───
        function drawConstellations(ctx) {
            const connectionDist = 150;
            const maxConnections = 2;
            const goldParticles = particles.filter(p => p.isGold);

            for (let i = 0; i < goldParticles.length; i++) {
                let connections = 0;
                // Only check next 15 neighbors to limit O(n²)
                const checkLimit = Math.min(i + 15, goldParticles.length);
                for (let j = i + 1; j < checkLimit; j++) {
                    const dx = goldParticles[i].x - goldParticles[j].x;
                    const dy = goldParticles[i].y - goldParticles[j].y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < connectionDist * connectionDist) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / connectionDist) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(goldParticles[i].x, goldParticles[i].y);
                        ctx.lineTo(goldParticles[j].x, goldParticles[j].y);
                        ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                        connections++;
                        if (connections >= maxConnections) break;
                    }
                }
            }
        }

        // ─── MAIN ANIMATION LOOP ───
        let frameCount = 0;
        function animate(timestamp) {
            if (!isActive) return;
            time = timestamp;
            frameCount++;

            ctx.clearRect(0, 0, width, height);

            nebulaClouds.forEach(cloud => {
                cloud.update();
                cloud.draw(ctx);
            });

            stars.forEach(star => {
                star.update();
                star.draw(ctx);
            });

            particles.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            // Draw constellations every 2nd frame to save GPU
            if (frameCount % 2 === 0) {
                drawConstellations(ctx);
            }

            shootingStars.forEach(s => {
                s.update();
                s.draw(ctx);
            });

            mouse.vx *= 0.9;
            mouse.vy *= 0.9;

            animationId = requestAnimationFrame(animate);
        }

        animate(0);

        // Pause when tab hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isActive = false;
                cancelAnimationFrame(animationId);
            } else if (canvas.getBoundingClientRect().bottom > 0) {
                isActive = true;
                animate(0);
            }
        });

        // Pause when scrolled past hero (IntersectionObserver)
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isActive) {
                    isActive = true;
                    animate(0);
                } else if (!entry.isIntersecting && isActive) {
                    isActive = false;
                    cancelAnimationFrame(animationId);
                }
            });
        }, { threshold: 0 });
        heroObserver.observe(canvas);
    }

    // ═══════════════════════════════════════════════════════════
    // PANTHEON GRID RENDERING
    // ═══════════════════════════════════════════════════════════

    function renderPantheonGrid() {
        const grid = document.getElementById('pantheon-grid');
        if (!grid || typeof ARCHETYPES === 'undefined') return;

        const sorted = [...ARCHETYPES].sort((a, b) => {
            if (a.built !== b.built) return b.built - a.built;
            return a.name.localeCompare(b.name);
        });

        grid.innerHTML = sorted.map((a, index) => {
            const url = getArchetypeUrl(a);
            const tag = url ? 'a' : 'div';
            const hrefAttr = url ? `href="${url}"` : '';
            const unbuiltClass = !a.built ? 'unbuilt' : '';
            const tierClass = a.tier === 'dual-tier' ? 'dual-tier' : a.tier;
            const badgeText = !a.built ? 'Awaiting' : a.tier === 'tier-1' ? 'Tier 1' : a.tier === 'tier-2' ? 'Tier 2' : 'Dual-Tier';

            return `
                <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" style="--stagger-index:${index % 6}">
                    <div class="card-portrait">
                        <img src="${a.mascotPath}" alt="${a.name} — ${a.domain}" loading="lazy" onerror="this.style.opacity='0'; this.parentElement.style.background='linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)'; this.parentElement.style.backgroundSize='200% 100%'; this.parentElement.style.animation='skeletonShimmer 1.5s infinite';">
                    </div>
                    <p class="card-name">${a.name}</p>
                    <p class="card-greek">${a.greek}</p>
                    <p class="card-domain">${a.domain}</p>
                    <span class="card-badge ${tierClass}">${badgeText}</span>
                </${tag}>
            `;
        }).join('');

        if (typeof revealObserver !== 'undefined') {
            grid.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderPantheonGrid);
    } else {
        renderPantheonGrid();
    }

    // ═══════════════════════════════════════════════════════════
    // STAT NUMBER ANIMATION
    // ═══════════════════════════════════════════════════════════

    function initStatAnimation() {
        const statsSection = document.querySelector('.origin-stats');
        if (!statsSection) return;

        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statsSection.querySelectorAll('.stat-number').forEach(el => {
                        const target = parseInt(el.dataset.count, 10);
                        if (target && !el.classList.contains('animated')) {
                            el.classList.add('animated');
                            if (window.PX && window.PX.animateNumber) {
                                window.PX.animateNumber(el, target, 2500);
                            } else {
                                el.textContent = target;
                            }
                        }
                    });
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        statObserver.observe(statsSection);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStatAnimation);
    } else {
        initStatAnimation();
    }

    // ═══════════════════════════════════════════════════════════
    // HERO PARALLAX ON SCROLL (throttled via rAF)
    // ═══════════════════════════════════════════════════════════

    const heroContent = document.querySelector('.hero-content');
    const heroCanvas = document.getElementById('hero-canvas');

    if (heroContent && !prefersReducedMotion) {
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const heroHeight = window.innerHeight;
                    const progress = Math.min(scrollY / heroHeight, 1);
                    heroContent.style.opacity = 1 - progress * 1.5;
                    heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
                    if (heroCanvas) {
                        heroCanvas.style.transform = `translateY(${scrollY * 0.1}px)`;
                    }
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════
    // AMBIENT PARTICLES FOR SECTIONS (paused when off-screen)
    // ═══════════════════════════════════════════════════════════

    function initAmbientParticles(container) {
        if (!container || prefersReducedMotion || isTouchDevice) return;

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let w, h;
        const dust = [];
        let animating = false;
        let rafId = null;

        function resize() {
            const rect = container.getBoundingClientRect();
            w = canvas.width = rect.width;
            h = canvas.height = rect.height;
        }
        resize();

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        for (let i = 0; i < 20; i++) {
            dust.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 2 + 0.5,
                speedY: -(Math.random() * 0.3 + 0.1),
                speedX: (Math.random() - 0.5) * 0.2,
                alpha: Math.random() * 0.2 + 0.05,
                flicker: Math.random() * 0.02 + 0.005
            });
        }

        let frame = 0;
        function animate() {
            if (!animating) return;
            frame++;
            if (frame % 2 !== 0) {
                rafId = requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, w, h);
            dust.forEach(d => {
                d.y += d.speedY;
                d.x += d.speedX;
                const flicker = Math.sin(frame * d.flicker) * 0.5 + 0.5;
                if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
                if (d.x < -10) d.x = w + 10;
                if (d.x > w + 10) d.x = -10;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${d.alpha * flicker})`;
                ctx.fill();
            });
            rafId = requestAnimationFrame(animate);
        }

        // IntersectionObserver to pause/resume
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animating = true;
                    if (!rafId) animate();
                } else {
                    animating = false;
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = null;
                    }
                }
            });
        }, { threshold: 0.05 });

        visibilityObserver.observe(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.ambient-particles').forEach(initAmbientParticles);
        });
    } else {
        document.querySelectorAll('.ambient-particles').forEach(initAmbientParticles);
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTELLATION SVG OVERLAY FOR PANTHEON — cached, throttled
    // ═══════════════════════════════════════════════════════════

    function initConstellationOverlay() {
        const section = document.querySelector('.section-pantheon');
        if (!section || typeof ARCHETYPES === 'undefined') return;

        const overlay = document.createElement('div');
        overlay.className = 'constellation-overlay';
        section.insertBefore(overlay, section.firstChild);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('preserveAspectRatio', 'none');
        overlay.appendChild(svg);

        let lineElements = [];
        let cardPositions = [];

        function cacheCardPositions() {
            const rect = section.getBoundingClientRect();
            const cards = section.querySelectorAll('.archetype-card');
            cardPositions = [];
            cards.forEach((card, i) => {
                const cr = card.getBoundingClientRect();
                cardPositions.push({
                    x: cr.left - rect.left + cr.width / 2,
                    y: cr.top - rect.top + cr.height / 2,
                    pantheon: ARCHETYPES[i] ? ARCHETYPES[i].pantheon : null
                });
            });
        }

        function drawLines() {
            const rect = section.getBoundingClientRect();
            svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

            // Remove old lines
            lineElements.forEach(line => line.remove());
            lineElements = [];

            if (cardPositions.length === 0) cacheCardPositions();

            const pantheonGroups = {};
            cardPositions.forEach(pos => {
                if (!pos.pantheon) return;
                if (!pantheonGroups[pos.pantheon]) pantheonGroups[pos.pantheon] = [];
                pantheonGroups[pos.pantheon].push({ x: pos.x, y: pos.y });
            });

            Object.values(pantheonGroups).forEach(group => {
                if (group.length < 2) return;
                for (let i = 0; i < group.length - 1; i++) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', group[i].x);
                    line.setAttribute('y1', group[i].y);
                    line.setAttribute('x2', group[i + 1].x);
                    line.setAttribute('y2', group[i + 1].y);
                    line.setAttribute('stroke', 'rgba(212, 175, 55, 0.08)');
                    line.setAttribute('stroke-width', '1');
                    svg.appendChild(line);
                    lineElements.push(line);
                }
            });
        }

        setTimeout(() => { cacheCardPositions(); drawLines(); }, 600);
        const debounce = window.PX && window.PX.debounce ? window.PX.debounce : function(fn, d) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }; };
        window.addEventListener('resize', debounce(() => { cacheCardPositions(); drawLines(); }, 500));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConstellationOverlay);
    } else {
        setTimeout(initConstellationOverlay, 500);
    }

})();
