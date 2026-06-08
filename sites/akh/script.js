/**
 * ꜣḫ FLAGSHIP TEMPLE — STARLIGHT CANVAS & INTERACTIONS
 * Star trails, rising luminous motes, cosmic dust, ethereal wisps
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Starlight Canvas ─────────────────────────────────────────────────── */
    const canvas = document.getElementById('star-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        let starTrails = [];
        let luminousMotes = [];
        let cosmicDust = [];
        let nebulaWisps = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class Star {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.3;
                this.baseOpacity = Math.random() * 0.6 + 0.2;
                this.opacity = this.baseOpacity;
                this.twinkleSpeed = Math.random() * 0.02 + 0.005;
                this.twinklePhase = Math.random() * Math.PI * 2;
                this.hue = Math.random() > 0.7 ? 270 : (Math.random() > 0.5 ? 260 : 280);
            }

            update() {
                this.twinklePhase += this.twinkleSpeed;
                this.opacity = this.baseOpacity + Math.sin(this.twinklePhase) * 0.15;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.opacity);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 40%, 85%)`;
                ctx.shadowBlur = this.size * 4;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 70%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class StarTrail {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.length = Math.random() * 40 + 15;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.15 + 0.05;
                this.growing = true;
                this.speed = Math.random() * 0.002 + 0.0005;
                this.hue = Math.random() > 0.5 ? 265 : 275;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < -50) this.x = width + 50;
                if (this.x > width + 50) this.x = -50;
                if (this.y < -50) this.y = height + 50;
                if (this.y > height + 50) this.y = -50;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                const tailX = this.x - this.vx * this.length;
                const tailY = this.y - this.vy * this.length;

                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(tailX, tailY);
                ctx.strokeStyle = `hsla(${this.hue}, 50%, 75%, 0.6)`;
                ctx.lineWidth = 0.8;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
        }

        class LuminousMote {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 20;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = -(Math.random() * 0.4 + 0.15);
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.hue = Math.random() > 0.6 ? 265 : (Math.random() > 0.4 ? 270 : 280);
                this.life = Math.random() * 500 + 300;
                this.maxLife = this.life;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.pulsePhase += 0.03;
                const pulse = 0.5 + Math.sin(this.pulsePhase) * 0.3;
                this.opacity = (this.life / this.maxLife) * (Math.random() * 0.3 + 0.15) * pulse;

                if (this.life <= 0 || this.y < -50) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 60%, 80%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${this.hue}, 60%, 70%, ${this.opacity * 0.5})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class CosmicDust {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : height + 10;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = -(Math.random() * 0.15 + 0.05);
                this.size = Math.random() * 1.2 + 0.3;
                this.opacity = Math.random() * 0.2 + 0.05;
                this.life = Math.random() * 600 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.15;

                if (this.life <= 0 || this.y < -20) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(260, 20%, 70%, 0.5)';
                ctx.fill();
                ctx.restore();
            }
        }

        class NebulaWisp {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 120 + 60;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.03 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0004 + 0.0001;
                this.hue = Math.random() > 0.5 ? 265 : 275;
                this.driftX = (Math.random() - 0.5) * 0.05;
                this.driftY = (Math.random() - 0.5) * 0.05;
            }

            update() {
                this.x += this.driftX;
                this.y += this.driftY;

                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) {
                        this.growing = false;
                    }
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) {
                        this.reset();
                    }
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, `hsla(${this.hue}, 40%, 60%, 0.3)`);
                gradient.addColorStop(0.5, `hsla(${this.hue}, 30%, 50%, 0.1)`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 80; i++) {
            stars.push(new Star());
        }
        for (let i = 0; i < 20; i++) {
            starTrails.push(new StarTrail());
        }
        for (let i = 0; i < 40; i++) {
            luminousMotes.push(new LuminousMote());
        }
        for (let i = 0; i < 60; i++) {
            cosmicDust.push(new CosmicDust());
        }
        for (let i = 0; i < 8; i++) {
            nebulaWisps.push(new NebulaWisp());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Deep cosmic background glow
            const cosmicGrad = ctx.createRadialGradient(width * 0.5, height * 0.3, 0, width * 0.5, height * 0.3, Math.min(width, height) * 0.5);
            cosmicGrad.addColorStop(0, 'hsla(265, 30%, 15%, 0.03)');
            cosmicGrad.addColorStop(0.5, 'hsla(270, 20%, 10%, 0.01)');
            cosmicGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cosmicGrad;
            ctx.fillRect(0, 0, width, height);

            // Nebula wisps (draw first, behind everything)
            nebulaWisps.forEach(w => { w.update(); w.draw(); });

            // Stars
            stars.forEach(s => { s.update(); s.draw(); });

            // Star trails
            starTrails.forEach(t => { t.update(); t.draw(); });

            // Cosmic dust
            cosmicDust.forEach(d => { d.update(); d.draw(); });

            // Luminous motes (ascending souls)
            luminousMotes.forEach(m => { m.update(); m.draw(); });

            requestAnimationFrame(animate);
        }

        animate();
    }

    /* ── Scroll Reveal ────────────────────────────────────────────────────── */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
    
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, parseInt(delay));
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('visible'));
    }

    /* ── Nav Scroll Effect ────────────────────────────────────────────────── */
    const nav = document.getElementById('main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });

    /* ── Mobile Nav Toggle ────────────────────────────────────────────────── */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /* ── Smooth Scroll for Anchor Links ───────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    /* ── Mascot Parallax ──────────────────────────────────────────────────── */
    const mascotImg = document.querySelector('.mascot-img');
    if (mascotImg && !prefersReducedMotion) {
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            const hero = document.getElementById('hero');
            if (hero) {
                const heroBottom = hero.offsetTop + hero.offsetHeight;
                if (scrollY < heroBottom) {
                    const translateY = scrollY * 0.15;
                    mascotImg.style.transform = `translateY(${translateY}px)`;
                }
            }
        }, { passive: true });
    }

})();

// ========== HERMÊS BOOKING SYSTEM ==========
const API_BASE = window.AKH_API_BASE || 'http://localhost:3456';
const SITE_SLUG = 'akh';

// Only initialize on pages with the booking modal
if (!document.getElementById('booking-modal')) {
  // Skip booking system on pages without modal (lore, gallery, etc.)
} else {

let slotsData = [];
let currentSlotId = null;
let currentSlotPriceCents = 0;
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
      const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
      slot = {
        name: nameEl ? nameEl.textContent : 'Slot',
        width: dimsMatch ? parseInt(dimsMatch[1]) : 0,
        height: dimsMatch ? parseInt(dimsMatch[2]) : 0,
        price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
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
    currentSlotPriceCents = slot.price_cents || 0;
    els.slotName.textContent = slot.name;
    els.slotDims.textContent = `${slot.width} \u00d7 ${slot.height} px`;
    updatePrice();

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
  const isYearly = els.leaseYearly && els.leaseYearly.classList.contains('active');
  const months = isYearly ? 12 : 1;
  const total = (currentSlotPriceCents * months / 100).toFixed(0);
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
      if (myBookingsResult) {
        myBookingsResult.textContent = 'Please enter a valid email address.';
        myBookingsResult.style.color = '#ff6b6b';
      } else {
        alert('Please enter a valid email address.');
      }
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
      if (myBookingsResult) {
        myBookingsResult.textContent = data.message || 'If bookings exist for this email, a link has been sent.';
        myBookingsResult.style.color = '#4ade80';
      } else {
        alert(data.message || 'If bookings exist for this email, a link has been sent.');
      }
    } catch (err) {
      if (myBookingsResult) {
        myBookingsResult.textContent = 'Error sending recovery email. Please try again.';
        myBookingsResult.style.color = '#ff6b6b';
      } else {
        alert('Error sending recovery email. Please try again.');
      }
    } finally {
      myBookingsSubmit.disabled = false;
      myBookingsSubmit.textContent = 'Send Dashboard Links';
    }
  });
}
