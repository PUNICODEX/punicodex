/* ===== ÁRTEMIS CANVAS — The Hunt at Moonlight ===== */
/* Canvas layers:
 * 1. Deep forest background
 * 2. Star field
 * 3. Crescent moon (phase-shifting)
 * 4. Silver moonbeams (precise, cold rays)
 * 5. Arrow trajectories (fast shooting lines)
 * 6. Falling forest leaves
 * 7. Animal silhouettes (wolf, deer)
 * 8. Ground mist
 */

const canvas = document.getElementById('hunt-canvas');
const ctx = canvas.getContext('2d');

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

// --- Stars ---
class Star {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.6;
        this.size = Math.random() * 1.5 + 0.3;
        this.baseAlpha = Math.random() * 0.4 + 0.15;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinklePhase = Math.random() * Math.PI * 2;
    }
    draw() {
        const alpha = this.baseAlpha + Math.sin(frameCount * this.twinkleSpeed + this.twinklePhase) * 0.1;
        ctx.fillStyle = `rgba(192, 192, 192, ${Math.max(0, alpha)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Crescent Moon ---
class Moon {
    constructor() {
        this.x = width * 0.78;
        this.y = height * 0.18;
        this.radius = Math.min(width, height) * 0.1;
        this.phase = 0;
        this.phaseSpeed = 0.003;
    }
    update() {
        this.x = width * 0.78;
        this.y = height * 0.18;
        this.radius = Math.min(width, height) * 0.1;
        this.phase += this.phaseSpeed;
    }
    draw() {
        const phaseShift = Math.sin(this.phase) * 0.15 + 0.2;
        // Moon glow
        const glow = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, this.radius * 2.5);
        glow.addColorStop(0, 'rgba(192, 192, 192, 0.08)');
        glow.addColorStop(0.5, 'rgba(192, 192, 192, 0.03)');
        glow.addColorStop(1, 'rgba(192, 192, 192, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(this.x - this.radius * 2.5, this.y - this.radius * 2.5, this.radius * 5, this.radius * 5);

        // Crescent body
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, -Math.PI / 2, Math.PI / 2);
        ctx.bezierCurveTo(
            this.x + this.radius * phaseShift, this.y + this.radius,
            this.x + this.radius * phaseShift, this.y - this.radius,
            this.x, this.y - this.radius
        );
        ctx.closePath();
        ctx.fillStyle = 'rgba(210, 210, 210, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(240, 240, 240, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}

// --- Moonbeam ---
class Moonbeam {
    constructor() {
        this.reset();
    }
    reset() {
        this.angle = Math.random() * Math.PI * 0.4 + Math.PI * 0.15; // Downward angled
        this.originX = Math.random() * width;
        this.originY = 0;
        this.length = Math.random() * height * 0.7 + height * 0.2;
        this.width = Math.random() * 3 + 1;
        this.speed = Math.random() * 0.3 + 0.1;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.08 + 0.03;
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
            this.alpha = this.targetAlpha + Math.sin(this.life * 0.01) * 0.01;
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
        grad.addColorStop(0, `rgba(192, 192, 192, ${this.alpha})`);
        grad.addColorStop(0.5, `rgba(200, 220, 210, ${this.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(192, 192, 192, 0)`);

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

// --- Arrow Trajectory ---
class Arrow {
    constructor() {
        this.reset();
    }
    reset() {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        if (side === 'left') {
            this.x = -50;
            this.y = Math.random() * height * 0.7 + height * 0.1;
            this.vx = Math.random() * 8 + 12;
            this.vy = Math.random() * 3 - 1.5;
        } else {
            this.x = width + 50;
            this.y = Math.random() * height * 0.7 + height * 0.1;
            this.vx = -(Math.random() * 8 + 12);
            this.vy = Math.random() * 3 - 1.5;
        }
        this.length = Math.random() * 40 + 30;
        this.alpha = 1;
        this.state = 'flying';
        this.trail = [];
    }
    update() {
        if (this.state === 'dead') return;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 12) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -100 || this.x > width + 100 || this.y < -50 || this.y > height + 50) {
            this.state = 'dead';
        }
    }
    draw() {
        if (this.state === 'dead' || this.trail.length < 2) return;
        ctx.save();
        // Draw arrow trail
        for (let i = 1; i < this.trail.length; i++) {
            const t = i / this.trail.length;
            const alpha = t * 0.6;
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.lineWidth = 2 * t;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
            ctx.stroke();
        }
        // Arrow head glow
        ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        this.size = Math.random() * 6 + 3;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.03;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = Math.random() * 1.2 + 0.4;
        this.swayFreq = Math.random() * 0.02 + 0.01;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.type = Math.random() < 0.6 ? 'green' : 'silver';
        this.alpha = Math.random() * 0.5 + 0.3;
    }
    update() {
        this.y += this.vy;
        this.x += this.vx + Math.sin(frameCount * this.swayFreq + this.swayPhase) * 0.5;
        this.rotation += this.rotSpeed;
        if (this.y > height + 20) this.reset();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        if (this.type === 'green') {
            ctx.fillStyle = `rgba(34, 139, 34, ${this.alpha})`;
        } else {
            ctx.fillStyle = `rgba(192, 192, 192, ${this.alpha})`;
        }
        // Simple leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Animal Silhouette ---
class Silhouette {
    constructor(type) {
        this.type = type; // 'wolf' or 'deer'
        this.reset();
    }
    reset() {
        this.side = Math.random() < 0.5 ? 'left' : 'right';
        this.x = this.side === 'left' ? -100 : width + 100;
        this.y = height - Math.random() * height * 0.15 - 40;
        this.vx = this.side === 'left' ? Math.random() * 0.3 + 0.15 : -(Math.random() * 0.3 + 0.15);
        this.scale = Math.random() * 0.3 + 0.5;
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 400 + 300;
    }
    update() {
        this.life++;
        this.x += this.vx;
        if (this.state === 'fading_in') {
            this.alpha += 0.008;
            if (this.alpha >= 0.4) this.state = 'holding';
        } else if (this.state === 'holding') {
            if (this.life > this.maxLife * 0.5) this.state = 'fading_out';
        } else {
            this.alpha -= 0.008;
            if (this.alpha <= 0) this.reset();
        }
        // Reset if wandered too far
        if (this.side === 'left' && this.x > width + 150) this.reset();
        if (this.side === 'right' && this.x < -150) this.reset();
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = '#0a1a0a';

        if (this.type === 'wolf') {
            // Simplified wolf silhouette
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(8, -35);
            ctx.lineTo(12, -28);
            ctx.lineTo(20, -30);
            ctx.lineTo(25, -22);
            ctx.lineTo(40, -18);
            ctx.lineTo(45, -10);
            ctx.lineTo(42, 0);
            ctx.lineTo(50, 5);
            ctx.lineTo(48, 12);
            ctx.lineTo(38, 10);
            ctx.lineTo(35, 15);
            ctx.lineTo(30, 12);
            ctx.lineTo(25, 15);
            ctx.lineTo(20, 10);
            ctx.lineTo(15, 12);
            ctx.lineTo(10, 8);
            ctx.lineTo(5, 12);
            ctx.lineTo(0, 8);
            ctx.lineTo(-3, 10);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-5, -8);
            ctx.lineTo(0, -15);
            ctx.closePath();
            ctx.fill();
        } else {
            // Simplified deer silhouette
            ctx.beginPath();
            ctx.moveTo(0, -40);
            ctx.lineTo(3, -50);
            ctx.lineTo(1, -38);
            ctx.lineTo(5, -48);
            ctx.lineTo(4, -35);
            ctx.lineTo(8, -42);
            ctx.lineTo(10, -35);
            ctx.lineTo(15, -30);
            ctx.lineTo(20, -20);
            ctx.lineTo(30, -15);
            ctx.lineTo(40, -12);
            ctx.lineTo(50, -10);
            ctx.lineTo(55, -5);
            ctx.lineTo(52, 0);
            ctx.lineTo(58, 3);
            ctx.lineTo(56, 8);
            ctx.lineTo(48, 6);
            ctx.lineTo(45, 12);
            ctx.lineTo(40, 8);
            ctx.lineTo(35, 12);
            ctx.lineTo(30, 8);
            ctx.lineTo(25, 12);
            ctx.lineTo(20, 8);
            ctx.lineTo(15, 12);
            ctx.lineTo(10, 8);
            ctx.lineTo(5, 12);
            ctx.lineTo(0, 8);
            ctx.lineTo(-3, 10);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-5, -10);
            ctx.lineTo(0, -20);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

// --- Ground Mist ---
class MistLayer {
    constructor() {
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: height - Math.random() * height * 0.12,
                radius: Math.random() * 80 + 40,
                speed: Math.random() * 0.3 + 0.1,
                alpha: Math.random() * 0.08 + 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    update() {
        for (let p of this.particles) {
            p.x += Math.sin(frameCount * 0.005 + p.phase) * p.speed;
            p.y += Math.cos(frameCount * 0.003 + p.phase) * p.speed * 0.3;
        }
    }
    draw() {
        for (let p of this.particles) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, `rgba(34, 139, 34, ${p.alpha})`);
            grad.addColorStop(0.5, `rgba(192, 192, 192, ${p.alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(34, 139, 34, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ========== STATE ==========
let stars = [];
let moon;
let moonbeams = [];
let arrows = [];
let leaves = [];
let silhouettes = [];
let mist;

function initElements() {
    // Stars
    stars = [];
    const starCount = Math.min(150, Math.floor(width * height / 6000));
    for (let i = 0; i < starCount; i++) stars.push(new Star());

    // Moon
    moon = new Moon();

    // Moonbeams
    moonbeams = [];
    const beamCount = Math.min(8, Math.floor(width / 150));
    for (let i = 0; i < beamCount; i++) moonbeams.push(new Moonbeam());

    // Arrows
    arrows = [];
    for (let i = 0; i < 3; i++) arrows.push(new Arrow());

    // Leaves
    leaves = [];
    const leafCount = Math.min(25, Math.floor(width * height / 25000));
    for (let i = 0; i < leafCount; i++) leaves.push(new Leaf());

    // Silhouettes
    silhouettes = [];
    silhouettes.push(new Silhouette('wolf'));
    silhouettes.push(new Silhouette('deer'));

    // Mist
    mist = new MistLayer();
}

// ========== DRAW BACKGROUND ==========
function drawBackground() {
    // Deep forest gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#060a06');
    grad.addColorStop(0.4, '#0a0f0a');
    grad.addColorStop(0.7, '#0d1a0d');
    grad.addColorStop(1, '#0a150a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle green haze at bottom
    const bottomGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    bottomGrad.addColorStop(0, 'rgba(34, 139, 34, 0)');
    bottomGrad.addColorStop(1, 'rgba(34, 139, 34, 0.04)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);
}

// ========== MAIN LOOP ==========
function animate() {
    ctx.clearRect(0, 0, width, height);
    frameCount++;

    drawBackground();

    // Stars
    for (let s of stars) s.draw();

    // Moon
    moon.update();
    moon.draw();

    // Moonbeams
    for (let b of moonbeams) {
        b.update();
        b.draw();
    }

    // Mist (behind animals)
    mist.update();
    mist.draw();

    // Silhouettes
    for (let s of silhouettes) {
        s.update();
        s.draw();
    }

    // Arrows
    for (let a of arrows) {
        a.update();
        if (a.state === 'dead') a.reset();
        a.draw();
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
const nav = document.getElementById('main-nav');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
        nav.style.background = 'rgba(6, 10, 6, 0.98)';
        nav.style.borderColor = 'rgba(34, 139, 34, 0.25)';
    } else {
        nav.style.background = 'var(--bg-nav)';
        nav.style.borderColor = 'rgba(34, 139, 34, 0.15)';
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
window.addEventListener('resize', resize);
resize();
initTilt();
animate();
