/**
 * PUNICODEX — Temple Base Interactions
 * Shared JavaScript for all temple pages (base + flagship).
 * Handles: scroll reveals, navigation, mobile toggle, generic canvas,
 * reduced motion, smooth scroll.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // ============================
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    if (!prefersReducedMotion && revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            // threshold 0: reveal as soon as ANY part of the element enters.
            // A 0.1 threshold can never be reached by elements taller than
            // 10x the viewport (e.g. the 11kpx blog body) — they would stay
            // invisible forever (the 2026-07 blog-blanking bug).
            threshold: 0,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // Instantly reveal all if reduced motion or no elements
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    // ============================
    // Navigation Scroll Effect
    // ============================
    const nav = document.querySelector('.main-nav');

    if (nav) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 100) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ============================
    // Smooth Scroll for Anchors
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ============================
    // Generic Particle Canvas
    // (for base temples without custom canvas)
    // ============================
    const particleCanvas = document.getElementById('particle-canvas');

    if (particleCanvas && !prefersReducedMotion) {
        const ctx = particleCanvas.getContext('2d');
        let width, height;
        let particles = [];
        const PARTICLE_COUNT = 60;

        // Read pantheon colors from CSS variables
        const styles = getComputedStyle(document.documentElement);
        const primaryColor = styles.getPropertyValue('--primary').trim() || '#D4AF37';
        const secondaryColor = styles.getPropertyValue('--secondary').trim() || '#4169E1';

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 212, g: 175, b: 55 };
        }

        const primaryRgb = hexToRgb(primaryColor);
        const secondaryRgb = hexToRgb(secondaryColor);

        function resizeCanvas() {
            width = particleCanvas.width = window.innerWidth;
            height = particleCanvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.isPrimary = Math.random() > 0.5;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x < 0 || this.x > width) this.speedX *= -1;
                if (this.y < 0 || this.y > height) this.speedY *= -1;
            }

            draw() {
                const rgb = this.isPrimary ? primaryRgb : secondaryRgb;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.opacity})`;
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle());
            }
        }

        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        const opacity = (1 - dist / 120) * 0.08;
                        const rgb = particles[i].isPrimary ? primaryRgb : secondaryRgb;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        let frameCount = 0;
        function animateParticles() {
            ctx.clearRect(0, 0, width, height);

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw connections every 2nd frame for performance
            frameCount++;
            if (frameCount % 2 === 0) {
                drawConnections();
            }

            requestAnimationFrame(animateParticles);
        }

        resizeCanvas();
        initParticles();
        animateParticles();

        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });
    }

    // ============================
    // Parallax on Hero Mascot
    // ============================
    const heroMascot = document.querySelector('.mascot-img');
    const heroSection = document.querySelector('.hero');

    if (heroMascot && heroSection && !prefersReducedMotion && !isTouchDevice) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const heroHeight = heroSection.offsetHeight;
                    if (scrollY < heroHeight) {
                        heroMascot.style.transform = `translateY(${scrollY * 0.15}px)`;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ============================
    // Copy to Clipboard Helper
    // ============================
    window.copyToClipboard = function(text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (button) {
                    const original = button.textContent;
                    button.textContent = 'Copied';
                    setTimeout(() => button.textContent = original, 2000);
                }
            });
        } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                if (button) {
                    const original = button.textContent;
                    button.textContent = 'Copied';
                    setTimeout(() => button.textContent = original, 2000);
                }
            } catch (err) {
                console.error('Copy failed:', err);
            }
            document.body.removeChild(textarea);
        }
    };

})();

    // ============================
    // AI-Generated Knowledge Panel
    // ============================
    (function injectAIPanel() {
        const pathMatch = window.location.pathname.match(/\/sites\/([^/]+)\/?/);
        if (!pathMatch) return;
        const entryId = pathMatch[1];

        fetch(`${window.location.origin}/api/entry/${encodeURIComponent(entryId)}`)
            .then(res => res.ok ? res.json() : null)
            .then(entry => {
                if (!entry || !entry.ai_summary) return;

                const section = document.createElement('section');
                section.className = 'ai-panel';
                section.id = 'ai-panel';

                const status = entry.ai_review_status || 'pending';
                const badgeClass = status === 'approved' ? 'approved' : 'pending';
                const badgeText = status === 'approved' ? 'AI reviewed' : 'AI-generated, pending review';

                let cards = '';
                cards += `<div class="ai-card full-width"><div class="ai-card-title">Oracle Summary</div><p class="ai-summary">${linkifyAIData(entry.ai_summary)}</p></div>`;
                if (entry.ai_symbols) {
                    cards += `<div class="ai-card"><div class="ai-card-title">Key Symbols</div><p>${linkifyAIData(entry.ai_symbols)}</p></div>`;
                }
                if (entry.ai_pronunciation) {
                    cards += `<div class="ai-card"><div class="ai-card-title">Pronunciation</div><p>${linkifyAIData(entry.ai_pronunciation)}</p></div>`;
                }
                if (entry.ai_etymology_narrative) {
                    cards += `<div class="ai-card full-width"><div class="ai-card-title">Etymology</div><p>${linkifyAIData(entry.ai_etymology_narrative)}</p></div>`;
                }
                if (entry.ai_relevance_today) {
                    cards += `<div class="ai-card full-width"><div class="ai-card-title">Why This Name Matters Today</div><p>${linkifyAIData(entry.ai_relevance_today)}</p></div>`;
                }

                section.innerHTML = `
                    <div class="ai-panel-header">
                        <h2 class="ai-panel-title">Knowledge Panel</h2>
                        <span class="ai-panel-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="ai-panel-body">
                        ${cards}
                    </div>
                `;

                // Insert before the sources/related sections, or after hero.
                const sourcesSection = document.getElementById('sources') || document.getElementById('etymology');
                if (sourcesSection && sourcesSection.parentNode) {
                    sourcesSection.parentNode.insertBefore(section, sourcesSection);
                } else {
                    const hero = document.getElementById('hero');
                    if (hero && hero.nextElementSibling) {
                        hero.parentNode.insertBefore(section, hero.nextElementSibling);
                    }
                }

            })
            .catch(err => console.error('AI panel failed to load:', err));

        function linkifyAIData(text) {
            if (!text) return '';
            return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        }
    })();

    // ============================
    // Tenant Sponsors Panel
    // ============================
    (function loadTenantSponsors() {
        const pathMatch = window.location.pathname.match(/\/sites\/([^/]+)\//);
        if (!pathMatch) return;
        const entryId = pathMatch[1];

        fetch(`/api/tenant-ads/?entryId=${encodeURIComponent(entryId)}&limit=3`)
            .then(r => r.ok ? r.json() : null)
            .then(ads => {
                if (!Array.isArray(ads) || ads.length === 0) return;

                const section = document.createElement('section');
                section.className = 'tenant-sponsors-section';
                section.innerHTML = `
                    <div class="tenant-sponsors-header">
                        <h2 class="tenant-sponsors-title">Sponsors</h2>
                        <span class="tenant-sponsors-badge">Advertisement</span>
                    </div>
                    <div class="tenant-sponsors-grid">
                        ${ads.map(ad => `
                            <a href="${escapeHtml(ad.websiteUrl)}" target="_blank" rel="sponsored noopener"
                               class="tenant-sponsor-card" data-tenant-ad-id="${ad.id}">
                                <div class="tenant-sponsor-headline">${escapeHtml(ad.headline)}</div>
                                <div class="tenant-sponsor-description">${escapeHtml(ad.description || '')}</div>
                                <div class="tenant-sponsor-url">${escapeHtml(ad.displayUrl || ad.websiteUrl)}</div>
                            </a>
                        `).join('')}
                    </div>
                `;

                const footer = document.querySelector('footer');
                if (footer && footer.parentNode) {
                    footer.parentNode.insertBefore(section, footer);
                }

                // Record impressions
                ads.forEach(ad => {
                    fetch(`/api/tenant-ads/${ad.id}/analytics`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventType: 'impression' })
                    }).catch(() => {});
                });

                section.querySelectorAll('.tenant-sponsor-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const adId = card.dataset.tenantAdId;
                        fetch(`/api/tenant-ads/${adId}/analytics`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ eventType: 'click' })
                        }).catch(() => {});
                    });
                });
            })
            .catch(err => console.error('Tenant sponsors failed to load:', err));

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    })();

    // ============================
    // Analytics: tab + outbound clicks
    // ============================
    (function trackTempleInteractions() {
        function pxTrack(name, props) {
            if (window.px && window.px.track) window.px.track(name, props || {});
        }

        function tabNameFromHref(href) {
            if (!href || href.startsWith('#')) return '';
            try {
                const url = new URL(href, window.location.href);
                const parts = url.pathname.split('/').filter(Boolean);
                const last = parts[parts.length - 1];
                if (last === 'index.html') parts.pop();
                return parts[parts.length - 1] || '';
            } catch (e) {
                return '';
            }
        }

        document.addEventListener('click', (e) => {
            const link = e.target.closest('.tab-nav-links .nav-link, .temple-mobile-menu .nav-link');
            if (!link) return;
            const tab = tabNameFromHref(link.getAttribute('href'));
            if (tab && tab !== 'index.html') pxTrack('tab_switch', { tab_name: tab });
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="http"]');
            if (!link) return;
            try {
                if (link.hostname && link.hostname !== window.location.hostname) {
                    pxTrack('outbound_click', { url: link.href });
                }
            } catch (e) {
                // ignore
            }
        });
    })();
