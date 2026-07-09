/* ===== DĒMĒTĒR CANVAS — The Harvest at Golden Hour ===== */
/* Canvas layers:
 * 1. Warm earth background
 * 2. Golden sunbeams from above
 * 3. Swaying wheat stalks at bottom
 * 4. Floating pollen/golden dust
 * 5. Falling autumn leaves
 * 6. Butterflies drifting
 * 7. Warm ground glow
 */

const canvas = document.getElementById('harvest-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {

let width, height, dpr;
let mouseX = 0, mouseY = 0;
let frameCount = 0;

// Resize
function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initElements();
}

// ========== ELEMENT CLASSES ==========

// --- Sunbeams ---
class Sunbeam {
    constructor() {
        this.reset();
    }
    reset() {
        this.originX = Math.random() * width;
        this.originY = -20;
        this.angle = Math.random() * Math.PI * 0.3 + Math.PI * 0.35; // Downward spread
        this.length = Math.random() * height * 0.8 + height * 0.3;
        this.width = Math.random() * 4 + 2;
        this.speed = Math.random() * 0.2 + 0.05;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.06 + 0.02;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 400 + 300;
    }
    update() {
        this.life++;
        if (this.state === 'fading_in') {
            this.alpha += 0.002;
            if (this.alpha >= this.targetAlpha) this.state = 'holding';
        } else if (this.state === 'holding') {
            this.alpha = this.targetAlpha + Math.sin(this.life * 0.008) * 0.008;
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.002;
            if (this.alpha <= 0) this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        const endX = this.originX + Math.cos(this.angle) * this.length;
        const endY = this.originY + Math.sin(this.angle) * this.length;
        const grad = ctx.createLinearGradient(this.originX, this.originY, endX, endY);
        grad.addColorStop(0, `rgba(255, 215, 100, ${this.alpha})`);
        grad.addColorStop(0.5, `rgba(218, 165, 32, ${this.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(218, 165, 32, 0)');

        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.originX, this.originY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Wheat Stalk ---
class WheatStalk {
    constructor(x) {
        this.baseX = x;
        this.reset();
    }
    reset() {
        this.x = this.baseX;
        this.y = height;
        this.height = Math.random() * height * 0.15 + height * 0.08;
        this.swayFreq = Math.random() * 0.015 + 0.008;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swayAmp = Math.random() * 15 + 8;
        this.stalkWidth = Math.random() * 1.5 + 0.8;
        this.goldness = Math.random() * 0.3 + 0.7;
    }
    update() {
        // Sway with wind
        this.swayPhase += this.swayFreq;
    }
    draw() {
        const sway = Math.sin(this.swayPhase) * this.swayAmp;
        const tipX = this.x + sway;
        const tipY = this.y - this.height;

        // Stalk
        const stalkGrad = ctx.createLinearGradient(this.x, this.y, tipX, tipY);
        stalkGrad.addColorStop(0, `rgba(107, 142, 35, ${0.5 * this.goldness})`);
        stalkGrad.addColorStop(0.5, `rgba(139, 90, 43, ${0.6 * this.goldness})`);
        stalkGrad.addColorStop(1, `rgba(218, 165, 32, ${0.8 * this.goldness})`);

        ctx.save();
        ctx.strokeStyle = stalkGrad;
        ctx.lineWidth = this.stalkWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.quadraticCurveTo(this.x + sway * 0.3, this.y - this.height * 0.5, tipX, tipY);
        ctx.stroke();

        // Wheat head (grain clusters)
        const headSize = this.height * 0.2;
        const headSegments = 5;
        for (let i = 0; i < headSegments; i++) {
            const t = i / headSegments;
            const hx = tipX + Math.sin(this.swayPhase + t) * 3;
            const hy = tipY + t * headSize;
            ctx.fillStyle = `rgba(218, 165, 32, ${0.7 * this.goldness})`;
            ctx.beginPath();
            ctx.ellipse(hx, hy, 2.5, 4, this.swayPhase * 0.1 + t, 0, Math.PI * 2);
            ctx.fill();
        }

        // Awns (the thin hairs on wheat)
        ctx.strokeStyle = `rgba(255, 215, 100, ${0.3 * this.goldness})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            const angle = -Math.PI / 2 + (i - 1) * 0.3 + Math.sin(this.swayPhase) * 0.1;
            const awnLen = 8 + Math.random() * 4;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + Math.cos(angle) * awnLen, tipY + Math.sin(angle) * awnLen);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// --- Pollen/Dust Particle ---
class Pollen {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.3 - 0.1;
        this.alpha = Math.random() * 0.4 + 0.1;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulsePhase += this.pulseSpeed;
        if (this.x < -10 || this.x > width + 10 || this.y < -10 || this.y > height + 10) {
            this.reset();
        }
    }
    draw() {
        const alpha = this.alpha + Math.sin(this.pulsePhase) * 0.08;
        ctx.fillStyle = `rgba(255, 215, 100, ${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Falling Leaf ---
class Leaf {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = -20;
        this.size = Math.random() * 8 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.025;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = Math.random() * 0.8 + 0.3;
        this.swayFreq = Math.random() * 0.015 + 0.008;
        this.swayPhase = Math.random() * Math.PI * 2;
        const colors = [
            { r: 218, g: 165, b: 32 },   // harvest gold
            { r: 210, g: 105, b: 30 },   // amber
            { r: 255, g: 215, b: 0 },    // wheat gold
            { r: 107, g: 142, b: 35 },   // olive
            { r: 139, g: 90, b: 43 },    // earth brown
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.y += this.vy;
        this.x += this.vx + Math.sin(frameCount * this.swayFreq + this.swayPhase) * 0.4;
        this.rotation += this.rotSpeed;
        if (this.y > height + 20) this.reset();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.7)`;
        // Leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Vein
        ctx.strokeStyle = `rgba(${this.color.r - 30}, ${this.color.g - 20}, ${this.color.b - 30}, 0.5)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.7, 0);
        ctx.lineTo(this.size * 0.7, 0);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Butterfly ---
class Butterfly {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() < 0.5 ? -30 : width + 30;
        this.y = Math.random() * height * 0.6 + height * 0.1;
        this.targetX = Math.random() * width;
        this.targetY = Math.random() * height * 0.7 + height * 0.1;
        this.speed = Math.random() * 0.8 + 0.4;
        this.wingPhase = Math.random() * Math.PI * 2;
        this.wingSpeed = Math.random() * 0.15 + 0.1;
        this.size = Math.random() * 6 + 4;
        this.hue = Math.random() * 40 + 30; // Gold/orange range
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 500 + 400;
    }
    update() {
        this.life++;
        this.wingPhase += this.wingSpeed;

        // Gentle drift toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            this.targetX = Math.random() * width;
            this.targetY = Math.random() * height * 0.7 + height * 0.1;
        }

        // Bobbing motion
        this.y += Math.sin(frameCount * 0.03 + this.life * 0.01) * 0.3;

        if (this.state === 'fading_in') {
            this.alpha += 0.01;
            if (this.alpha >= 0.7) this.state = 'holding';
        } else if (this.state === 'holding') {
            if (this.life > this.maxLife * 0.7) this.state = 'fading_out';
        } else {
            this.alpha -= 0.008;
            if (this.alpha <= 0) this.reset();
        }

        if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
            this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.alpha;

        const wingScale = Math.abs(Math.sin(this.wingPhase));

        // Wings
        ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, 0.7)`;
        // Left wing
        ctx.save();
        ctx.scale(wingScale, 1);
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.5, -this.size * 0.3, this.size * 0.6, this.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.4, this.size * 0.2, this.size * 0.4, this.size * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.scale(-wingScale, 1);
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.5, -this.size * 0.3, this.size * 0.6, this.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.4, this.size * 0.2, this.size * 0.4, this.size * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body
        ctx.fillStyle = `hsla(${this.hue}, 60%, 30%, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.15, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Ground Glow ---
class GroundGlow {
    constructor() {
        this.particles = [];
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: height - Math.random() * height * 0.1,
                radius: Math.random() * 60 + 30,
                speed: Math.random() * 0.2 + 0.05,
                alpha: Math.random() * 0.06 + 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    update() {
        for (let p of this.particles) {
            p.x += Math.sin(frameCount * 0.003 + p.phase) * p.speed;
        }
    }
    draw() {
        for (let p of this.particles) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, `rgba(218, 165, 32, ${p.alpha})`);
            grad.addColorStop(0.5, `rgba(210, 105, 30, ${p.alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(218, 165, 32, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ========== STATE ==========
let sunbeams = [];
let wheatStalks = [];
let pollens = [];
let leaves = [];
let butterflies = [];
let groundGlow;

function initElements() {
    // Sunbeams
    sunbeams = [];
    const beamCount = Math.min(6, Math.floor(width / 200));
    for (let i = 0; i < beamCount; i++) sunbeams.push(new Sunbeam());

    // Wheat stalks
    wheatStalks = [];
    const stalkCount = Math.min(60, Math.floor(width / 15));
    for (let i = 0; i < stalkCount; i++) {
        wheatStalks.push(new WheatStalk((i / stalkCount) * width + Math.random() * 10));
    }

    // Pollen
    pollens = [];
    const pollenCount = Math.min(80, Math.floor(width * height / 12000));
    for (let i = 0; i < pollenCount; i++) pollens.push(new Pollen());

    // Leaves
    leaves = [];
    const leafCount = Math.min(20, Math.floor(width * height / 35000));
    for (let i = 0; i < leafCount; i++) leaves.push(new Leaf());

    // Butterflies
    butterflies = [];
    const butterflyCount = Math.min(5, Math.floor(width / 250));
    for (let i = 0; i < butterflyCount; i++) butterflies.push(new Butterfly());

    // Ground glow
    groundGlow = new GroundGlow();
}

// ========== DRAW BACKGROUND ==========
function drawBackground() {
    // Warm earth gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0f0c08');
    grad.addColorStop(0.3, '#120e08');
    grad.addColorStop(0.6, '#15100a');
    grad.addColorStop(0.85, '#1a1208');
    grad.addColorStop(1, '#1e150a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm golden haze at top
    const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
    topGrad.addColorStop(0, 'rgba(218, 165, 32, 0.04)');
    topGrad.addColorStop(1, 'rgba(218, 165, 32, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height * 0.4);
}

// ========== MAIN LOOP ==========
function animate() {
    ctx.clearRect(0, 0, width, height);
    frameCount++;

    drawBackground();

    // Sunbeams
    for (let b of sunbeams) {
        b.update();
        b.draw();
    }

    // Ground glow (behind wheat)
    groundGlow.update();
    groundGlow.draw();

    // Pollen
    for (let p of pollens) {
        p.update();
        p.draw();
    }

    // Wheat stalks
    for (let w of wheatStalks) {
        w.update();
        w.draw();
    }

    // Butterflies
    for (let b of butterflies) {
        b.update();
        b.draw();
    }

    // Leaves
    for (let l of leaves) {
        l.update();
        l.draw();
    }

    requestAnimationFrame(animate);
}

// ========== MOUSE TRACKING ==========
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Parallax on mascot
    const mascot = document.querySelector('.hero-mascot');
    if (mascot) {
        const rect = mascot.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (mouseX - centerX) / 40;
        const offsetY = (mouseY - centerY) / 40;
        mascot.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
});

window.addEventListener('resize', resize);
resize();
initTilt();
animate();
    } else {
    }
// ========== SCROLL REVEALS ==========
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
});

// ========== NAV SCROLL EFFECT ==========
const nav = document.querySelector('.main-nav');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    if (!nav) return;
    const scrollY = window.scrollY;
    if (scrollY > 50) {
        nav.style.background = 'rgba(12, 9, 5, 0.98)';
        nav.style.borderColor = 'rgba(218, 165, 32, 0.2)';
    } else {
        nav.style.background = 'var(--bg-nav)';
        nav.style.borderColor = 'rgba(218, 165, 32, 0.12)';
    }
    lastScrollY = scrollY;
}, { passive: true });

// ========== MOBILE NAV TOGGLE ==========
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// ========== 3D TILT ON CARDS ==========
function initTilt() {
    const cards = document.querySelectorAll('.name-card, .domain-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ========== INITIALIZATION ==========
