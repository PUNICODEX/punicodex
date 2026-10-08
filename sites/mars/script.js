/* =====================================================
   MĀRS — Legion Canvas Engine
   Marching eagle standards, laurel wreaths, glinting
   pilum tips, golden wheat sheaves, the red planet's orbit
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       LEGION CANVAS
       ===================================================== */
    const canvas = document.getElementById('legion-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // Color palette — archetype: Roman red + bronze gold
    const ROMAN_RED = { r: 192, g: 57, b: 43 };
    const ROMAN_RED_DEEP = { r: 146, g: 34, b: 26 };
    const BRONZE_GOLD = { r: 212, g: 175, b: 55 };
    const GOLD_BRIGHT = { r: 232, g: 200, b: 110 };
    const WHEAT = { r: 214, g: 178, b: 94 };
    const WHEAT_DARK = { r: 176, g: 138, b: 62 };
    const IRON = { r: 140, g: 132, b: 120 };

    let mouseX = 0, mouseY = 0;
    let time = 0;

    /* ---------- LAYER 1: Marching Eagle Standards (aquilae) ---------- */
    const eagles = [];
    const EAGLE_COUNT = 6;

    function initEagles() {
        eagles.length = 0;
        for (let i = 0; i < EAGLE_COUNT; i++) {
            eagles.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.6,
                size: Math.random() * 60 + 60,
                vx: Math.random() * 0.25 + 0.15,   // the column marches right
                opacity: Math.random() * 0.05 + 0.03,
                bobPhase: Math.random() * Math.PI * 2,
                bobSpeed: Math.random() * 0.008 + 0.004,
                crest: Math.random() > 0.5,
            });
        }
    }

    function drawEagle(e) {
        const s = e.size;
        ctx.save();
        ctx.translate(e.x, e.y + Math.sin(e.bobPhase) * s * 0.04);
        ctx.scale(s / 100, s / 100);

        const col = e.crest ? ROMAN_RED : BRONZE_GOLD;
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${e.currentOpacity})`;
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${e.currentOpacity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Standard pole
        ctx.beginPath();
        ctx.moveTo(0, -70);
        ctx.lineTo(0, 70);
        ctx.stroke();

        // Crossbar of the standard
        ctx.beginPath();
        ctx.moveTo(-18, -58);
        ctx.lineTo(18, -58);
        ctx.stroke();

        // Eagle silhouette: spread wings, body, head
        ctx.beginPath();
        // left wing
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(-38, -52, -46, -34);
        ctx.quadraticCurveTo(-26, -36, -14, -26);
        // tail / lower body
        ctx.quadraticCurveTo(-8, -14, 0, -10);
        ctx.quadraticCurveTo(8, -14, 14, -26);
        // right wing
        ctx.quadraticCurveTo(26, -36, 46, -34);
        ctx.quadraticCurveTo(38, -52, 0, -30);
        ctx.closePath();
        ctx.fill();

        // Head with beak, facing right (the army's direction)
        ctx.beginPath();
        ctx.arc(12, -34, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(16, -35);
        ctx.lineTo(23, -32);
        ctx.lineTo(16, -30);
        ctx.closePath();
        ctx.fill();

        // Wreath hanging from the crossbar
        ctx.beginPath();
        ctx.arc(-26, -40, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /* ---------- LAYER 2: Drifting Laurel Wreaths ---------- */
    const wreaths = [];
    const WREATH_COUNT = 8;

    function initWreaths() {
        wreaths.length = 0;
        for (let i = 0; i < WREATH_COUNT; i++) {
            wreaths.push(createWreath());
        }
    }

    function createWreath() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 30 + 18,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.15 - 0.05,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.004,
            opacity: Math.random() * 0.12 + 0.05,
            pulsePhase: Math.random() * Math.PI * 2,
        };
    }

    function drawWreath(w) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rotation);

        const alpha = w.opacity * (0.6 + 0.4 * Math.sin(w.pulsePhase));
        ctx.strokeStyle = `rgba(${BRONZE_GOLD.r}, ${BRONZE_GOLD.g}, ${BRONZE_GOLD.b}, ${alpha})`;
        ctx.lineWidth = 1.2;

        // Ring
        ctx.beginPath();
        ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Leaves around the ring
        const leafCount = 14;
        ctx.fillStyle = `rgba(${BRONZE_GOLD.r}, ${BRONZE_GOLD.g}, ${BRONZE_GOLD.b}, ${alpha * 1.3})`;
        for (let i = 0; i < leafCount; i++) {
            const a = (Math.PI * 2 / leafCount) * i;
            const lx = Math.cos(a) * w.radius;
            const ly = Math.sin(a) * w.radius;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(a + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, 0, 2.2, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    /* ---------- LAYER 3: Wheat Sheaves (the agriculture half) ---------- */
    const sheaves = [];
    let SHEAF_COUNT = 0;

    function initSheaves() {
        sheaves.length = 0;
        SHEAF_COUNT = Math.max(14, Math.floor(width / 90));
        for (let i = 0; i < SHEAF_COUNT; i++) {
            sheaves.push({
                x: (width / SHEAF_COUNT) * i + (Math.random() - 0.5) * 40,
                baseY: height + Math.random() * 20,
                height: Math.random() * 70 + 60,
                stalks: 5 + Math.floor(Math.random() * 4),
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.008 + 0.006,
                opacity: Math.random() * 0.2 + 0.12,
            });
        }
    }

    function drawSheaves() {
        for (const sh of sheaves) {
            const sway = Math.sin(sh.swayPhase + time * sh.swaySpeed * 0.06) * 0.09;
            const topX = sh.x + Math.sin(sway) * sh.height;
            const topY = sh.baseY - Math.cos(sway) * sh.height;

            ctx.save();
            ctx.strokeStyle = `rgba(${WHEAT_DARK.r}, ${WHEAT_DARK.g}, ${WHEAT_DARK.b}, ${sh.opacity})`;
            ctx.fillStyle = `rgba(${WHEAT.r}, ${WHEAT.g}, ${WHEAT.b}, ${sh.opacity * 1.2})`;
            ctx.lineWidth = 1;

            // Bundled stalks fanning from the tie
            const spread = 14;
            for (let i = 0; i < sh.stalks; i++) {
                const f = sh.stalks === 1 ? 0 : (i / (sh.stalks - 1)) - 0.5;
                const tipX = topX + f * spread * 2;
                const tipY = topY - Math.abs(f) * 14;

                ctx.beginPath();
                ctx.moveTo(sh.x, sh.baseY - sh.height * 0.45);
                ctx.quadraticCurveTo(
                    sh.x + f * spread, sh.baseY - sh.height * 0.75,
                    tipX, tipY
                );
                ctx.stroke();

                // Grain head
                ctx.beginPath();
                ctx.ellipse(tipX, tipY - 4, 2.2, 6, f * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Binding tie
            ctx.strokeStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, ${sh.opacity * 1.4})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sh.x - 7, sh.baseY - sh.height * 0.45);
            ctx.lineTo(sh.x + 7, sh.baseY - sh.height * 0.45);
            ctx.stroke();

            ctx.restore();
        }
    }

    /* ---------- LAYER 4: Standing Pila with Glinting Tips ---------- */
    const pila = [];
    let PILA_COUNT = 0;

    function initPila() {
        pila.length = 0;
        PILA_COUNT = Math.max(6, Math.floor(width / 220));
        for (let i = 0; i < PILA_COUNT; i++) {
            pila.push({
                x: (width / PILA_COUNT) * i + (Math.random() - 0.5) * 60,
                baseY: height,
                height: Math.random() * 90 + 110,
                lean: (Math.random() - 0.5) * 0.06,
                opacity: Math.random() * 0.12 + 0.08,
                glintPhase: Math.random() * Math.PI * 2,
                glintSpeed: Math.random() * 0.02 + 0.008,
            });
        }
    }

    function drawPila() {
        for (const p of pila) {
            const tipX = p.x + Math.sin(p.lean) * p.height;
            const tipY = p.baseY - Math.cos(p.lean) * p.height;

            // Shaft
            ctx.strokeStyle = `rgba(${IRON.r}, ${IRON.g}, ${IRON.b}, ${p.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.baseY);
            ctx.lineTo(tipX, tipY + 14);
            ctx.stroke();

            // Iron shank below the point
            ctx.strokeStyle = `rgba(${IRON.r}, ${IRON.g}, ${IRON.b}, ${p.opacity * 1.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY + 22);
            ctx.lineTo(tipX, tipY + 12);
            ctx.stroke();

            // Glint — the one bright event on each spear
            const glint = Math.max(0, Math.sin(p.glintPhase + time * p.glintSpeed * 0.06));
            const glintAlpha = glint * glint * 0.9;
            if (glintAlpha > 0.02) {
                // Leaf-shaped point
                ctx.fillStyle = `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${p.opacity * 1.2})`;
                ctx.beginPath();
                ctx.moveTo(tipX, tipY - 12);
                ctx.lineTo(tipX - 3.5, tipY + 14);
                ctx.lineTo(tipX + 3.5, tipY + 14);
                ctx.closePath();
                ctx.fill();

                // Star sparkle at the tip
                const g = ctx.createRadialGradient(tipX, tipY - 6, 0, tipX, tipY - 6, 12);
                g.addColorStop(0, `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${glintAlpha})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(tipX, tipY - 6, 12, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(${GOLD_BRIGHT.r}, ${GOLD_BRIGHT.g}, ${GOLD_BRIGHT.b}, ${glintAlpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tipX - 9, tipY - 6);
                ctx.lineTo(tipX + 9, tipY - 6);
                ctx.moveTo(tipX, tipY - 15);
                ctx.lineTo(tipX, tipY + 3);
                ctx.stroke();
            }
        }
    }

    /* ---------- LAYER 5: The Red Planet's Orbit ---------- */
    const orbit = {
        tilt: -0.32,
        radiusX: 0,
        radiusY: 0,
        cx: 0,
        cy: 0,
        angle: Math.random() * Math.PI * 2,
        speed: 0.0035,
    };

    function initOrbit() {
        orbit.radiusX = Math.min(width, height) * 0.55;
        orbit.radiusY = orbit.radiusX * 0.42;
        orbit.cx = width * 0.5;
        orbit.cy = height * 0.42;
    }

    function drawOrbit() {
        ctx.save();
        ctx.translate(orbit.cx, orbit.cy);
        ctx.rotate(orbit.tilt);

        // Orbit ring — thin red line
        ctx.strokeStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.radiusX, orbit.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Faint second ring — the far ellipse ghost
        ctx.strokeStyle = `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, 0.08)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.radiusX * 1.12, orbit.radiusY * 1.12, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Mars dot
        const dx = Math.cos(orbit.angle) * orbit.radiusX;
        const dy = Math.sin(orbit.angle) * orbit.radiusY;
        const front = Math.sin(orbit.angle) > 0; // nearer half of the tilted orbit

        if (front) {
            // Glow
            const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, 14);
            glow.addColorStop(0, `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.55)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(dx, dy, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${ROMAN_RED.r}, ${ROMAN_RED.g}, ${ROMAN_RED.b}, 0.95)`;
            ctx.beginPath();
            ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Polar cap glint — a pale speck on the god's planet
            ctx.fillStyle = `rgba(240, 235, 225, 0.8)`;
            ctx.beginPath();
            ctx.arc(dx - 1.4, dy - 1.6, 1.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Far half — dimmer, behind everything else
            ctx.fillStyle = `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, 0.35)`;
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* ---------- LAYER 6: Dust — the red haze of the field ---------- */
    const haze = [];
    const HAZE_COUNT = 18;

    function initHaze() {
        haze.length = 0;
        for (let i = 0; i < HAZE_COUNT; i++) {
            haze.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 120 + 60,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -(Math.random() * 0.15 + 0.05),
                opacity: Math.random() * 0.05 + 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    function drawHaze() {
        for (const h of haze) {
            h.pulsePhase += 0.004;
            const alpha = h.opacity * (0.5 + 0.5 * Math.sin(h.pulsePhase));
            const gradient = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.size);
            gradient.addColorStop(0, `rgba(${ROMAN_RED_DEEP.r}, ${ROMAN_RED_DEEP.g}, ${ROMAN_RED_DEEP.b}, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ---------- Update Functions ---------- */
    function updateEagles() {
        for (const e of eagles) {
            e.x += e.vx;
            e.bobPhase += e.bobSpeed;
            e.currentOpacity = e.opacity * (0.75 + 0.25 * Math.sin(e.bobPhase * 0.7));
            if (e.x - e.size > width + 80) {
                e.x = -e.size - 80;
                e.y = Math.random() * height * 0.6;
            }
        }
    }

    function updateWreaths() {
        for (let i = 0; i < wreaths.length; i++) {
            const w = wreaths[i];
            w.x += w.vx;
            w.y += w.vy;
            w.rotation += w.rotSpeed;
            w.pulsePhase += 0.006;

            if (w.x < -w.radius - 20) w.x = width + w.radius + 20;
            if (w.x > width + w.radius + 20) w.x = -w.radius - 20;
            if (w.y < -w.radius - 20) wreaths[i] = createWreath(), wreaths[i].y = height + w.radius;
            if (w.y > height + w.radius + 20) wreaths[i] = createWreath(), wreaths[i].y = -w.radius;
        }
    }

    function updateOrbit() {
        orbit.angle += orbit.speed;
    }

    /* ---------- Draw Functions ---------- */
    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(12, 8, 8, 0)');
        gradient.addColorStop(1, 'rgba(12, 8, 8, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /* ---------- Main Loop ---------- */
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initEagles();
        initSheaves();
        initPila();
        initOrbit();
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(14, 10, 10, 0.25)';
        ctx.fillRect(0, 0, width, height);

        time += 16;

        updateEagles();
        updateWreaths();
        updateOrbit();

        // Far half of the orbit first (behind the columns)
        drawOrbit();
        drawHaze();
        drawSheaves();
        drawPila();
        drawEagles();
        drawWreaths();

        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
    initWreaths();
    initHaze();
    animateCanvas();

    } else {
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
                revealObserver.unobserve(entry);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
        revealObserver.observe(el);
    });

    /* =====================================================
       NAV SCROLL EFFECT
       ===================================================== */
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        if (!nav) return;
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
const API_BASE = window.PUNICODEX_API_BASE || ''; // Set window.PUNICODEX_API_BASE in HTML if needed

function pxTrack(name, props) {
  if (window.px && window.px.track) window.px.track(name, props || {});
}

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
    const res = await fetch(`${API_BASE}/api/slots/?site=mars`);
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

    pxTrack('sponsor_modal_open', { slot_id: String(slotId || '') });

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
    const payload = { code, temple: 'mars', leaseMonths: currentLeaseMonths };
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
  pxTrack('sponsor_apply_submit', { slot_id: String(currentSlotId || '') });
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
        els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${data.token}`;
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

    function trackSponsorPayment() {
      const amountCents = booking && (booking.amount_paid_cents || booking.total_price_cents || booking.price_cents);
      pxTrack('sponsor_payment_complete', {
        slot_id: String(booking.slot_id || currentSlotId || ''),
        amount: amountCents ? amountCents / 100 : 0,
        currency: 'USD',
      });
    }

    if (canceled) {
      showBookingError('Payment was canceled. You can try again anytime.');
      return;
    }

    if (renewed && booking.status === 'live') {
      trackSponsorPayment();
      openModal(slot);
      showStep('3');
      const titleEl = document.querySelector('#booking-step-3 .booking-modal-title');
      if (titleEl) titleEl.textContent = 'Renewal Complete';
      const subtitleEl = document.querySelector('#booking-step-3 .booking-modal-subtitle');
      if (subtitleEl) subtitleEl.textContent = 'Your lease has been extended. Thank you for continuing with us.';
      els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      trackSponsorPayment();
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/mars/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/mars/dashboard/?token=${currentBooking.analytics_token}`;
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

  const templeId = 'mars';
  const siteName = 'Mārs';
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
    pxTrack('patron_view', { tier_id: String(selectedCents) });
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

      pxTrack('patron_checkout_init', {
        amount: selectedCents / 100,
        tier_id: String(selectedCents),
        currency: 'USD',
      });
      try {
        sessionStorage.setItem('px_patron_tier', String(selectedCents));
      } catch (e) {
        // ignore
      }

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
      let tierId = String(selectedCents);
      try {
        tierId = sessionStorage.getItem('px_patron_tier') || tierId;
      } catch (e) {
        // ignore
      }
      pxTrack('patron_checkout_complete', {
        amount: Number(tierId) / 100 || selectedCents / 100,
        tier_id: tierId,
        currency: 'USD',
      });
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
