/**
 * Šw FLAGSHIP TEMPLE — WIND CANVAS & INTERACTIONS
 * Wind currents, air spirals, mist drift, dust motes, feather particles
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Wind Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('wind-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let windCurrents = [];
        let dustMotes = [];
        let mistDrift = [];
        let airSpirals = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class WindCurrent {
            constructor() {
                this.reset();
            }

            reset() {
                this.y = Math.random() * height;
                this.x = Math.random() > 0.5 ? -100 : width + 100;
                this.vx = this.x < 0 ? (Math.random() * 1.5 + 0.5) : -(Math.random() * 1.5 + 0.5);
                this.vy = (Math.random() - 0.5) * 0.3;
                this.length = Math.random() * 300 + 150;
                this.width = Math.random() * 1.5 + 0.5;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.06 + 0.02;
                this.growing = true;
                this.speed = Math.random() * 0.002 + 0.0005;
                this.wavePhase = Math.random() * Math.PI * 2;
                this.waveSpeed = Math.random() * 0.02 + 0.01;
                this.waveAmp = Math.random() * 20 + 10;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.wavePhase += this.waveSpeed;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }

                if (this.x > width + 200 || this.x < -200) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const waveY = Math.sin(this.wavePhase) * this.waveAmp;
                const x1 = this.x;
                const y1 = this.y + waveY;
                const x2 = this.x + (this.vx > 0 ? this.length : -this.length);
                const y2 = this.y + waveY + Math.sin(this.wavePhase + 1) * this.waveAmp;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(
                    (x1 + x2) / 2, 
                    (y1 + y2) / 2 + Math.sin(this.wavePhase + 0.5) * this.waveAmp * 0.5,
                    x2, y2
                );
                ctx.strokeStyle = 'hsla(200, 60%, 75%, 0.5)';
                ctx.lineWidth = this.width;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
        }

        class DustMote {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.3) * 0.4;
                this.vy = -(Math.random() * 0.2 + 0.05);
                this.size = Math.random() * 1.5 + 0.3;
                this.opacity = Math.random() * 0.25 + 0.05;
                this.hue = Math.random() > 0.6 ? 200 : (Math.random() > 0.5 ? 210 : 190);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.15 + 0.08);

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 40%, 70%)`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `hsla(${this.hue}, 40%, 60%, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class MistDrift {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.5 + height * 0.2;
                this.radius = Math.random() * 100 + 50;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0008 + 0.0002;
                this.vx = (Math.random() - 0.5) * 0.2;
            }

            update() {
                this.x += this.vx;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, 'hsla(200, 40%, 70%, 0.3)');
                gradient.addColorStop(0.5, 'hsla(210, 30%, 60%, 0.1)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class AirSpiral {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 40 + 20;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.008 + 0.003);
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.015;
                this.growing = true;
                this.speed = Math.random() * 0.001 + 0.0003;
                this.points = 3 + Math.floor(Math.random() * 3);
            }

            update() {
                this.rotation += this.rotationSpeed;
                this.x += Math.sin(this.rotation) * 0.3;
                this.y += Math.cos(this.rotation) * 0.1;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.strokeStyle = 'hsla(190, 50%, 70%, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < this.points; i++) {
                    const angle = (i / this.points) * Math.PI * 2;
                    const r = this.radius;
                    const cx = Math.cos(angle) * r;
                    const cy = Math.sin(angle) * r;
                    if (i === 0) {
                        ctx.moveTo(cx, cy);
                    } else {
                        ctx.quadraticCurveTo(
                            Math.cos(angle - 0.5) * r * 0.5,
                            Math.sin(angle - 0.5) * r * 0.5,
                            cx, cy
                        );
                    }
                }
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 12; i++) {
            windCurrents.push(new WindCurrent());
        }
        for (let i = 0; i < 60; i++) {
            dustMotes.push(new DustMote());
        }
        for (let i = 0; i < 8; i++) {
            mistDrift.push(new MistDrift());
        }
        for (let i = 0; i < 4; i++) {
            airSpirals.push(new AirSpiral());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Subtle atmospheric glow
            const atmX = width * 0.5;
            const atmY = height * 0.3;
            const atmGrad = ctx.createRadialGradient(atmX, atmY, 0, atmX, atmY, Math.min(width, height) * 0.4);
            atmGrad.addColorStop(0, 'hsla(200, 40%, 50%, 0.025)');
            atmGrad.addColorStop(0.5, 'hsla(210, 30%, 40%, 0.01)');
            atmGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = atmGrad;
            ctx.fillRect(0, 0, width, height);

            // Wind currents
            windCurrents.forEach(r => { r.update(); r.draw(); });

            // Mist drift
            mistDrift.forEach(m => { m.update(); m.draw(); });

            // Air spirals
            airSpirals.forEach(a => { a.update(); a.draw(); });

            // Dust motes
            dustMotes.forEach(d => { d.update(); d.draw(); });

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
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();
