/**
 * MUSPELLHEIMR — Realm of Fire
 * Legendary Canvas: Rising embers, fire sparks, heat shimmer, volcanic ash, flame bursts
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Legendary Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('mist-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let embers = [];
        let sparks = [];
        let ashParticles = [];
        let heatWaves = [];
        let flameBursts = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Ember {
            constructor() {
                this.reset();
            }

            reset(randomY = false) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 10;
                this.baseX = this.x;
                this.size = 1 + Math.random() * 3;
                this.speedY = -(Math.random() * 0.8 + 0.3);
                this.waveSpeed = 0.005 + Math.random() * 0.01;
                this.wavePhase = Math.random() * Math.PI * 2;
                this.opacity = Math.random() * 0.6 + 0.3;
                this.pulse = Math.random() * Math.PI * 2;
                this.hue = 10 + Math.random() * 35;
                this.saturation = 70 + Math.random() * 30;
                this.life = Math.random() * 600 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.wavePhase += this.waveSpeed;
                this.x = this.baseX + Math.sin(this.wavePhase) * 20 + Math.sin(this.wavePhase * 1.3) * 10;
                this.y += this.speedY;
                this.pulse += 0.04;
                this.life--;
                const lifeRatio = this.life / this.maxLife;
                this.opacity = lifeRatio * (0.4 + Math.sin(this.pulse) * 0.2);

                if (this.life <= 0 || this.y < -20) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 65%, 1)`);
                gradient.addColorStop(0.5, `hsla(${this.hue + 5}, ${this.saturation - 10}%, 50%, 0.6)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${this.hue}, ${this.saturation}%, 50%, 0.5)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class FireSpark {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height - Math.random() * 60;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -(Math.random() * 4 + 2);
                this.size = 0.5 + Math.random() * 1.5;
                this.opacity = Math.random() * 0.8 + 0.4;
                this.life = Math.random() * 40 + 20;
                this.maxLife = this.life;
                this.hue = 15 + Math.random() * 30;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy *= 0.98;
                this.vx *= 0.99;
                this.life--;
                const lifeRatio = this.life / this.maxLife;
                this.opacity = lifeRatio * 0.8;

                if (this.life <= 0 || this.y < -10) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = `hsla(${this.hue}, 90%, 70%, 1)`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 0.8)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Spark trail
                ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, ${this.opacity * 0.5})`;
                ctx.lineWidth = this.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
                ctx.stroke();
                ctx.restore();
            }
        }

        class AshParticle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.15 + 0.05);
                this.size = 1 + Math.random() * 2.5;
                this.opacity = Math.random() * 0.15 + 0.05;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotSpeed = (Math.random() - 0.5) * 0.02;
                this.life = Math.random() * 1000 + 800;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotSpeed;
                this.life--;
                const lifeRatio = this.life / this.maxLife;
                this.opacity = lifeRatio * 0.15;

                if (this.life <= 0 || this.y < -20) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = 'hsla(20, 8%, 35%, 0.7)';
                ctx.shadowBlur = 2;
                ctx.shadowColor = 'hsla(20, 5%, 25%, 0.3)';

                // Irregular ash shape
                ctx.beginPath();
                ctx.moveTo(-this.size, 0);
                ctx.lineTo(0, -this.size * 0.6);
                ctx.lineTo(this.size, 0);
                ctx.lineTo(0, this.size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        class HeatWave {
            constructor() {
                this.reset();
            }

            reset() {
                this.yOffset = Math.random() * height * 0.6;
                this.speed = 0.0003 + Math.random() * 0.0004;
                this.phase = Math.random() * Math.PI * 2;
                this.opacity = Math.random() * 0.015 + 0.005;
                this.width = 100 + Math.random() * 200;
            }

            update() {
                this.phase += this.speed;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createLinearGradient(0, this.yOffset, 0, this.yOffset + 100);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.5, 'hsla(15, 60%, 55%, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;

                ctx.beginPath();
                for (let x = 0; x <= width; x += 60) {
                    const y = this.yOffset + Math.sin(x * 0.004 + this.phase) * 15 + Math.sin(x * 0.008 + this.phase * 1.5) * 8;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineTo(width, this.yOffset + 80);
                ctx.lineTo(0, this.yOffset + 80);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        class FlameBurst {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = height - Math.random() * 40;
                this.size = 0;
                this.maxSize = 15 + Math.random() * 25;
                this.opacity = 0;
                this.state = 'growing';
                this.hue = 10 + Math.random() * 25;
            }

            update() {
                if (this.state === 'growing') {
                    this.size += 0.5;
                    this.opacity += 0.02;
                    if (this.size >= this.maxSize) this.state = 'fading';
                } else if (this.state === 'fading') {
                    this.size += 0.1;
                    this.opacity -= 0.015;
                }

                if (this.opacity <= 0 && this.state === 'fading') {
                    this.reset();
                    // Random chance to stay dormant
                    if (Math.random() < 0.7) {
                        this.size = 0;
                        this.opacity = 0;
                        this.state = 'dormant';
                    }
                }
            }

            draw() {
                if (this.opacity <= 0 || this.size <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
                gradient.addColorStop(0, `hsla(${this.hue + 10}, 90%, 70%, 0.8)`);
                gradient.addColorStop(0.4, `hsla(${this.hue}, 80%, 55%, 0.4)`);
                gradient.addColorStop(1, `hsla(${this.hue - 10}, 70%, 40%, 0)`);
                ctx.fillStyle = gradient;
                ctx.shadowBlur = 20;
                ctx.shadowColor = `hsla(${this.hue}, 80%, 50%, 0.5)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();

        // Embers
        for (let i = 0; i < 60; i++) {
            const ember = new Ember();
            ember.y = Math.random() * height;
            embers.push(ember);
        }

        // Fire sparks
        for (let i = 0; i < 25; i++) {
            sparks.push(new FireSpark());
        }

        // Ash particles
        for (let i = 0; i < 30; i++) {
            ashParticles.push(new AshParticle());
        }

        // Heat waves
        for (let i = 0; i < 6; i++) {
            heatWaves.push(new HeatWave());
        }

        // Flame bursts
        for (let i = 0; i < 5; i++) {
            flameBursts.push(new FlameBurst());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep background glow — warm fire from below
            const bottomGrad = ctx.createRadialGradient(
                width / 2, height, 0,
                width / 2, height, Math.min(width, height) * 0.7
            );
            bottomGrad.addColorStop(0, 'hsla(12, 50%, 15%, 0.1)');
            bottomGrad.addColorStop(0.5, 'hsla(15, 40%, 10%, 0.05)');
            bottomGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(0, 0, width, height);

            // Heat shimmer waves
            heatWaves.forEach(w => { w.update(); w.draw(); });

            // Ash particles
            ashParticles.forEach(a => { a.update(); a.draw(); });

            // Flame bursts at bottom
            flameBursts.forEach(f => { f.update(); f.draw(); });

            // Embers
            embers.forEach(e => { e.update(); e.draw(); });

            // Fire sparks
            sparks.forEach(s => { s.update(); s.draw(); });

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
                    }, parseInt(delay));
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
    const nav = document.getElementById('main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
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
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

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
                    const translateY = scrollY * 0.12;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();
