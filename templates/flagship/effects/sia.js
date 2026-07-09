/**
 * sꜥ FLAGSHIP TEMPLE — MIND CANVAS & INTERACTIONS
 * Swirling vortex patterns, floating geometric shapes,
 * silver data-stream particles, neural network connections, indigo glows
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Mind Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('mind-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let vortexParticles = [];
        let geometries = [];
        let dataStreams = [];
        let neuralNodes = [];
        let neuralConnections = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class VortexParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.radius = Math.random() * 50 + 20;
                this.speed = Math.random() * 0.01 + 0.003;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.4 + 0.1;
                this.growing = true;
                this.size = Math.random() * 1.5 + 0.5;
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.hue = Math.random() > 0.5 ? 260 : 270;
            }

            update() {
                this.centerX = width / 2;
                this.centerY = height / 2;
                this.angle += this.speed;
                this.radius += 0.15;

                if (this.growing) {
                    this.opacity += 0.005;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= 0.003;
                }

                if (this.opacity <= 0 || this.radius > Math.min(width, height) * 0.6) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const x = this.centerX + Math.cos(this.angle) * this.radius;
                const y = this.centerY + Math.sin(this.angle) * this.radius;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 40%, 70%, 0.8)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${this.hue}, 50%, 60%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class Geometry {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 30 + 15;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.005;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.08 + 0.02;
                this.growing = true;
                this.type = Math.floor(Math.random() * 3); // 0=triangle, 1=square, 2=hexagon
                this.hue = Math.random() > 0.6 ? 260 : (Math.random() > 0.5 ? 270 : 250);
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.2;
                this.life = Math.random() * 800 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotSpeed;
                this.life--;

                if (this.growing) {
                    this.opacity += 0.002;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity = (this.life / this.maxLife) * this.targetOpacity;
                }

                if (this.life <= 0 || this.opacity <= 0) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.strokeStyle = `hsla(${this.hue}, 50%, 70%, 0.6)`;
                ctx.lineWidth = 0.8;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `hsla(${this.hue}, 50%, 60%, ${this.opacity * 0.3})`;

                ctx.beginPath();
                if (this.type === 0) {
                    // Triangle
                    for (let i = 0; i < 3; i++) {
                        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
                        const px = Math.cos(a) * this.size;
                        const py = Math.sin(a) * this.size;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                } else if (this.type === 1) {
                    // Square
                    ctx.rect(-this.size, -this.size, this.size * 2, this.size * 2);
                } else {
                    // Hexagon
                    for (let i = 0; i < 6; i++) {
                        const a = (i * Math.PI * 2) / 6;
                        const px = Math.cos(a) * this.size;
                        const py = Math.sin(a) * this.size;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        class DataStream {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                this.length = Math.random() * 40 + 20;
                this.opacity = Math.random() * 0.3 + 0.1;
                this.life = Math.random() * 300 + 200;
                this.maxLife = this.life;
                this.hue = Math.random() > 0.5 ? 260 : 270;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.2 + 0.1);

                if (this.life <= 0 || this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const angle = Math.atan2(this.vy, this.vx);
                const x1 = this.x - Math.cos(angle) * this.length;
                const y1 = this.y - Math.sin(angle) * this.length;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(this.x, this.y);
                ctx.strokeStyle = `hsla(${this.hue}, 30%, 75%, 0.7)`;
                ctx.lineWidth = 1;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `hsla(${this.hue}, 40%, 70%, ${this.opacity * 0.5})`;
                ctx.stroke();
                ctx.restore();
            }
        }

        class NeuralNode {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 1;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.pulsePhase = Math.random() * Math.PI * 2;
                this.pulseSpeed = Math.random() * 0.02 + 0.01;
            }

            update() {
                this.pulsePhase += this.pulseSpeed;
            }

            draw() {
                const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
                ctx.save();
                ctx.globalAlpha = this.opacity * pulse;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(265, 40%, 70%, 0.8)';
                ctx.shadowBlur = 6;
                ctx.shadowColor = `hsla(265, 40%, 60%, ${this.opacity * pulse * 0.4})`;
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 80; i++) {
            vortexParticles.push(new VortexParticle());
        }
        for (let i = 0; i < 12; i++) {
            geometries.push(new Geometry());
        }
        for (let i = 0; i < 40; i++) {
            dataStreams.push(new DataStream());
        }
        for (let i = 0; i < 25; i++) {
            neuralNodes.push(new NeuralNode());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Central indigo glow
            const centerX = width / 2;
            const centerY = height / 2;
            const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * 0.4);
            glowGrad.addColorStop(0, 'hsla(265, 40%, 30%, 0.04)');
            glowGrad.addColorStop(0.5, 'hsla(260, 35%, 25%, 0.015)');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, width, height);

            // Neural connections
            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = 'hsla(265, 30%, 65%, 0.4)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < neuralNodes.length; i++) {
                for (let j = i + 1; j < neuralNodes.length; j++) {
                    const dx = neuralNodes[i].x - neuralNodes[j].x;
                    const dy = neuralNodes[i].y - neuralNodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        ctx.globalAlpha = 0.08 * (1 - dist / 180);
                        ctx.beginPath();
                        ctx.moveTo(neuralNodes[i].x, neuralNodes[i].y);
                        ctx.lineTo(neuralNodes[j].x, neuralNodes[j].y);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();

            // Neural nodes
            neuralNodes.forEach(n => { n.update(); n.draw(); });

            // Vortex particles
            vortexParticles.forEach(p => { p.update(); p.draw(); });

            // Geometries
            geometries.forEach(g => { g.update(); g.draw(); });

            // Data streams
            dataStreams.forEach(d => { d.update(); d.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, parseInt(delay, 10));
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
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            const hero = document.getElementById('hero');
            if (hero) {
                const heroBottom = hero.offsetTop + hero.offsetHeight;
                if (scrollY < heroBottom) {
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();
