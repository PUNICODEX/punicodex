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
    // HERO 3D DIVINE GEOMETRIC ENGINE
    // A mathematically dense sacred-geometry scene: nested Platonic
    // solids scaled by the golden ratio, Fourier epicycles tracing
    // the Ψ monogram, spherical-harmonic particle shells, golden
    // spirals, god rays and chromatic bloom. Designed to look like
    // a $50k mathematician-crafted installation.
    // ═══════════════════════════════════════════════════════════
    function initHeroCanvas() {
        const ctx = heroCanvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width, height, cx, cy;

        function resize() {
            width = heroCanvas.clientWidth || window.innerWidth;
            height = heroCanvas.clientHeight || window.innerHeight;
            heroCanvas.width = Math.floor(width * dpr);
            heroCanvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cx = width * 0.5;
            cy = height * 0.5;
        }
        resize();
        window.addEventListener('resize', resize);

        const isMobile = window.matchMedia('(pointer: coarse)').matches;
        const PHI = 1.618033988749895;
        const PHI2 = PHI * PHI;
        const INV_PHI = 1 / PHI;
        const TAU = Math.PI * 2;
        const DEG = Math.PI / 180;

        const baseScale = () => Math.min(width, height) * 0.42;

        // ── Vector math ──────────────────────────────────────────
        const V = {
            add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
            sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
            mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
            div: (a, s) => ({ x: a.x / s, y: a.y / s, z: a.z / s }),
            dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
            cross: (a, b) => ({
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            }),
            len: (a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
            norm: (a) => {
                const l = V.len(a);
                return l === 0 ? { x: 0, y: 0, z: 0 } : V.div(a, l);
            },
            rotX: (p, a) => {
                const c = Math.cos(a), s = Math.sin(a);
                return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
            },
            rotY: (p, a) => {
                const c = Math.cos(a), s = Math.sin(a);
                return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
            },
            rotZ: (p, a) => {
                const c = Math.cos(a), s = Math.sin(a);
                return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
            },
            rotAxis: (p, axis, a) => {
                const u = V.norm(axis);
                const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
                return {
                    x: (c + u.x * u.x * t) * p.x + (u.x * u.y * t - u.z * s) * p.y + (u.x * u.z * t + u.y * s) * p.z,
                    y: (u.y * u.x * t + u.z * s) * p.x + (c + u.y * u.y * t) * p.y + (u.y * u.z * t - u.x * s) * p.z,
                    z: (u.z * u.x * t - u.y * s) * p.x + (u.z * u.y * t + u.x * s) * p.y + (c + u.z * u.z * t) * p.z
                };
            }
        };

        // ── Projection ───────────────────────────────────────────
        const fov = 900;
        function project(p) {
            const d = fov / (fov + p.z);
            return { x: p.x * d + cx, y: p.y * d + cy, scale: d, z: p.z };
        }

        // ── Interaction ──────────────────────────────────────────
        let pointerTargetX = 0, pointerTargetY = 0;
        let pointerX = 0, pointerY = 0;
        function onPointerMove(clientX, clientY) {
            pointerTargetY = ((clientX / width) * 2 - 1) * 0.55;
            pointerTargetX = ((clientY / height) * 2 - 1) * 0.35;
        }
        heroCanvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
        heroCanvas.addEventListener('touchmove', (e) => {
            if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        heroCanvas.addEventListener('mouseleave', () => { pointerTargetX = 0; pointerTargetY = 0; });

        // ── Platonic solids ──────────────────────────────────────
        function buildSolids() {
            const phi = PHI;
            const solids = [];

            // Tetrahedron
            solids.push({
                verts: [
                    { x: 1, y: 1, z: 1 }, { x: 1, y: -1, z: -1 },
                    { x: -1, y: 1, z: -1 }, { x: -1, y: -1, z: 1 }
                ].map(V.norm),
                edges: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
                scale: 1.0,
                speed: 0.0011,
                axis: V.norm({ x: 1, y: PHI, z: INV_PHI }),
                hue: 45
            });

            // Hexahedron (cube)
            solids.push({
                verts: [
                    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
                    { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
                    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
                    { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
                ],
                edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
                scale: PHI,
                speed: -0.0006,
                axis: V.norm({ x: -INV_PHI, y: 1, z: PHI }),
                hue: 200
            });

            // Octahedron
            solids.push({
                verts: [
                    { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
                    { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
                    { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
                ],
                edges: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]],
                scale: 1 / PHI,
                speed: 0.0014,
                axis: V.norm({ x: PHI, y: -1, z: INV_PHI }),
                hue: 280
            });

            // Dodecahedron
            const dodVerts = [];
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    for (let k = -1; k <= 1; k += 2) {
                        dodVerts.push({ x: i, y: j, z: k });
                    }
                }
            }
            const dodSet = [
                { x: 0, y: phi, z: 1 / phi }, { x: 0, y: phi, z: -1 / phi },
                { x: 0, y: -phi, z: 1 / phi }, { x: 0, y: -phi, z: -1 / phi },
                { x: 1 / phi, y: 0, z: phi }, { x: -1 / phi, y: 0, z: phi },
                { x: 1 / phi, y: 0, z: -phi }, { x: -1 / phi, y: 0, z: -phi },
                { x: phi, y: 1 / phi, z: 0 }, { x: phi, y: -1 / phi, z: 0 },
                { x: -phi, y: 1 / phi, z: 0 }, { x: -phi, y: -1 / phi, z: 0 }
            ];
            dodVerts.push(...dodSet.map(V.norm));
            const dodEdges = [];
            for (let i = 0; i < dodVerts.length; i++) {
                for (let j = i + 1; j < dodVerts.length; j++) {
                    if (V.len(V.sub(dodVerts[i], dodVerts[j])) < 1.16) dodEdges.push([i, j]);
                }
            }
            solids.push({
                verts: dodVerts,
                edges: dodEdges,
                scale: PHI2,
                speed: -0.00035,
                axis: V.norm({ x: 1, y: -PHI, z: INV_PHI }),
                hue: 35
            });

            // Icosahedron
            const icoVerts = [
                { x: 0, y: 1, z: phi }, { x: 0, y: -1, z: phi },
                { x: 0, y: 1, z: -phi }, { x: 0, y: -1, z: -phi },
                { x: 1, y: phi, z: 0 }, { x: -1, y: phi, z: 0 },
                { x: 1, y: -phi, z: 0 }, { x: -1, y: -phi, z: 0 },
                { x: phi, y: 0, z: 1 }, { x: phi, y: 0, z: -1 },
                { x: -phi, y: 0, z: 1 }, { x: -phi, y: 0, z: -1 }
            ].map(V.norm);
            const icoEdges = [];
            for (let i = 0; i < icoVerts.length; i++) {
                for (let j = i + 1; j < icoVerts.length; j++) {
                    if (V.len(V.sub(icoVerts[i], icoVerts[j])) < 1.16) icoEdges.push([i, j]);
                }
            }
            solids.push({
                verts: icoVerts,
                edges: icoEdges,
                scale: 1 / (PHI * 0.85),
                speed: 0.0008,
                axis: V.norm({ x: INV_PHI, y: PHI, z: 1 }),
                hue: 170
            });

            return solids;
        }

        const solids = buildSolids();

        // ── Ψ path for Fourier epicycles ─────────────────────────
        function buildPsiPath(samples = 256) {
            const pts = [];
            const add = (x, y) => pts.push({ x, y });
            const lerp = (a, b, t) => a + (b - a) * t;
            const quad = (p0, p1, p2, n) => {
                for (let i = 1; i < n; i++) {
                    const t = i / n, mt = 1 - t;
                    add(
                        mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                        mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
                    );
                }
            };
            const line = (p0, p1, n) => {
                for (let i = 1; i < n; i++) {
                    const t = i / n;
                    add(lerp(p0.x, p1.x, t), lerp(p0.y, p1.y, t));
                }
            };

            const top = { x: 0, y: -1.0 };
            const loopTop = { x: 0, y: -0.42 };
            const loopBottom = { x: 0, y: 0.42 };
            const bottom = { x: 0, y: 1.0 };
            const baseLeft = { x: -0.2, y: 0.78 };
            const baseRight = { x: 0.2, y: 0.78 };

            add(top.x, top.y);
            line(top, loopTop, 10);
            quad(loopTop, { x: -0.62, y: -0.42 }, { x: -0.72, y: 0.0 }, 12);
            quad({ x: -0.72, y: 0.0 }, { x: -0.62, y: 0.42 }, loopBottom, 12);
            quad(loopBottom, { x: 0.62, y: 0.42 }, { x: 0.72, y: 0.0 }, 12);
            quad({ x: 0.72, y: 0.0 }, { x: 0.62, y: -0.42 }, loopTop, 12);
            line(loopTop, loopBottom, 6);
            line(loopBottom, bottom, 14);
            line(bottom, baseLeft, 4);
            line(baseLeft, baseRight, 4);
            line(baseRight, bottom, 4);

            // Resample evenly to fixed count for stable DFT
            const even = [];
            const totalLen = pts.reduce((sum, p, i) => {
                const q = pts[(i + 1) % pts.length];
                return sum + Math.hypot(q.x - p.x, q.y - p.y);
            }, 0);
            let walk = 0;
            let idx = 0;
            for (let i = 0; i < samples; i++) {
                const target = (i / samples) * totalLen;
                while (walk < target && idx < pts.length) {
                    const a = pts[idx];
                    const b = pts[(idx + 1) % pts.length];
                    const seg = Math.hypot(b.x - a.x, b.y - a.y);
                    if (walk + seg >= target) {
                        const t = (target - walk) / seg;
                        even.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
                        break;
                    }
                    walk += seg;
                    idx++;
                }
                if (even.length <= i) even.push({ ...pts[pts.length - 1] });
            }
            return even;
        }

        const psiPath = buildPsiPath(isMobile ? 128 : 256);

        // ── Discrete Fourier Transform ───────────────────────────
        function dft(points) {
            const N = points.length;
            const coeffs = [];
            for (let k = 0; k < N; k++) {
                let re = 0, im = 0;
                for (let n = 0; n < N; n++) {
                    const phi = (TAU * k * n) / N;
                    re += points[n].x * Math.cos(phi) + points[n].y * Math.sin(phi);
                    im += points[n].y * Math.cos(phi) - points[n].x * Math.sin(phi);
                }
                re /= N;
                im /= N;
                coeffs.push({
                    re, im,
                    freq: k,
                    amp: Math.sqrt(re * re + im * im),
                    phase: Math.atan2(im, re)
                });
            }
            return coeffs.sort((a, b) => b.amp - a.amp).slice(0, isMobile ? 48 : 96);
        }

        const psiCoeffs = dft(psiPath);

        // ── Golden spiral particles ──────────────────────────────
        const spiralCount = isMobile ? 180 : 420;
        const spiralParticles = [];
        for (let i = 0; i < spiralCount; i++) {
            const t = i / spiralCount;
            const theta = t * TAU * 4.5;
            const r = Math.pow(t, 0.7);
            spiralParticles.push({
                baseTheta: theta,
                baseR: r,
                speed: 0.0003 + Math.random() * 0.0004,
                phase: Math.random() * TAU,
                size: 0.5 + Math.random() * 1.5
            });
        }

        // ── Harmonic shell particles ─────────────────────────────
        const shellCount = isMobile ? 120 : 280;
        const shellParticles = [];
        for (let i = 0; i < shellCount; i++) {
            const phi = Math.acos(1 - 2 * (i / shellCount));
            const theta = TAU * i * PHI;
            shellParticles.push({
                phi, theta,
                r: 1.0 + Math.sin(i * 0.5) * 0.12,
                pulse: Math.random() * TAU
            });
        }

        // ── Diacritic orbit rings ────────────────────────────────
        const orbitGlyphs = ['Ψ', 'ψ', '´', 'ˉ', 'þ', 'ð', 'ś', 'ṇ', 'ꜥ', 'xn--', 'ō', 'Ω', 'א', 'ॐ', 'η', 'ω', 'ā', 'ī', 'ū'];
        const orbits = [
            { axis: V.norm({ x: 0.6, y: 1, z: 0.3 }), radius: 1.35, speed: 0.0035, count: isMobile ? 8 : 16 },
            { axis: V.norm({ x: 1, y: -0.4, z: 0.6 }), radius: 1.65, speed: -0.0025, count: isMobile ? 6 : 12 },
            { axis: V.norm({ x: -0.3, y: 0.7, z: 1 }), radius: 2.0, speed: 0.0018, count: isMobile ? 5 : 10 }
        ].map((o) => {
            const len = V.len(o.axis);
            o.axis = V.div(o.axis, len);
            o.glyphs = [];
            for (let i = 0; i < o.count; i++) {
                o.glyphs.push({
                    phase: (i / o.count) * TAU,
                    glyph: orbitGlyphs[(i * 7) % orbitGlyphs.length],
                    size: 9 + Math.random() * 6
                });
            }
            return o;
        });

        // ── God rays ─────────────────────────────────────────────
        const rayCount = isMobile ? 9 : 15;
        const rays = [];
        for (let i = 0; i < rayCount; i++) {
            rays.push({
                angle: (i / rayCount) * TAU + Math.random() * 0.2,
                width: 0.03 + Math.random() * 0.04,
                speed: 0.0002 + Math.random() * 0.0003,
                opacity: 0.04 + Math.random() * 0.05
            });
        }

        // ── Color helpers ────────────────────────────────────────
        function hsla(h, s, l, a) {
            return `hsla(${h}, ${s}%, ${l}%, ${a})`;
        }
        const GOLD = { h: 45, s: 70, l: 52 };
        const VOID = '#030305';

        // ── Bloom buffer ─────────────────────────────────────────
        const bloomCanvas = document.createElement('canvas');
        const bloomCtx = bloomCanvas.getContext('2d');
        function resizeBloom() {
            bloomCanvas.width = Math.floor(width * 0.5);
            bloomCanvas.height = Math.floor(height * 0.5);
        }
        resizeBloom();
        window.addEventListener('resize', resizeBloom);

        // ── Render loop ──────────────────────────────────────────
        let frame = 0;
        let time = 0;

        function renderSolids(base, camRotX, camRotY) {
            const allLines = [];
            const allNodes = [];

            solids.forEach((solid, si) => {
                const t = frame * solid.speed + si * 0.3;
                const worldVerts = solid.verts.map((v) => {
                    const scaled = V.mul(v, base * solid.scale * 0.55);
                    const rotated = V.rotAxis(scaled, solid.axis, t);
                    const tilted = V.rotX(V.rotY(rotated, camRotY), camRotX);
                    return project(tilted);
                });

                solid.edges.forEach(([a, b]) => {
                    const pa = worldVerts[a];
                    const pb = worldVerts[b];
                    allLines.push({
                        a: pa, b: pb,
                        z: (pa.z + pb.z) * 0.5,
                        hue: solid.hue,
                        width: 0.7
                    });
                });

                worldVerts.forEach((v) => {
                    allNodes.push({ v, hue: solid.hue, z: v.z });
                });
            });

            allLines.sort((u, v) => u.z - v.z);
            allLines.forEach((ln) => {
                const depth = 1 - Math.max(0, Math.min(1, (ln.z + base * 2) / (base * 4)));
                ctx.beginPath();
                ctx.moveTo(ln.a.x, ln.a.y);
                ctx.lineTo(ln.b.x, ln.b.y);
                ctx.strokeStyle = hsla(ln.hue, 60, 55, 0.05 + depth * 0.22);
                ctx.lineWidth = ln.width * ((ln.a.scale + ln.b.scale) * 0.5);
                ctx.stroke();
            });

            allNodes.sort((a, b) => a.z - b.z);
            allNodes.forEach((n) => {
                const a = Math.max(0.08, 0.35 * n.v.scale);
                ctx.beginPath();
                ctx.arc(n.v.x, n.v.y, a, 0, TAU);
                ctx.fillStyle = hsla(n.hue, 70, 60, a * 0.6);
                ctx.fill();
            });
        }

        function renderPsiEpicycles(base, camRotX, camRotY) {
            const scale = base * 0.55;
            let x = 0, y = 0;
            const trail = [];
            const dt = frame * 0.008;

            psiCoeffs.forEach((c) => {
                const radius = c.amp * scale;
                const angle = c.freq * dt + c.phase;
                const prevX = x;
                const prevY = y;
                x += radius * Math.cos(angle);
                y += radius * Math.sin(angle);

                // Epicycle ring
                ctx.beginPath();
                ctx.arc(cx + prevX, cy + prevY, Math.abs(radius), 0, TAU);
                ctx.strokeStyle = `rgba(212,175,55,${0.03 + c.amp * 0.08})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Radius arm
                ctx.beginPath();
                ctx.moveTo(cx + prevX, cy + prevY);
                ctx.lineTo(cx + x, cy + y);
                ctx.strokeStyle = `rgba(212,175,55,${0.06 + c.amp * 0.12})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                trail.push({ x: cx + x, y: cy + y, amp: c.amp });
            });

            // Draw traced Ψ with glow
            ctx.save();
            ctx.shadowColor = 'rgba(212,175,55,0.9)';
            ctx.shadowBlur = 24;
            ctx.beginPath();
            if (trail.length) {
                ctx.moveTo(trail[0].x, trail[0].y);
                for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = 'rgba(255,235,180,0.9)';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();

            // Luminous tip
            ctx.beginPath();
            ctx.arc(cx + x, cy + y, 3.5, 0, TAU);
            ctx.fillStyle = 'rgba(255,245,210,0.95)';
            ctx.shadowColor = 'rgba(212,175,55,1)';
            ctx.shadowBlur = 28;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function renderGoldenSpiral(base, camRotX, camRotY) {
            const items = [];
            spiralParticles.forEach((p) => {
                const theta = p.baseTheta + frame * p.speed + time * 0.1;
                const r = p.baseR * base * 1.9;
                const flat = { x: Math.cos(theta) * r, y: Math.sin(theta) * r, z: 0 };
                const world = V.rotX(V.rotY(flat, camRotY), camRotX);
                const proj = project(world);
                items.push({ proj, z: world.z, size: p.size, alpha: 0.3 + p.baseR * 0.7 });
            });

            items.sort((a, b) => a.z - b.z);
            ctx.fillStyle = 'rgba(212,175,55,0.55)';
            items.forEach((it) => {
                const s = Math.max(0.6, it.size * it.proj.scale);
                const a = Math.max(0.08, 0.5 * it.proj.scale * it.alpha);
                ctx.globalAlpha = a;
                ctx.beginPath();
                ctx.arc(it.proj.x, it.proj.y, s, 0, TAU);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        function renderShell(base, camRotX, camRotY) {
            const items = [];
            shellParticles.forEach((p) => {
                const theta = p.theta + time * 0.05;
                const phi = p.phi + Math.sin(time * 0.03 + p.pulse) * 0.08;
                const r = base * (1.15 + Math.sin(time * 0.04 + p.pulse) * 0.06) * p.r;
                const sp = {
                    x: r * Math.sin(phi) * Math.cos(theta),
                    y: r * Math.sin(phi) * Math.sin(theta),
                    z: r * Math.cos(phi)
                };
                const world = V.rotX(V.rotY(sp, camRotY), camRotX);
                const proj = project(world);
                items.push({ proj, z: world.z, pulse: p.pulse });
            });

            items.sort((a, b) => a.z - b.z);
            items.forEach((it) => {
                const a = Math.max(0.06, 0.35 * it.proj.scale * (0.6 + Math.sin(time * 0.08 + it.pulse) * 0.4));
                ctx.beginPath();
                ctx.arc(it.proj.x, it.proj.y, Math.max(0.5, 1.2 * it.proj.scale), 0, TAU);
                ctx.fillStyle = `rgba(140,180,255,${a * 0.45})`;
                ctx.fill();
            });
        }

        function renderOrbits(base, camRotX, camRotY) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const items = [];

            orbits.forEach((ring) => {
                const n = ring.axis;
                let tmp = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
                const u = V.norm(V.cross(tmp, n));
                const v = V.norm(V.cross(n, u));

                ring.glyphs.forEach((g) => {
                    const theta = g.phase + frame * ring.speed;
                    const r = ring.radius * base;
                    const local = V.add(V.mul(u, Math.cos(theta) * r), V.mul(v, Math.sin(theta) * r));
                    const world = V.rotX(V.rotY(local, camRotY), camRotX);
                    const proj = project(world);
                    items.push({ proj, glyph: g.glyph, size: g.size, z: world.z });
                });
            });

            items.sort((a, b) => a.z - b.z);
            items.forEach((it) => {
                const a = Math.max(0.12, 0.55 * it.proj.scale);
                const size = Math.max(7, it.size * it.proj.scale);
                ctx.save();
                ctx.font = `300 ${size}px Cinzel, serif`;
                ctx.shadowColor = 'rgba(212,175,55,0.6)';
                ctx.shadowBlur = 14 * a;
                ctx.fillStyle = `rgba(255,235,190,${a})`;
                ctx.fillText(it.glyph, it.proj.x, it.proj.y);
                ctx.restore();
            });
        }

        function renderGodRays() {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            rays.forEach((ray) => {
                const angle = ray.angle + frame * ray.speed;
                const len = Math.max(width, height) * 0.72;
                const x1 = cx + Math.cos(angle - ray.width) * baseScale() * 0.25;
                const y1 = cy + Math.sin(angle - ray.width) * baseScale() * 0.25;
                const x2 = cx + Math.cos(angle) * len;
                const y2 = cy + Math.sin(angle) * len;
                const x3 = cx + Math.cos(angle + ray.width) * len;
                const y3 = cy + Math.sin(angle + ray.width) * len;

                const grad = ctx.createLinearGradient(cx, cy, x2, y2);
                grad.addColorStop(0, `rgba(212,175,55,${ray.opacity})`);
                grad.addColorStop(0.4, `rgba(212,175,55,${ray.opacity * 0.4})`);
                grad.addColorStop(1, 'rgba(212,175,55,0)');

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
            });
            ctx.restore();
        }

        function renderCentralBloom(base) {
            const pulse = 1 + Math.sin(time * 1.2) * 0.08;
            const r1 = base * 0.35 * pulse;
            const r2 = base * 0.8 * pulse;

            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r1);
            g1.addColorStop(0, 'rgba(255,245,220,0.45)');
            g1.addColorStop(0.25, 'rgba(212,175,55,0.22)');
            g1.addColorStop(0.6, 'rgba(212,175,55,0.05)');
            g1.addColorStop(1, 'rgba(212,175,55,0)');
            ctx.fillStyle = g1;
            ctx.fillRect(0, 0, width, height);

            const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
            g2.addColorStop(0, 'rgba(100,160,255,0.08)');
            g2.addColorStop(0.5, 'rgba(212,175,55,0.03)');
            g2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(0, 0, width, height);

            ctx.restore();
        }

        function renderNoiseField() {
            const count = isMobile ? 60 : 140;
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            for (let i = 0; i < count; i++) {
                const t = (i / count) * TAU + time * 0.02;
                const r = baseScale() * (1.6 + Math.sin(i * PHI) * 0.4);
                const x = cx + Math.cos(t) * r;
                const y = cy + Math.sin(t * PHI) * r * 0.6;
                const s = 0.5 + Math.sin(time * 0.05 + i) * 0.3;
                ctx.fillStyle = `rgba(212,175,55,${0.02 + s * 0.04})`;
                ctx.beginPath();
                ctx.arc(x, y, s, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
        }

        function renderChromaticAberration() {
            // Subtle channel separation toward screen edges
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const strength = 2.5;
            ctx.drawImage(heroCanvas, -strength, 0, width + strength * 2, height);
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(heroCanvas, strength, 0, width - strength * 2, height);
            ctx.restore();
        }

        function drawToBloom() {
            bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
            bloomCtx.drawImage(heroCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
            bloomCtx.globalCompositeOperation = 'screen';
            for (let i = 0; i < 3; i++) {
                bloomCtx.drawImage(bloomCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height);
            }
            bloomCtx.globalCompositeOperation = 'source-over';
        }

        function loop() {
            frame++;
            time = frame * 0.016;

            pointerX += (pointerTargetX - pointerX) * 0.05;
            pointerY += (pointerTargetY - pointerY) * 0.05;

            const camRotX = 0.18 + Math.sin(time * 0.25) * 0.06 + pointerX;
            const camRotY = time * 0.08 + pointerY;
            const base = baseScale();

            // Clear
            ctx.fillStyle = VOID;
            ctx.fillRect(0, 0, width, height);

            // Background layers
            renderNoiseField();
            renderGodRays();
            renderGoldenSpiral(base, camRotX, camRotY);
            renderShell(base, camRotX, camRotY);

            // Sacred geometry solids
            renderSolids(base, camRotX, camRotY);

            // Ψ traced by Fourier epicycles
            renderPsiEpicycles(base, camRotX, camRotY);

            // Diacritic orbits
            renderOrbits(base, camRotX, camRotY);

            // Divine light
            renderCentralBloom(base);

            // Bloom composite
            drawToBloom();
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.35;
            ctx.drawImage(bloomCanvas, 0, 0, width, height);
            ctx.restore();

            // Final chromatic aberration pass
            renderChromaticAberration();

            // Vignette
            const vig = ctx.createRadialGradient(cx, cy, base * 0.4, cx, cy, Math.max(width, height) * 0.75);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(0.7, 'rgba(0,0,0,0.35)');
            vig.addColorStop(1, 'rgba(0,0,0,0.75)');
            ctx.fillStyle = vig;
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
