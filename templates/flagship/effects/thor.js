/**
 * ÞÓRR FLAGSHIP TEMPLE — STORM CANVAS & INTERACTIONS
 * Lightning/rain/storm cloud animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Storm Canvas ─────────────────────────────────────────────────────── */
    const canvas = document.getElementById('storm-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let rain = [];
        let lightningBolts = [];
        let stormClouds = [];
        let sparks = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class RainDrop {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * -100;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = Math.random() * 8 + 12;
                this.length = Math.random() * 15 + 8;
                this.opacity = Math.random() * 0.3 + 0.1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.y > height + 20) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.vx, this.y + this.length);
                ctx.strokeStyle = '#8A9AAA';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }

        class LightningBolt {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.cooldown = Math.random() * 200 + 100;
                this.segments = [];
                this.opacity = 0;
                this.flashOpacity = 0;
            }

            trigger() {
                this.active = true;
                this.opacity = 1;
                this.flashOpacity = 0.15;
                this.segments = [];
                let x = Math.random() * width;
                let y = 0;
                const targetY = Math.random() * height * 0.6 + height * 0.2;
                
                while (y < targetY) {
                    const nextX = x + (Math.random() - 0.5) * 60;
                    const nextY = y + Math.random() * 30 + 15;
                    this.segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
                    x = nextX;
                    y = nextY;
                    
                    // Branch occasionally
                    if (Math.random() < 0.2) {
                        let bx = x;
                        let by = y;
                        for (let i = 0; i < 3; i++) {
                            const bnx = bx + (Math.random() - 0.5) * 40;
                            const bny = by + Math.random() * 20 + 10;
                            this.segments.push({ x1: bx, y1: by, x2: bnx, y2: bny, branch: true });
                            bx = bnx;
                            by = bny;
                        }
                    }
                }
            }

            update() {
                if (!this.active) {
                    this.cooldown--;
                    if (this.cooldown <= 0) {
                        this.trigger();
                    }
                    return;
                }

                this.opacity -= 0.08;
                this.flashOpacity -= 0.02;

                if (this.opacity <= 0) {
                    this.active = false;
                    this.cooldown = Math.random() * 250 + 150;
                }
            }

            draw() {
                if (!this.active) return;
                
                // Flash effect
                if (this.flashOpacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = this.flashOpacity;
                    ctx.fillStyle = '#C8D8E8';
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                }

                // Bolt
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.strokeStyle = '#E8E8F0';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#C8B858';
                
                this.segments.forEach(seg => {
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.lineWidth = seg.branch ? 1 : 2.5;
                    ctx.stroke();
                });
                ctx.restore();
            }
        }

        class StormCloud {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height * 0.3;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.radius = Math.random() * 100 + 60;
                this.opacity = Math.random() * 0.06 + 0.02;
                this.life = Math.random() * 600 + 300;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.05;

                if (this.life <= 0 || this.x < -150 || this.x > width + 150) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, 'hsla(210, 10%, 25%, 0.5)');
                gradient.addColorStop(0.5, 'hsla(210, 8%, 20%, 0.2)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Spark {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.8 + 0.2;
                this.life = Math.random() * 30 + 10;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.1;
                this.life--;
                this.opacity = (this.life / 40) * 0.6;
            }

            draw() {
                if (this.life <= 0 || this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#C8B858';
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#C8B858';
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 120; i++) {
            rain.push(new RainDrop());
        }
        for (let i = 0; i < 3; i++) {
            lightningBolts.push(new LightningBolt());
        }
        for (let i = 0; i < 6; i++) {
            stormClouds.push(new StormCloud());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Dark storm background glow
            const stormGrad = ctx.createRadialGradient(width / 2, 0, 0, width / 2, height * 0.3, Math.min(width, height) * 0.5);
            stormGrad.addColorStop(0, 'hsla(210, 15%, 15%, 0.04)');
            stormGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = stormGrad;
            ctx.fillRect(0, 0, width, height);

            // Storm clouds
            stormClouds.forEach(c => { c.update(); c.draw(); });

            // Rain
            rain.forEach(r => { r.update(); r.draw(); });

            // Lightning
            lightningBolts.forEach(b => { b.update(); b.draw(); });

            // Sparks from lightning
            lightningBolts.forEach(b => {
                if (b.active && b.opacity > 0.5) {
                    for (let i = 0; i < 3; i++) {
                        const seg = b.segments[b.segments.length - 1];
                        if (seg) {
                            sparks.push(new Spark(seg.x2, seg.y2));
                        }
                    }
                }
            });

            sparks = sparks.filter(s => s.life > 0);
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
