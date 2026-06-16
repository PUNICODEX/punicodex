/**
 * GAÎA — Earth, Mother of All
 * Interactive Layer: Organic Roots, Falling Leaves, Pollen, Reveals, Navigation
 */

(function() {
    'use strict';

    // ============================
    // Canvas Organic System
    // ============================
    const canvas = document.getElementById('roots-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;
    let roots = [];
    let leaves = [];
    let pollen = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Helper: Random range
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Helper: Quadratic bezier point
    function bezierPoint(t, p0, p1, p2) {
        const mt = 1 - t;
        return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
    }

    // ---- Root System ----
    class Root {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = height + rand(10, 50);
            this.targetY = rand(height * 0.2, height * 0.7);
            this.progress = 0;
            this.speed = rand(0.0015, 0.004);
            this.maxWidth = rand(0.5, 2.5);
            this.width = this.maxWidth;
            this.color = this.pickColor();
            // Bezier control point for organic curve
            this.cpX = this.x + rand(-120, 120);
            this.cpY = (this.y + this.targetY) * 0.5 + rand(-80, 40);
            this.branches = [];
            this.branchChance = rand(0.3, 0.6);
            this.finished = false;
            this.opacity = rand(0.15, 0.45);
            this.segments = [];
            this.generatePath();
        }

        pickColor() {
            const colors = [
                { r: 61, g: 107, b: 61 },    // moss
                { r: 93, g: 58, b: 30 },      // brown
                { r: 74, g: 154, b: 74 },     // life green
                { r: 26, g: 58, b: 26 },      // forest
                { r: 139, g: 115, b: 85 },    // gold-dim
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        generatePath() {
            this.segments = [];
            const steps = 40;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const bx = bezierPoint(t, this.x, this.cpX, this.x + rand(-20, 20));
                const by = bezierPoint(t, this.y, this.cpY, this.targetY);
                // Add organic jitter
                const jitterX = Math.sin(t * Math.PI * 3 + this.x) * rand(-3, 3);
                this.segments.push({
                    x: bx + jitterX,
                    y: by
                });
            }
        }

        update() {
            if (this.finished) return false;

            this.progress += this.speed;

            // Spawn branches
            if (this.progress > 0.3 && this.progress < 0.8 && this.branches.length < 3 && Math.random() < this.branchChance * 0.02) {
                const idx = Math.floor(this.progress * this.segments.length);
                const seg = this.segments[Math.min(idx, this.segments.length - 1)];
                this.branches.push({
                    x: seg.x,
                    y: seg.y,
                    angle: rand(-Math.PI * 0.4, Math.PI * 0.4) - Math.PI * 0.5,
                    length: rand(20, 60),
                    progress: 0,
                    speed: rand(0.02, 0.05),
                    width: this.maxWidth * rand(0.3, 0.6),
                    color: this.color,
                    points: []
                });
            }

            // Update branches
            this.branches.forEach(branch => {
                if (branch.progress < 1) {
                    branch.progress += branch.speed;
                    const currentLen = branch.length * branch.progress;
                    const endX = branch.x + Math.cos(branch.angle) * currentLen;
                    const endY = branch.y + Math.sin(branch.angle) * currentLen;
                    branch.points = [
                        { x: branch.x, y: branch.y },
                        { x: branch.x + Math.cos(branch.angle + rand(-0.2, 0.2)) * currentLen * 0.5, y: branch.y + Math.sin(branch.angle + rand(-0.2, 0.2)) * currentLen * 0.5 },
                        { x: endX, y: endY }
                    ];
                }
            });

            if (this.progress >= 1) {
                this.finished = true;
                this.fadeOut = 1;
            }
            return true;
        }

        draw(ctx) {
            if (this.segments.length < 2) return;

            const fade = this.finished ? Math.max(0, this.fadeOut -= 0.003) : 1;
            if (fade <= 0) return;

            const alpha = this.opacity * fade;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw main root with tapering width
            const visibleSteps = Math.floor(this.progress * this.segments.length);
            for (let i = 1; i < Math.min(visibleSteps + 1, this.segments.length); i++) {
                const t = i / this.segments.length;
                const w = this.maxWidth * (1 - t * 0.6);
                ctx.lineWidth = w;
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * (1 - t * 0.3)})`;
                ctx.beginPath();
                ctx.moveTo(this.segments[i - 1].x, this.segments[i - 1].y);
                ctx.lineTo(this.segments[i].x, this.segments[i].y);
                ctx.stroke();
            }

            // Draw branches
            this.branches.forEach(branch => {
                if (branch.points.length < 2) return;
                ctx.lineWidth = branch.width;
                ctx.strokeStyle = `rgba(${branch.color.r}, ${branch.color.g}, ${branch.color.b}, ${alpha * 0.7})`;
                ctx.beginPath();
                ctx.moveTo(branch.points[0].x, branch.points[0].y);
                for (let i = 1; i < branch.points.length; i++) {
                    ctx.lineTo(branch.points[i].x, branch.points[i].y);
                }
                ctx.stroke();
            });

            ctx.restore();
        }
    }

    // ---- Leaf System ----
    class Leaf {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = rand(-50, -10);
            this.size = rand(3, 8);
            this.speedY = rand(0.3, 1.2);
            this.speedX = rand(-0.5, 0.5);
            this.rotation = rand(0, Math.PI * 2);
            this.rotSpeed = rand(-0.03, 0.03);
            this.sway = rand(0, Math.PI * 2);
            this.swaySpeed = rand(0.01, 0.03);
            this.color = this.pickColor();
            this.opacity = rand(0.2, 0.5);
            this.shape = Math.random() > 0.5 ? 'oval' : 'pointed';
        }

        pickColor() {
            const colors = [
                { r: 74, g: 154, b: 74 },
                { r: 61, g: 107, b: 61 },
                { r: 107, g: 142, b: 35 },
                { r: 139, g: 115, b: 85 },
                { r: 212, g: 175, b: 55 },
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y += this.speedY;
            this.sway += this.swaySpeed;
            this.x += this.speedX + Math.sin(this.sway) * 0.8;
            this.rotation += this.rotSpeed;

            if (this.y > height + 20) {
                this.reset();
            }
            return true;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 1)`;

            if (this.shape === 'oval') {
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.quadraticCurveTo(this.size * 0.6, 0, 0, this.size);
                ctx.quadraticCurveTo(-this.size * 0.6, 0, 0, -this.size);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ---- Pollen System ----
    class Pollen {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = rand(0, width);
            this.y = rand(0, height);
            this.size = rand(0.5, 2);
            this.speedX = rand(-0.3, 0.3);
            this.speedY = rand(-0.2, 0.2);
            this.opacity = rand(0.1, 0.4);
            this.pulse = rand(0, Math.PI * 2);
            this.pulseSpeed = rand(0.02, 0.05);
        }

        update() {
            this.x += this.speedX + Math.sin(this.pulse) * 0.2;
            this.y += this.speedY + Math.cos(this.pulse * 0.7) * 0.15;
            this.pulse += this.pulseSpeed;

            // Wrap around
            if (this.x < -10) this.x = width + 10;
            if (this.x > width + 10) this.x = -10;
            if (this.y < -10) this.y = height + 10;
            if (this.y > height + 10) this.y = -10;

            return true;
        }

        draw(ctx) {
            const flicker = 0.7 + Math.sin(this.pulse) * 0.3;
            ctx.save();
            ctx.globalAlpha = this.opacity * flicker;
            ctx.fillStyle = '#D4AF37';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Initialize particles
    const maxRoots = 12;
    const maxLeaves = 18;
    const maxPollen = 40;

    for (let i = 0; i < maxLeaves; i++) {
        leaves.push(new Leaf());
    }
    for (let i = 0; i < maxPollen; i++) {
        pollen.push(new Pollen());
    }

    function spawnRoot() {
        if (roots.length < maxRoots && Math.random() < 0.03) {
            roots.push(new Root());
        }
    }

    function animateOrganic() {
        ctx.clearRect(0, 0, width, height);

        // Draw and update roots
        roots = roots.filter(root => {
            root.update();
            root.draw(ctx);
            return !root.finished || root.fadeOut > 0;
        });

        spawnRoot();

        // Draw and update leaves
        leaves.forEach(leaf => {
            leaf.update();
            leaf.draw(ctx);
        });

        // Draw and update pollen
        pollen.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        requestAnimationFrame(animateOrganic);
    }

    animateOrganic();

    // ============================
    
    } else {
      console.log('[gaia] Canvas roots-canvas not present on this page');
    }
    // Scroll Reveal System
    // ============================
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay) || 0;
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ============================
    // Navigation
    // ============================
    const nav = document.getElementById('main-nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        if (scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollY = scrollY;
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // ============================
    // Mouse Follow Glow (Desktop)
    // ============================
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            document.querySelectorAll('.name-card, .domain-card, .myth-content').forEach(card => {
                const rect = card.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    card.style.transform = `translateY(-5px) perspective(1000px) rotateX(${-y * 0.3}deg) rotateY(${x * 0.3}deg)`;
                }
            });
        });
    }

    // ============================
    // Prefers Reduced Motion
    // ============================
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealElements.forEach(el => el.classList.add('revealed'));
        if (canvas) canvas.style.display = 'none';
    }

    // ============================
    // Hide canvas on very small screens
    // ============================
    function checkCanvasVisibility() {
        if (!canvas) return;
        if (window.innerWidth < 360) {
            canvas.style.display = 'none';
        } else if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            canvas.style.display = 'block';
        }
    }

    checkCanvasVisibility();
    window.addEventListener('resize', checkCanvasVisibility);

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
    const res = await fetch(`${API_BASE}/api/slots/?site=gaia`);
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
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/gaia/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/gaia/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/gaia/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/gaia/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/gaia/dashboard/?token=${currentBooking.analytics_token}`;
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
