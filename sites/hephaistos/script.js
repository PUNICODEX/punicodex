/* =====================================================
   ἭΦΑΙΣΤΟΣ — Forge Canvas Engine
   Sparks, molten flows, hammer strikes, heat shimmer,
   forge glow, embers, mechanical gears
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       FORGE CANVAS
       ===================================================== */
const canvas = document.getElementById('forge-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const FLAME = { r: 255, g: 69, b: 0 };
    const FLAME_BRIGHT = { r: 255, g: 140, b: 50 };
    const BRONZE = { r: 205, g: 127, b: 50 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const IRON = { r: 74, g: 74, b: 74 };
    const ASH = { r: 120, g: 110, b: 100 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Forge Glow (bottom) ---------- */
    let forgeGlow = { intensity: 0.15, pulsePhase: 0 };

    /* ---------- LAYER 2: Sparks ---------- */
    const sparks = [];
    const SPARK_COUNT = 80;

    function initSparks() {
        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push(createSpark());
        }
    }

    function createSpark() {
        return {
            x: width * 0.5 + (Math.random() - 0.5) * 300,
            y: height + Math.random() * 50,
            vx: (Math.random() - 0.5) * 3,
            vy: -(Math.random() * 4 + 2),
            size: Math.random() * 2.5 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            fadeSpeed: Math.random() * 0.008 + 0.003,
            color: Math.random() > 0.3 ? FLAME_BRIGHT : (Math.random() > 0.5 ? FLAME : GOLD),
            flickerPhase: Math.random() * Math.PI * 2,
        };
    }

    /* ---------- LAYER 3: Molten Flows ---------- */
    const flows = [];
    const FLOW_COUNT = 4;

    function initFlows() {
        for (let i = 0; i < FLOW_COUNT; i++) {
            flows.push({
                x: Math.random() * width,
                y: Math.random() * height,
                width: Math.random() * 3 + 1,
                length: Math.random() * 100 + 50,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.15 + 0.05,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 4: Hammer Strikes ---------- */
    const strikes = [];
    function spawnStrike() {
        if (Math.random() > 0.012) return;
        strikes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 40 + 20,
            opacity: 1,
            fadeSpeed: Math.random() * 0.05 + 0.03,
            rings: Math.floor(Math.random() * 2) + 2,
        });
    }

    /* ---------- LAYER 5: Heat Shimmer ---------- */
    const shimmers = [];
    const SHIMMER_COUNT = 6;

    function initShimmers() {
        for (let i = 0; i < SHIMMER_COUNT; i++) {
            shimmers.push({
                x: Math.random() * width,
                y: Math.random() * height,
                width: Math.random() * 200 + 100,
                amplitude: Math.random() * 3 + 1,
                frequency: Math.random() * 0.02 + 0.01,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.06 + 0.02,
            });
        }
    }

    /* ---------- LAYER 6: Embers ---------- */
    const embers = [];
    const EMBER_COUNT = 30;

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push({
                x: Math.random() * width,
                y: Math.random() * height + height * 0.5,
                vx: (Math.random() - 0.5) * 1,
                vy: -(Math.random() * 1.5 + 0.5),
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.4 + 0.1,
                fadeSpeed: Math.random() * 0.004 + 0.002,
                flickerPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 7: Mechanical Gears ---------- */
    const gears = [];
    const GEAR_COUNT = 3;

    function initGears() {
        for (let i = 0; i < GEAR_COUNT; i++) {
            gears.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 60 + 40,
                teeth: Math.floor(Math.random() * 8) + 8,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008,
                opacity: Math.random() * 0.08 + 0.03,
                color: Math.random() > 0.5 ? IRON : BRONZE,
            });
        }
    }

    /* ---------- Update Functions ---------- */
    function updateForgeGlow() {
        forgeGlow.pulsePhase += 0.03;
        forgeGlow.currentIntensity = forgeGlow.intensity * (0.8 + 0.2 * Math.sin(forgeGlow.pulsePhase));
    }

    function updateSparks() {
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.05; // gravity
            s.flickerPhase += 0.15;
            s.opacity -= s.fadeSpeed;

            if (s.opacity <= 0 || s.y > height + 20) {
                sparks[i] = createSpark();
            }
        }
    }

    function updateFlows() {
        for (const f of flows) {
            f.x += Math.cos(f.angle) * f.speed;
            f.y += Math.sin(f.angle) * f.speed;
            f.pulsePhase += 0.02;
            f.currentOpacity = f.opacity * (0.6 + 0.4 * Math.sin(f.pulsePhase));

            if (f.x < -100) f.x = width + 100;
            if (f.x > width + 100) f.x = -100;
            if (f.y < -100) f.y = height + 100;
            if (f.y > height + 100) f.y = -100;
        }
    }

    function updateStrikes() {
        for (let i = strikes.length - 1; i >= 0; i--) {
            const s = strikes[i];
            s.opacity -= s.fadeSpeed;
            if (s.opacity <= 0) {
                strikes.splice(i, 1);
            }
        }
    }

    function updateShimmers() {
        for (const s of shimmers) {
            s.phase += s.speed * 0.01;
            s.x += s.speed;
            if (s.x > width + s.width) s.x = -s.width;
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.flickerPhase += 0.08;
            e.opacity -= e.fadeSpeed;

            if (e.opacity <= 0 || e.y < -20) {
                e.x = Math.random() * width;
                e.y = height + Math.random() * 50;
                e.opacity = Math.random() * 0.4 + 0.1;
            }
        }
    }

    function updateGears() {
        for (const g of gears) {
            g.rotation += g.rotSpeed;
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawForgeGlow() {
        const gradient = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, height * 0.6);
        gradient.addColorStop(0, `rgba(${FLAME.r}, ${FLAME.g}, ${FLAME.b}, ${forgeGlow.currentIntensity})`);
        gradient.addColorStop(0.4, `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${forgeGlow.currentIntensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function drawSparks() {
        for (const s of sparks) {
            const flicker = 0.7 + 0.3 * Math.sin(s.flickerPhase);
            const alpha = s.opacity * flicker;

            // Glow
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
            glow.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha * 0.4})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFlows() {
        for (const f of flows) {
            ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${f.currentOpacity})`;
            ctx.lineWidth = f.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const x2 = f.x + Math.cos(f.angle) * f.length;
            const y2 = f.y + Math.sin(f.angle) * f.length;
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    function drawStrikes() {
        for (const s of strikes) {
            if (s.opacity <= 0) continue;

            for (let r = 0; r < s.rings; r++) {
                const ringSize = s.size * (r + 1) / s.rings;
                ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity * (1 - r / s.rings) * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(s.x, s.y, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Center flash
            const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 0.5);
            gradient.addColorStop(0, `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawShimmers() {
        for (const s of shimmers) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(s.x, s.y - 20, s.width, 40);
            ctx.clip();

            for (let y = s.y - 20; y < s.y + 20; y += 2) {
                const offset = Math.sin(y * s.frequency + s.phase) * s.amplitude;
                ctx.strokeStyle = `rgba(${FLAME_BRIGHT.r}, ${FLAME_BRIGHT.g}, ${FLAME_BRIGHT.b}, ${s.opacity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(s.x, y);
                ctx.lineTo(s.x + s.width, y + offset);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const flicker = 0.7 + 0.3 * Math.sin(e.flickerPhase);
            const alpha = e.opacity * flicker;

            ctx.fillStyle = `rgba(${FLAME.r}, ${FLAME.g}, ${FLAME.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGears() {
        for (const g of gears) {
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.rotation);

            // Outer ring
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, g.size, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, g.size * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // Center
            ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.7})`;
            ctx.beginPath();
            ctx.arc(0, 0, g.size * 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Spokes
            ctx.strokeStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${g.opacity * 0.4})`;
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * g.size * 0.6, Math.sin(angle) * g.size * 0.6);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initFlows();
        initShimmers();
        initGears();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateForgeGlow();
        updateSparks();
        updateFlows();
        updateStrikes();
        updateShimmers();
        updateEmbers();
        updateGears();

        spawnStrike();

        drawForgeGlow();
        drawGears();
        drawShimmers();
        drawFlows();
        drawEmbers();
        drawSparks();
        drawStrikes();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initSparks();
    initEmbers();
    animateCanvas();

    } else {
      console.log('[hephaistos] Canvas forge-canvas not present on this page');
    }
    /* =====================================================
       SCROLL REVEALS
       ===================================================== */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    /* =====================================================
       NAV SCROLL EFFECT
       ===================================================== */
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

    /* =====================================================
       MOBILE NAV TOGGLE
       ===================================================== */
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

    /* =====================================================
       MASCOT PARALLAX
       ===================================================== */
    const mascot = document.querySelector('.mascot-img');
    if (mascot) {
        window.addEventListener('mousemove', e => {
            const x = (e.clientX / width - 0.5) * 15;
            const y = (e.clientY / height - 0.5) * 10;
            mascot.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    /* =====================================================
       SMOOTH SCROLL
       ===================================================== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();

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
};

let selectedFile = null;
let selectedFileBase64 = null;

// Fetch slots and update UI
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots/?site=hephaistos`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {

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

  try {
    currentSlotId = slotId;
    // Robust ID comparison (handles string vs number IDs from API)
    let slot = slotsData.find(s => String(s.id) === String(slotId));

    // Fallback to DOM if slotsData hasn't loaded yet
    if (!slot) {
      const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
      if (!slotEl) return;
      const nameEl = slotEl.querySelector('.space-name');
      const dimsEl = slotEl.querySelector('.space-dims');
      const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
      slot = {
        name: nameEl ? nameEl.textContent : 'Slot',
        width: dimsMatch ? parseInt(dimsMatch[1]) : 0,
        height: dimsMatch ? parseInt(dimsMatch[2]) : 0,
        price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
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

  } catch (err) {

  }
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

// Event: Click anywhere on an available frame to open booking
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;
  const slotId = parseInt(slotEl.dataset.space, 10);

  openModal(slotId);
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
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/hephaistos/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/hephaistos/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/hephaistos/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/hephaistos/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {

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
      els.dashboardLink.href = `${API_BASE}/sites/hephaistos/dashboard/?token=${currentBooking.analytics_token}`;
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
