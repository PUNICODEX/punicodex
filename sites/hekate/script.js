(function() {
    'use strict';

    const canvas = document.getElementById('crossroads-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {

    let W, H, DPR;
    let time = 0;
    let torchX = 0.5;
    let torchY = 0.5;
    let targetTorchX = 0.5;
    let targetTorchY = 0.5;

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.width = window.innerWidth * DPR;
        H = canvas.height = window.innerHeight * DPR;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        initMist();
        initSparks();
        initKeys();
    }

    const mist = [];
    function initMist() {
        mist.length = 0;
        for (let i = 0; i < 60; i++) {
            mist.push({
                x: Math.random() * W, y: Math.random() * H,
                r: Math.random() * 80 + 40,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2,
                alpha: Math.random() * 0.08 + 0.02,
                hue: Math.random() > 0.5 ? 240 : 270
            });
        }
    }

    const sparks = [];
    function initSparks() {
        sparks.length = 0;
        for (let i = 0; i < 40; i++) sparks.push(createSpark());
    }
    function createSpark() {
        return {
            x: torchX * W + (Math.random() - 0.5) * 40,
            y: torchY * H + Math.random() * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2.5 - 0.5,
            life: Math.random() * 120 + 60,
            maxLife: 180,
            size: Math.random() * 2 + 1,
            hue: 20
        };
    }

    const keys = [];
    function initKeys() {
        keys.length = 0;
        for (let i = 0; i < 10; i++) {
            keys.push({
                x: Math.random() * W, y: Math.random() * H * 0.7,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.01,
                driftX: (Math.random() - 0.5) * 0.4,
                driftY: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 15 + 12,
                alpha: Math.random() * 0.15 + 0.05,
                glow: Math.random() * 0.1 + 0.05
            });
        }
    }

    let moonPhase = 0;
    let moonTimer = 0;

    const ghosts = [];
    function spawnGhost() {
        if (ghosts.length > 2) return;
        const side = Math.random() > 0.5 ? -1 : 1;
        ghosts.push({
            x: side === -1 ? -50 : W + 50,
            y: H * 0.4 + Math.random() * H * 0.3,
            vx: side * (Math.random() * 0.3 + 0.1),
            alpha: 0,
            maxAlpha: Math.random() * 0.15 + 0.05,
            life: 0,
            maxLife: 400 + Math.random() * 200,
            width: 30 + Math.random() * 20,
            height: 60 + Math.random() * 30
        });
    }

    function drawTorch(tx, ty) {
        const flicker = Math.sin(time * 0.15 + tx) * 0.15 + Math.sin(time * 0.23 + ty) * 0.08;
        const flameH = 90 + flicker * 30;
        const flameW = 35 + flicker * 8;

        const outerGrad = ctx.createRadialGradient(tx, ty - flameH * 0.3, 0, tx, ty - flameH * 0.3, flameH * 2);
        outerGrad.addColorStop(0, `rgba(255, 107, 53, ${0.25 + flicker * 0.08})`);
        outerGrad.addColorStop(0.4, `rgba(255, 80, 30, ${0.12 + flicker * 0.04})`);
        outerGrad.addColorStop(1, 'rgba(255, 60, 20, 0)');
        ctx.fillStyle = outerGrad;
        ctx.fillRect(tx - flameH * 2, ty - flameH * 2.5, flameH * 4, flameH * 3);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const angle = (i / 20) * Math.PI;
            const r = flameW * 0.5 * Math.sin(angle) * (1 + flicker * 0.3);
            const fy = -flameH * Math.sin(angle * 0.5) * (1 + Math.sin(time * 0.3 + i) * 0.1);
            if (i === 0) ctx.moveTo(r, fy); else ctx.lineTo(r, fy);
        }
        for (let i = 20; i >= 0; i--) {
            const angle = (i / 20) * Math.PI;
            const r = -flameW * 0.5 * Math.sin(angle) * (1 + flicker * 0.3);
            const fy = -flameH * Math.sin(angle * 0.5) * (1 + Math.sin(time * 0.3 + i) * 0.1);
            ctx.lineTo(r, fy);
        }
        ctx.closePath();
        const flameGrad = ctx.createLinearGradient(0, 0, 0, -flameH);
        flameGrad.addColorStop(0, '#FF6B35');
        flameGrad.addColorStop(0.4, '#FF4500');
        flameGrad.addColorStop(0.7, '#CC3300');
        flameGrad.addColorStop(1, 'rgba(150, 30, 0, 0)');
        ctx.fillStyle = flameGrad;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#3A2A1A';
        ctx.fillRect(tx - 4, ty, 8, 40);
        ctx.fillStyle = '#5A4A3A';
        ctx.fillRect(tx - 3, ty + 5, 6, 30);
    }

    function drawKey(k) {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.angle);
        ctx.globalAlpha = k.alpha;
        const keyGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, k.size * 2);
        keyGlow.addColorStop(0, `rgba(255, 107, 53, ${k.glow})`);
        keyGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
        ctx.fillStyle = keyGlow;
        ctx.beginPath();
        ctx.arc(0, 0, k.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(192, 192, 192, ${k.alpha + 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-k.size * 0.3, 0, k.size * 0.25, 0, Math.PI * 2);
        ctx.moveTo(-k.size * 0.05, 0);
        ctx.lineTo(k.size * 0.6, 0);
        ctx.lineTo(k.size * 0.6, -k.size * 0.15);
        ctx.lineTo(k.size * 0.5, -k.size * 0.15);
        ctx.lineTo(k.size * 0.5, -k.size * 0.05);
        ctx.lineTo(k.size * 0.4, -k.size * 0.05);
        ctx.lineTo(k.size * 0.4, 0);
        ctx.stroke();
        ctx.restore();
    }

    function drawMoon(cx, cy, phase) {
        const r = 20;
        ctx.save();
        ctx.translate(cx, cy);
        const moonGlow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 3);
        moonGlow.addColorStop(0, 'rgba(192, 192, 192, 0.15)');
        moonGlow.addColorStop(1, 'rgba(192, 192, 192, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(220, 220, 230, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(15, 15, 46, 0.85)';
        ctx.beginPath();
        if (phase === 0) {
            ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
            ctx.ellipse(0, 0, r * 0.5, r, 0, Math.PI / 2, -Math.PI / 2, true);
        } else if (phase === 2) {
            ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
            ctx.ellipse(0, 0, r * 0.5, r, 0, -Math.PI / 2, Math.PI / 2, true);
        }
        ctx.fill();
        ctx.restore();
    }

    function drawGhost(g) {
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.fillStyle = 'rgba(180, 180, 210, 0.3)';
        ctx.filter = 'blur(8px)';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y + g.height);
        ctx.lineTo(g.x - g.width * 0.3, g.y + g.height * 0.6);
        ctx.lineTo(g.x - g.width * 0.4, g.y + g.height * 0.3);
        ctx.quadraticCurveTo(g.x - g.width * 0.5, g.y, g.x, g.y - g.height * 0.2);
        ctx.quadraticCurveTo(g.x + g.width * 0.5, g.y, g.x + g.width * 0.4, g.y + g.height * 0.3);
        ctx.lineTo(g.x + g.width * 0.3, g.y + g.height * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCrossroads(cx, cy) {
        const roadLen = Math.max(W, H) * 0.35;
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - roadLen * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + roadLen * 0.7, cy + roadLen * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - roadLen * 0.7, cy + roadLen * 0.4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        const crossGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
        crossGlow.addColorStop(0, 'rgba(255, 107, 53, 0.15)');
        crossGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
        ctx.fillStyle = crossGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 120, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        torchX += (targetTorchX - torchX) * 0.25;
        torchY += (targetTorchY - torchY) * 0.25;

        const w = W / DPR;
        const h = H / DPR;
        ctx.clearRect(0, 0, w, h);

        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, h * 0.8);
        bgGrad.addColorStop(0, '#1A1A4E');
        bgGrad.addColorStop(0.5, '#12123A');
        bgGrad.addColorStop(1, '#0A0A20');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const torchCX = torchX * w;
        const torchCY = torchY * h;
        drawCrossroads(torchCX, torchCY);

        mist.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -p.r) p.x = w + p.r;
            if (p.x > w + p.r) p.x = -p.r;
            if (p.y < -p.r) p.y = h + p.r;
            if (p.y > h + p.r) p.y = -p.r;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            grad.addColorStop(0, `hsla(${p.hue}, 40%, 40%, ${p.alpha})`);
            grad.addColorStop(1, `hsla(${p.hue}, 40%, 30%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        drawTorch(torchCX, torchCY);

        sparks.forEach((s, i) => {
            s.x += s.vx + Math.sin(time * 0.1 + i) * 0.3;
            s.y += s.vy;
            s.vx *= 0.99;
            s.life--;
            if (s.life <= 0) {
                sparks[i] = createSpark();
                return;
            }
            const lifeRatio = s.life / s.maxLife;
            const alpha = lifeRatio * 0.9;
            ctx.fillStyle = `rgba(255, ${120 + lifeRatio * 100}, ${50 + lifeRatio * 50}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * lifeRatio, 0, Math.PI * 2);
            ctx.fill();
        });

        keys.forEach(k => {
            k.x += k.driftX;
            k.y += k.driftY;
            k.angle += k.rotSpeed;
            if (k.x < -50) k.x = w + 50;
            if (k.x > w + 50) k.x = -50;
            if (k.y < -50) k.y = h + 50;
            if (k.y > h * 0.8) k.y = -50;
            k.alpha = 0.05 + Math.sin(time * 0.02 + k.x) * 0.05;
            drawKey(k);
        });

        moonTimer++;
        if (moonTimer > 300) { moonTimer = 0; moonPhase = (moonPhase + 1) % 3; }
        drawMoon(w * 0.5, h * 0.12, moonPhase);

        if (Math.random() < 0.003) spawnGhost();
        ghosts.forEach((g, i) => {
            g.x += g.vx;
            g.life++;
            if (g.life < 60) g.alpha = (g.life / 60) * g.maxAlpha;
            else if (g.life > g.maxLife - 60) g.alpha = ((g.maxLife - g.life) / 60) * g.maxAlpha;
            else g.alpha = g.maxAlpha;
            drawGhost(g);
            if (g.life >= g.maxLife || g.x < -100 || g.x > w + 100) ghosts.splice(i, 1);
        });

        time++;
        requestAnimationFrame(draw);
    }

    resize();
    initSparks();
    initKeys();
    draw();
    window.addEventListener('resize', resize);

    
    } else {
    }
    const nav = document.querySelector('.main-nav');
    function setTorchFromScroll() {
        const sy = window.scrollY || document.documentElement.scrollTop || 0;
        const sh = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
        const ch = window.innerHeight || document.documentElement.clientHeight || 1;
        const maxScroll = Math.max(sh - ch, 1);
        const p = Math.min(Math.max(sy, 0) / maxScroll, 1);
        targetTorchX = 0.5 - (p * 0.35); // 0.5 -> 0.15
        targetTorchY = 0.5 + (p * 0.25); // 0.5 -> 0.75
    }
    window.addEventListener('scroll', () => {
        if (!nav) return;
        nav.classList.toggle('scrolled', window.scrollY > 50);
        setTorchFromScroll();
    });
    setInterval(setTorchFromScroll, 50);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => entry.target.classList.add('visible'), delay);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => observer.observe(el));

    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => navLinks.classList.toggle('active'));
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('active'));
        });
    }

    const mascot = document.querySelector('.mascot-img');
    if (mascot) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 15;
            mascot.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const res = await fetch(`${API_BASE}/api/slots/?site=hekate`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {

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
    const spaceNum = slotEl.dataset.space;
    const sortOrder = parseInt(spaceNum, 10);
    const slot = orderedSlots.find(s => s.sort_order === sortOrder);
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

// Event: Click anywhere on an available frame to open booking
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;
  const sortOrder = parseInt(slotEl.dataset.space, 10);
  const slot = slotsData.find(s => s.sort_order === sortOrder);
  if (!slot) return;

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
        els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${data.token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/hekate/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${token}`;
    } else if (booking.status === 'pending_payment') {
      showBookingError('Payment is still processing. Please refresh in a moment.');
    }
  } catch (err) {

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
      els.dashboardLink.href = `${API_BASE}/sites/hekate/dashboard/?token=${currentBooking.analytics_token}`;
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
