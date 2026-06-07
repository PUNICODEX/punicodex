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
const nav = document.getElementById('main-nav');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
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


// ========== NIKE BOOKING SYSTEM ==========
const API_BASE = window.NIKE_API_BASE || 'http://localhost:3456'; // Set window.NIKE_API_BASE in HTML for production

// Only initialize on pages with the booking modal
if (!document.getElementById('booking-modal')) {
  // Skip booking system on pages without modal (lore, gallery, etc.)
} else {

let slotsData = [];
let currentSlotId = null;
let currentBooking = null;

// DOM refs
const modal = document.getElementById('booking-modal');
const modalClose = document.getElementById('booking-modal-close');
const steps = {
  1: document.getElementById('booking-step-1'),
  verify: document.getElementById('booking-step-verify'),
  2: document.getElementById('booking-step-2'),
  3: document.getElementById('booking-step-3'),
  rejected: document.getElementById('booking-step-rejected'),
  loading: document.getElementById('booking-step-loading'),
};

const els = {
  slotName: document.getElementById('booking-slot-name'),
  slotDims: document.getElementById('booking-slot-dims'),
  price: document.getElementById('booking-price'),
  email: document.getElementById('booking-email'),
  company: document.getElementById('booking-company'),
  website: document.getElementById('booking-website'),
  heading: document.getElementById('booking-heading'),
  subtitle: document.getElementById('booking-subtitle'),
  headingLimit: document.getElementById('booking-heading-limit'),
  subtitleLimit: document.getElementById('booking-subtitle-limit'),
  headingCount: document.getElementById('booking-heading-count'),
  subtitleCount: document.getElementById('booking-subtitle-count'),
  sendCode: document.getElementById('booking-send-code'),
  verifyBtn: document.getElementById('booking-verify-btn'),
  resendCode: document.getElementById('booking-resend-code'),
  leaseMonthly: document.getElementById('lease-monthly'),
  leaseYearly: document.getElementById('lease-yearly'),
  codeInput: document.getElementById('booking-code'),
  verifyEmail: document.getElementById('booking-verify-email'),
  verifyError: document.getElementById('booking-verify-error'),
  uploadZone: document.getElementById('booking-upload-zone'),
  uploadInput: document.getElementById('booking-upload-input'),
  uploadPreview: document.getElementById('booking-upload-preview'),
  uploadPrompt: document.querySelector('.booking-upload-prompt'),
  uploadActions: document.getElementById('booking-upload-actions'),
  submitUpload: document.getElementById('booking-submit-upload'),
  changeFile: document.getElementById('booking-change-file'),
  uploadDims: document.getElementById('booking-upload-dims'),
  livePreview: document.getElementById('booking-live-preview'),
  livePreviewFrame: document.getElementById('booking-live-preview-frame'),
  dashboardLink: document.getElementById('booking-dashboard-link'),
  doneBtn: document.getElementById('booking-done'),
  rejectReason: document.getElementById('booking-reject-reason'),
  reuploadBtn: document.getElementById('booking-reupload'),
  rejectedClose: document.getElementById('booking-rejected-close'),
};

let selectedFile = null;
let selectedFileBase64 = null;

// Fetch slots and update UI
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots?site=nike`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {
    console.error('Failed to load slots:', err);
  }
}

function updateSlotUI() {
  document.querySelectorAll('.space-slot').forEach(slotEl => {
    const spaceNum = slotEl.dataset.space;
    const slotId = parseInt(spaceNum, 10);
    const slot = slotsData.find(s => s.id === slotId);
    if (!slot) return;

    const btn = slotEl.querySelector('.space-reserve');
    const frame = slotEl.querySelector('.space-frame');
    const meta = slotEl.querySelector('.space-meta');
    if (!btn || !frame) return;

    // Remove any existing dynamic overlays
    const existingOverlay = frame.querySelector('.space-frame-overlay');
    if (existingOverlay) existingOverlay.remove();
    const existingPixel = frame.querySelector('.space-pixel');
    if (existingPixel) existingPixel.remove();

    // Handle custom meta text for live slots
    if (slot.status === 'live' && meta) {
      const hasCustom = slot.custom_heading || slot.custom_subtitle;
      if (hasCustom) {
        meta.style.display = 'flex';
        const nameEl = meta.querySelector('.space-name');
        const dimsEl = meta.querySelector('.space-dims');
        if (nameEl) nameEl.textContent = slot.custom_heading || slot.name;
        if (dimsEl) dimsEl.textContent = slot.custom_subtitle || `${slot.width} × ${slot.height} px`;
      } else {
        meta.style.display = 'none';
      }
    } else if (meta) {
      // Reset to default for available/reserved slots
      meta.style.display = 'flex';
      const nameEl = meta.querySelector('.space-name');
      const dimsEl = meta.querySelector('.space-dims');
      if (nameEl) nameEl.textContent = slot.name;
      if (dimsEl) dimsEl.textContent = `${slot.width} × ${slot.height} px`;
    }

    // Determine if this slot should render its own creative
    // Bundle members need a per-slot creative; the bundle slot itself uses main creative
    const bundleSlot = slotsData.find(s => s.is_bundle === 1);
    const isBundleMember = bundleSlot && slotId !== bundleSlot.id && slot.booking_id && bundleSlot.current_booking_id === slot.booking_id;
    const hasOwnCreative = isBundleMember ? slot.has_slot_creative : !!slot.creative_path;

    if (slot.status === 'live' && hasOwnCreative) {
      // LIVE: render actual creative with click tracking
      btn.style.display = 'none';
      const pixelUrl = `${API_BASE}/api/analytics/pixel.gif?b=${slot.analytics_token}`;
      const clickUrl = `${API_BASE}/api/analytics/click?b=${slot.analytics_token}&url=${encodeURIComponent(slot.website_url || '#')}`;
      frame.innerHTML = `
        <a href="${clickUrl}" target="_blank" rel="noopener" class="space-live-ad" style="display:block;width:100%;height:100%;position:relative;z-index:2;">
          <img src="${API_BASE}${slot.creative_path}" alt="${slot.company_name || 'Advertisement'}" style="width:100%;height:100%;object-fit:cover;display:block;">
        </a>
        <img class="space-pixel" src="${pixelUrl}" width="1" height="1" style="position:absolute;opacity:0;pointer-events:none;" alt="">
      `;
      // Re-add glow if it was removed
      if (!frame.querySelector('.space-frame-glow')) {
        const glow = document.createElement('div');
        glow.className = 'space-frame-glow';
        frame.appendChild(glow);
      }
    } else if (slot.status !== 'available') {
      // RESERVED: hide button, show overlay inside frame
      btn.style.display = 'none';
      const overlay = document.createElement('div');
      overlay.className = 'space-frame-overlay';
      overlay.innerHTML = `
        <span class="space-frame-overlay-text">${slot.status === 'live' ? 'LIVE' : 'RESERVED'}</span>
        <span class="space-frame-overlay-sub">${slot.company_name || ''}</span>
      `;
      frame.appendChild(overlay);

      if (!slotEl.querySelector('.space-reserved-badge')) {
        const badge = document.createElement('span');
        badge.className = `space-reserved-badge ${slot.status === 'live' ? '' : 'space-reserved-badge--reserved'}`;
        badge.textContent = slot.status === 'live' ? 'Live' : 'Reserved';
        const footer = slotEl.querySelector('.space-footer');
        if (footer) footer.appendChild(badge);
      }
    } else {
      // AVAILABLE: show button, remove overlays, restore placeholder
      btn.style.display = '';
      const badge = slotEl.querySelector('.space-reserved-badge');
      if (badge) badge.remove();
      // Restore default placeholder content if it was replaced
      if (!frame.querySelector('.space-frame-content')) {
        frame.innerHTML = `
          <div class="space-frame-glow"></div>
          <div class="space-frame-content">
            <span class="space-placeholder-logo">◆</span>
            <span class="space-placeholder-text">Your Brand Here</span>
          </div>
        `;
      }
    }
  });
}

// Modal helpers
function showStep(name) {
  Object.values(steps).forEach(el => el.style.display = 'none');
  if (steps[name]) steps[name].style.display = 'block';
}

function showBookingError(msg) {
  const errEl = document.getElementById('booking-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}
function clearBookingError() {
  const errEl = document.getElementById('booking-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
}

function getCharLimits(width) {
  if (width >= 1000) return { heading: 50, subtitle: 80 };
  if (width >= 800)  return { heading: 38, subtitle: 60 };
  if (width >= 500)  return { heading: 24, subtitle: 40 };
  if (width >= 300)  return { heading: 15, subtitle: 26 };
  return { heading: 10, subtitle: 18 };
}

function updateCharCounter(input, countEl, max) {
  const len = input.value.length;
  countEl.textContent = `${len} / ${max}`;
  countEl.classList.remove('booking-char-count--near', 'booking-char-count--over');
  if (len > max) countEl.classList.add('booking-char-count--over');
  else if (len >= max - 3) countEl.classList.add('booking-char-count--near');
}

function applyCharLimits(width) {
  const limits = getCharLimits(width);
  els.heading.maxLength = limits.heading;
  els.subtitle.maxLength = limits.subtitle;
  if (els.headingLimit) els.headingLimit.textContent = `(max ${limits.heading} chars)`;
  if (els.subtitleLimit) els.subtitleLimit.textContent = `(max ${limits.subtitle} chars)`;
  updateCharCounter(els.heading, els.headingCount, limits.heading);
  updateCharCounter(els.subtitle, els.subtitleCount, limits.subtitle);
}

function openModal(slotId) {
  currentSlotId = slotId;
  let slot = slotsData.find(s => s.id === slotId);

  // Fallback to DOM if slotsData hasn't loaded yet
  if (!slot) {
    const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
    if (!slotEl) return;
    const nameEl = slotEl.querySelector('.space-name');
    const dimsEl = slotEl.querySelector('.space-dims');
    const priceEl = slotEl.querySelector('.space-price');
    const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
    slot = {
      name: nameEl ? nameEl.textContent : 'Slot',
      width: dimsMatch ? parseInt(dimsMatch[1]) : 0,
      height: dimsMatch ? parseInt(dimsMatch[2]) : 0,
      price_cents: priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, '')) * 100 : 0,
    };
  }

  currentSlotPriceCents = slot.price_cents || 0;
  currentLeaseMonths = 1;
  if (els.leaseMonthly) els.leaseMonthly.classList.add('active');
  if (els.leaseYearly) els.leaseYearly.classList.remove('active');
  updatePriceDisplay();
  els.slotName.textContent = slot.name;
  els.slotDims.textContent = `${slot.width} × ${slot.height} px`;
  applyCharLimits(slot.width || 0);
  clearBookingError();
  showStep('1');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function updatePriceDisplay() {
  const total = currentSlotPriceCents * currentLeaseMonths;
  const label = currentLeaseMonths === 12 ? '/yr' : '/mo';
  els.price.innerHTML = `$${(total / 100).toLocaleString()}<span>${label}</span>`;
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  currentSlotId = null;
  currentBooking = null;
  selectedFile = null;
  selectedFileBase64 = null;
  resetUpload();
}

function resetUpload() {
  els.uploadPreview.style.display = 'none';
  els.uploadPrompt.style.display = 'block';
  els.uploadActions.style.display = 'none';
  els.livePreview.style.display = 'none';
  els.livePreviewFrame.innerHTML = '';
  els.uploadInput.value = '';
}

// Event: Reserve button clicks
document.querySelectorAll('.space-reserve').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const slotEl = e.target.closest('.space-slot');
    if (!slotEl) return;
    const slotId = parseInt(slotEl.dataset.space, 10);
    openModal(slotId);
  });
});

modalClose.addEventListener('click', closeModal);
modal.querySelector('.booking-modal-backdrop').addEventListener('click', closeModal);

// Real-time character counters
els.heading.addEventListener('input', () => {
  const max = parseInt(els.heading.maxLength, 10) || 0;
  updateCharCounter(els.heading, els.headingCount, max);
});
els.subtitle.addEventListener('input', () => {
  const max = parseInt(els.subtitle.maxLength, 10) || 0;
  updateCharCounter(els.subtitle, els.subtitleCount, max);
});

// Lease period toggle
if (els.leaseMonthly) {
  els.leaseMonthly.addEventListener('click', () => {
    currentLeaseMonths = 1;
    els.leaseMonthly.classList.add('active');
    if (els.leaseYearly) els.leaseYearly.classList.remove('active');
    updatePriceDisplay();
  });
}
if (els.leaseYearly) {
  els.leaseYearly.addEventListener('click', () => {
    currentLeaseMonths = 12;
    els.leaseYearly.classList.add('active');
    if (els.leaseMonthly) els.leaseMonthly.classList.remove('active');
    updatePriceDisplay();
  });
}

// Step 1: Send verification code
async function sendVerificationCode() {
  const email = els.email.value.trim();
  if (!email || !email.includes('@')) {
    showBookingError('Please enter a valid email');
    return;
  }
  clearBookingError();
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/verify/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.sent) {
      els.verifyEmail.textContent = email;
      showStep('verify');
    } else {
      showBookingError(data.error || 'Failed to send code');
      showStep('1');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('1');
  }
}

els.sendCode.addEventListener('click', sendVerificationCode);
els.resendCode.addEventListener('click', sendVerificationCode);

// Step 1b: Verify code & proceed to Stripe
els.verifyBtn.addEventListener('click', async () => {
  const email = els.email.value.trim();
  const code = els.codeInput.value.trim();
  if (!code || code.length !== 6) {
    if (els.verifyError) {
      els.verifyError.textContent = 'Please enter the 6-digit code';
      els.verifyError.style.display = 'block';
    }
    return;
  }
  if (els.verifyError) els.verifyError.style.display = 'none';
  showStep('loading');
  try {
    const verifyRes = await fetch(`${API_BASE}/api/verify/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.verified) {
      if (els.verifyError) {
        els.verifyError.textContent = verifyData.error || 'Invalid code';
        els.verifyError.style.display = 'block';
      }
      showStep('verify');
      return;
    }

    // Code verified — create booking and redirect to Stripe
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: currentSlotId,
        email,
        companyName: els.company.value.trim(),
        websiteUrl: els.website.value.trim(),
        customHeading: els.heading ? els.heading.value.trim() : '',
        customSubtitle: els.subtitle ? els.subtitle.value.trim() : '',
        leaseMonths: currentLeaseMonths,
      }),
    });
    const data = await res.json();
    if (data.stripeUrl) {
      window.location.href = data.stripeUrl;
    } else {
      showBookingError(data.error || 'Something went wrong');
      showStep('1');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('verify');
  }
});

// Handle return from Stripe
async function handleReturnFromStripe() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('booking');
  const paid = params.get('paid');
  const canceled = params.get('canceled');

  if (!token) return;

  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    // First check/update payment status with Stripe directly
    const checkRes = await fetch(`${API_BASE}/api/bookings/${token}/check-payment`);
    const checkData = await checkRes.json();
    const booking = checkData.booking;
    if (!booking || checkData.error) return;

    currentBooking = booking;
    const slot = slotsData.find(s => s.id === booking.slot_id);
    currentSlotId = booking.slot_id;

    if (canceled) {
      showBookingError('Payment was canceled. You can try again anytime.');
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(booking.slot_id);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/nike/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/nike/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/nike/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/nike/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {
    console.error('Handle return error:', err);
  }
}

function setupUploadStep(slot) {
  els.uploadDims.innerHTML = `Recommended size: <strong style="color:var(--classic-gold);">${slot.width} × ${slot.height} px</strong>`;
  els.uploadDims.className = 'booking-modal-subtitle booking-upload-dims';
  resetUpload();
}

function showRejected(booking) {
  els.rejectReason.textContent = booking.admin_note || 'Does not meet our guidelines.';
  showStep('rejected');
}

els.reuploadBtn.addEventListener('click', () => {
  const slot = slotsData.find(s => s.id === currentSlotId);
  setupUploadStep(slot);
  showStep('2');
});
els.rejectedClose.addEventListener('click', closeModal);

// Upload handling
els.uploadZone.addEventListener('click', () => els.uploadInput.click());
els.uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.uploadZone.classList.add('dragover');
});
els.uploadZone.addEventListener('dragleave', () => {
  els.uploadZone.classList.remove('dragover');
});
els.uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.uploadZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) handleFileSelect(files[0]);
});
els.uploadInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFileSelect(e.target.files[0]);
});
els.changeFile.addEventListener('click', resetUpload);

function handleFileSelect(file) {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showBookingError('Please upload PNG, JPG, or WebP');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showBookingError('File must be under 2MB');
    return;
  }
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedFileBase64 = e.target.result;
    els.uploadPreview.src = selectedFileBase64;
    els.uploadPreview.style.display = 'block';
    els.uploadPrompt.style.display = 'none';
    els.uploadActions.style.display = 'flex';

    // Live preview in frame
    els.livePreview.style.display = 'block';
    els.livePreviewFrame.innerHTML = `<img src="${selectedFileBase64}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

els.submitUpload.addEventListener('click', async () => {
  if (!selectedFileBase64 || !currentBooking) return;
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${currentBooking.analytics_token}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: selectedFileBase64,
        filename: selectedFile.name,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/nike/dashboard/?token=${currentBooking.analytics_token}`;
    } else {
      showBookingError(data.error || 'Upload failed');
      showStep('2');
    }
  } catch (err) {
    showBookingError('Upload error. Please try again.');
    showStep('2');
  }
});

els.doneBtn.addEventListener('click', closeModal);

// Change Creative button (from Under Review step)
const changeCreativeBtn = document.getElementById('booking-change-creative');
if (changeCreativeBtn) {
  changeCreativeBtn.addEventListener('click', () => {
    if (!currentBooking) return;
    const slot = slotsData.find(s => s.id === currentBooking.slot_id);
    setupUploadStep(slot);
    showStep('2');
  });
}

// ========== MY BOOKINGS MODAL ==========
const myBookingsModal = document.getElementById('my-bookings-modal');
const myBookingsNav = document.getElementById('my-bookings-nav');
const myBookingsClose = document.getElementById('my-bookings-close');
const myBookingsBackdrop = document.getElementById('my-bookings-backdrop');
const myBookingsSubmit = document.getElementById('my-bookings-submit');
const myBookingsEmail = document.getElementById('my-bookings-email');
const myBookingsStepEmail = document.getElementById('my-bookings-step-email');
const myBookingsStepSent = document.getElementById('my-bookings-step-sent');

function openMyBookings() {
  if (!myBookingsModal) return;
  myBookingsModal.style.display = 'flex';
  myBookingsStepEmail.style.display = 'block';
  myBookingsStepSent.style.display = 'none';
  if (myBookingsEmail) myBookingsEmail.value = '';
}
function closeMyBookings() {
  if (!myBookingsModal) return;
  myBookingsModal.style.display = 'none';
}

if (myBookingsNav) myBookingsNav.addEventListener('click', openMyBookings);
if (myBookingsClose) myBookingsClose.addEventListener('click', closeMyBookings);
if (myBookingsBackdrop) myBookingsBackdrop.addEventListener('click', closeMyBookings);

if (myBookingsSubmit) {
  myBookingsSubmit.addEventListener('click', async () => {
    const email = myBookingsEmail.value.trim();
    if (!email || !email.includes('@')) {
      showBookingError('Please enter a valid email');
      return;
    }
    myBookingsSubmit.textContent = 'Sending...';
    try {
      const res = await fetch(`${API_BASE}/api/bookings/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      myBookingsStepEmail.style.display = 'none';
      myBookingsStepSent.style.display = 'block';
    } catch (err) {
      myBookingsSubmit.textContent = 'Send My Links';
      showBookingError('Failed to send email. Please try again.');
    }
  });
}

// Init
loadSlots();
handleReturnFromStripe();

} // end else (booking modal exists)
