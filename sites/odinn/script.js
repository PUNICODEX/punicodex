/**
 * ÓÐINN FLAGSHIP TEMPLE — MIST CANVAS & INTERACTIONS
 * Raven/mist/snow particle animation + scroll reveals + nav behavior
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Mist Canvas ──────────────────────────────────────────────────────── */
    const canvas = document.getElementById('mist-canvas');
    if (!canvas || prefersReducedMotion) {
        if (canvas) canvas.style.display = 'none';
    } else {
        const ctx = canvas.getContext('2d');
        let width, height;
        let mist = [];
        let snow = [];
        let ravens = [];
        let runes = [];
        let frameCount = 0;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        class MistLayer {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.08;
                this.radius = Math.random() * 120 + 60;
                this.opacity = Math.random() * 0.04 + 0.01;
                this.life = Math.random() * 800 + 400;
                this.maxLife = this.life;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;
                this.opacity = (this.life / this.maxLife) * 0.03;

                if (this.life <= 0 || this.x < -150 || this.x > width + 150 || this.y < -150 || this.y > height + 150) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, 'hsla(200, 15%, 50%, 0.4)');
                gradient.addColorStop(0.5, 'hsla(200, 10%, 40%, 0.15)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class SnowFlake {
            constructor() {
                this.reset(true);
            }

            reset(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -10;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = Math.random() * 0.5 + 0.2;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.sway = Math.random() * 0.02;
                this.swayPhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.swayPhase += this.sway;
                this.x += this.vx + Math.sin(this.swayPhase) * 0.3;
                this.y += this.vy;

                if (this.y > height + 10 || this.x < -10 || this.x > width + 10) {
                    this.reset(false);
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#D0D8D8';
                ctx.shadowBlur = this.size * 2;
                ctx.shadowColor = `rgba(208, 216, 216, ${this.opacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        class Raven {
            constructor() {
                this.reset();
            }

            reset() {
                this.side = Math.random() > 0.5 ? 'left' : 'right';
                this.x = this.side === 'left' ? -30 : width + 30;
                this.y = Math.random() * height * 0.4 + 50;
                this.vx = this.side === 'left' ? (Math.random() * 0.8 + 0.3) : -(Math.random() * 0.8 + 0.3);
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = Math.random() * 3 + 2;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.25 + 0.1;
                this.growing = true;
                this.wingPhase = Math.random() * Math.PI * 2;
                this.wingSpeed = Math.random() * 0.08 + 0.04;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.wingPhase += this.wingSpeed;

                if (this.growing) {
                    this.opacity += 0.005;
                    if (this.opacity >= this.targetOpacity) this.growing = false;
                } else {
                    this.opacity -= 0.003;
                }

                if (this.opacity <= 0 || (this.side === 'left' && this.x > width + 50) || (this.side === 'right' && this.x < -50)) {
                    this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                
                // Simple raven silhouette (body + wings)
                const wingOffset = Math.sin(this.wingPhase) * 4;
                ctx.fillStyle = '#1A2028';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 2, this.size, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                ctx.beginPath();
                ctx.moveTo(-this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(-this.size * 3, -this.size * 2 + wingOffset, -this.size * 4, -this.size * 0.5 + wingOffset);
                ctx.quadraticCurveTo(-this.size * 2, -this.size * 0.5, -this.size, 0);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(this.size, -this.size * 0.3);
                ctx.quadraticCurveTo(this.size * 3, -this.size * 2 - wingOffset, this.size * 4, -this.size * 0.5 - wingOffset);
                ctx.quadraticCurveTo(this.size * 2, -this.size * 0.5, this.size, 0);
                ctx.fill();
                
                ctx.restore();
            }
        }

        class RuneSymbol {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.opacity = 0;
                this.targetOpacity = Math.random() * 0.04 + 0.01;
                this.growing = true;
                this.speed = Math.random() * 0.0005 + 0.0002;
                this.size = Math.random() * 20 + 12;
                this.rune = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛈ','ᛇ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'][Math.floor(Math.random() * 24)];
            }

            update() {
                if (this.growing) {
                    this.opacity += this.speed;
                    if (this.opacity >= this.targetOpacity) this.growing = false;
                } else {
                    this.opacity -= this.speed;
                    if (this.opacity <= 0) this.reset();
                }
            }

            draw() {
                if (this.opacity <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.font = `${this.size}px serif`;
                ctx.fillStyle = '#B8963A';
                ctx.fillText(this.rune, this.x, this.y);
                ctx.restore();
            }
        }

        // Initialize
        resize();
        for (let i = 0; i < 8; i++) {
            mist.push(new MistLayer());
        }
        for (let i = 0; i < 60; i++) {
            snow.push(new SnowFlake());
        }
        for (let i = 0; i < 4; i++) {
            ravens.push(new Raven());
        }
        for (let i = 0; i < 6; i++) {
            runes.push(new RuneSymbol());
        }

        window.addEventListener('resize', resize);

        function animate() {
            frameCount++;
            ctx.clearRect(0, 0, width, height);

            // Subtle aurora-like glow at top
            const auroraGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
            auroraGrad.addColorStop(0, 'hsla(200, 20%, 15%, 0.04)');
            auroraGrad.addColorStop(0.5, 'hsla(180, 15%, 10%, 0.02)');
            auroraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auroraGrad;
            ctx.fillRect(0, 0, width, height);

            // Mist layers
            mist.forEach(m => { m.update(); m.draw(); });

            // Runes
            runes.forEach(r => { r.update(); r.draw(); });

            // Ravens
            ravens.forEach(r => { r.update(); r.draw(); });

            // Snow
            snow.forEach(s => { s.update(); s.draw(); });

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


// ========== BOOKING SYSTEM ==========
const API_BASE = window.ODINN_API_BASE || 'http://localhost:3456'; // Set window.ODINN_API_BASE in HTML for production

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
    const res = await fetch(`${API_BASE}/api/slots?site=odinn`);
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
  console.log('[PUNYCODEX:odinn] openModal called:', slotId);
  try {
    currentSlotId = slotId;
    // Robust ID comparison (handles string vs number IDs from API)
    let slot = slotsData.find(s => String(s.id) === String(slotId));

    // Fallback to DOM if slotsData hasn't loaded yet
    if (!slot) {
      const slotEl = document.querySelector(`.space-slot[data-space="${String(slotId).padStart(2, '0')}"]`);
      if (!slotEl) { console.log('[PUNYCODEX:odinn] No slotEl found'); return; }
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
    console.log('[PUNYCODEX:odinn] Modal opened for slot', slotId);
  } catch (err) {
    console.error('[PUNYCODEX:odinn] openModal error:', err);
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
  console.log('[PUNYCODEX:odinn] Slot clicked:', slotId);
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
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/odinn/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/odinn/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/odinn/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(booking.slot_id);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(booking.slot_id);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/odinn/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/odinn/dashboard/?token=${currentBooking.analytics_token}`;
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
