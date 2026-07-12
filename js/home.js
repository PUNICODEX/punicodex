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
    // HERO CANVAS — The Celestial Armillary
    // A slow, majestic sacred-astronomy instrument: nested golden
    // rings (armillary sphere), a luminous Ψ monogram at the heart,
    // orbiting Unicode glyphs, constellation networks, and soft
    // volumetric light. Built to feel like a $50k installation.
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
        const TAU = Math.PI * 2;
        const PHI = 1.618033988749895;

        // ── 3D math ──────────────────────────────────────────────
        function v3(x, y, z) { return { x, y, z }; }
        function vMul(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
        function vAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
        function vRotY(v, a) {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
        }
        function vRotX(v, a) {
            const c = Math.cos(a), s = Math.sin(a);
            return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
        }
        function vLen(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
        function vNorm(v) {
            const l = vLen(v);
            return l === 0 ? v3(0, 0, 0) : vMul(v, 1 / l);
        }
        function vRotAxis(v, axis, a) {
            const u = vNorm(axis);
            const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
            return v3(
                (c + u.x * u.x * t) * v.x + (u.x * u.y * t - u.z * s) * v.y + (u.x * u.z * t + u.y * s) * v.z,
                (u.y * u.x * t + u.z * s) * v.x + (c + u.y * u.y * t) * v.y + (u.y * u.z * t - u.x * s) * v.z,
                (u.z * u.x * t - u.y * s) * v.x + (u.z * u.y * t + u.x * s) * v.y + (c + u.z * u.z * t) * v.z
            );
        }

        const fov = 900;
        function project(p) {
            const d = fov / (fov + p.z);
            return { x: p.x * d + cx, y: p.y * d + cy, scale: d, z: p.z };
        }

        const baseScale = () => Math.min(width, height) * 0.32;

        // ── Pointer interaction ──────────────────────────────────
        let targetPitch = 0, targetYaw = 0;
        let pitch = 0, yaw = 0;
        function onPointerMove(clientX, clientY) {
            targetYaw = ((clientX / width) * 2 - 1) * 0.45;
            targetPitch = ((clientY / height) * 2 - 1) * 0.25;
        }
        heroCanvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY), { passive: true });
        heroCanvas.addEventListener('touchmove', (e) => {
            if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        heroCanvas.addEventListener('mouseleave', () => { targetPitch = 0; targetYaw = 0; });

        // ── Armillary rings ──────────────────────────────────────
        const rings = [
            { axis: v3(1, 0, 0.15), radius: 1.0, speed: 0.00035, tilt: 0, hue: 45, width: 2.2 },
            { axis: v3(0.2, 1, 0.1), radius: 1.25, speed: -0.00028, tilt: TAU / 5, hue: 42, width: 1.8 },
            { axis: v3(-0.15, 0.6, 1), radius: 1.55, speed: 0.00022, tilt: -TAU / 7, hue: 38, width: 1.5 },
            { axis: v3(0.4, -0.8, 0.5), radius: 1.9, speed: 0.00018, tilt: TAU / 3, hue: 50, width: 1.2 }
        ];

        // ── Glyphs in orbit ──────────────────────────────────────
        const glyphs = ['Ψ', 'ψ', '´', 'ˉ', 'þ', 'ð', 'ś', 'ṇ', 'ꜥ', 'ō', 'Ω', 'א', 'ॐ', 'η', 'ω', 'ā', 'ī', 'ū', 'ṓ', 'ḗ'];
        const glyphRings = [
            { axis: v3(0.2, 1, 0.3), radius: 1.45, speed: 0.00055, count: isMobile ? 7 : 12 },
            { axis: v3(1, -0.3, 0.4), radius: 1.75, speed: -0.0004, count: isMobile ? 6 : 10 },
            { axis: v3(-0.4, 0.5, 1), radius: 2.1, speed: 0.00032, count: isMobile ? 5 : 9 }
        ].map((r) => {
            r.axis = vNorm(r.axis);
            r.items = [];
            for (let i = 0; i < r.count; i++) {
                r.items.push({ phase: (i / r.count) * TAU, glyph: glyphs[(i * 11) % glyphs.length], size: 11 + (i % 3) * 3 });
            }
            return r;
        });

        // ── Constellation field ──────────────────────────────────
        const starCount = isMobile ? 60 : 130;
        const stars = [];
        for (let i = 0; i < starCount; i++) {
            const angle = Math.random() * TAU;
            const dist = 0.15 + Math.pow(Math.random(), 0.6) * 1.25;
            stars.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                z: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 1.2 + 0.3,
                twinkle: Math.random() * 0.04 + 0.01,
                phase: Math.random() * TAU
            });
        }

        // ── God rays ─────────────────────────────────────────────
        const rayCount = isMobile ? 10 : 18;
        const rays = [];
        for (let i = 0; i < rayCount; i++) {
            rays.push({
                angle: (i / rayCount) * TAU + Math.random() * 0.15,
                width: 0.025 + Math.random() * 0.03,
                speed: 0.00015 + Math.random() * 0.0002,
                opacity: 0.04 + Math.random() * 0.04
            });
        }

        // ── Ψ path (smooth vector) ───────────────────────────────
        function buildPsiPath() {
            const pts = [];
            const add = (x, y) => pts.push({ x, y });
            const line = (a, b, n) => {
                for (let i = 1; i < n; i++) {
                    const t = i / n;
                    add(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
                }
            };
            const quad = (p0, p1, p2, n) => {
                for (let i = 1; i < n; i++) {
                    const t = i / n, mt = 1 - t;
                    add(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                        mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);
                }
            };

            const top = { x: 0, y: -1.0 };
            const loopTop = { x: 0, y: -0.4 };
            const loopBottom = { x: 0, y: 0.4 };
            const bottom = { x: 0, y: 1.0 };
            const baseL = { x: -0.2, y: 0.78 };
            const baseR = { x: 0.2, y: 0.78 };

            add(top.x, top.y);
            line(top, loopTop, 10);
            quad(loopTop, { x: -0.62, y: -0.4 }, { x: -0.74, y: 0 }, 14);
            quad({ x: -0.74, y: 0 }, { x: -0.62, y: 0.4 }, loopBottom, 14);
            quad(loopBottom, { x: 0.62, y: 0.4 }, { x: 0.74, y: 0 }, 14);
            quad({ x: 0.74, y: 0 }, { x: 0.62, y: -0.4 }, loopTop, 14);
            line(loopTop, loopBottom, 6);
            line(loopBottom, bottom, 14);
            line(bottom, baseL, 4);
            line(baseL, baseR, 4);
            line(baseR, bottom, 4);
            return pts;
        }

        const psiPath = buildPsiPath();

        // ── Off-screen glow buffer ───────────────────────────────
        const glowCanvas = document.createElement('canvas');
        const glowCtx = glowCanvas.getContext('2d');
        function resizeGlow() {
            glowCanvas.width = Math.floor(width * 0.5);
            glowCanvas.height = Math.floor(height * 0.5);
        }
        resizeGlow();
        window.addEventListener('resize', resizeGlow);

        // ── Helpers ──────────────────────────────────────────────
        function ringBasis(axis) {
            let tmp = Math.abs(axis.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
            const u = vNorm(vRotAxis(vMul(tmp, 1), axis, 0));
            const v = vNorm(vRotAxis(u, axis, TAU / 4));
            return { u, v };
        }

        function drawSoftRing(radius, axis, rotation, alpha, lineWidth, hue) {
            const { u, v } = ringBasis(axis);
            const segs = isMobile ? 120 : 240;
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const t = (i / segs) * TAU + rotation;
                const local = vAdd(vMul(u, Math.cos(t) * radius), vMul(v, Math.sin(t) * radius));
                const world = vRotX(vRotY(local, yaw), pitch);
                pts.push(project(world));
            }

            ctx.beginPath();
            pts.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.strokeStyle = `hsla(${hue}, 70%, 58%, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = `hsla(${hue}, 80%, 55%, ${alpha * 0.8})`;
            ctx.shadowBlur = lineWidth * 4;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        function drawGlyphOrbits(base) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const items = [];

            glyphRings.forEach((ring) => {
                const { u, v } = ringBasis(ring.axis);
                ring.items.forEach((it) => {
                    const theta = it.phase + frame * ring.speed;
                    const local = vAdd(vMul(u, Math.cos(theta) * ring.radius * base), vMul(v, Math.sin(theta) * ring.radius * base));
                    const world = vRotX(vRotY(local, yaw), pitch);
                    items.push({ p: project(world), glyph: it.glyph, size: it.size, z: world.z });
                });
            });

            items.sort((a, b) => a.z - b.z);
            items.forEach((it) => {
                const a = Math.max(0.12, 0.55 * it.p.scale);
                const size = Math.max(8, it.size * it.p.scale);
                ctx.save();
                ctx.font = `300 ${size}px Cinzel, serif`;
                ctx.shadowColor = 'rgba(212,175,55,0.55)';
                ctx.shadowBlur = 14 * a;
                ctx.fillStyle = `rgba(255,235,190,${a})`;
                ctx.fillText(it.glyph, it.p.x, it.p.y);
                ctx.restore();
            });
        }

        function drawStars(base) {
            const proj = stars.map((s) => {
                const world = vRotX(vRotY(v3(s.x * base * 2.8, s.y * base * 2.8, s.z * base), yaw), pitch);
                return { p: project(world), z: world.z, star: s };
            });

            proj.sort((a, b) => a.z - b.z);

            // Connections
            ctx.strokeStyle = 'rgba(212,175,55,0.035)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < proj.length; i++) {
                for (let j = i + 1; j < proj.length; j++) {
                    const dx = proj[i].p.x - proj[j].p.x;
                    const dy = proj[i].p.y - proj[j].p.y;
                    if (dx * dx + dy * dy < 16000) {
                        ctx.beginPath();
                        ctx.moveTo(proj[i].p.x, proj[i].p.y);
                        ctx.lineTo(proj[j].p.x, proj[j].p.y);
                        ctx.stroke();
                    }
                }
            }

            // Stars
            proj.forEach((it) => {
                const twinkle = 0.5 + 0.5 * Math.sin(frame * it.star.twinkle + it.star.phase);
                const a = Math.max(0.05, 0.45 * it.p.scale * twinkle);
                ctx.beginPath();
                ctx.arc(it.p.x, it.p.y, Math.max(0.4, it.star.size * it.p.scale), 0, TAU);
                ctx.fillStyle = `rgba(255,235,190,${a})`;
                ctx.fill();
            });
        }

        function drawPsi(base) {
            const scale = base * 0.42;
            const timeRot = frame * 0.0015;

            // Outer halo first
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(timeRot * 0.2);

            const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, base * 0.55);
            halo.addColorStop(0, 'rgba(212,175,55,0.18)');
            halo.addColorStop(0.35, 'rgba(212,175,55,0.06)');
            halo.addColorStop(1, 'rgba(212,175,55,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(-base, -base, base * 2, base * 2);
            ctx.restore();

            // Draw Ψ with thick glowing strokes
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-timeRot * 0.1);
            ctx.scale(scale, scale);

            ctx.beginPath();
            psiPath.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();

            ctx.shadowColor = 'rgba(255,220,130,0.95)';
            ctx.shadowBlur = 28;
            ctx.strokeStyle = 'rgba(255,245,210,0.95)';
            ctx.lineWidth = 0.09;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            ctx.shadowColor = 'rgba(212,175,55,0.6)';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = 'rgba(212,175,55,0.55)';
            ctx.lineWidth = 0.22;
            ctx.stroke();

            ctx.restore();

            // Inner core
            const corePulse = 1 + Math.sin(frame * 0.025) * 0.06;
            ctx.beginPath();
            ctx.arc(cx, cy, base * 0.09 * corePulse, 0, TAU);
            ctx.fillStyle = 'rgba(255,250,230,0.9)';
            ctx.shadowColor = 'rgba(212,175,55,1)';
            ctx.shadowBlur = 42;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function drawGodRays() {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            rays.forEach((ray) => {
                const angle = ray.angle + frame * ray.speed;
                const len = Math.max(width, height) * 0.8;
                const x1 = cx + Math.cos(angle - ray.width) * baseScale() * 0.2;
                const y1 = cy + Math.sin(angle - ray.width) * baseScale() * 0.2;
                const x2 = cx + Math.cos(angle) * len;
                const y2 = cy + Math.sin(angle) * len;
                const x3 = cx + Math.cos(angle + ray.width) * len;
                const y3 = cy + Math.sin(angle + ray.width) * len;

                const grad = ctx.createLinearGradient(cx, cy, x2, y2);
                grad.addColorStop(0, `rgba(212,175,55,${ray.opacity})`);
                grad.addColorStop(0.5, `rgba(212,175,55,${ray.opacity * 0.35})`);
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

        function drawNebula() {
            const t = frame * 0.0008;
            const g = ctx.createRadialGradient(cx + Math.sin(t) * width * 0.1, cy + Math.cos(t * 1.3) * height * 0.08, 0, cx, cy, Math.max(width, height) * 0.65);
            g.addColorStop(0, 'rgba(60,45,20,0.08)');
            g.addColorStop(0.4, 'rgba(30,25,45,0.05)');
            g.addColorStop(0.75, 'rgba(5,5,8,0.02)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }

        function compositeGlow() {
            glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
            glowCtx.drawImage(heroCanvas, 0, 0, glowCanvas.width, glowCanvas.height);
            glowCtx.globalCompositeOperation = 'screen';
            for (let i = 0; i < 2; i++) {
                glowCtx.drawImage(glowCanvas, 0, 0, glowCanvas.width, glowCanvas.height);
            }
            glowCtx.globalCompositeOperation = 'source-over';

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.3;
            ctx.drawImage(glowCanvas, 0, 0, width, height);
            ctx.restore();
        }

        function drawVignette() {
            const g = ctx.createRadialGradient(cx, cy, baseScale() * 0.4, cx, cy, Math.max(width, height) * 0.75);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.65, 'rgba(0,0,0,0.35)');
            g.addColorStop(1, 'rgba(0,0,0,0.78)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }

        // ── Main loop ────────────────────────────────────────────
        let frame = 0;
        function loop() {
            frame++;
            pitch += (targetPitch - pitch) * 0.04;
            yaw += (targetYaw - yaw) * 0.04;
            const base = baseScale();

            ctx.fillStyle = '#030305';
            ctx.fillRect(0, 0, width, height);

            drawNebula();
            drawGodRays();
            drawStars(base);

            // Armillary rings (back to front)
            rings.forEach((ring, i) => {
                const rot = frame * ring.speed + ring.tilt;
                const alpha = 0.08 + (i / rings.length) * 0.12;
                drawSoftRing(ring.radius * base, ring.axis, rot, alpha, ring.width, ring.hue);
            });

            // Glyphs
            drawGlyphOrbits(base);

            // Central Ψ
            drawPsi(base);

            // Bloom & vignette
            compositeGlow();
            drawVignette();

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
