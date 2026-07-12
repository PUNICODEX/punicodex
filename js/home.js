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

        window.addEventListener('resize', () => {
            heroWidth = window.innerWidth;
            heroHeight = window.innerHeight;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // HERO 3D GEOMETRIC VISUAL — The Unicode Pantheon Atom
    // A crystalline Ψ monogram suspended inside a rotating
    // icosahedral temple, orbited by the diacritics and scripts
    // that PÚNYCODEX restores.
    // ═══════════════════════════════════════════════════════════
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
        const scaleBase = () => Math.min(width, height) * 0.5;
        const fov = 900;

        // ── 3D math ──────────────────────────────────────────────
        function rotateX(p, a) {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
        }
        function rotateY(p, a) {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
        }
        function rotateZ(p, a) {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
        }
        function project(p) {
            const d = fov / (fov + p.z);
            return { x: p.x * d + width / 2, y: p.y * d + height / 2, scale: d, z: p.z };
        }

        // ── Icosahedron (the Pantheon lattice) ───────────────────
        const phi = (1 + Math.sqrt(5)) / 2;
        const icoRaw = [
            { x: 0, y: 1, z: phi }, { x: 0, y: -1, z: phi }, { x: 0, y: 1, z: -phi }, { x: 0, y: -1, z: -phi },
            { x: 1, y: phi, z: 0 }, { x: -1, y: phi, z: 0 }, { x: 1, y: -phi, z: 0 }, { x: -1, y: -phi, z: 0 },
            { x: phi, y: 0, z: 1 }, { x: phi, y: 0, z: -1 }, { x: -phi, y: 0, z: 1 }, { x: -phi, y: 0, z: -1 }
        ];
        const icoEdges = [];
        for (let i = 0; i < icoRaw.length; i++) {
            for (let j = i + 1; j < icoRaw.length; j++) {
                const dx = icoRaw[i].x - icoRaw[j].x;
                const dy = icoRaw[i].y - icoRaw[j].y;
                const dz = icoRaw[i].z - icoRaw[j].z;
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2.1) icoEdges.push([i, j]);
            }
        }

        // ── Ψ monogram geometry ──────────────────────────────────
        function lineSamples(a, b, n) {
            const pts = [];
            for (let i = 1; i < n; i++) {
                const t = i / n;
                pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 0 });
            }
            return pts;
        }
        function quadBezier(p0, p1, p2, n) {
            const pts = [];
            for (let i = 1; i < n; i++) {
                const t = i / n, mt = 1 - t;
                pts.push({
                    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
                    z: 0
                });
            }
            return pts;
        }

        // Normalised Ψ path (y up); extrude in z for a crystalline solid.
        const staffTop = { x: 0, y: 1.05, z: 0 };
        const loopTop = { x: 0, y: 0.55, z: 0 };
        const loopBottom = { x: 0, y: -0.45, z: 0 };
        const staffBottom = { x: 0, y: -0.9, z: 0 };
        const baseTip = { x: 0, y: -0.72, z: 0 };

        const psiFrontPath = [
            staffTop,
            ...lineSamples(staffTop, loopTop, 5),
            ...quadBezier(loopTop, { x: -0.5, y: 0.55, z: 0 }, { x: -0.6, y: 0.05, z: 0 }, 7),
            ...quadBezier({ x: -0.6, y: 0.05, z: 0 }, { x: -0.5, y: -0.45, z: 0 }, loopBottom, 7),
            ...quadBezier(loopBottom, { x: 0.5, y: -0.45, z: 0 }, { x: 0.6, y: 0.05, z: 0 }, 7),
            ...quadBezier({ x: 0.6, y: 0.05, z: 0 }, { x: 0.5, y: 0.55, z: 0 }, loopTop, 7),
            ...lineSamples(loopTop, loopBottom, 2).slice(1),
            ...lineSamples(loopBottom, staffBottom, 8),
            ...lineSamples(staffBottom, baseTip, 4),
            { x: -0.18, y: -0.62, z: 0 },
            { x: 0.18, y: -0.62, z: 0 }
        ];
        const extrude = 0.14;
        const psiPoints = [];
        const psiEdges = [];
        psiFrontPath.forEach((p) => {
            psiPoints.push({ x: p.x, y: p.y, z: extrude });
            psiPoints.push({ x: p.x, y: p.y, z: -extrude });
        });
        for (let i = 0; i < psiFrontPath.length - 1; i++) {
            const f0 = i * 2, f1 = f0 + 2;
            const b0 = f0 + 1, b1 = f1 + 1;
            psiEdges.push([f0, f1], [b0, b1], [f0, b0]);
        }
        // Close the loop seam manually
        psiEdges.push([0, 1]);

        // ── Orbital rings (diacritics / scripts in orbit) ────────
        const orbitGlyphs = ['Ψ', 'ψ', '´', 'ˉ', 'þ', 'ð', 'ś', 'ṇ', 'ꜥ', 'xn--', 'ō', 'Ω', 'א', 'ॐ'];
        const orbits = [
            { axis: { x: 0.6, y: 1.0, z: 0.3 }, radius: 0.78, speed: 0.004, count: isMobile ? 7 : 13 },
            { axis: { x: 1.0, y: -0.4, z: 0.6 }, radius: 0.92, speed: -0.003, count: isMobile ? 6 : 11 },
            { axis: { x: -0.3, y: 0.7, z: 1.0 }, radius: 1.06, speed: 0.002, count: isMobile ? 5 : 9 }
        ].map((o) => {
            // Normalise ring axis
            const len = Math.sqrt(o.axis.x * o.axis.x + o.axis.y * o.axis.y + o.axis.z * o.axis.z);
            o.axis = { x: o.axis.x / len, y: o.axis.y / len, z: o.axis.z / len };
            o.glyphs = [];
            for (let i = 0; i < o.count; i++) {
                o.glyphs.push({
                    phase: (i / o.count) * Math.PI * 2,
                    glyph: orbitGlyphs[(i * 3) % orbitGlyphs.length],
                    size: Math.random() * 5 + 9
                });
            }
            return o;
        });

        // Pointer-driven scene rotation
        let pointerTargetX = 0, pointerTargetY = 0;
        let pointerX = 0, pointerY = 0;
        function onPointerMove(clientX, clientY) {
            pointerTargetY = ((clientX / width) * 2 - 1) * 0.35;
            pointerTargetX = ((clientY / height) * 2 - 1) * 0.25;
        }
        heroCanvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
        heroCanvas.addEventListener('touchmove', (e) => {
            if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        heroCanvas.addEventListener('mouseleave', () => { pointerTargetX = 0; pointerTargetY = 0; });

        let frame = 0;
        const gold = '212, 175, 55';
        const dimGold = '140, 115, 50';

        function loop() {
            frame++;
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);

            const base = scaleBase();
            const time = frame * 0.003;

            // Smooth pointer inertia
            pointerX += (pointerTargetX - pointerX) * 0.06;
            pointerY += (pointerTargetY - pointerY) * 0.06;

            // Camera/scene rotation
            const camRotX = 0.25 + Math.sin(time * 0.4) * 0.08 + pointerX;
            const camRotY = time * 0.15 + pointerY;

            function transformWorld(p, s) {
                let q = { x: p.x * s, y: p.y * s, z: p.z * s };
                q = rotateY(q, camRotY);
                q = rotateX(q, camRotX);
                return q;
            }

            // ── Icosahedron edges (back to front) ─────────────────
            const icoProj = icoRaw.map((p) => project(transformWorld(p, base * 1.35)));
            const icoLines = icoEdges.map(([a, b]) => {
                const za = icoProj[a].z, zb = icoProj[b].z;
                return { a: icoProj[a], b: icoProj[b], z: (za + zb) / 2 };
            }).sort((u, v) => u.z - v.z);

            ctx.lineCap = 'round';
            for (const ln of icoLines) {
                const depthAlpha = Math.max(0.06, 0.32 * (1 - (ln.z + base) / (base * 3)));
                ctx.beginPath();
                ctx.moveTo(ln.a.x, ln.a.y);
                ctx.lineTo(ln.b.x, ln.b.y);
                ctx.strokeStyle = `rgba(${dimGold}, ${depthAlpha})`;
                ctx.lineWidth = 0.8 * ((ln.a.scale + ln.b.scale) / 2);
                ctx.stroke();
            }

            // ── Icosahedron vertices ───────────────────────────────
            for (const v of icoProj) {
                const a = Math.max(0.1, 0.45 * v.scale);
                ctx.beginPath();
                ctx.arc(v.x, v.y, a, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${gold}, ${a * 0.5})`;
                ctx.fill();
            }

            // ── Orbital rings ──────────────────────────────────────
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const orbitItems = [];
            orbits.forEach((ring, ri) => {
                // Build an orthonormal basis for the ring plane
                const n = ring.axis;
                let tmp = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
                const u = normalize(cross(tmp, n));
                const v = normalize(cross(n, u));
                ring.glyphs.forEach((g) => {
                    const theta = g.phase + frame * ring.speed;
                    const r = ring.radius * base;
                    const local = {
                        x: u.x * Math.cos(theta) * r + v.x * Math.sin(theta) * r,
                        y: u.y * Math.cos(theta) * r + v.y * Math.sin(theta) * r,
                        z: u.z * Math.cos(theta) * r + v.z * Math.sin(theta) * r
                    };
                    const world = rotateY(rotateX(local, camRotX), camRotY);
                    const proj = project(world);
                    orbitItems.push({ proj, glyph: g.glyph, size: g.size, z: world.z });
                });
            });
            orbitItems.sort((a, b) => a.z - b.z);
            for (const item of orbitItems) {
                const a = Math.max(0.15, 0.55 * item.proj.scale);
                const size = Math.max(7, item.size * item.proj.scale);
                ctx.font = `300 ${size}px Cinzel, serif`;
                ctx.shadowColor = `rgba(${gold}, 0.5)`;
                ctx.shadowBlur = 12 * a;
                ctx.fillStyle = `rgba(${gold}, ${a})`;
                ctx.fillText(item.glyph, item.proj.x, item.proj.y);
            }
            ctx.shadowBlur = 0;

            // ── Ψ monogram (extruded wireframe) ────────────────────
            const psiProj = psiPoints.map((p) => project(transformWorld(p, base * 0.85)));
            const psiLines = psiEdges.map(([a, b]) => {
                return { a: psiProj[a], b: psiProj[b], z: (psiProj[a].z + psiProj[b].z) / 2 };
            }).sort((u, v) => u.z - v.z);

            for (const ln of psiLines) {
                const a = Math.max(0.25, 0.95 * (1 - (ln.z + base * 0.3) / (base * 1.2)));
                ctx.beginPath();
                ctx.moveTo(ln.a.x, ln.a.y);
                ctx.lineTo(ln.b.x, ln.b.y);
                ctx.strokeStyle = `rgba(${gold}, ${a})`;
                ctx.lineWidth = 2.2 * ((ln.a.scale + ln.b.scale) / 2);
                ctx.shadowColor = `rgba(${gold}, 0.6)`;
                ctx.shadowBlur = 14 * a;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;

            // Ψ vertices as luminous nodes
            for (const v of psiProj) {
                const a = Math.max(0.15, 0.7 * v.scale);
                ctx.beginPath();
                ctx.arc(v.x, v.y, a * 1.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${gold}, ${a})`;
                ctx.fill();
            }

            // Central glow behind the Ψ
            const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, base * 0.6);
            glow.addColorStop(0, `rgba(${gold}, 0.14)`);
            glow.addColorStop(0.5, `rgba(${gold}, 0.04)`);
            glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            updateHeroTransform();
            requestAnimationFrame(loop);
        }

        function cross(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        }
        function normalize(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return len === 0 ? { x: 0, y: 0, z: 0 } : { x: v.x / len, y: v.y / len, z: v.z / len };
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
