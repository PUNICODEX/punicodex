/* ===== NÍKĒ CANVAS — The Triumph Unfolds ===== */
/* Canvas layers:
 * 1. Deep navy background
 * 2. Golden ascending light rays
 * 3. Rising victory sparks (gold/silver)
 * 4. Speed streaks (diagonal upward)
 * 5. Laurel leaves falling
 * 6. Wing silhouettes
 * 7. Star bursts
 * 8. Swoosh arcs
 */

const canvas = document.getElementById('victory-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let width, height, dpr;
let mouseX = 0, mouseY = 0;
let frameCount = 0;

// Resize
function resize() {
    if (!canvas) return;
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

// --- Ascending Ray ---
class AscendingRay {
    constructor() {
        this.reset();
    }
    reset() {
        this.originX = Math.random() * width;
        this.originY = height + 20;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; // Upward with slight spread
        this.length = Math.random() * height * 0.6 + height * 0.2;
        this.width = Math.random() * 3 + 1;
        this.speed = Math.random() * 0.3 + 0.1;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.06 + 0.02;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 300 + 200;
    }
    update() {
        this.life++;
        if (this.state === 'fading_in') {
            this.alpha += 0.003;
            if (this.alpha >= this.targetAlpha) this.state = 'holding';
        } else if (this.state === 'holding') {
            this.alpha = this.targetAlpha + Math.sin(this.life * 0.01) * 0.008;
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.003;
            if (this.alpha <= 0) this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        const endX = this.originX + Math.cos(this.angle) * this.length;
        const endY = this.originY + Math.sin(this.angle) * this.length;
        const grad = ctx.createLinearGradient(this.originX, this.originY, endX, endY);
        grad.addColorStop(0, `rgba(212, 175, 55, ${this.alpha})`);
        grad.addColorStop(0.5, `rgba(232, 213, 163, ${this.alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(212, 175, 55, 0)');

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

// --- Victory Spark ---
class VictorySpark {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 50;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = -(Math.random() * 2 + 0.8);
        this.size = Math.random() * 2.5 + 0.5;
        this.alpha = Math.random() * 0.6 + 0.3;
        this.decay = Math.random() * 0.003 + 0.001;
        this.color = Math.random() < 0.6 ? 'gold' : 'silver';
        this.trail = [];
    }
    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.alpha <= 0 || this.y < -20) this.reset();
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        // Trail
        for (let i = 1; i < this.trail.length; i++) {
            const t = i / this.trail.length;
            ctx.strokeStyle = this.color === 'gold'
                ? `rgba(212, 175, 55, ${t * this.alpha * 0.5})`
                : `rgba(192, 192, 192, ${t * this.alpha * 0.4})`;
            ctx.lineWidth = this.size * t;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
            ctx.stroke();
        }
        // Head
        ctx.shadowColor = this.color === 'gold' ? 'rgba(212, 175, 55, 0.6)' : 'rgba(192, 192, 192, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.color === 'gold'
            ? `rgba(255, 230, 150, ${this.alpha})`
            : `rgba(220, 220, 220, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Speed Streak ---
class SpeedStreak {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 100;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = -(Math.random() * 6 + 4);
        this.length = Math.random() * 40 + 20;
        this.width = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.3 + 0.1;
        this.color = Math.random() < 0.5 ? 'gold' : 'white';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -this.length) this.reset();
    }
    draw() {
        const tailX = this.x - this.vx * (this.length / Math.abs(this.vy));
        const tailY = this.y + this.length;
        const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        if (this.color === 'gold') {
            grad.addColorStop(0, 'rgba(212, 175, 55, 0)');
            grad.addColorStop(1, `rgba(212, 175, 55, ${this.alpha})`);
        } else {
            grad.addColorStop(0, 'rgba(245, 245, 245, 0)');
            grad.addColorStop(1, `rgba(245, 245, 245, ${this.alpha})`);
        }
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Laurel Leaf ---
class LaurelLeaf {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = -20;
        this.size = Math.random() * 7 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.03;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = Math.random() * 1.2 + 0.5;
        this.swayFreq = Math.random() * 0.015 + 0.008;
        this.swayPhase = Math.random() * Math.PI * 2;
        const colors = [
            { r: 212, g: 175, b: 55 },   // gold
            { r: 107, g: 142, b: 35 },   // olive
            { r: 232, g: 213, b: 163 },  // pale gold
            { r: 192, g: 192, b: 192 },  // silver
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
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.65)`;
        // Laurel leaf shape (elongated ellipse with pointed ends)
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Central vein
        ctx.strokeStyle = `rgba(${this.color.r - 40}, ${this.color.g - 30}, ${this.color.b - 40}, 0.4)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.7, 0);
        ctx.lineTo(this.size * 0.7, 0);
        ctx.stroke();
        ctx.restore();
    }
}

// --- Wing Silhouette ---
class WingSilhouette {
    constructor() {
        this.reset();
    }
    reset() {
        this.side = Math.random() < 0.5 ? 'left' : 'right';
        this.x = this.side === 'left' ? -80 : width + 80;
        this.y = Math.random() * height * 0.5 + height * 0.1;
        this.vx = this.side === 'left' ? Math.random() * 0.4 + 0.2 : -(Math.random() * 0.4 + 0.2);
        this.scale = Math.random() * 0.4 + 0.6;
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 500 + 400;
        this.flapPhase = Math.random() * Math.PI * 2;
        this.flapSpeed = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.life++;
        this.flapPhase += this.flapSpeed;
        this.x += this.vx;
        this.y += Math.sin(this.life * 0.01) * 0.3;

        if (this.state === 'fading_in') {
            this.alpha += 0.006;
            if (this.alpha >= 0.25) this.state = 'holding';
        } else if (this.state === 'holding') {
            if (this.life > this.maxLife * 0.5) this.state = 'fading_out';
        } else {
            this.alpha -= 0.006;
            if (this.alpha <= 0) this.reset();
        }

        if (this.side === 'left' && this.x > width + 100) this.reset();
        if (this.side === 'right' && this.x < -100) this.reset();
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        const flap = Math.sin(this.flapPhase) * 0.15 + 1;

        if (this.side === 'right') {
            ctx.scale(-1, 1);
        }

        // Draw wing shape
        ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(30, -40 * flap, 80, -60 * flap, 120, -30 * flap);
        ctx.bezierCurveTo(100, -10 * flap, 90, 10 * flap, 110, 30 * flap);
        ctx.bezierCurveTo(70, 20 * flap, 40, 30 * flap, 0, 0);
        ctx.fill();

        // Wing feathers detail
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const t = i / 5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(40 * t, -25 * t * flap, 80 * t, -20 * t * flap);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// --- Star Burst ---
class StarBurst {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.7;
        this.size = Math.random() * 2 + 1;
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 200 + 150;
        this.sparkleSpeed = Math.random() * 0.05 + 0.02;
    }
    update() {
        this.life++;
        if (this.state === 'fading_in') {
            this.alpha += 0.015;
            if (this.alpha >= 0.8) this.state = 'holding';
        } else if (this.state === 'holding') {
            this.alpha = 0.8 + Math.sin(this.life * this.sparkleSpeed) * 0.15;
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.012;
            if (this.alpha <= 0) this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';
        ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Cross star
        ctx.strokeStyle = 'rgba(255, 245, 200, 0.5)';
        ctx.lineWidth = 0.5;
        const rays = 4;
        for (let i = 0; i < rays; i++) {
            const angle = (i / rays) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(this.x - Math.cos(angle) * this.size * 3, this.y - Math.sin(angle) * this.size * 3);
            ctx.lineTo(this.x + Math.cos(angle) * this.size * 3, this.y + Math.sin(angle) * this.size * 3);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// --- Swoosh Arc ---
class SwooshArc {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = height * 0.3 + Math.random() * height * 0.4;
        this.radiusX = Math.random() * 80 + 40;
        this.radiusY = Math.random() * 20 + 10;
        this.rotation = Math.random() * 0.3 - 0.15;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.08 + 0.03;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 350 + 250;
    }
    update() {
        this.life++;
        if (this.state === 'fading_in') {
            this.alpha += 0.004;
            if (this.alpha >= this.targetAlpha) this.state = 'holding';
        } else if (this.state === 'holding') {
            this.alpha = this.targetAlpha + Math.sin(this.life * 0.008) * 0.01;
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.004;
            if (this.alpha <= 0) this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radiusX, this.radiusY, 0, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        ctx.restore();
    }
}

// ========== STATE ==========
let rays = [];
let sparks = [];
let streaks = [];
let leaves = [];
let wings = [];
let stars = [];
let swooshes = [];

function initElements() {
    // Ascending rays
    rays = [];
    const rayCount = Math.min(5, Math.floor(width / 200));
    for (let i = 0; i < rayCount; i++) rays.push(new AscendingRay());

    // Victory sparks
    sparks = [];
    const sparkCount = Math.min(50, Math.floor(width * height / 15000));
    for (let i = 0; i < sparkCount; i++) sparks.push(new VictorySpark());

    // Speed streaks
    streaks = [];
    const streakCount = Math.min(12, Math.floor(width / 100));
    for (let i = 0; i < streakCount; i++) streaks.push(new SpeedStreak());

    // Laurel leaves
    leaves = [];
    const leafCount = Math.min(18, Math.floor(width * height / 40000));
    for (let i = 0; i < leafCount; i++) leaves.push(new LaurelLeaf());

    // Wing silhouettes
    wings = [];
    wings.push(new WingSilhouette());
    wings.push(new WingSilhouette());

    // Star bursts
    stars = [];
    const starCount = Math.min(15, Math.floor(width * height / 50000));
    for (let i = 0; i < starCount; i++) stars.push(new StarBurst());

    // Swoosh arcs
    swooshes = [];
    const swooshCount = Math.min(6, Math.floor(width / 180));
    for (let i = 0; i < swooshCount; i++) swooshes.push(new SwooshArc());
}

// ========== DRAW BACKGROUND ==========
function drawBackground() {
    if (!ctx) return;
    // Deep navy gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a121f');
    grad.addColorStop(0.4, '#0c1525');
    grad.addColorStop(0.7, '#0e1828');
    grad.addColorStop(1, '#0f1a2d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle golden glow from bottom
    const bottomGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
    bottomGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    bottomGrad.addColorStop(1, 'rgba(212, 175, 55, 0.03)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height * 0.5, width, height * 0.5);
}

// ========== MAIN LOOP ==========
function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    frameCount++;

    drawBackground();

    // Ascending rays
    for (let r of rays) {
        r.update();
        r.draw();
    }

    // Swoosh arcs
    for (let s of swooshes) {
        s.update();
        s.draw();
    }

    // Wing silhouettes
    for (let w of wings) {
        w.update();
        w.draw();
    }

    // Speed streaks
    for (let s of streaks) {
        s.update();
        s.draw();
    }

    // Victory sparks
    for (let s of sparks) {
        s.update();
        s.draw();
    }

    // Laurel leaves
    for (let l of leaves) {
        l.update();
        l.draw();
    }

    // Star bursts
    for (let s of stars) {
        s.update();
        s.draw();
    }

    requestAnimationFrame(animate);
}

// ========== MOUSE TRACKING ==========
const mascot = document.querySelector('.hero-mascot');
let mouseRaf = null;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!mascot) return;
    if (mouseRaf) return;

    mouseRaf = requestAnimationFrame(() => {
        mouseRaf = null;
        const rect = mascot.getBoundingClientRect();
        if (rect.width === 0) return; // not rendered
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (mouseX - centerX) / 40;
        const offsetY = (mouseY - centerY) / 40;
        mascot.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });
});

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
        nav.style.background = 'rgba(8, 14, 25, 0.98)';
        nav.style.borderColor = 'rgba(212, 175, 55, 0.15)';
    } else {
        nav.style.background = 'var(--bg-nav)';
        nav.style.borderColor = 'rgba(212, 175, 55, 0.1)';
    }
    lastScrollY = scrollY;
}, { passive: true });

// ========== MOBILE NAV TOGGLE ==========
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

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
if (canvas) {
    window.addEventListener('resize', resize);
    resize();
    animate();
}
initTilt();
