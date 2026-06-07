/* ===== HERMÊS CANVAS — The Messenger's Road ===== */
/* Canvas layers:
 * 1. Deep emerald background
 * 2. Road trails (golden dashed lines)
 * 3. Swift streaks (speed lines)
 * 4. Caduceus serpents (intertwined sine waves)
 * 5. Wing particles (floating feathers)
 * 6. Mercury droplets (pulsing orbs)
 * 7. Signal pulses (expanding rings)
 * 8. Lightning flashes (brief illuminations)
 */

const canvas = document.getElementById('solar-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let width, height;
let mouseX = 0, mouseY = 0;
let time = 0;

// Color palette
const GOLDENROD = { r: 212, g: 148, b: 30 };
const GREEN = { r: 45, g: 138, b: 94 };
const GOLD = { r: 212, g: 148, b: 30 };
const CREAM = { r: 245, g: 245, b: 220 };
const OLIVE = { r: 85, g: 107, b: 47 };

/* ---------- LAYER 1: Road Trails ---------- */
const trails = [];
const TRAIL_COUNT = 6;

function initTrails() {
    trails.length = 0;
    for (let i = 0; i < TRAIL_COUNT; i++) {
        trails.push({
            y: Math.random() * height,
            width: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.08 + 0.02,
            speed: Math.random() * 0.5 + 0.2,
            dashOffset: Math.random() * 100,
        });
    }
}

/* ---------- LAYER 2: Swift Streaks ---------- */
const streaks = [];
function spawnStreak() {
    if (Math.random() > 0.02) return;
    const angle = Math.random() * Math.PI * 2;
    streaks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: angle,
        length: Math.random() * 200 + 100,
        speed: Math.random() * 8 + 5,
        opacity: Math.random() * 0.4 + 0.2,
        width: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.6 ? GOLDENROD : CREAM,
    });
}

/* ---------- LAYER 3: Caduceus Serpents ---------- */
const serpents = [];
function initSerpents() {
    serpents.length = 0;
    for (let i = 0; i < 2; i++) {
        serpents.push({
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.01 + 0.005,
            amplitude: Math.random() * 40 + 30,
            frequency: Math.random() * 0.008 + 0.004,
            yOffset: height * 0.3 + i * height * 0.3,
            opacity: Math.random() * 0.1 + 0.05,
            color: i === 0 ? GREEN : GOLDENROD,
        });
    }
}

/* ---------- LAYER 4: Wing Particles ---------- */
const wings = [];
const WING_COUNT = 30;

function initWings() {
    for (let i = 0; i < WING_COUNT; i++) {
        wings.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 0.8,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.03,
            opacity: Math.random() * 0.25 + 0.08,
            color: Math.random() > 0.5 ? CREAM : GOLDENROD,
        });
    }
}

/* ---------- LAYER 5: Mercury Droplets ---------- */
const droplets = [];
const DROPLET_COUNT = 15;

function initDroplets() {
    for (let i = 0; i < DROPLET_COUNT; i++) {
        droplets.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 4 + 2,
            opacity: Math.random() * 0.4 + 0.15,
            pulsePhase: Math.random() * Math.PI * 2,
        });
    }
}

/* ---------- LAYER 6: Signal Pulses ---------- */
const signals = [];
function spawnSignal() {
    if (Math.random() > 0.008) return;
    signals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 5,
        maxRadius: Math.random() * 100 + 60,
        opacity: 0.6,
        color: Math.random() > 0.5 ? GOLDENROD : GREEN,
    });
}

/* ---------- LAYER 7: Lightning Flashes ---------- */
const flashes = [];
function spawnFlash() {
    if (Math.random() > 0.006) return;
    flashes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 60 + 30,
        opacity: 1,
        fadeSpeed: Math.random() * 0.08 + 0.05,
    });
}

/* ---------- Update Functions ---------- */
function updateTrails() {
    for (const t of trails) {
        t.dashOffset += t.speed;
    }
}

function updateStreaks() {
    for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.015;
        if (s.opacity <= 0 || s.x < -200 || s.x > width + 200 || s.y < -200 || s.y > height + 200) {
            streaks.splice(i, 1);
        }
    }
}

function updateSerpents() {
    for (const s of serpents) {
        s.phase += s.speed;
    }
}

function updateWings() {
    for (const w of wings) {
        w.x += w.vx;
        w.y += w.vy;
        w.rotation += w.rotSpeed;

        if (w.x < -50) w.x = width + 50;
        if (w.x > width + 50) w.x = -50;
        if (w.y < -50) w.y = height + 50;
        if (w.y > height + 50) w.y = -50;
    }
}

function updateDroplets() {
    for (const d of droplets) {
        d.x += d.vx;
        d.y += d.vy;
        d.pulsePhase += 0.05;
        d.currentOpacity = d.opacity * (0.7 + 0.3 * Math.sin(d.pulsePhase));

        if (d.x < 0 || d.x > width) d.vx *= -1;
        if (d.y < 0 || d.y > height) d.vy *= -1;
    }
}

function updateSignals() {
    for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.radius += 1.2;
        s.opacity = 0.6 * (1 - s.radius / s.maxRadius);
        if (s.radius >= s.maxRadius || s.opacity <= 0) {
            signals.splice(i, 1);
        }
    }
}

function updateFlashes() {
    for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.opacity -= f.fadeSpeed;
        if (f.opacity <= 0) {
            flashes.splice(i, 1);
        }
    }
}

/* ---------- Draw Functions ---------- */
function drawTrails() {
    for (const t of trails) {
        ctx.strokeStyle = `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${t.opacity})`;
        ctx.lineWidth = t.width;
        ctx.setLineDash([20, 40]);
        ctx.lineDashOffset = -t.dashOffset;
        ctx.beginPath();
        ctx.moveTo(0, t.y);
        ctx.lineTo(width, t.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawStreaks() {
    for (const s of streaks) {
        const x2 = s.x + Math.cos(s.angle) * s.length;
        const y2 = s.y + Math.sin(s.angle) * s.length;

        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.2})`;
        ctx.lineWidth = s.width * 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function drawSerpents() {
    for (const s of serpents) {
        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
            const y = s.yOffset + Math.sin(x * s.frequency + s.phase) * s.amplitude;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < width; x += 3) {
            const y = s.yOffset + Math.sin(x * s.frequency + s.phase + Math.PI) * s.amplitude;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function drawWings() {
    for (const w of wings) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rotation);

        ctx.fillStyle = `rgba(${w.color.r}, ${w.color.g}, ${w.color.b}, ${w.opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, -w.size);
        ctx.quadraticCurveTo(w.size * 0.7, -w.size * 0.3, w.size * 0.5, w.size * 0.5);
        ctx.quadraticCurveTo(0, w.size * 0.3, 0, w.size * 0.5);
        ctx.quadraticCurveTo(-w.size * 0.5, w.size * 0.3, -w.size * 0.5, w.size * 0.5);
        ctx.quadraticCurveTo(-w.size * 0.7, -w.size * 0.3, 0, -w.size);
        ctx.fill();

        ctx.strokeStyle = `rgba(${w.color.r}, ${w.color.g}, ${w.color.b}, ${w.opacity * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -w.size);
        ctx.lineTo(0, w.size * 0.3);
        ctx.stroke();

        ctx.restore();
    }
}

function drawDroplets() {
    for (const d of droplets) {
        const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size * 3);
        glow.addColorStop(0, `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${d.currentOpacity * 0.3})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${d.currentOpacity})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${d.currentOpacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(d.x - d.size * 0.3, d.y - d.size * 0.3, d.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSignals() {
    for (const s of signals) {
        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawFlashes() {
    for (const f of flashes) {
        if (f.opacity <= 0) continue;

        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        gradient.addColorStop(0, `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${f.opacity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(${GOLDENROD.r}, ${GOLDENROD.g}, ${GOLDENROD.b}, ${f.opacity * 0.3})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawOverlay() {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, 'rgba(10, 18, 10, 0)');
    gradient.addColorStop(1, 'rgba(10, 18, 10, 0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

/* ---------- Main Loop ---------- */
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
    initTrails();
    initSerpents();
}

function animateCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(10, 18, 10, 0.15)';
    ctx.fillRect(0, 0, width, height);

    time += 16;

    updateTrails();
    updateStreaks();
    updateSerpents();
    updateWings();
    updateDroplets();
    updateSignals();
    updateFlashes();

    spawnStreak();
    spawnSignal();
    spawnFlash();

    drawTrails();
    drawSerpents();
    drawSignals();
    drawWings();
    drawDroplets();
    drawStreaks();
    drawFlashes();
    drawOverlay();

    requestAnimationFrame(animateCanvas);
}

if (canvas) {
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    resizeCanvas();
    initWings();
    initDroplets();
    animateCanvas();
}


// ========== UI INTERACTIONS ==========

// 3D tilt on cards
function initTilt() {
    document.querySelectorAll('.space-slot').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = (y - cy) / cy * -3;
            const ry = (x - cx) / cx * 3;
            card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
}

// Scroll reveals
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, delay);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
});

// Nav scroll effect
const nav = document.getElementById('main-nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 80) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
});

// Mobile nav toggle
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

// Mascot parallax
const mascot = document.querySelector('.mascot-img');
if (mascot) {
    window.addEventListener('mousemove', e => {
        const x = (e.clientX / width - 0.5) * 15;
        const y = (e.clientY / height - 0.5) * 10;
        mascot.style.transform = `translate(${x}px, ${y}px)`;
    });
}

initTilt();


// ========== HERMÊS BOOKING SYSTEM ==========
const API_BASE = window.RA_API_BASE || 'http://localhost:3456';
const SITE_SLUG = 'ra';

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
    const res = await fetch(`${API_BASE}/api/slots?site=${SITE_SLUG}`);
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
        if (dimsEl) dimsEl.textContent = slot.custom_subtitle || `${slot.width} \u00d7 ${slot.height} px`;
      } else {
        meta.style.display = 'none';
      }
    } else if (meta) {
      // Reset to default for available/reserved slots
      meta.style.display = 'flex';
      const nameEl = meta.querySelector('.space-name');
      const dimsEl = meta.querySelector('.space-dims');
      if (nameEl) nameEl.textContent = slot.name;
      if (dimsEl) dimsEl.textContent = `${slot.width} \u00d7 ${slot.height} px`;
    }

    // Determine if this slot should render its own creative
    // Bundle members need a per-slot creative; the bundle slot itself uses main creative
    const bundleSlot = slotsData.find(s => s.is_bundle === 1);
    const isBundleMember = bundleSlot && slotId !== bundleSlot.id && slot.booking_id && bundleSlot.current_booking_id === slot.booking_id;
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
    } else if (slot.status !== 'available') {
      // RESERVED: hide button, show overlay inside frame
      const overlay = document.createElement('div');
      overlay.className = 'space-frame-overlay';
      overlay.innerHTML = `
        <span class="space-frame-overlay-text">${slot.status === 'live' ? 'LIVE' : 'RESERVED'}</span>
        <span class="space-frame-overlay-sub">${slot.company_name || ''}</span>
      `;
      frame.appendChild(overlay);
    } else {
      // AVAILABLE: show button, reset frame
      btn.style.display = '';
      const placeholder = frame.querySelector('.space-frame-content');
      if (!placeholder) {
        frame.innerHTML = `
          <div class="space-frame-glow"></div>
          <div class="space-frame-content">
            <span class="space-placeholder-logo">\u25c6</span>
            
          </div>
        `;
      }
    }
  });
}

// Open booking modal for a slot
function openBooking(slotId) {
  console.log('[PUNYCODEX] openBooking called:', slotId);
  try {
    // Robust ID comparison (handles string vs number IDs from API)
    let slot = slotsData.find(s => String(s.id) === String(slotId));

    // Fallback to DOM if slotsData hasn't loaded yet
    if (!slot) {
      const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
      if (!slotEl) { console.log('[PUNYCODEX] No slotEl found'); return; }
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

    currentSlotId = slotId;
    currentBooking = null;

    // Reset form
    els.email.value = '';
    els.company.value = '';
    els.website.value = '';
    els.heading.value = '';
    els.subtitle.value = '';
    els.codeInput.value = '';
    els.verifyError.textContent = '';
    els.verifyError.style.display = 'none';
    selectedFile = null;
    selectedFileBase64 = null;
    if (els.uploadPreview) els.uploadPreview.innerHTML = '';
    if (els.uploadPrompt) els.uploadPrompt.style.display = 'flex';
    if (els.uploadActions) els.uploadActions.style.display = 'none';
    if (els.livePreview) els.livePreview.style.display = 'none';
    if (els.rejectReason) els.rejectReason.textContent = '';

    // Set slot info
    els.slotName.textContent = slot.name;
    els.slotDims.textContent = `${slot.width} \u00d7 ${slot.height} px`;
    const price = ((slot.price_cents || 0) / 100).toFixed(0);
    els.price.textContent = `$${price}`;

    // Set char limits
    const limits = getCharLimits(slot.width || 0);
    els.headingLimit.textContent = limits.heading;
    els.subtitleLimit.textContent = limits.subtitle;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Show step 1
    showStep(1);
    console.log('[PUNYCODEX] Modal opened for slot', slotId);
  } catch (err) {
    console.error('[PUNYCODEX] openBooking error:', err);
  }
}

function getCharLimits(slotWidth) {
  if (slotWidth >= 1000) return { heading: 50, subtitle: 80 };
  if (slotWidth >= 800)  return { heading: 38, subtitle: 60 };
  if (slotWidth >= 500)  return { heading: 24, subtitle: 40 };
  if (slotWidth >= 300)  return { heading: 15, subtitle: 26 };
  return { heading: 10, subtitle: 18 };
}

function showStep(step) {
  Object.values(steps).forEach(s => { if (s) s.style.display = 'none'; });
  if (steps[step]) steps[step].style.display = 'block';
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Event: Click anywhere on a slot to open booking
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;
  const slotId = parseInt(slotEl.dataset.space, 10);
  console.log('[PUNYCODEX] Slot clicked:', slotId);
  openBooking(slotId);
});

// Close modal
if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Lease toggle
if (els.leaseMonthly && els.leaseYearly) {
  els.leaseMonthly.addEventListener('click', () => {
    els.leaseMonthly.classList.add('active');
    els.leaseYearly.classList.remove('active');
    updatePrice();
  });
  els.leaseYearly.addEventListener('click', () => {
    els.leaseYearly.classList.add('active');
    els.leaseMonthly.classList.remove('active');
    updatePrice();
  });
}

function updatePrice() {
  const slot = slotsData.find(s => s.id === currentSlotId);
  if (!slot) return;
  const isYearly = els.leaseYearly && els.leaseYearly.classList.contains('active');
  const months = isYearly ? 12 : 1;
  const total = (slot.price_cents * months / 100).toFixed(0);
  els.price.textContent = `$${total}`;
}

// Character counters
function updateCounts() {
  const slot = slotsData.find(s => s.id === currentSlotId);
  if (!slot) return;
  const limits = getCharLimits(slot.width);
  els.headingCount.textContent = els.heading.value.length;
  els.subtitleCount.textContent = els.subtitle.value.length;
  els.headingCount.style.color = els.heading.value.length > limits.heading ? '#ff6b6b' : '';
  els.subtitleCount.style.color = els.subtitle.value.length > limits.subtitle ? '#ff6b6b' : '';
}
if (els.heading) els.heading.addEventListener('input', updateCounts);
if (els.subtitle) els.subtitle.addEventListener('input', updateCounts);

// Step 1: Send verification code
if (els.sendCode) {
  els.sendCode.addEventListener('click', async () => {
    const email = els.email.value.trim();
    if (!email || !email.includes('@')) {
      els.verifyError.textContent = 'Please enter a valid email address.';
      els.verifyError.style.display = 'block';
      return;
    }

    els.sendCode.disabled = true;
    els.sendCode.textContent = 'Sending...';

    try {
      const res = await fetch(`${API_BASE}/api/verify/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.sent) {
        showStep('verify');
        els.verifyEmail.textContent = email;
        els.verifyError.style.display = 'none';
      } else {
        throw new Error(data.error || 'Failed to send code');
      }
    } catch (err) {
      els.verifyError.textContent = err.message;
      els.verifyError.style.display = 'block';
    } finally {
      els.sendCode.disabled = false;
      els.sendCode.textContent = 'Send Verification Code';
    }
  });
}

// Step verify: Verify code
if (els.verifyBtn) {
  els.verifyBtn.addEventListener('click', async () => {
    const email = els.email.value.trim();
    const code = els.codeInput.value.trim();
    if (!code) {
      els.verifyError.textContent = 'Please enter the verification code.';
      els.verifyError.style.display = 'block';
      return;
    }

    els.verifyBtn.disabled = true;
    els.verifyBtn.textContent = 'Verifying...';

    try {
      const res = await fetch(`${API_BASE}/api/verify/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.verified) {
        // Proceed to payment
        await createBooking();
      } else {
        throw new Error(data.error || 'Invalid code');
      }
    } catch (err) {
      els.verifyError.textContent = err.message;
      els.verifyError.style.display = 'block';
    } finally {
      els.verifyBtn.disabled = false;
      els.verifyBtn.textContent = 'Verify & Continue';
    }
  });
}

// Resend code
if (els.resendCode) {
  els.resendCode.addEventListener('click', async () => {
    const email = els.email.value.trim();
    try {
      await fetch(`${API_BASE}/api/verify/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      els.resendCode.textContent = 'Code sent!';
      setTimeout(() => els.resendCode.textContent = 'Resend code', 2000);
    } catch (err) {
      console.error('Resend failed:', err);
    }
  });
}

async function createBooking() {
  const slot = slotsData.find(s => s.id === currentSlotId);
  if (!slot) return;

  const isYearly = els.leaseYearly && els.leaseYearly.classList.contains('active');
  const leaseMonths = isYearly ? 12 : 1;

  try {
    showStep('loading');
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: currentSlotId,
        email: els.email.value.trim(),
        companyName: els.company.value.trim(),
        websiteUrl: els.website.value.trim(),
        customHeading: els.heading.value.trim(),
        customSubtitle: els.subtitle.value.trim(),
        leaseMonths,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentBooking = data;

    // Redirect to Stripe
    if (data.stripeUrl) {
      window.location.href = data.stripeUrl;
    } else {
      // Stripe not configured — skip to upload
      showStep(2);
    }
  } catch (err) {
    els.verifyError.textContent = err.message;
    els.verifyError.style.display = 'block';
    showStep(1);
  }
}

// Handle return from Stripe
async function handleReturnFromStripe() {
  const params = new URLSearchParams(window.location.search);
  const bookingToken = params.get('booking');
  const paid = params.get('paid');
  const canceled = params.get('canceled');

  if (!bookingToken) return;

  if (canceled) {
    // User canceled — show message
    showStep(1);
    els.verifyError.textContent = 'Payment was canceled. You can try again.';
    els.verifyError.style.display = 'block';
    return;
  }

  if (paid) {
    // Check payment status
    try {
      showStep('loading');
      const res = await fetch(`${API_BASE}/api/bookings/${bookingToken}/check-payment`);
      const data = await res.json();
      if (data.status === 'pending_upload' || data.status === 'pending_approval' || data.status === 'live') {
        currentBooking = data.booking;
        showStep(2);
      } else {
        showStep(1);
        els.verifyError.textContent = 'Payment is still processing. Please check your email.';
        els.verifyError.style.display = 'block';
      }
    } catch (err) {
      showStep(1);
      els.verifyError.textContent = 'Error checking payment status. Please try again.';
      els.verifyError.style.display = 'block';
    }
  }
}

// Step 2: Upload creative
if (els.uploadZone) {
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
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

if (els.uploadInput) {
  els.uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (PNG, JPG, or WebP).');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Image must be under 2MB.');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedFileBase64 = e.target.result;
    if (els.uploadPreview) {
      els.uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width:100%;max-height:200px;border-radius:4px;">`;
    }
    if (els.uploadPrompt) els.uploadPrompt.style.display = 'none';
    if (els.uploadActions) els.uploadActions.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

if (els.changeFile) {
  els.changeFile.addEventListener('click', () => {
    selectedFile = null;
    selectedFileBase64 = null;
    if (els.uploadPreview) els.uploadPreview.innerHTML = '';
    if (els.uploadPrompt) els.uploadPrompt.style.display = 'flex';
    if (els.uploadActions) els.uploadActions.style.display = 'none';
  });
}

if (els.submitUpload) {
  els.submitUpload.addEventListener('click', async () => {
    if (!selectedFileBase64 || !currentBooking) return;

    els.submitUpload.disabled = true;
    els.submitUpload.textContent = 'Uploading...';

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${currentBooking.token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedFileBase64,
          filename: selectedFile.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStep(3);
        // Show live preview
        if (els.livePreviewFrame) {
          els.livePreviewFrame.innerHTML = `<img src="${API_BASE}${data.path}" alt="Creative preview" style="width:100%;height:100%;object-fit:cover;">`;
        }
        if (els.dashboardLink) {
          els.dashboardLink.href = `${API_BASE}/sites/${SITE_SLUG}/dashboard/?token=${currentBooking.token}`;
        }
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      els.submitUpload.disabled = false;
      els.submitUpload.textContent = 'Submit Creative';
    }
  });
}

// Re-upload after rejection
if (els.reuploadBtn) {
  els.reuploadBtn.addEventListener('click', () => {
    showStep(2);
    selectedFile = null;
    selectedFileBase64 = null;
    if (els.uploadPreview) els.uploadPreview.innerHTML = '';
    if (els.uploadPrompt) els.uploadPrompt.style.display = 'flex';
    if (els.uploadActions) els.uploadActions.style.display = 'none';
  });
}

if (els.rejectedClose) {
  els.rejectedClose.addEventListener('click', closeModal);
}

if (els.doneBtn) {
  els.doneBtn.addEventListener('click', closeModal);
}

// Load slots on page load
loadSlots();

// Handle return from Stripe on page load
handleReturnFromStripe();

// Refresh slots every 30 seconds
setInterval(loadSlots, 30000);

} // End booking system


// ========== MY BOOKINGS RECOVERY ==========
const myBookingsBtn = document.getElementById('my-bookings-btn');
const myBookingsModal = document.getElementById('my-bookings-modal');
const myBookingsClose = document.getElementById('my-bookings-close');
const myBookingsSubmit = document.getElementById('my-bookings-submit');
const myBookingsEmail = document.getElementById('my-bookings-email');
const myBookingsResult = document.getElementById('my-bookings-result');

if (myBookingsBtn && myBookingsModal) {
  myBookingsBtn.addEventListener('click', () => {
    myBookingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
}

if (myBookingsClose) {
  myBookingsClose.addEventListener('click', () => {
    myBookingsModal.style.display = 'none';
    document.body.style.overflow = '';
  });
}

if (myBookingsModal) {
  myBookingsModal.addEventListener('click', (e) => {
    if (e.target === myBookingsModal) {
      myBookingsModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  });
}

if (myBookingsSubmit) {
  myBookingsSubmit.addEventListener('click', async () => {
    const email = myBookingsEmail.value.trim();
    if (!email || !email.includes('@')) {
      myBookingsResult.textContent = 'Please enter a valid email address.';
      myBookingsResult.style.color = '#ff6b6b';
      return;
    }

    myBookingsSubmit.disabled = true;
    myBookingsSubmit.textContent = 'Sending...';

    try {
      const res = await fetch(`${API_BASE}/api/bookings/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      myBookingsResult.textContent = data.message || 'If bookings exist for this email, a link has been sent.';
      myBookingsResult.style.color = '#4ade80';
    } catch (err) {
      myBookingsResult.textContent = 'Error sending recovery email. Please try again.';
      myBookingsResult.style.color = '#ff6b6b';
    } finally {
      myBookingsSubmit.disabled = false;
      myBookingsSubmit.textContent = 'Send Dashboard Links';
    }
  });
}
