/**
 * PUNYCODEX — Cognate Network Graph
 * Canvas-based force-directed graph. No external dependencies.
 */

(function() {
    'use strict';

    if (typeof LEXICON === 'undefined') {
        console.error('LEXICON not loaded');
        return;
    }

    // ─── Color map by pantheon ───
    const PANTHEON_COLORS = {
        greek: '#4169E1',
        'greek-location': '#4169E1',
        norse: '#C0C0C0',
        egyptian: '#1E3A5F',
        sanskrit: '#FF9933',
        celtic: '#228B22',
        mesopotamian: '#CD7F32',
        polynesian: '#50C878',
        japanese: '#DC143C',
        nahuatl: '#50C878',
        yoruba: '#D4AF37',
        slavic: '#C0C0C0',
        zoroastrian: '#FF4500',
        incan: '#D4AF37',
        chinese: '#DC143C',
        buddhist: '#DC143C',
        taoist: '#DC143C',
        korean: '#DC143C',
        phoenician: '#1E3A5F',
        hittite: '#CD7F32'
    };

    // ─── Build graph data ───
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Add all entries with etymology as nodes
    LEXICON.forEach((entry, i) => {
        if (!entry.etymology) return;
        const node = {
            id: entry.id,
            label: entry.unicode,
            entry: entry,
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: 0,
            vy: 0,
            radius: entry.etymology.cognates && entry.etymology.cognates.length > 0 ? 18 : 12,
            color: PANTHEON_COLORS[entry.pantheon] || '#808080',
            index: nodes.length
        };
        nodes.push(node);
        nodeMap.set(entry.id, node);
    });

    // Build edges from cognate relationships
    nodes.forEach(node => {
        const etym = node.entry.etymology;
        if (!etym.cognates) return;
        etym.cognates.forEach(c => {
            const target = nodeMap.get(c.id);
            if (target && target.index > node.index) {
                edges.push({ source: node, target: target, label: c.relationship });
            }
        });
    });

    // ─── Canvas setup ───
    const canvas = document.getElementById('cognate-canvas');
    const ctx = canvas.getContext('2d');
    const sidebar = document.getElementById('graph-sidebar');
    let width, height, dpr;
    let running = true;
    let draggedNode = null;
    let hoveredNode = null;
    let transform = { x: 0, y: 0, scale: 1 };

    function resize() {
        const wrap = canvas.parentElement;
        dpr = window.devicePixelRatio || 1;
        width = wrap.clientWidth;
        height = wrap.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Center initial nodes
    const cx = width / 2;
    const cy = height / 2;
    nodes.forEach(n => {
        n.x = cx + (Math.random() - 0.5) * 300;
        n.y = cy + (Math.random() - 0.5) * 300;
    });

    // ─── Physics ───
    function stepPhysics() {
        if (!running) return;

        const k = 0.05; // spring constant
        const repulsion = 8000;
        const damping = 0.85;
        const centerForce = 0.002;

        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = repulsion / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }
        }

        // Spring attraction along edges
        edges.forEach(e => {
            const a = e.source;
            const b = e.target;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 120;
            const force = (dist - targetDist) * k;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
        });

        // Center gravity
        nodes.forEach(n => {
            n.vx += (cx - n.x) * centerForce;
            n.vy += (cy - n.y) * centerForce;
        });

        // Update positions
        nodes.forEach(n => {
            if (n === draggedNode) return;
            n.vx *= damping;
            n.vy *= damping;
            n.x += n.vx;
            n.y += n.vy;
        });
    }

    // ─── Render ───
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        // Edges
        edges.forEach(e => {
            ctx.beginPath();
            ctx.moveTo(e.source.x, e.source.y);
            ctx.lineTo(e.target.x, e.target.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Nodes
        nodes.forEach(n => {
            // Glow
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = n.color + '18';
            ctx.fill();

            // Circle
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fillStyle = n.color + '30';
            ctx.fill();
            ctx.strokeStyle = n.color;
            ctx.lineWidth = n === hoveredNode ? 2.5 : 1.5;
            ctx.stroke();

            // Label
            ctx.font = '11px Cinzel, serif';
            ctx.fillStyle = '#e0e0e0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(n.label, n.x, n.y + n.radius + 6);
        });

        ctx.restore();
        requestAnimationFrame(draw);
    }

    // Physics loop
    function physicsLoop() {
        stepPhysics();
        setTimeout(physicsLoop, 16);
    }

    physicsLoop();
    draw();

    // ─── Interaction ───
    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left - transform.x) / transform.scale,
            y: (evt.clientY - rect.top - transform.y) / transform.scale
        };
    }

    function findNodeAt(pos) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = pos.x - n.x;
            const dy = pos.y - n.y;
            if (dx * dx + dy * dy <= (n.radius + 8) * (n.radius + 8)) {
                return n;
            }
        }
        return null;
    }

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        draggedNode = findNodeAt(pos);
        if (draggedNode) {
            draggedNode.vx = 0;
            draggedNode.vy = 0;
            renderSidebar(draggedNode.entry);
        }
    });

    canvas.addEventListener('mousemove', e => {
        const pos = getMousePos(e);
        hoveredNode = findNodeAt(pos);
        canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
        if (draggedNode) {
            draggedNode.x = pos.x;
            draggedNode.y = pos.y;
        }
    });

    canvas.addEventListener('mouseup', () => {
        draggedNode = null;
    });

    canvas.addEventListener('mouseleave', () => {
        draggedNode = null;
        hoveredNode = null;
    });

    // Touch support
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            const pos = getMousePos(e.touches[0]);
            draggedNode = findNodeAt(pos);
            if (draggedNode) renderSidebar(draggedNode.entry);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
        if (draggedNode && e.touches.length === 1) {
            const pos = getMousePos(e.touches[0]);
            draggedNode.x = pos.x;
            draggedNode.y = pos.y;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        draggedNode = null;
    });

    // ─── Sidebar rendering ───
    function renderSidebar(entry) {
        const e = entry.etymology;
        const protoLabel = {
            'proto-indo-european': 'PIE',
            'proto-afro-asiatic': 'Afro-Asiatic',
            'proto-polynesian': 'Proto-Polynesian',
            'proto-uto-aztecan': 'Proto-Uto-Aztecan',
            'proto-sino-tibetan': 'Proto-Sino-Tibetan',
            'proto-mayan': 'Proto-Mayan',
            'isolate': 'Language Isolate',
            'unknown': 'Unknown'
        }[e.protoLanguage] || e.protoLanguage;

        let cognatesHtml = '';
        if (e.cognates && e.cognates.length > 0) {
            cognatesHtml = '<div class="sidebar-cognates"><h4>Cognates</h4>' +
                e.cognates.map(c => {
                    const isLink = nodeMap.has(c.id);
                    const tag = isLink ? 'a' : 'span';
                    const href = isLink ? ` href="/sites/${c.id}${c.hasAdSite ? '/lore/' : '/'}"` : '';
                    return `<${tag}${href} class="sidebar-cognate">${escapeHtml(c.form)} <span class="sidebar-cognate-lang">${c.language}</span></${tag}>`;
                }).join('') +
                '</div>';
        }

        sidebar.innerHTML = `
            <div class="sidebar-content">
                <a href="/sites/${entry.id}${entry.hasAdSite ? '/lore/' : '/'}" class="sidebar-title">${escapeHtml(entry.unicode)}</a>
                <span class="sidebar-greek">${entry.greek !== '—' ? escapeHtml(entry.greek) : ''}</span>
                <span class="sidebar-domain">${escapeHtml(entry.domain)}</span>
                ${e.protoForm ? `<div class="sidebar-proto"><span class="sidebar-proto-label">${escapeHtml(protoLabel)}</span><span class="sidebar-proto-form">${escapeHtml(e.protoForm)}</span></div>` : ''}
                ${e.protoGloss ? `<p class="sidebar-gloss">"${escapeHtml(e.protoGloss)}"</p>` : ''}
                ${e.derivation ? `<p class="sidebar-derivation">${escapeHtml(e.derivation)}</p>` : ''}
                ${cognatesHtml}
                <span class="sidebar-certainty certainty-${e.certainty}">${e.certainty}</span>
            </div>
        `;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Controls ───
    document.getElementById('btn-reset').addEventListener('click', () => {
        transform = { x: 0, y: 0, scale: 1 };
        nodes.forEach(n => {
            n.x = cx + (Math.random() - 0.5) * 300;
            n.y = cy + (Math.random() - 0.5) * 300;
            n.vx = 0;
            n.vy = 0;
        });
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
        running = !running;
        document.getElementById('btn-pause').textContent = running ? '⏸' : '▶';
    });

})();
