import json
from pathlib import Path

root = Path("C:/projects/punycodex")
effects_dir = root / "templates/flagship/effects"
effects_json = effects_dir / "effects.json"

specs = {
    "ankh":     {"cid": "ankh-life-canvas",    "theme": "life_rays",      "primary": "#C9A227", "secondary": "#1E3A5F", "desc": "Ankh — life, golden radiance, rising souls"},
    "aseratu":  {"cid": "aseratu-sea-canvas",  "theme": "sea_mother",     "primary": "#4B0082", "secondary": "#A0A0A0", "desc": "Ašeratu — sea waves, stars, motherly depths"},
    "ashur":    {"cid": "ashur-wing-canvas",   "theme": "winged_sun",     "primary": "#8B0000", "secondary": "#D4AF37", "desc": "Aššur — winged solar disk, Assyrian rays"},
    "isis":     {"cid": "isis-throne-canvas",  "theme": "magic_throne",   "primary": "#C9A227", "secondary": "#1E3A5F", "desc": "Isis — throne glyphs, starry magic, protective wings"},
    "bagua":    {"cid": "bagua-trigram-canvas","theme": "trigrams",       "primary": "#C41E3A", "secondary": "#D4AF37", "desc": "Bagua — rotating trigrams, chi flow"},
    "bastet":   {"cid": "bastet-cat-canvas",   "theme": "cat_moon",       "primary": "#C9A227", "secondary": "#1E3A5F", "desc": "Bastet — feline eyes, lunar glow, golden dust"},
    "david":    {"cid": "david-harp-canvas",   "theme": "harp_strings",   "primary": "#6B4C1E", "secondary": "#D4AF37", "desc": "David — harp strings, royal crown sparks"},
    "erebus":   {"cid": "erebus-void-canvas",  "theme": "deep_void",      "primary": "#2A1F3D", "secondary": "#D4AF37", "desc": "Erebus — primordial darkness, slow shadow tides"},
    "abel":     {"cid": "abel-pastoral-canvas","theme": "pastoral",       "primary": "#6B4C1E", "secondary": "#D4AF37", "desc": "Abel — green pastures, gentle flocks, morning light"},
    "hemera":   {"cid": "hemera-dawn-canvas",  "theme": "dawn_rays",      "primary": "#D4AF37", "secondary": "#4169E1", "desc": "Hemera — dawn rays, sky gradient, rising light"},
    "herakles": {"cid": "herakles-lion-canvas","theme": "hero_flame",     "primary": "#D4AF37", "secondary": "#4169E1", "desc": "Herakles — lion's mane flames, labors embers"},
    "leviathan":{"cid": "leviathan-coil-canvas","theme":"sea_serpent",    "primary": "#1E3A5F", "secondary": "#00CED1", "desc": "Leviathan — coiled sea serpent, bioluminescent depths"},
    "long":     {"cid": "long-dragon-canvas",  "theme": "dragon_coils",   "primary": "#C41E3A", "secondary": "#D4AF37", "desc": "Long — Chinese dragon coils, clouds, pearls"},
    "moses":    {"cid": "moses-desert-canvas", "theme": "desert_fire",    "primary": "#6B4C1E", "secondary": "#D4AF37", "desc": "Moses — desert sand, mountain fire, burning bush sparks"},
    "mot":      {"cid": "mot-death-canvas",    "theme": "death_dust",     "primary": "#4B0082", "secondary": "#A0A0A0", "desc": "Mot — underworld dust, stillness, pale flames"},
    "njordr":   {"cid": "njordr-waves-canvas", "theme": "sea_wind",       "primary": "#4A6741", "secondary": "#C9A227", "desc": "Njǫrðr — Norse sea and wind, longship waves"},
    "noah":     {"cid": "noah-rain-canvas",    "theme": "flood_rainbow",  "primary": "#6B4C1E", "secondary": "#D4AF37", "desc": "Noah — rain, ark silhouette, covenant rainbow"},
    "cain":     {"cid": "cain-mark-canvas",    "theme": "thorn_mark",     "primary": "#6B4C1E", "secondary": "#8B0000", "desc": "Cain — dark soil, thorns, the Mark"},
    "quetzalcoatl":{"cid":"quetzal-feather-canvas","theme":"feather_serpent","primary":"#00A86B","secondary":"#D4AF37","desc":"Quetzalcōātl — emerald feathers, wind spirals"},
    "sekhmet":  {"cid": "sekhmet-lion-canvas", "theme": "lioness_fire",   "primary": "#C9A227", "secondary": "#1E3A5F", "desc": "Sekhmet — lioness rage, solar flares, blood embers"},
    "shamash":  {"cid": "shamash-justice-canvas","theme":"justice_rays",  "primary": "#8B0000", "secondary": "#D4AF37", "desc": "Šamaš — rays of justice, law tablets, golden sun"},
    "solomon":  {"cid": "solomon-temple-canvas","theme":"temple_seal",   "primary": "#6B4C1E", "secondary": "#D4AF37", "desc": "Solomon — temple columns, seal rings, wisdom sparks"},
    "taichi":   {"cid": "taichi-swirl-canvas", "theme": "taiji_swirl",    "primary": "#C41E3A", "secondary": "#D4AF37", "desc": "Tàijí — rotating yin-yang, chi spiral"},
    "wadjet":   {"cid": "wadjet-cobra-canvas", "theme": "cobra_scales",   "primary": "#C9A227", "secondary": "#1E3A5F", "desc": "Wadjet — cobra scales, protective green flame"},
    "wuji":     {"cid": "wuji-void-canvas",    "theme": "primordial_mist","primary": "#2F4F4F", "secondary": "#00CED1", "desc": "Wújí — primordial emptiness, slow mist, no form"},
    "wuxing":   {"cid": "wuxing-elements-canvas","theme":"five_elements", "primary": "#C41E3A", "secondary": "#D4AF37", "desc": "Wǔxíng — five elemental phases, colored orbs"},
    "yinyang":  {"cid": "yinyang-swirl-canvas","theme": "dual_swirl",     "primary": "#2F4F4F", "secondary": "#00CED1", "desc": "Yīnyáng — black and white dual swirl, dots"},
}

def write_effect(site_id, spec):
    cid = spec["cid"]
    theme = spec["theme"]
    p = spec["primary"]
    s = spec["secondary"]
    desc = spec["desc"]

    body = f"""// {desc}
(function() {{
    const canvas = document.getElementById('{cid}');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {{
        const n = parseInt(hex.slice(1), 16);
        return {{ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }};
    }}
    const P = hexToRgb('{p}');
    const S = hexToRgb('{s}');

    function resize() {{
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }}
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const PARTICLE_COUNT = 70;
    for (let i = 0; i < PARTICLE_COUNT; i++) {{
        particles.push({{
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.5 ? P : S
        }});
    }}

"""

    if theme == "life_rays":
        body += f"""
    const rays = [];
    for (let i = 0; i < 12; i++) {{
        rays.push({{ angle: Math.random() * Math.PI * 2, width: Math.random() * 0.2 + 0.05, speed: (Math.random() - 0.5) * 0.002, alpha: Math.random() * 0.15 + 0.05 }});
    }}
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.35;
        rays.forEach(r => {{
            r.angle += r.speed;
            const a = r.alpha * (0.7 + 0.3 * Math.sin(frame * 0.01 + r.angle * 5));
            const g = ctx.createConicGradient(r.angle, cx, cy);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            g.addColorStop(0.5, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`);
            g.addColorStop(1, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }});
        particles.forEach(p => {{ p.y -= 0.3; p.x += Math.sin(frame * 0.01 + p.phase) * 0.3; if (p.y < -10) p.y = height + 10; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "sea_mother":
        body += f"""
    let waveOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        waveOffset += 0.005;
        for (let d = 0; d < 4; d++) {{
            ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{0.03 + d * 0.01}})`;
            ctx.beginPath();
            const baseY = height - 30 - d * 35;
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {{
                const y = baseY + Math.sin((x + waveOffset * 40 + d * 150) * 0.004) * 30 + Math.cos((x + waveOffset * 25 + d * 80) * 0.008) * 15;
                ctx.lineTo(x, y);
            }}
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy + Math.sin(frame * 0.01 + p.phase) * 0.1; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha * 0.6}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "winged_sun":
        body += f"""
    let wingFlap = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        wingFlap += 0.02;
        const cx = width * 0.5, cy = height * 0.25;
        for (let i = 0; i < 16; i++) {{
            const a = (i / 16) * Math.PI * 2 + frame * 0.002;
            const len = 120 + Math.sin(frame * 0.03 + i) * 20;
            const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.25)`);
            g.addColorStop(1, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }}
        ctx.save(); ctx.translate(cx, cy);
        const flap = Math.sin(wingFlap) * 0.1;
        ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.12)`;
        for (let side of [-1, 1]) {{
            ctx.save(); ctx.scale(side, 1); ctx.rotate(flap);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(80, -60, 180, -40, 220, 10); ctx.bezierCurveTo(160, 30, 90, 20, 0, 0); ctx.fill(); ctx.restore();
        }}
        ctx.restore();
        particles.forEach(p => {{ p.x += p.vx * 0.5; p.y += p.vy * 0.5; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "magic_throne":
        body += f"""
    const glyphs = [];
    for (let i = 0; i < 8; i++) glyphs.push({{ x: Math.random(), y: Math.random(), size: Math.random() * 20 + 15, phase: Math.random() * Math.PI * 2 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        glyphs.forEach(g => {{
            g.phase += 0.015;
            const x = g.x * width, y = g.y * height;
            const a = 0.08 + 0.05 * Math.sin(g.phase);
            ctx.strokeStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - g.size, y); ctx.lineTo(x - g.size * 0.3, y - g.size * 0.6); ctx.lineTo(x + g.size * 0.3, y - g.size * 0.6); ctx.lineTo(x + g.size, y); ctx.lineTo(x + g.size * 0.3, y + g.size * 0.6); ctx.lineTo(x - g.size * 0.3, y + g.size * 0.6); ctx.closePath(); ctx.stroke();
        }});
        particles.forEach(p => {{ p.y -= 0.2; p.x += Math.sin(frame * 0.01 + p.phase) * 0.2; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "trigrams":
        body += f"""
    const trigrams = [];
    for (let i = 0; i < 8; i++) trigrams.push({{ angle: (i / 8) * Math.PI * 2, dist: 90 + Math.random() * 40, phase: Math.random() * Math.PI * 2 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.35;
        trigrams.forEach(t => {{
            t.angle += 0.003; t.phase += 0.02;
            const x = cx + Math.cos(t.angle) * t.dist;
            const y = cy + Math.sin(t.angle) * t.dist * 0.5;
            const a = 0.15 + 0.08 * Math.sin(t.phase);
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`;
            ctx.save(); ctx.translate(x, y); ctx.rotate(t.angle + Math.PI / 2);
            for (let row = 0; row < 3; row++) {{
                const broken = (row + Math.floor(t.angle * 10)) % 2 === 0;
                const yy = (row - 1) * 10;
                if (broken) {{ ctx.fillRect(-14, yy, 10, 3); ctx.fillRect(4, yy, 10, 3); }} else {{ ctx.fillRect(-16, yy, 32, 3); }}
            }}
            ctx.restore();
        }});
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "cat_moon":
        body += f"""
    let moonPhase = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        moonPhase += 0.01;
        const cx = width * 0.75, cy = height * 0.2, r = 50;
        ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.15)`;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.25)`;
        ctx.beginPath(); ctx.arc(cx + Math.sin(moonPhase) * 8, cy, r - 4, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) {{
            const ex = Math.random() * width, ey = Math.random() * height;
            const a = 0.1 + 0.1 * Math.sin(frame * 0.05 + i);
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`;
            ctx.beginPath(); ctx.ellipse(ex, ey, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "harp_strings":
        body += f"""
    const strings = [];
    for (let i = 0; i < 9; i++) strings.push({{ x: 0.2 + i * 0.075, phase: Math.random() * Math.PI * 2 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        strings.forEach((str, i) => {{
            str.phase += 0.05;
            const x = str.x * width;
            const amp = 4 + Math.sin(str.phase) * 3;
            ctx.strokeStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.2)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, height * 0.25);
            for (let y = height * 0.25; y < height * 0.85; y += 10) {{
                ctx.lineTo(x + Math.sin((y + str.phase * 20) * 0.05) * amp, y);
            }}
            ctx.lineTo(x, height * 0.85); ctx.stroke();
        }});
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "deep_void":
        body += f"""
    const tendrils = [];
    for (let i = 0; i < 7; i++) tendrils.push({{ x: Math.random() * width, width: 20 + Math.random() * 40, phase: Math.random() * Math.PI * 2, speed: 0.002 + Math.random() * 0.003 }});
    function draw() {{
        ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.08)`;
        ctx.fillRect(0, 0, width, height);
        tendrils.forEach(t => {{
            t.phase += t.speed;
            const a = 0.04 + 0.03 * Math.sin(t.phase);
            const g = ctx.createLinearGradient(t.x, -50, t.x, height + 50);
            g.addColorStop(0, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            g.addColorStop(0.5, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{a}})`);
            g.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.fillStyle = g; ctx.fillRect(t.x - t.width / 2, 0, t.width, height);
        }});
        particles.forEach(p => {{ p.x += p.vx * 0.3; p.y += p.vy * 0.3; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha * 0.5}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "pastoral":
        body += f"""
    let hillOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        hillOffset += 0.2;
        for (let d = 0; d < 3; d++) {{
            ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{0.04 + d * 0.015}})`;
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 15) {{
                const y = height - 40 - d * 40 + Math.sin((x + hillOffset + d * 200) * 0.005) * 25;
                ctx.lineTo(x, y);
            }}
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "dawn_rays":
        body += f"""
    const rays = [];
    for (let i = 0; i < 10; i++) rays.push({{ angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2, width: Math.random() * 0.15 + 0.05, phase: Math.random() * Math.PI * 2 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.2;
        rays.forEach(r => {{
            r.phase += 0.02;
            const a = 0.08 + 0.05 * Math.sin(r.phase);
            const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle) * height, cy + Math.sin(r.angle) * height);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`);
            g.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, height, r.angle - r.width / 2, r.angle + r.width / 2); ctx.closePath(); ctx.fill();
        }});
        particles.forEach(p => {{ p.y -= 0.3; p.x += Math.sin(frame * 0.01 + p.phase) * 0.3; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "hero_flame":
        body += f"""
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, baseY = height * 0.85;
        for (let i = 0; i < 30; i++) {{
            const x = cx + (Math.random() - 0.5) * 200;
            const h = 60 + Math.random() * 120;
            const a = 0.05 + Math.random() * 0.08;
            const g = ctx.createLinearGradient(x, baseY, x, baseY - h);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`);
            g.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, baseY - h / 2, 8 + Math.random() * 8, h / 2, 0, 0, Math.PI * 2); ctx.fill();
        }}
        particles.forEach(p => {{ p.y -= 0.5; p.x += (Math.random() - 0.5) * 0.5; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "sea_serpent":
        body += f"""
    let coilOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        coilOffset += 0.01;
        ctx.strokeStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.12)`;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 4; t += 0.05) {{
            const r = 80 + t * 12;
            const x = width * 0.5 + Math.cos(t + coilOffset) * r;
            const y = height * 0.6 + Math.sin(t * 2 + coilOffset) * r * 0.4;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }}
        ctx.stroke();
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "dragon_coils":
        body += f"""
    let dragonPhase = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        dragonPhase += 0.008;
        ctx.strokeStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.15)`;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 5; t += 0.04) {{
            const r = 60 + t * 18;
            const x = width * 0.5 + Math.cos(t + dragonPhase) * r;
            const y = height * 0.45 + Math.sin(t * 1.5 + dragonPhase) * r * 0.35;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }}
        ctx.stroke();
        const px = width * 0.5 + Math.cos(dragonPhase * 3) * 120;
        const py = height * 0.45 + Math.sin(dragonPhase * 3) * 60;
        ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.25)`;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "desert_fire":
        body += f"""
    let duneOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        duneOffset += 0.15;
        for (let d = 0; d < 3; d++) {{
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{0.04 + d * 0.01}})`;
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {{
                const y = height - 30 - d * 30 + Math.sin((x + duneOffset + d * 200) * 0.004) * 25;
                ctx.lineTo(x, y);
            }}
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }}
        particles.forEach(p => {{ p.y -= 0.6; p.x += (Math.random() - 0.5) * 0.8; if (p.y < -10) {{ p.y = height + 10; p.x = Math.random() * width; }} ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "death_dust":
        body += f"""
    function draw() {{
        ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.05)`;
        ctx.fillRect(0, 0, width, height);
        particles.forEach(p => {{ p.y += 0.2; p.x += Math.sin(frame * 0.01 + p.phase) * 0.2; if (p.y > height + 10) {{ p.y = -10; p.x = Math.random() * width; }} ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha * 0.5}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "sea_wind":
        body += f"""
    let waveOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        waveOffset += 0.015;
        for (let d = 0; d < 4; d++) {{
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{0.04 + d * 0.01}})`;
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {{
                const y = height - 25 - d * 30 + Math.sin((x + waveOffset * 50 + d * 150) * 0.004) * 30 + Math.cos((x + waveOffset * 30 + d * 80) * 0.007) * 12;
                ctx.lineTo(x, y);
            }}
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx + 0.3; p.y += p.vy; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "flood_rainbow":
        body += f"""
    let rainFrame = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        rainFrame += 1;
        ctx.strokeStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.15)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {{
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 25); ctx.stroke();
        }}
        if (rainFrame % 600 < 300) {{
            const t = (rainFrame % 300) / 300;
            const a = 0.15 * Math.sin(t * Math.PI);
            const g = ctx.createRadialGradient(width * 0.5, height * 0.8, 0, width * 0.5, height * 0.8, width * 0.5);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            g.addColorStop(0.5, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a * 0.5}})`);
            g.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(width * 0.5, height * 0.8, width * 0.5, Math.PI, 0); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy + 0.5; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "thorn_mark":
        body += f"""
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.15)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {{
            const x = (i / 12) * width + Math.sin(frame * 0.01 + i) * 20;
            const baseY = height;
            ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + 10, baseY - 80, x + Math.sin(frame * 0.02 + i) * 30, baseY - 140); ctx.stroke();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "feather_serpent":
        body += f"""
    let featherPhase = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        featherPhase += 0.01;
        ctx.strokeStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.15)`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 4; t += 0.04) {{
            const r = 70 + t * 14;
            const x = width * 0.5 + Math.cos(t + featherPhase) * r;
            const y = height * 0.5 + Math.sin(t * 1.3 + featherPhase) * r * 0.35;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }}
        ctx.stroke();
        for (let i = 0; i < 20; i++) {{
            const a = (i / 20) * Math.PI * 2 + featherPhase;
            const x = width * 0.5 + Math.cos(a) * (120 + Math.sin(frame * 0.03 + i) * 20);
            const y = height * 0.5 + Math.sin(a) * 60;
            ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.12)`;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "lioness_fire":
        body += f"""
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, baseY = height * 0.9;
        for (let i = 0; i < 40; i++) {{
            const x = cx + (Math.random() - 0.5) * 260;
            const h = 80 + Math.random() * 140;
            const a = 0.06 + Math.random() * 0.08;
            const g = ctx.createLinearGradient(x, baseY, x, baseY - h);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`);
            g.addColorStop(0.5, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{a * 0.7}})`);
            g.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, baseY - h / 2, 10 + Math.random() * 10, h / 2, 0, 0, Math.PI * 2); ctx.fill();
        }}
        particles.forEach(p => {{ p.y -= 0.7; p.x += (Math.random() - 0.5) * 0.6; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "justice_rays":
        body += f"""
    const tablets = [];
    for (let i = 0; i < 2; i++) tablets.push({{ x: 0.35 + i * 0.3, y: 0.25, w: 70, h: 100, phase: Math.random() * Math.PI * 2 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.15;
        for (let i = 0; i < 18; i++) {{
            const a = (i / 18) * Math.PI * 2 + frame * 0.001;
            const len = 180 + Math.sin(frame * 0.03 + i) * 30;
            const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            grad.addColorStop(0, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.2)`);
            grad.addColorStop(1, `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0)`);
            ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }}
        tablets.forEach(t => {{
            t.phase += 0.015;
            const x = t.x * width, y = t.y * height;
            const alpha = 0.12 + 0.06 * Math.sin(t.phase);
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{alpha}})`;
            ctx.fillRect(x - t.w / 2, y, t.w, t.h);
            ctx.strokeStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{alpha + 0.1}})`;
            ctx.strokeRect(x - t.w / 2, y, t.w, t.h);
        }});
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "temple_seal":
        body += f"""
    const columns = [];
    for (let i = 0; i < 6; i++) columns.push({{ x: (i + 1) / 7 }});
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        columns.forEach(c => {{
            const x = c.x * width;
            const g = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
            g.addColorStop(0, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            g.addColorStop(0.5, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.08)`);
            g.addColorStop(1, `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0)`);
            ctx.fillStyle = g; ctx.fillRect(x - 15, 0, 30, height);
        }});
        const cx = width * 0.5, cy = height * 0.35;
        for (let r = 30; r < 120; r += 25) {{
            ctx.strokeStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, ${{0.1 - r * 0.0005}})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, r + Math.sin(frame * 0.02 + r) * 3, 0, Math.PI * 2); ctx.stroke();
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme in ("taiji_swirl", "dual_swirl"):
        body += f"""
    let rotation = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        rotation += 0.004;
        const cx = width * 0.5, cy = height * 0.4, r = 110;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation);
        ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.12)`;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${{S.r}}, ${{S.g}}, ${{S.b}}, 0.12)`;
        ctx.beginPath(); ctx.arc(0, -r / 2, r / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.12)`;
        ctx.beginPath(); ctx.arc(0, r / 2, r / 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "cobra_scales":
        body += f"""
    let scaleOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        scaleOffset += 0.3;
        const size = 24;
        for (let y = 0; y < height + size; y += size) {{
            for (let x = 0; x < width + size; x += size) {{
                const dx = x - width * 0.5;
                const dy = y - height * 0.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const a = 0.04 + 0.04 * Math.sin((dist - scaleOffset) * 0.05);
                ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, ${{a}})`;
                ctx.beginPath(); ctx.arc(x + (y / size % 2) * size / 2, y, size / 2 - 2, 0, Math.PI, true); ctx.fill();
            }}
        }}
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "primordial_mist":
        body += f"""
    let mistOffset = 0;
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        mistOffset += 0.2;
        for (let d = 0; d < 5; d++) {{
            ctx.fillStyle = `rgba(${{P.r}}, ${{P.g}}, ${{P.b}}, 0.03)`;
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {{
                const y = height * 0.5 + d * 30 + Math.sin((x + mistOffset + d * 300) * 0.003) * 60;
                ctx.lineTo(x, y);
            }}
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }}
        particles.forEach(p => {{ p.x += p.vx * 0.3; p.y += p.vy * 0.3; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha * 0.6}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    elif theme == "five_elements":
        body += f"""
    const colors = [
        {{ r: 34, g: 139, b: 34 }},
        {{ r: 220, g: 20, b: 60 }},
        {{ r: 218, g: 165, b: 32 }},
        {{ r: 192, g: 192, b: 192 }},
        {{ r: 30, g: 144, b: 255 }},
    ];
    particles.forEach((p, i) => p.color = colors[i % 5]);
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {{
            p.x += p.vx; p.y += p.vy;
            if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10;
            ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.3, 0, Math.PI * 2); ctx.fill();
        }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""
    else:
        body += f"""
    function draw() {{
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {{ p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${{p.color.r}}, ${{p.color.g}}, ${{p.color.b}}, ${{p.alpha}})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }});
        frame++;
        requestAnimationFrame(draw);
    }}
"""

    body += "    draw();\n})();\n"
    (effects_dir / f"{site_id}.js").write_text(body, encoding="utf-8")

for site_id, spec in specs.items():
    write_effect(site_id, spec)

with effects_json.open("r", encoding="utf-8") as f:
    data = json.load(f)
for site_id, spec in specs.items():
    data[site_id] = {"canvasId": spec["cid"]}
with effects_json.open("w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Generated {len(specs)} bespoke effects and updated effects.json")
