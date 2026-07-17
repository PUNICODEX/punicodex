/**
 * PuniCodex — Tier System Page JavaScript v11
 * Simplified: hero counters, scroll reveal, constellation, converter.
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // HERO COUNTERS
    // ═══════════════════════════════════════════════════════════
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number[data-count]');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        counters.forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            if (Number.isNaN(target)) return;

            if (reduced) {
                el.textContent = target.toLocaleString();
                return;
            }

            const duration = 1600;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                el.textContent = Math.round(eased * target).toLocaleString();
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ═══════════════════════════════════════════════════════════
    function initScrollReveal() {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const elements = document.querySelectorAll('.reveal-up, .reveal-hero');

        if (reduced) {
            elements.forEach(el => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        elements.forEach(el => observer.observe(el));

        document.querySelectorAll('.reveal-hero').forEach((el, i) => {
            setTimeout(() => el.classList.add('visible'), i * 100);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // HERO CONSTELLATION CANVAS (lightweight)
    // ═══════════════════════════════════════════════════════════
    function initConstellation() {
        const canvas = document.getElementById('tier-constellation');
        if (!canvas) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return;

        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let rafId = null;
        let isVisible = true;

        const PARTICLE_COUNT = Math.min(40, Math.floor((window.innerWidth || 1200) / 40));
        const CONNECTION_DIST = 110;
        const MAX_CONNECTIONS = 3;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function createParticles() {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.25,
                    vy: (Math.random() - 0.5) * 0.25,
                    radius: Math.random() * 1.5 + 0.5
                });
            }
        }

        function draw() {
            if (!isVisible) return;
            ctx.clearRect(0, 0, width, height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
            });

            ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
            ctx.lineWidth = 0.6;
            for (let i = 0; i < particles.length; i++) {
                let connections = 0;
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        connections++;
                        if (connections >= MAX_CONNECTIONS) break;
                    }
                }
            }

            ctx.fillStyle = 'rgba(212, 175, 55, 0.45)';
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            rafId = requestAnimationFrame(draw);
        }

        function start() {
            resize();
            createParticles();
            if (rafId) cancelAnimationFrame(rafId);
            draw();
        }

        function stop() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && !rafId) draw();
                else if (!isVisible) stop();
            });
        }, { threshold: 0 });

        visibilityObserver.observe(canvas);

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        }, { passive: true });

        start();
    }

    // ═══════════════════════════════════════════════════════════
    // PUNYCODE CONVERTER
    // ═══════════════════════════════════════════════════════════
    function initConverter() {
        const input = document.getElementById('converter-input');
        const btn = document.getElementById('converter-btn');
        const result = document.getElementById('converter-result');
        const resultUnicode = document.getElementById('result-unicode');
        const resultPunycode = document.getElementById('result-punycode');

        if (!input) return;

        function toPunycode(value) {
            let domain = value.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
            domain = domain.split('/')[0];
            if (!domain) return null;
            try {
                const url = new URL('http://' + domain);
                return { unicode: domain, punycode: url.hostname };
            } catch (err) {
                return null;
            }
        }

        function doConvert() {
            const value = input.value.trim();
            if (!value) {
                if (result) result.classList.add('hidden');
                return;
            }

            const converted = toPunycode(value);
            if (!converted) {
                if (result) result.classList.add('hidden');
                return;
            }

            if (resultUnicode) resultUnicode.textContent = converted.unicode;
            if (resultPunycode) resultPunycode.textContent = converted.punycode;
            if (result) result.classList.remove('hidden');
        }

        btn?.addEventListener('click', doConvert);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doConvert();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════
    function init() {
        animateCounters();
        initScrollReveal();
        initConstellation();
        initConverter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
