/* =====================================================
   ΠΡΟΜΗΘΕΎΣ — Firebringer Canvas Engine
   Stolen flame, chains from above, storm, eagle, lightning
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       FIREBRINGER CANVAS
       ===================================================== */
    const canvas = document.getElementById('firebringer-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette
    const FLAME = { r: 232, g: 93, b: 4 };
    const EMBER = { r: 255, g: 140, b: 66 };
    const GOLD = { r: 212, g: 175, b: 55 };
    const CHAIN = { r: 160, g: 160, b: 160 };
    const STORM = { r: 74, g: 111, b: 165 };

    // Fire at bottom center
    let fireX, fireY;

    // Flame tongues
    const flames = [];
    const FLAME_COUNT = 15;

    // Rising embers
    const embers = [];
    const EMBER_COUNT = 40;

    // Chains
    const chains = [];
    const CHAIN_COUNT = 3;

    // Lightning
    let lightning = null;
    let lightningTimer = 0;

    // Eagle
    let eagle = null;
    let eagleTimer = 0;

    // Storm clouds
    const clouds = [];

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        fireX = width * 0.5;
        fireY = height * 0.88;
        initFlames();
        initChains();
        initClouds();
    }

    function initFlames() {
        flames.length = 0;
        for (let i = 0; i < FLAME_COUNT; i++) {
            flames.push({
                x: fireX + (Math.random() - 0.5) * 80,
                y: fireY,
                height: Math.random() * 100 + 60,
                width: Math.random() * 16 + 8,
                speed: Math.random() * 0.04 + 0.02,
                phase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.15,
            });
        }
    }

    function initEmbers() {
        for (let i = 0; i < EMBER_COUNT; i++) {
            embers.push(createEmber());
        }
    }

    function createEmber() {
        return {
            x: fireX + (Math.random() - 0.5) * 100,
            y: fireY - Math.random() * 40,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 1.5 + 0.4,
            drift: (Math.random() - 0.5) * 0.6,
            opacity: Math.random() * 0.6 + 0.2,
            life: Math.random() * 120 + 60,
            maxLife: 180,
            color: Math.random() > 0.6 ? FLAME : (Math.random() > 0.5 ? EMBER : GOLD),
        };
    }

    function initChains() {
        chains.length = 0;
        for (let i = 0; i < CHAIN_COUNT; i++) {
            const anchorX = width * 0.3 + i * width * 0.2;
            chains.push({
                anchorX: anchorX,
                anchorY: -20,
                length: height * 0.75 + Math.random() * height * 0.15,
                swingPhase: Math.random() * Math.PI * 2,
                swingSpeed: Math.random() * 0.005 + 0.002,
                swingAmp: Math.random() * 8 + 3,
                links: 25,
            });
        }
    }

    function initClouds() {
        clouds.length = 0;
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.25,
                size: Math.random() * 80 + 60,
                speed: Math.random() * 0.1 + 0.05,
                opacity: Math.random() * 0.08 + 0.03,
            });
        }
    }

    function spawnLightning() {
        lightningTimer++;
        if (lightningTimer < 200 + Math.random() * 300) return;
        lightningTimer = 0;

        const startX = Math.random() * width;
        const points = [{ x: startX, y: 0 }];
        let cx = startX;
        let cy = 0;
        while (cy < height * 0.5) {
            cx += (Math.random() - 0.5) * 60;
            cy += Math.random() * 40 + 20;
            points.push({ x: cx, y: cy });
        }

        lightning = {
            points,
            opacity: 1,
            life: 0,
            maxLife: Math.random() * 8 + 4,
        };
    }

    function spawnEagle() {
        eagleTimer++;
        if (eagleTimer < 400 + Math.random() * 400) return;
        eagleTimer = 0;

        const fromLeft = Math.random() > 0.5;
        eagle = {
            x: fromLeft ? -60 : width + 60,
            y: height * 0.15 + Math.random() * height * 0.2,
            vx: fromLeft ? 2.5 : -2.5,
            vy: Math.random() * 0.4 - 0.2,
            size: 30,
            wingPhase: 0,
            opacity: 0.7,
        };
    }

    function updateFlames() {
        for (const f of flames) {
            f.phase += f.speed;
            f.currentHeight = f.height * (0.6 + 0.4 * Math.sin(f.phase));
            f.currentOpacity = Math.max(0, f.opacity * (0.5 + 0.5 * Math.sin(f.phase * 1.2)));
        }
    }

    function updateEmbers() {
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.y -= e.speed;
            e.x += e.drift + Math.sin(time * 0.002 + e.y * 0.01) * 0.3;
            e.life++;
            e.currentOpacity = Math.max(0, e.opacity * (1 - e.life / e.maxLife));

            if (e.life >= e.maxLife || e.y < 0 || isNaN(e.currentOpacity)) {
                embers[i] = createEmber();
            }
        }
    }

    function updateChains() {
        for (const c of chains) {
            c.swingPhase += c.swingSpeed;
            c.currentSwing = Math.sin(c.swingPhase) * c.swingAmp;
        }
    }

    function updateClouds() {
        for (const c of clouds) {
            c.x += c.speed;
            if (c.x > width + c.size) {
                c.x = -c.size;
                c.y = Math.random() * height * 0.25;
            }
        }
    }

    function updateLightning() {
        if (!lightning) return;
        lightning.life++;
        lightning.opacity = 1 - (lightning.life / lightning.maxLife);
        if (lightning.life >= lightning.maxLife) {
            lightning = null;
        }
    }

    function updateEagle() {
        if (!eagle) return;
        eagle.x += eagle.vx;
        eagle.y += eagle.vy;
        eagle.wingPhase += 0.15;

        if (eagle.x < -80 || eagle.x > width + 80) {
            eagle = null;
        }
    }

    function drawBackground() {
        // Stormy dark sky with fire glow at bottom
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#151515');
        grad.addColorStop(0.3, '#1C1815');
        grad.addColorStop(0.6, '#201810');
        grad.addColorStop(0.85, '#2A1A0A');
        grad.addColorStop(1, '#111111');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawClouds() {
        for (const c of clouds) {
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
            grad.addColorStop(0, `rgba(40, 40, 45, ${c.opacity})`);
            grad.addColorStop(1, 'rgba(40, 40, 45, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFireGlow() {
        // Warm fire glow rising from bottom
        const glow = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, Math.max(width, height) * 0.5);
        glow.addColorStop(0, 'rgba(232, 93, 4, 0.08)');
        glow.addColorStop(0.3, 'rgba(255, 107, 53, 0.04)');
        glow.addColorStop(1, 'rgba(232, 93, 4, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawChains() {
        for (const c of chains) {
            const bottomX = c.anchorX + c.currentSwing;

            ctx.strokeStyle = 'rgba(100, 100, 100, 0.25)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(c.anchorX, c.anchorY);
            ctx.quadraticCurveTo(
                c.anchorX + c.currentSwing * 0.5, c.anchorY + c.length * 0.5,
                bottomX, c.anchorY + c.length
            );
            ctx.stroke();

            // Chain links
            for (let i = 1; i < c.links; i++) {
                const t = i / c.links;
                const lx = c.anchorX + (bottomX - c.anchorX) * t + Math.sin(c.swingPhase + i * 0.5) * 2;
                const ly = c.anchorY + c.length * t;
                ctx.strokeStyle = 'rgba(120, 120, 120, 0.2)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(lx - 4, ly);
                ctx.lineTo(lx + 4, ly);
                ctx.stroke();
            }
        }
    }

    function drawFlames() {
        for (const f of flames) {
            const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y - f.currentHeight);
            grad.addColorStop(0, `rgba(232, 93, 4, ${f.currentOpacity || 0})`);
            grad.addColorStop(0.3, `rgba(255, 107, 53, ${(f.currentOpacity || 0) * 0.7})`);
            grad.addColorStop(0.7, `rgba(255, 140, 66, ${(f.currentOpacity || 0) * 0.3})`);
            grad.addColorStop(1, 'rgba(255, 200, 100, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width * 0.5, f.y);
            ctx.quadraticCurveTo(
                f.x - f.width * 0.2, f.y - f.currentHeight * 0.5,
                f.x + Math.sin(f.phase) * f.width * 0.4, f.y - f.currentHeight
            );
            ctx.quadraticCurveTo(
                f.x + f.width * 0.2, f.y - f.currentHeight * 0.5,
                f.x + f.width * 0.5, f.y
            );
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawEmbers() {
        for (const e of embers) {
            const op = e.currentOpacity || 0;
            if (op <= 0) continue;

            const r = e.color.r;
            const g = e.color.g;
            const b = e.color.b;

            const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${op * 0.3})`);
            glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${op})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawLightning() {
        if (!lightning || lightning.opacity <= 0) return;

        ctx.strokeStyle = `rgba(200, 210, 230, ${lightning.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
        for (let i = 1; i < lightning.points.length; i++) {
            ctx.lineTo(lightning.points[i].x, lightning.points[i].y);
        }
        ctx.stroke();

        // Flash effect
        ctx.fillStyle = `rgba(200, 210, 230, ${lightning.opacity * 0.08})`;
        ctx.fillRect(0, 0, width, height);
    }

    function drawEagle() {
        if (!eagle) return;

        ctx.save();
        ctx.translate(eagle.x, eagle.y);
        ctx.globalAlpha = eagle.opacity;

        // Eagle body
        ctx.fillStyle = '#2A2A2A';
        ctx.beginPath();
        ctx.ellipse(0, 0, eagle.size * 0.4, eagle.size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        const wingY = Math.sin(eagle.wingPhase) * 12;
        ctx.strokeStyle = '#2A2A2A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(-20, -15 + wingY, -35, -5 + wingY * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.quadraticCurveTo(20, -15 + wingY, 35, -5 + wingY * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(20, 20, 20, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function animateCanvas() {
        drawBackground();

        time += 16;

        updateFlames();
        updateEmbers();
        updateChains();
        updateClouds();
        updateLightning();
        updateEagle();

        spawnLightning();
        spawnEagle();

        drawClouds();
        drawFireGlow();
        drawChains();
        drawFlames();
        drawEmbers();
        drawLightning();
        drawEagle();
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
    animateCanvas();

    /* ===================================================== SCROLL REVEALS ===================================================== */
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
    
    } else {
      console.log('[prometheus] Canvas firebringer-canvas not present on this page');
    }const nav = document.getElementById('main-nav');
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
const API_BASE = window.PROMETHEUS_API_BASE || 'http://localhost:3456'; // Set window.PROMETHEUS_API_BASE in HTML for production

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
    const res = await fetch(`${API_BASE}/api/slots?site=prometheus`);
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
  console.log('[PUNYCODEX:prometheus] openModal called:', slotId);
  try {
    currentSlotId = slotId;
    // Robust ID comparison (handles string vs number IDs from API)
    let slot = slotsData.find(s => String(s.id) === String(slotId));

    // Fallback to DOM if slotsData hasn't loaded yet
    if (!slot) {
      const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
      if (!slotEl) { console.log('[PUNYCODEX:prometheus] No slotEl found'); return; }
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
    console.log('[PUNYCODEX:prometheus] Modal opened for slot', slotId);
  } catch (err) {
    console.error('[PUNYCODEX:prometheus] openModal error:', err);
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
  console.log('[PUNYCODEX:prometheus] Slot clicked:', slotId);
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
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/prometheus/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/prometheus/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/prometheus/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/prometheus/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/prometheus/dashboard/?token=${currentBooking.analytics_token}`;
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
