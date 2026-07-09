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

// ========== BOOKING SYSTEM ==========
const API_BASE = window.PUNYCODEX_API_BASE || ''; // Set window.PUNYCODEX_API_BASE in HTML if needed

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
  applySlotName: document.getElementById('booking-apply-slot-name'),
  applicationNote: document.getElementById('booking-application-note'),
  submitApplication: document.getElementById('booking-submit-application'),
  applyError: document.getElementById('booking-apply-error'),
};

let selectedFile = null;
let selectedFileBase64 = null;
let verificationToken = '';
let isBundleApplication = false;
let currentUploadSlot = null;

// Fetch slots and update UI
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots/?site=demeter`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {
    console.error('[PUNYCODEX] loadSlots failed:', err);
  }
}

function trackViewability(container, token) {
  if (!('IntersectionObserver' in window)) return;
  let timer = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (timer) return;
        timer = setTimeout(() => {
          fetch(`${API_BASE}/api/analytics/viewability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              visibleSeconds: 1,
              visiblePercent: Math.round(entry.intersectionRatio * 100),
            }),
          }).catch(() => {});
          observer.disconnect();
        }, 1000);
      } else {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    });
  }, { threshold: [0, 0.5, 1] });
  observer.observe(container);
}

function updateSlotUI() {
  const orderedSlots = [...slotsData].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  document.querySelectorAll('.space-slot').forEach(slotEl => {
    let slot;
    if (slotEl.dataset.bundle === '1') {
      // The full-page takeover maps to the bundle slot in the database.
      slot = orderedSlots.find(s => s.is_bundle === 1);
    } else {
      const spaceNum = slotEl.dataset.space;
      const sortOrder = parseInt(spaceNum, 10);
      slot = orderedSlots.find(s => s.sort_order === sortOrder);
    }
    if (!slot) return;

    const frame = slotEl.querySelector('.space-frame');
    const meta = slotEl.querySelector('.space-meta');
    if (!frame) return;

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
    const isBundleMember = bundleSlot && slot.id !== bundleSlot.id && slot.booking_id && bundleSlot.current_booking_id === slot.booking_id;
    const hasOwnCreative = isBundleMember ? slot.has_slot_creative : !!slot.creative_path;

    if (slot.status === 'live' && hasOwnCreative) {
      // LIVE: render actual creative with click tracking
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

      // Fire viewability beacon after 1s at ≥50% visibility
      trackViewability(frame, slot.analytics_token);
    } else if (slot.status !== 'available') {
      // RESERVED: hide button, show overlay inside frame
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
      const badge = slotEl.querySelector('.space-reserved-badge');
      if (badge) badge.remove();
      // Restore default placeholder content if it was replaced
      if (!frame.querySelector('.space-frame-content')) {
        frame.innerHTML = `
          <div class="space-frame-glow"></div>
          <div class="space-frame-content">
            <span class="space-placeholder-logo">◆</span>
            <span class="space-placeholder-text">Available</span>
            <span class="space-placeholder-dims">Select to reserve</span>
          </div>
        `;
      }
    }
  });

  // Full-page takeover is an exclusive first-tenant offer:
  // hide it as soon as any individual slot is no longer available,
  // or if the bundle slot itself has been claimed.
  const bundleSlot = orderedSlots.find(s => s.is_bundle === 1);
  const anyIndividualClaimed = orderedSlots.some(s => !s.is_bundle && s.status !== 'available');
  const bundleClaimed = bundleSlot && bundleSlot.status !== 'available';
  const takeoverEl = document.querySelector('.space-slot[data-bundle="1"]');
  if (takeoverEl) {
    if (anyIndividualClaimed || bundleClaimed) {
      takeoverEl.classList.add('takeover-hidden');
    } else {
      takeoverEl.classList.remove('takeover-hidden');
    }
  }
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
  // New marketplace layout has two slot shapes:
  // - Banners: 1200 × 400 px
  // - Boxes: 600 × 600 px
  if (width >= 1000) return { heading: 60, subtitle: 100 };
  if (width >= 500)  return { heading: 36, subtitle: 60 };
  if (width >= 300)  return { heading: 24, subtitle: 40 };
  return { heading: 12, subtitle: 20 };
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

function openModal(slotOrId) {

  try {
    let slot;
    let slotId;
    if (slotOrId && typeof slotOrId === 'object' && slotOrId.id !== undefined) {
      slot = slotOrId;
      slotId = slot.id;
    } else {
      slotId = slotOrId;
      // Robust ID comparison (handles string vs number IDs from API)
      slot = slotsData.find(s => String(s.id) === String(slotId));
    }
    currentSlotId = slotId;

    // Fallback to DOM if slotsData hasn't loaded yet (only when caller passed a slot object with sort_order)
    if (!slot && typeof slotOrId === 'object' && slotOrId.sort_order) {
      const sortOrder = slotOrId.sort_order;
      const slotEl = document.querySelector(`.space-slot[data-space="${String(sortOrder).padStart(2, '0')}"]`);
      if (!slotEl) return;
      const nameEl = slotEl.querySelector('.space-name');
      const dimsEl = slotEl.querySelector('.space-dims');
      const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
      slot = {
        name: nameEl ? nameEl.textContent : 'Slot',
        width: dimsMatch ? parseInt(dimsMatch[1], 10) : 0,
        height: dimsMatch ? parseInt(dimsMatch[2], 10) : 0,
        price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
        is_bundle: parseInt(slotEl.dataset.bundle, 10) || 0,
      };
    }
    if (!slot) return;

    currentSlotPriceCents = slot.price_cents || 0;
    currentLeaseMonths = 1;
    isBundleApplication = Boolean(slot.is_bundle) || false;
    if (els.leaseMonthly) els.leaseMonthly.classList.add('active');
    if (els.leaseYearly) els.leaseYearly.classList.remove('active');
    updatePriceDisplay();
    els.slotName.textContent = slot.name;
    els.slotDims.textContent = `${slot.width} × ${slot.height} px`;
    applyCharLimits(slot.width || 0);
    if (isBundleApplication) {
      els.slotDims.textContent = 'All 13 ad spaces · One unified campaign';
    }

    clearBookingError();
    showStep('1');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

  } catch (err) {
    console.error('[PUNYCODEX] openModal failed:', err);
  }
}

function updatePriceDisplay() {
  let total;
  if (currentLeaseMonths === 12) {
    total = Math.round(currentSlotPriceCents * 12 * 0.9);
  } else {
    total = currentSlotPriceCents * currentLeaseMonths;
  }
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
  const warn = document.getElementById('booking-upload-warning');
  if (warn) warn.remove();
}

function buildSlotFromDom(slotEl) {
  const nameEl = slotEl.querySelector('.space-name');
  const dimsEl = slotEl.querySelector('.space-dims');
  const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
  const isBundle = slotEl.dataset.bundle === '1';
  const sortOrder = parseInt(slotEl.dataset.space, 10) || 0;
  return {
    id: isBundle ? 'bundle' : sortOrder,
    name: nameEl ? nameEl.textContent.trim() : 'Ad Space',
    width: dimsMatch ? parseInt(dimsMatch[1], 10) : 0,
    height: dimsMatch ? parseInt(dimsMatch[2], 10) : 0,
    price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
    is_bundle: isBundle ? 1 : 0,
    sort_order: sortOrder,
  };
}

// Event: Click anywhere on an available frame to open booking
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;

  let slot;
  if (slotEl.dataset.bundle === '1') {
    // Full-page takeover maps to the bundle slot.
    slot = slotsData.find(s => s.is_bundle === 1);
  } else {
    const sortOrder = parseInt(slotEl.dataset.space, 10);
    slot = slotsData.find(s => s.sort_order === sortOrder);
  }

  // Fallback to DOM data when API slots are not loaded/available.
  if (!slot) {
    slot = buildSlotFromDom(slotEl);
  }

  openModal(slot);
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
els.submitApplication.addEventListener('click', async () => {
  const note = els.applicationNote ? els.applicationNote.value.trim() : '';
  showStep('loading');
  try {
    const res = await fetch(`${API_BASE}/api/bookings/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: currentSlotId,
        email: els.email.value.trim(),
        companyName: els.company.value.trim(),
        websiteUrl: els.website.value.trim(),
        customHeading: els.heading ? els.heading.value.trim() : '',
        customSubtitle: els.subtitle ? els.subtitle.value.trim() : '',
        leaseMonths: currentLeaseMonths,
        verificationToken,
        applicationNote: note,
      }),
    });
    const data = await res.json();
    if (data.status === 'pending_application') {
      showStep('3');
      if (els.dashboardLink) {
        els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${data.token}`;
      }
    } else {
      showBookingError(data.error || 'Application failed');
      showStep('apply');
    }
  } catch (err) {
    showBookingError('Network error. Please try again.');
    showStep('apply');
  }
});

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
    if (verifyData.verified && verifyData.verificationToken) {
      verificationToken = verifyData.verificationToken;
    }
    if (!verifyData.verified) {
      if (els.verifyError) {
        els.verifyError.textContent = verifyData.error || 'Invalid code';
        els.verifyError.style.display = 'block';
      }
      showStep('verify');
      return;
    }

    if (isBundleApplication) {
      const slot = slotsData.find((s) => s.id === currentSlotId) || {};
      if (els.applySlotName) els.applySlotName.textContent = slot.name || 'Full Page Takeover';
      showStep('apply');
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
        verificationToken,
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
  const renewed = params.get('renewed');

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

    if (renewed && booking.status === 'live') {
      openModal(slot);
      showStep('3');
      const titleEl = document.querySelector('#booking-step-3 .booking-modal-title');
      if (titleEl) titleEl.textContent = 'Renewal Complete';
      const subtitleEl = document.querySelector('#booking-step-3 .booking-modal-subtitle');
      if (subtitleEl) subtitleEl.textContent = 'Your lease has been extended. Thank you for continuing with us.';
      els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/demeter/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {
    console.error('[PUNYCODEX] handleReturnFromStripe failed:', err);
  }
}

function setupUploadStep(slot) {
  currentUploadSlot = slot;
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

    // Aspect-ratio sanity check against the booked slot
    if (currentUploadSlot && currentUploadSlot.width && currentUploadSlot.height) {
      const img = new Image();
      img.onload = () => {
        const expected = currentUploadSlot.width / currentUploadSlot.height;
        const actual = img.naturalWidth / img.naturalHeight;
        const deviation = Math.abs(expected - actual) / expected;
        let warn = document.getElementById('booking-upload-warning');
        if (deviation > 0.15) {
          if (!warn) {
            warn = document.createElement('p');
            warn.id = 'booking-upload-warning';
            warn.style.cssText = 'margin-top:0.75rem;font-size:0.8rem;color:#ff6b6b;text-align:center;';
            els.uploadZone.parentNode.insertBefore(warn, els.uploadZone.nextSibling);
          }
          const expectedLabel = expected >= 2.9 ? '3:1 banner' : '1:1 box';
          warn.textContent = 'Aspect ratio mismatch. Recommended ' + currentUploadSlot.width + 'x' + currentUploadSlot.height + ' (' + expectedLabel + '). Your image is ' + img.naturalWidth + 'x' + img.naturalHeight + '. It will be cropped to fit.';
        } else if (warn) {
          warn.remove();
        }
      };
      img.src = selectedFileBase64;
    }
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
      els.dashboardLink.href = `${API_BASE}/sites/demeter/dashboard/?token=${currentBooking.analytics_token}`;
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
const myBookingsFooter = document.getElementById('my-bookings-footer');
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
if (myBookingsFooter) myBookingsFooter.addEventListener('click', openMyBookings);
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

// ─── Original Script Provenance Toggle (lore pages) ───
(function initProvenanceToggle() {
  const toggle = document.getElementById('provenance-toggle');
  const panel = document.getElementById('provenance-content');
  if (!toggle || !panel) return;

  const label = toggle.querySelector('.provenance-toggle-label');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setOpen(isOpen) {
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (label) label.textContent = isOpen ? 'Hide scholarly provenance' : 'Show scholarly provenance';

    if (isOpen) {
      panel.hidden = false;
      // Force a reflow so the transition fires when the class is added.
      void panel.offsetWidth;
      panel.classList.add('is-open');
    } else {
      panel.classList.remove('is-open');
      if (prefersReducedMotion) {
        panel.hidden = true;
      } else {
        const onTransitionEnd = () => {
          panel.removeEventListener('transitionend', onTransitionEnd);
          if (toggle.getAttribute('aria-expanded') !== 'true') panel.hidden = true;
        };
        panel.addEventListener('transitionend', onTransitionEnd);
      }
    }
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!expanded);
  });

  toggle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle.click();
    }
  });
})();
