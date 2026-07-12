/**
 * PÚNYCODEX — Homepage JavaScript (Enterprise-Grade Optimized)
 * Zero canvas animation loops. CSS-driven hero. Declarative interactions only.
 */

(function() {
    'use strict';

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ═══════════════════════════════════════════════════════════
    // PANTHEON GRID RENDERING
    // ═══════════════════════════════════════════════════════════

    function getArchetypeUrl(archetype) {
        if (archetype.hasAdSite) {
            return `/sites/${archetype.id}/lore/`;
        }
        // Always link built temples to punycodex.com so visitors never hit a
        // raw Unicode/punycode domain and trigger browser safe-browsing warnings.
        return archetype.built ? `/sites/${archetype.id}/` : null;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

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

            const scriptInfo = typeof ORIGINAL_SCRIPT_LOOKUP !== 'undefined' ? ORIGINAL_SCRIPT_LOOKUP[a.id] : null;
            const originalScript = scriptInfo ? scriptInfo.originalScript : (a.greek || '');
            const scriptName = scriptInfo ? scriptInfo.scriptName : 'Greek';
            const scriptLabel = originalScript && originalScript !== '—'
                ? `<span class="card-script-name">${escapeHtml(scriptName)}</span>${escapeHtml(originalScript)}`
                : '<span class="card-script-name">Scholarly transliteration</span>';

            return `
                <${tag} ${hrefAttr} class="archetype-card reveal-up ${unbuiltClass}" style="--stagger-index:${index % 6}">
                    <div class="card-portrait">
                        <img src="${a.mascotPath}" alt="${escapeHtml(a.name)} — ${escapeHtml(a.domain)}" loading="lazy" onerror="this.style.opacity='0'; this.parentElement.style.background='linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)'; this.parentElement.style.backgroundSize='200% 100%'; this.parentElement.style.animation='skeletonShimmer 1.5s infinite';">
                    </div>
                    <p class="card-name">${escapeHtml(a.name)}</p>
                    <p class="card-greek">${scriptLabel}</p>
                    <p class="card-domain">${escapeHtml(a.domain)}</p>
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
    // HERO 3D STARFIELD + PERSPECTIVE TILT
    // ═══════════════════════════════════════════════════════════

    const heroContent = document.querySelector('.hero-content');
    const heroCanvas = document.getElementById('hero-canvas');

    // Shared animation state
    let scrollTranslateY = 0;
    let contentOpacity = 1;
    let targetRotateX = 0;
    let targetRotateY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;
    let heroWidth = window.innerWidth;
    let heroHeight = window.innerHeight;

    function updateHeroTransform() {
        if (!heroContent) return;
        const ease = 0.08;
        currentRotateX += (targetRotateX - currentRotateX) * ease;
        currentRotateY += (targetRotateY - currentRotateY) * ease;
        heroContent.style.opacity = contentOpacity;
        heroContent.style.transform = `translateY(${scrollTranslateY}px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) translateZ(24px)`;
    }

    if (!prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const progress = Math.min(scrollY / heroHeight, 1);
            scrollTranslateY = scrollY * 0.3;
            contentOpacity = Math.max(0, 1 - progress * 1.5);
            if (heroCanvas) {
                heroCanvas.style.transform = `translateY(${scrollY * 0.1}px)`;
            }
        }, { passive: true });

        // Mouse / touch driven perspective tilt
        function onPointerMove(x, y, rect) {
            const nx = (x / rect.width) * 2 - 1;
            const ny = (y / rect.height) * 2 - 1;
            targetRotateY = nx * 6;   // left/right tilt
            targetRotateX = -ny * 5;  // up/down tilt
        }

        if (heroContent) {
            heroContent.addEventListener('mousemove', (e) => {
                const rect = heroContent.getBoundingClientRect();
                onPointerMove(e.clientX - rect.left, e.clientY - rect.top, rect);
            }, { passive: true });

            heroContent.addEventListener('touchmove', (e) => {
                if (!e.touches[0]) return;
                const rect = heroContent.getBoundingClientRect();
                onPointerMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, rect);
            }, { passive: true });

            heroContent.addEventListener('mouseleave', () => {
                targetRotateX = 0;
                targetRotateY = 0;
            });
        }

        window.addEventListener('resize', () => {
            heroWidth = window.innerWidth;
            heroHeight = window.innerHeight;
        });
    }

    // 3D starfield canvas
    function initHeroCanvas() {
        const ctx = heroCanvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width, height;

        function resize() {
            width = heroCanvas.clientWidth || window.innerWidth;
            height = heroCanvas.clientHeight || window.innerHeight;
            heroCanvas.width = Math.floor(width * dpr);
            heroCanvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        const isMobile = window.matchMedia('(pointer: coarse)').matches;
        const particleCount = isMobile ? 90 : 220;
        const glyphCount = isMobile ? 6 : 14;
        const depth = 1200;
        const fov = 300;
        const glyphs = ['Ψ', 'ψ', '΄', 'ῑ', 'ā', 'ō', 'þ', 'ð', 'ś', 'ṇ', 'ꜥ', 'xn--'];

        function createParticle() {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                z: Math.random() * depth,
                size: Math.random() * 1.8 + 0.4,
                speed: Math.random() * 1.2 + 0.3,
                alpha: Math.random() * 0.6 + 0.2,
                color: Math.random() > 0.8 ? '212, 175, 55' : '245, 245, 245'
            };
        }

        const particles = Array.from({ length: particleCount }, createParticle);
        const floatingGlyphs = Array.from({ length: glyphCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * depth * 0.7 + depth * 0.2,
            size: Math.random() * 14 + 10,
            speed: Math.random() * 0.6 + 0.2,
            glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
            alpha: Math.random() * 0.2 + 0.05
        }));

        function project(x, y, z) {
            const scale = fov / (fov + z);
            return {
                x: (x - width / 2) * scale + width / 2,
                y: (y - height / 2) * scale + height / 2,
                scale: scale
            };
        }

        let frame = 0;
        function loop() {
            frame++;
            // Long trails for a cinematic streak effect
            ctx.fillStyle = 'rgba(5, 5, 5, 0.28)';
            ctx.fillRect(0, 0, width, height);

            // Stars
            for (const p of particles) {
                p.z -= p.speed;
                if (p.z <= 0) {
                    p.z = depth;
                    p.x = Math.random() * width;
                    p.y = Math.random() * height;
                }
                const proj = project(p.x, p.y, p.z);
                const r = Math.max(0.3, p.size * proj.scale);
                const a = p.alpha * proj.scale;
                if (a < 0.02 || proj.x < -50 || proj.x > width + 50 || proj.y < -50 || proj.y > height + 50) continue;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color}, ${a})`;
                ctx.fill();
            }

            // Floating glyphs
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const g of floatingGlyphs) {
                g.z -= g.speed;
                if (g.z <= 0) {
                    g.z = depth;
                    g.x = Math.random() * width;
                    g.y = Math.random() * height;
                    g.glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
                }
                const proj = project(g.x, g.y, g.z);
                const size = Math.max(4, g.size * proj.scale);
                const a = g.alpha * proj.scale;
                if (a < 0.01 || proj.x < -80 || proj.x > width + 80 || proj.y < -80 || proj.y > height + 80) continue;
                ctx.font = `300 ${size}px var(--font-display, Cinzel, serif)`;
                ctx.fillStyle = `rgba(212, 175, 55, ${a})`;
                ctx.fillText(g.glyph, proj.x, proj.y);
            }

            // Subtle radial light pulse at the center
            const pulse = 0.04 + Math.sin(frame * 0.01) * 0.015;
            const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.45);
            grad.addColorStop(0, `rgba(212, 175, 55, ${pulse})`);
            grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            updateHeroTransform();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }

    if (heroCanvas && !prefersReducedMotion) {
        initHeroCanvas();
    } else if (!prefersReducedMotion) {
        // No canvas: still run the transform lerp
        function loopTransform() {
            updateHeroTransform();
            requestAnimationFrame(loopTransform);
        }
        requestAnimationFrame(loopTransform);
    }

})();
