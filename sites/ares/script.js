/* =====================================================
   ἌΡΗΣ — Battlefield Canvas Engine
   Embers, blood mist, shield walls, sword slashes, fire
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       BATTLEFIELD CANVAS
       ===================================================== */
    const canvas = document.getElementById('battlefield-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const CRIMSON = { r: 139, g: 0, b: 0 };
    const CRIMSON_BRIGHT = { r: 179, g: 0, b: 0 };
    const BRONZE = { r: 205, g: 127, b: 50 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const ORANGE = { r: 255, g: 100, b: 30 };
    const ASH = { r: 120, g: 110, b: 100 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Shield Wall Triangles ---------- */
    const shields = [];
    const SHIELD_COUNT = 5;

    function initShields() {
        shields.length = 0;
        for (let i = 0; i < SHIELD_COUNT; i++) {
            shields.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 100 + 80,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.002,
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 2: Embers & Sparks ---------- */
    const embers = [];
    const EMBER_COUNT = 60;

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push(createEmber());
        }
    }

    function createEmber() {
        const isSpark = Math.random() > 0.7;
        return {
            x: Math.random() * width,
            y: Math.random() * height + height * 0.3,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(Math.random() * 1.5 + 0.5),
            size: isSpark ? Math.random() * 2 + 0.5 : Math.random() * 3 + 1,
            opacity: Math.random() * 0.6 + 0.2,
            fadeSpeed: Math.random() * 0.005 + 0.002,
            color: isSpark ? ORANGE : (Math.random() > 0.5 ? CRIMSON_BRIGHT : BRONZE),
            flickerPhase: Math.random() * Math.PI * 2,
        };
    }

    /* ---------- LAYER 3: Blood Mist ---------- */
    const bloodMist = [];
    const MIST_COUNT = 25;

    function initMist() {
        for (let i = 0; i < MIST_COUNT; i++) {
            bloodMist.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 80 + 40,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.08 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 4: Sword Slashes ---------- */
    const slashes = [];
    function spawnSlash() {
        if (Math.random() > 0.015) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200 + 100;
        slashes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            angle: angle,
            length: Math.random() * 150 + 80,
            width: Math.random() * 3 + 1,
            opacity: 1,
            fadeSpeed: Math.random() * 0.03 + 0.02,
            color: Math.random() > 0.5 ? CRIMSON_BRIGHT : BRONZE,
        });
    }

    /* ---------- LAYER 5: Smoke/Dust Clouds ---------- */
    const smoke = [];
    const SMOKE_COUNT = 8;

    function initSmoke() {
        for (let i = 0; i < SMOKE_COUNT; i++) {
            smoke.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 150 + 100,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -(Math.random() * 0.3 + 0.1),
                opacity: Math.random() * 0.06 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /* ---------- LAYER 6: Fire Flickers (bottom edge) ---------- */
    const fires = [];
    const FIRE_COUNT = 12;

    function initFires() {
        for (let i = 0; i < FIRE_COUNT; i++) {
            fires.push({
                x: (width / FIRE_COUNT) * i + Math.random() * 50,
                baseY: height,
                height: Math.random() * 60 + 30,
                width: Math.random() * 20 + 10,
                flickerPhase: Math.random() * Math.PI * 2,
                flickerSpeed: Math.random() * 0.1 + 0.05,
                opacity: Math.random() * 0.15 + 0.05,
            });
        }
    }

    /* ---------- LAYER 7: Floating Debris ---------- */
    const debris = [];
    const DEBRIS_COUNT = 20;

    function initDebris() {
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            debris.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 4 + 2,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.03,
                opacity: Math.random() * 0.2 + 0.05,
                color: Math.random() > 0.6 ? BRONZE : ASH,
            });
        }
    }

    /* ---------- Update Functions ---------- */
    function updateShields() {
        for (const s of shields) {
            s.rotation += s.rotSpeed;
            s.pulsePhase += 0.008;
            s.currentOpacity = s.opacity * (0.7 + 0.3 * Math.sin(s.pulsePhase));
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.flickerPhase += 0.1;
            e.opacity -= e.fadeSpeed;

            if (e.opacity <= 0 || e.y < -20) {
                embers[i] = createEmber();
                embers[i].y = height + Math.random() * 50;
            }
        }
    }

    function updateMist() {
        for (const m of bloodMist) {
            m.x += m.vx;
            m.y += m.vy;
            m.pulsePhase += 0.005;
            m.currentOpacity = m.opacity * (0.5 + 0.5 * Math.sin(m.pulsePhase));

            if (m.x < -100) m.x = width + 100;
            if (m.x > width + 100) m.x = -100;
            if (m.y < -100) m.y = height + 100;
            if (m.y > height + 100) m.y = -100;
        }
    }

    function updateSlashes() {
        for (let i = slashes.length - 1; i >= 0; i--) {
            const s = slashes[i];
            s.opacity -= s.fadeSpeed;
            if (s.opacity <= 0) {
                slashes.splice(i, 1);
            }
        }
    }

    function updateSmoke() {
        for (const s of smoke) {
            s.x += s.vx;
            s.y += s.vy;
            s.pulsePhase += 0.003;
            s.currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(s.pulsePhase));

            if (s.x < -200) s.x = width + 200;
            if (s.x > width + 200) s.x = -200;
            if (s.y < -200) s.y = height + 200;
            if (s.y > height + 200) s.y = -200;
        }
    }

    function updateFires() {
        for (const f of fires) {
            f.flickerPhase += f.flickerSpeed;
            f.currentOpacity = f.opacity * (0.5 + 0.5 * Math.sin(f.flickerPhase));
            f.currentHeight = f.height * (0.7 + 0.3 * Math.sin(f.flickerPhase * 1.3));
        }
    }

    function updateDebris() {
        for (const d of debris) {
            d.x += d.vx;
            d.y += d.vy;
            d.rotation += d.rotSpeed;

            if (d.x < -50) d.x = width + 50;
            if (d.x > width + 50) d.x = -50;
            if (d.y < -50) d.y = height + 50;
            if (d.y > height + 50) d.y = -50;
        }
    }

    /* ---------- Draw Functions ---------- */
    function drawShields() {
        for (const s of shields) {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            // Outer triangle (shield)
            ctx.strokeStyle = `rgba(${BRONZE.r}, ${BRONZE.g}, ${BRONZE.b}, ${s.currentOpacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(-s.size * 0.87, s.size * 0.5);
            ctx.lineTo(s.size * 0.87, s.size * 0.5);
            ctx.closePath();
            ctx.stroke();

            // Inner V (delta emblem)
            ctx.strokeStyle = `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${s.currentOpacity * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(-s.size * 0.4, s.size * 0.25);
            ctx.moveTo(0, -s.size * 0.5);
            ctx.lineTo(s.size * 0.4, s.size * 0.25);
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const flicker = 0.7 + 0.3 * Math.sin(e.flickerPhase);
            const alpha = e.opacity * flicker;

            // Glow
            const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            glow.addColorStop(0, `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha * 0.4})`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMist() {
        for (const m of bloodMist) {
            const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
            gradient.addColorStop(0, `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${m.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSlashes() {
        for (const s of slashes) {
            if (s.opacity <= 0) continue;

            const x2 = s.x + Math.cos(s.angle) * s.length;
            const y2 = s.y + Math.sin(s.angle) * s.length;

            // Glow trail
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity * 0.3})`;
            ctx.lineWidth = s.width * 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Core line
            ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.opacity})`;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Spark at tip
            ctx.fillStyle = `rgba(${ORANGE.r}, ${ORANGE.g}, ${ORANGE.b}, ${s.opacity})`;
            ctx.beginPath();
            ctx.arc(x2, y2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSmoke() {
        for (const s of smoke) {
            const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            gradient.addColorStop(0, `rgba(${ASH.r}, ${ASH.g}, ${ASH.b}, ${s.currentOpacity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFires() {
        for (const f of fires) {
            const gradient = ctx.createRadialGradient(f.x, f.baseY, 0, f.x, f.baseY - f.currentHeight, f.width);
            gradient.addColorStop(0, `rgba(${CRIMSON_BRIGHT.r}, ${CRIMSON_BRIGHT.g}, ${CRIMSON_BRIGHT.b}, ${f.currentOpacity})`);
            gradient.addColorStop(0.5, `rgba(${ORANGE.r}, ${ORANGE.g}, ${ORANGE.b}, ${f.currentOpacity * 0.5})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width, f.baseY);
            ctx.quadraticCurveTo(f.x - f.width * 0.5, f.baseY - f.currentHeight * 0.5, f.x, f.baseY - f.currentHeight);
            ctx.quadraticCurveTo(f.x + f.width * 0.5, f.baseY - f.currentHeight * 0.5, f.x + f.width, f.baseY);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawDebris() {
        for (const d of debris) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);

            ctx.strokeStyle = `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${d.opacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-d.size, 0);
            ctx.lineTo(d.size, 0);
            ctx.moveTo(0, -d.size);
            ctx.lineTo(0, d.size);
            ctx.stroke();

            ctx.restore();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initShields();
        initFires();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateShields();
        updateEmbers();
        updateMist();
        updateSlashes();
        updateSmoke();
        updateFires();
        updateDebris();

        spawnSlash();

        drawSmoke();
        drawShields();
        drawMist();
        drawFires();
        drawEmbers();
        drawSlashes();
        drawDebris();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initEmbers();
    initMist();
    initSmoke();
    initDebris();
    animateCanvas();

    /* =====================================================
       
    } else {
      console.log('[ares] Canvas battlefield-canvas not present on this page');
    }
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
const API_BASE = window.ARES_API_BASE || 'http://localhost:3456'; // Set window.ARES_API_BASE in HTML for production

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
    const res = await fetch(`${API_BASE}/api/slots?site=ares`);
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
  console.log('[PUNYCODEX:ares] openModal called:', slotId);
  try {
    currentSlotId = slotId;
    // Robust ID comparison (handles string vs number IDs from API)
    let slot = slotsData.find(s => String(s.id) === String(slotId));

    // Fallback to DOM if slotsData hasn't loaded yet
    if (!slot) {
      const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
      if (!slotEl) { console.log('[PUNYCODEX:ares] No slotEl found'); return; }
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
    console.log('[PUNYCODEX:ares] Modal opened for slot', slotId);
  } catch (err) {
    console.error('[PUNYCODEX:ares] openModal error:', err);
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
  console.log('[PUNYCODEX:ares] Slot clicked:', slotId);
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
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/ares/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/ares/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/ares/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/ares/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/ares/dashboard/?token=${currentBooking.analytics_token}`;
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
