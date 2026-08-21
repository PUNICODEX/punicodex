// Tiān — Celestial mandate, golden dragon-clouds, auspicious characters ascending
(function() {
    const canvas = document.getElementById('tian-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#DC143C');   // imperial red
    const S = readColor('data-secondary', '#FFD700'); // celestial gold

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const clouds = [];
    const CLOUD_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < CLOUD_COUNT; i++) {
        clouds.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.65,
            scale: 0.6 + Math.random() * 1.2,
            speed: 0.05 + Math.random() * 0.12,
            phase: Math.random() * Math.PI * 2,
            opacity: 0.12 + Math.random() * 0.18
        });
    }

    const characters = [];
    const CHARS = '天龍雲福壽祥瑞帝宇';
    const CHAR_COUNT = width < 768 ? 8 : 14;
    for (let i = 0; i < CHAR_COUNT; i++) {
        characters.push({
            x: Math.random() * width,
            y: Math.random() * height,
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            size: 14 + Math.random() * 22,
            speed: 0.15 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.15 + Math.random() * 0.25
        });
    }

    const sparks = [];
    const SPARK_COUNT = width < 600 ? 30 : 60;
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.6 + 0.4,
            vy: -0.2 - Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.5 + 0.15
        });
    }

    function drawCloud(x, y, scale, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.arc(26, -6, 18, 0, Math.PI * 2);
        ctx.arc(48, 2, 20, 0, Math.PI * 2);
        ctx.arc(70, -5, 14, 0, Math.PI * 2);
        ctx.arc(22, 10, 16, 0, Math.PI * 2);
        ctx.arc(50, 12, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Deep red radial ground
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.75);
        bg.addColorStop(0, `rgba(${Math.max(P.r - 80, 20)}, ${Math.max(P.g - 80, 0)}, ${Math.max(P.b - 80, 0)}, 0.22)`);
        bg.addColorStop(0.6, `rgba(${Math.max(P.r - 60, 30)}, ${Math.max(P.g - 60, 0)}, ${Math.max(P.b - 60, 0)}, 0.35)`);
        bg.addColorStop(1, `rgba(40, 0, 10, 0.95)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Drifting clouds
        clouds.forEach(c => {
            if (!prefersReduced) c.x += c.speed;
            if (c.x > width + 120 * c.scale) c.x = -120 * c.scale;
            const y = c.y + Math.sin(time * 0.005 + c.phase) * 8;
            drawCloud(c.x, y, c.scale, c.opacity);
        });

        // Rising golden characters
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 1)`;
        ctx.font = 'lighter sans-serif';
        ctx.textAlign = 'center';
        characters.forEach(c => {
            if (!prefersReduced) c.y -= c.speed;
            if (c.y < -40) { c.y = height + 40; c.x = Math.random() * width; }
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.02 + c.phase);
            ctx.globalAlpha = c.alpha * pulse;
            ctx.font = `${c.size}px serif`;
            ctx.fillText(c.char, c.x, c.y);
        });
        ctx.globalAlpha = 1;

        // Golden sparks
        sparks.forEach(s => {
            if (!prefersReduced) s.y += s.vy;
            if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.04 + s.phase);
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();

// ========== BOOKING SYSTEM ==========
const API_BASE = window.PUNICODEX_API_BASE || ''; // Set window.PUNICODEX_API_BASE in HTML if needed

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
  apply: document.getElementById('booking-step-apply'),
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
  priceOriginal: document.getElementById('booking-price-original'),
  discount: document.getElementById('booking-discount'),
  discountNote: document.getElementById('booking-discount-note'),
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
let currentDiscount = null;
let discountTimer = null;
let currentUploadSlot = null;
let slotsLoadFailed = false;

// Fetch slots and update UI
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots/?site=tian`);
    const data = await res.json();
    slotsData = data.slots || [];
    slotsLoadFailed = false;
    updateSlotUI();
  } catch (err) {
    slotsLoadFailed = true;
    console.error('[PUNICODEX] loadSlots failed:', err);
  }
}

function trackViewability(container, token, slotSlug) {
  if (!('IntersectionObserver' in window)) return;
  let timer = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (timer) return;
        timer = setTimeout(() => {
          fetch(`${API_BASE}/api/analytics/viewability/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              visibleSeconds: 1,
              visiblePercent: Math.round(entry.intersectionRatio * 100),
              slotSlug: slotSlug || undefined,
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
    // Bundle members prefer their per-slot creative but fall back to the
    // booking-level creative (the slots payload COALESCEs it into creative_path),
    // so an approved takeover creative always renders in every member frame.
    const hasOwnCreative = isBundleMember
      ? slot.has_slot_creative || !!slot.creative_path
      : !!slot.creative_path;

    if (slot.status === 'live' && hasOwnCreative) {
      // LIVE: render actual creative with click tracking. slot.public_id is a
      // write-only tracking identifier; the secret management token is never
      // shipped to the browser. The slot slug rides along on every tracker so
      // bundle/takeover bookings (one token across member placements) can be
      // split per placement in the analytics pipeline.
      const slotParam = slot.slug ? `&slot=${encodeURIComponent(slot.slug)}` : '';
      const pixelUrl = `${API_BASE}/api/analytics/pixel.gif/?b=${slot.public_id}${slotParam}`;
      const clickUrl = `${API_BASE}/api/analytics/click/?b=${slot.public_id}&url=${encodeURIComponent(slot.website_url || '#')}${slotParam}`;
      // Built with DOM calls, not an HTML string: company_name is
      // sponsor-supplied and reaches this page before any payment clears, so
      // interpolating it into markup (even inside an alt="") is a stored-XSS
      // sink in the same origin as the admin portal. Property assignment
      // cannot break out of its attribute.
      const link = document.createElement('a');
      link.href = clickUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'space-live-ad';
      link.style.cssText = 'display:block;width:100%;height:100%;position:relative;z-index:2;';

      const adImg = document.createElement('img');
      // creative_path may be a site-relative /uploads/ path or an absolute
      // blob URL — resolve either.
      adImg.src = /^https?:\/\//.test(slot.creative_path)
        ? slot.creative_path
        : `${API_BASE}${slot.creative_path}`;
      adImg.alt = slot.company_name || 'Advertisement';
      adImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

      if (slot.creative_webp_path) {
        const picture = document.createElement('picture');
        const source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = `${API_BASE}${slot.creative_webp_path}`;
        picture.appendChild(source);
        picture.appendChild(adImg);
        link.appendChild(picture);
      } else {
        link.appendChild(adImg);
      }

      const pixel = document.createElement('img');
      pixel.className = 'space-pixel';
      pixel.src = pixelUrl;
      pixel.width = 1;
      pixel.height = 1;
      pixel.alt = '';
      pixel.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';

      frame.innerHTML = '';
      frame.appendChild(link);
      frame.appendChild(pixel);
      // Re-add glow if it was removed
      if (!frame.querySelector('.space-frame-glow')) {
        const glow = document.createElement('div');
        glow.className = 'space-frame-glow';
        frame.appendChild(glow);
      }

      // Fire viewability beacon after 1s at ≥50% visibility
      trackViewability(frame, slot.public_id, slot.slug);
    } else if (slot.status !== 'available') {
      // RESERVED: hide button, show overlay inside frame
      const overlay = document.createElement('div');
      overlay.className = 'space-frame-overlay';
      // textContent, not innerHTML: a sponsor controls company_name and this
      // overlay renders while the booking is still merely 'reserved'.
      const overlayText = document.createElement('span');
      overlayText.className = 'space-frame-overlay-text';
      overlayText.textContent = slot.status === 'live' ? 'LIVE' : 'RESERVED';
      const overlaySub = document.createElement('span');
      overlaySub.className = 'space-frame-overlay-sub';
      overlaySub.textContent = slot.company_name || '';
      overlay.appendChild(overlayText);
      overlay.appendChild(overlaySub);
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

// The takeover application step has its own error box — writing to step 1's
// #booking-error while the apply step is showing makes failures invisible.
function showApplyError(msg) {
  if (els.applyError) {
    els.applyError.textContent = msg;
    els.applyError.style.display = 'block';
  }
}

// Step 3 is shared by several terminal states (under review, application
// received, renewal complete) whose callers rewrite its title, subtitle, and
// Change Creative button. Restore the defaults every time the modal opens so
// stale copy from a previous flow never leaks into the next one.
function resetStatusStep() {
  const titleEl = document.querySelector('#booking-step-3 .booking-modal-title');
  if (titleEl) titleEl.textContent = 'Under Review';
  const subtitleEl = document.querySelector('#booking-step-3 .booking-modal-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent =
      "Your creative has been submitted. You'll receive an email once it's approved.";
  }
  const changeBtn = document.getElementById('booking-change-creative');
  if (changeBtn) changeBtn.style.display = '';
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
    currentDiscount = null;
    if (els.discount) els.discount.value = '';
    if (els.discountNote) els.discountNote.style.display = 'none';
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
    resetStatusStep();
    showStep('1');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

  } catch (err) {
    console.error('[PUNICODEX] openModal failed:', err);
  }
}

function discountBaseCents() {
  return currentLeaseMonths === 12
    ? Math.round(currentSlotPriceCents * 12 * 0.9)
    : currentSlotPriceCents * currentLeaseMonths;
}

// Mirrors discount-service.computePrice for the display: what we show is
// what the server will charge (same base, same math).
function computeDisplayPrice(baseCents, terms) {
  if (!terms) return baseCents;
  if (terms.kind === 'percent_off') return Math.round(baseCents * (1 - Number(terms.percent) / 100));
  if (terms.kind === 'fixed_off') return Math.max(0, baseCents - Math.round(Number(terms.fixedCents) || 0));
  return baseCents; // free-month kinds adjust the trial, not the sticker price
}

function updatePriceDisplay() {
  const base = discountBaseCents();
  const label = currentLeaseMonths === 12 ? '/yr' : '/mo';
  if (currentDiscount && currentDiscount.valid) {
    const final = computeDisplayPrice(base, currentDiscount.terms);
    if (final !== base) {
      els.priceOriginal.style.display = '';
      els.priceOriginal.textContent = `$${(base / 100).toLocaleString()}`;
      els.price.innerHTML = final === 0
        ? `$0<span> · complimentary</span>`
        : `$${(final / 100).toLocaleString()}<span>${label}</span>`;
      return;
    }
  }
  els.priceOriginal.style.display = 'none';
  els.price.innerHTML = `$${(base / 100).toLocaleString()}<span>${label}</span>`;
}

function discountTermsText() {
  const t = currentDiscount.terms;
  const code = currentDiscount.code;
  if (currentDiscount.complimentary) {
    return `${code} — complimentary placement: no card, no checkout, no auto-renewal.`;
  }
  if (t.kind === 'percent_off') return `${code} — ${t.percent}% off applied.`;
  if (t.kind === 'fixed_off') return `${code} — $${(t.fixedCents / 100).toLocaleString()} off applied.`;
  if (t.kind === 'free_months') {
    return `${code} — ${t.freeMonths} month${t.freeMonths === 1 ? '' : 's'} complimentary: no card, no checkout, then the placement ends.`;
  }
  if (t.kind === 'trial_extension') return `${code} — trial extended by ${t.freeMonths} month${t.freeMonths === 1 ? '' : 's'}.`;
  if (t.kind === 'free_months_then_price') {
    return `${code} — ${t.freeMonths} months free, then $${(t.thenPriceCents / 100).toLocaleString()}/mo.`;
  }
  return `${code} applied.`;
}

async function validateDiscountCode() {
  const code = els.discount ? els.discount.value.trim() : '';
  currentDiscount = null;
  if (!code) {
    if (els.discountNote) els.discountNote.style.display = 'none';
    syncVerifyButtonLabel();
    updatePriceDisplay();
    return;
  }
  try {
    const payload = { code, temple: 'tian', leaseMonths: currentLeaseMonths };
    if (currentSlotId != null && Number.isInteger(Number(currentSlotId))) {
      payload.slotId = Number(currentSlotId);
    }
    const res = await fetch(`${API_BASE}/api/discount/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data && data.valid) {
      currentDiscount = data;
      if (els.discountNote) {
        els.discountNote.textContent = discountTermsText();
        els.discountNote.style.color = '#7ee2a0';
        els.discountNote.style.display = 'block';
      }
    } else if (els.discountNote) {
      els.discountNote.textContent = "That code doesn't apply to this frame.";
      els.discountNote.style.color = '#f28b8b';
      els.discountNote.style.display = 'block';
    }
  } catch {
    // Validation is advisory; the server re-validates authoritatively at booking.
    if (els.discountNote) els.discountNote.style.display = 'none';
  }
  syncVerifyButtonLabel();
  updatePriceDisplay();
}

// The verify button must never promise payment for a complimentary term.
function syncVerifyButtonLabel() {
  if (!els.verifyBtn) return;
  els.verifyBtn.textContent =
    currentDiscount && currentDiscount.complimentary
      ? 'Verify & Continue'
      : 'Verify & Proceed to Payment';
}

if (els.discount) {
  els.discount.addEventListener('input', () => {
    clearTimeout(discountTimer);
    discountTimer = setTimeout(validateDiscountCode, 450);
  });
  els.discount.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(discountTimer);
      validateDiscountCode();
    }
  });
}
const discountApplyBtn = document.getElementById('booking-discount-apply');
if (discountApplyBtn) {
  discountApplyBtn.addEventListener('click', () => {
    clearTimeout(discountTimer);
    validateDiscountCode();
  });
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

// Brief, self-clearing notice for the rare case the slots API is unreachable.
let slotToastTimer = null;
function showSlotToast(message) {
  let toast = document.querySelector('.slot-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'slot-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  if (slotToastTimer) clearTimeout(slotToastTimer);
  slotToastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

// Event: click an AVAILABLE frame to open booking. Reserved and live slots
// never open the modal — a live slot's creative is a real link out to the
// sponsor, and a reserved slot is simply inert.
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

  if (!slot) {
    // The slots API is the only source of truth for availability. When it
    // failed (or the slot is absent), never open the modal on DOM guesses —
    // the booking would fail at the server after the sponsor did all the work.
    if (slotsLoadFailed) {
      showSlotToast('Bookings are temporarily unavailable — please try again shortly.');
    }
    return;
  }
  if (slot.status !== 'available') return;

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
    validateDiscountCode();
  });
}
if (els.leaseYearly) {
  els.leaseYearly.addEventListener('click', () => {
    currentLeaseMonths = 12;
    els.leaseYearly.classList.add('active');
    if (els.leaseMonthly) els.leaseMonthly.classList.remove('active');
    updatePriceDisplay();
    validateDiscountCode();
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
    const res = await fetch(`${API_BASE}/api/verify/send/`, {
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
    const res = await fetch(`${API_BASE}/api/bookings/apply/`, {
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
      // An application is not a creative submission: say what was actually
      // sent, and hide Change Creative — uploads unlock once the application
      // is approved (the upload endpoint rejects pending_application).
      const titleEl = document.querySelector('#booking-step-3 .booking-modal-title');
      if (titleEl) titleEl.textContent = 'Application Received';
      const subtitleEl = document.querySelector('#booking-step-3 .booking-modal-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent =
          'Your application is with the team — applications are typically reviewed within 24–48 hours. Once approved, you\'ll get an email with your payment link, and the creative upload opens after that.';
      }
      const changeBtn = document.getElementById('booking-change-creative');
      if (changeBtn) changeBtn.style.display = 'none';
      if (els.dashboardLink) {
        els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${data.token}`;
      }
    } else {
      showApplyError(data.error || 'Application failed');
      showStep('apply');
    }
  } catch (err) {
    showApplyError('Network error. Please try again.');
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
    const verifyRes = await fetch(`${API_BASE}/api/verify/check/`, {
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
      if (els.applyError) els.applyError.style.display = 'none';
      showStep('apply');
      return;
    }

    // Code verified — create booking and redirect to Stripe
    const discountCode = els.discount ? els.discount.value.trim() : '';
    const res = await fetch(`${API_BASE}/api/bookings/`, {
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
        discountCode: discountCode || undefined,
        verificationToken,
      }),
    });
    const data = await res.json();
    if (data.stripeUrl) {
      window.location.href = data.stripeUrl;
    } else if (data.complimentary) {
      // Complimentary term: no Stripe at all — the placement is approved;
      // the sponsor goes straight to the creative upload.
      currentBooking = { token: data.token, analytics_token: data.token, slot_id: currentSlotId };
      const slot = slotsData.find((s) => String(s.id) === String(currentSlotId));
      if (slot) setupUploadStep(slot);
      showStep('2');
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
      els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/tian/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {
    console.error('[PUNICODEX] handleReturnFromStripe failed:', err);
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

async function handleFileSelect(file) {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showBookingError('Please upload PNG, JPG, or WebP');
    return;
  }
  selectedFile = file;

  // Normalize client-side (center-crop to the slot's frame, downscale to
  // 2×). The preview shows exactly what will run — and the server performs
  // the same normalization again, so the two can never disagree.
  const warn = (() => {
    let el = document.getElementById('booking-upload-warning');
    if (!el) {
      el = document.createElement('p');
      el.id = 'booking-upload-warning';
      el.style.cssText = 'margin-top:0.75rem;font-size:0.8rem;color:#e8c860;text-align:center;';
      els.uploadZone.parentNode.insertBefore(el, els.uploadZone.nextSibling);
    }
    return el;
  })();

  try {
    if (typeof CreativeNormalize === 'undefined' || !currentUploadSlot) {
      throw new Error('normalizer unavailable');
    }
    warn.textContent = 'Preparing your creative…';
    const n = await CreativeNormalize.normalizeCreative(
      file,
      currentUploadSlot.width,
      currentUploadSlot.height
    );
    selectedFileBase64 = n.dataUrl;
    if (n.tooSmall) {
      warn.textContent = `Your image is ${n.originalWidth}x${n.originalHeight} — smaller than the slot's ${currentUploadSlot.width}x${currentUploadSlot.height}. It will run, but may print soft; a larger original is better.`;
    } else if (n.cropped) {
      warn.textContent = `Framed to ${n.width}x${n.height} from your ${n.originalWidth}x${n.originalHeight} original — the preview below is exactly what will run.`;
    } else {
      warn.remove();
    }
  } catch (err) {
    // Fall back to the raw file: the server normalizes regardless, so this
    // path only matters when the browser cannot decode the image at all.
    if (file.size > 20 * 1024 * 1024) {
      showBookingError(err.message || 'This file is too large to process');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedFileBase64 = e.target.result;
      finishPreview();
    };
    reader.readAsDataURL(file);
    return;
  }
  finishPreview();

  function finishPreview() {
    els.uploadPreview.src = selectedFileBase64;
    els.uploadPreview.style.display = 'block';
    els.uploadPrompt.style.display = 'none';
    els.uploadActions.style.display = 'flex';

    // Live preview in frame
    els.livePreview.style.display = 'block';
    els.livePreviewFrame.innerHTML = `<img src="${selectedFileBase64}" alt="Preview">`;
  }
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
      els.dashboardLink.href = `${API_BASE}/tian/dashboard/?token=${currentBooking.analytics_token}`;
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
      const res = await fetch(`${API_BASE}/api/bookings/recover/`, {
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

// ─── PATRON SYSTEM ───
(function initPatronSystem() {
  const modal = document.getElementById('patron-modal');
  const grid = document.getElementById('patron-grid');
  const joinCard = document.getElementById('patron-join-card');
  const ctaBtn = document.getElementById('patron-cta-btn');
  if (!modal || !grid) return;

  const templeId = 'tian';
  const siteName = 'Tiān';
  let selectedCents = 700;

  const els = {
    close: document.getElementById('patron-modal-close'),
    backdrop: document.getElementById('patron-modal-backdrop'),
    stepForm: document.getElementById('patron-step-form'),
    stepLoading: document.getElementById('patron-step-loading'),
    stepSuccess: document.getElementById('patron-step-success'),
    displayName: document.getElementById('patron-display-name'),
    title: document.getElementById('patron-title'),
    message: document.getElementById('patron-message'),
    email: document.getElementById('patron-email'),
    error: document.getElementById('patron-error'),
    submit: document.getElementById('patron-submit'),
    successClose: document.getElementById('patron-success-close'),
    amountToggle: document.getElementById('patron-amount-toggle'),
  };

  function showStep(name) {
    if (els.stepForm) els.stepForm.style.display = name === 'form' ? 'block' : 'none';
    if (els.stepLoading) els.stepLoading.style.display = name === 'loading' ? 'block' : 'none';
    if (els.stepSuccess) els.stepSuccess.style.display = name === 'success' ? 'block' : 'none';
  }

  function showError(msg) {
    if (els.error) {
      els.error.textContent = msg;
      els.error.style.display = 'block';
    }
  }

  function clearError() {
    if (els.error) {
      els.error.textContent = '';
      els.error.style.display = 'none';
    }
  }

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showStep('form');
    clearError();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (ctaBtn) ctaBtn.addEventListener('click', openModal);
  if (joinCard) joinCard.addEventListener('click', openModal);
  if (els.close) els.close.addEventListener('click', closeModal);
  if (els.backdrop) els.backdrop.addEventListener('click', closeModal);
  if (els.successClose) els.successClose.addEventListener('click', closeModal);

  if (els.amountToggle) {
    els.amountToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.patron-amount-btn');
      if (!btn) return;
      selectedCents = parseInt(btn.dataset.cents, 10);
      els.amountToggle.querySelectorAll('.patron-amount-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  if (els.submit) {
    els.submit.addEventListener('click', async () => {
      clearError();
      const displayName = els.displayName?.value.trim();
      const title = els.title?.value.trim() || null;
      const message = els.message?.value.trim() || null;
      const email = els.email?.value.trim().toLowerCase();

      if (!displayName) return showError('Please enter the name or title to display.');
      if (!email || !email.includes('@')) return showError('Please enter a valid email address.');

      showStep('loading');
      try {
        const res = await fetch(`${API_BASE}/api/patrons/checkout/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templeId,
            email,
            displayName,
            title,
            message,
            amountCents: selectedCents,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (err) {
        showStep('form');
        showError(err.message || 'Unable to start checkout. Please try again.');
      }
    });
  }

  function renderPatron(patron) {
    const card = document.createElement('div');
    card.className = 'patron-card';
    card.innerHTML = `
      <div class="patron-badge-seal">&#10022;</div>
      <h3 class="patron-badge-name">${escapeHtml(patron.display_name)}</h3>
      ${patron.title ? `<p class="patron-badge-title">${escapeHtml(patron.title)}</p>` : ''}
      ${patron.message ? `<p class="patron-badge-message">“${escapeHtml(patron.message)}”</p>` : ''}
    `;
    return card;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function loadPatrons() {
    try {
      const res = await fetch(`${API_BASE}/api/patrons/${encodeURIComponent(templeId)}`);
      const data = await res.json();
      const patrons = data.patrons || [];

      // Remove existing patron cards except the join card
      grid.querySelectorAll('.patron-card:not(.patron-card--join)').forEach((el) => el.remove());

      patrons.forEach((patron) => {
        grid.insertBefore(renderPatron(patron), joinCard);
      });
    } catch (err) {
      console.error('[PUNICODEX] loadPatrons failed:', err);
    }
  }

  function handleReturnFromPatronStripe() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('patron') === 'success') {
      openModal();
      showStep('success');
      loadPatrons();
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    } else if (params.get('patron') === 'canceled') {
      openModal();
      showStep('form');
      showError('Checkout was canceled. You can try again whenever you like.');
      const url = new URL(window.location.href);
      url.searchParams.delete('patron');
      window.history.replaceState({}, '', url.toString());
    }
  }

  loadPatrons();
  handleReturnFromPatronStripe();
})();

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
