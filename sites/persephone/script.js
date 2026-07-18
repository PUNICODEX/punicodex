/* =====================================================
   ΠΕΡΣΕΦΌΝΗ — Threshold Canvas Engine
   Spring above. Underworld below. The six seeds. The wilt.
   ===================================================== */

(function() {
    'use strict';

    /* =====================================================
       THRESHOLD CANVAS
       ===================================================== */
const canvas = document.getElementById('seasonal-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (ctx) {
    let width, height;

    // The threshold — where spring ends and underworld begins
    let thresholdY;

    // === SPRING REALM (above threshold) ===
    const narcissus = [];
    const NARCISSUS_COUNT = 12;
    const petals = [];
    const PETAL_COUNT = 20;
    const pollens = [];
    const POLLEN_COUNT = 30;

    // === THE SIX SEEDS ===
    const sixSeeds = [];

    // === UNDERWORLD REALM (below threshold) ===
    const underworldVines = [];
    const VINE_COUNT = 5;
    const ashMotes = [];
    const MOTE_COUNT = 40;

    // === THE POMEGRANATE HEART ===
    let heartPulse = 0;

    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        thresholdY = height * 0.52;
        initNarcissus();
        initPetals();
        initPollens();
        initSixSeeds();
        initVines();
        initAshMotes();
    }

    // === SPRING INITIALIZERS ===
    function initNarcissus() {
        narcissus.length = 0;
        for (let i = 0; i < NARCISSUS_COUNT; i++) {
            narcissus.push(createNarcissus());
        }
    }

    function createNarcissus() {
        return {
            x: Math.random() * width,
            y: Math.random() * thresholdY * 0.8,
            size: Math.random() * 8 + 5,
            speed: Math.random() * 0.4 + 0.15,
            sway: Math.random() * 2 + 1,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.008 + 0.003,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.008,
            opacity: Math.random() * 0.5 + 0.3,
            wilt: 0, // 0 = fresh, 1 = fully wilted
            color: { r: 255, g: 250, b: 220 }, // creamy white-yellow
        };
    }

    function initPetals() {
        petals.length = 0;
        for (let i = 0; i < PETAL_COUNT; i++) {
            petals.push(createPetal());
        }
    }

    function createPetal() {
        const isPink = Math.random() > 0.4;
        return {
            x: Math.random() * width,
            y: Math.random() * thresholdY * 0.6,
            size: Math.random() * 5 + 3,
            speed: Math.random() * 0.5 + 0.2,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.01 + 0.004,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.01,
            opacity: Math.random() * 0.35 + 0.15,
            color: isPink ? { r: 240, g: 190, b: 190 } : { r: 255, g: 230, b: 230 },
        };
    }

    function initPollens() {
        pollens.length = 0;
        for (let i = 0; i < POLLEN_COUNT; i++) {
            pollens.push({
                x: Math.random() * width,
                y: Math.random() * thresholdY,
                size: Math.random() * 1.5 + 0.3,
                speed: Math.random() * 0.2 + 0.05,
                drift: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.1,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.015 + 0.005,
            });
        }
    }

    // === THE SIX SEEDS ===
    function initSixSeeds() {
        sixSeeds.length = 0;
        for (let i = 0; i < 6; i++) {
            sixSeeds.push({
                x: width * 0.3 + (i / 5) * width * 0.4 + (Math.random() - 0.5) * 40,
                y: -Math.random() * 200 - i * 80,
                size: 5 + Math.random() * 2,
                speed: Math.random() * 0.8 + 0.5,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01,
                glowPhase: Math.random() * Math.PI * 2,
                glowSpeed: 0.02 + Math.random() * 0.015,
                settled: false,
                settleY: thresholdY + 40 + Math.random() * (height - thresholdY - 80),
            });
        }
    }

    // === UNDERWORLD INITIALIZERS ===
    function initVines() {
        underworldVines.length = 0;
        for (let i = 0; i < VINE_COUNT; i++) {
            underworldVines.push({
                points: [],
                xBase: (width / (VINE_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 80,
                amplitude: Math.random() * 30 + 15,
                frequency: Math.random() * 0.005 + 0.002,
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.006 + 0.002,
                opacity: Math.random() * 0.1 + 0.04,
                segments: 35,
            });
        }
    }

    function initAshMotes() {
        ashMotes.length = 0;
        for (let i = 0; i < MOTE_COUNT; i++) {
            ashMotes.push({
                x: Math.random() * width,
                y: thresholdY + Math.random() * (height - thresholdY),
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                drift: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.2 + 0.05,
                fadePhase: Math.random() * Math.PI * 2,
                fadeSpeed: Math.random() * 0.008 + 0.003,
            });
        }
    }

    // === UPDATE FUNCTIONS ===
    function updateNarcissus() {
        for (const n of narcissus) {
            n.y += n.speed;
            n.swayPhase += n.swaySpeed;
            n.x += Math.sin(n.swayPhase) * n.sway * 0.2;
            n.rotation += n.rotSpeed;

            // Wilt as they approach threshold
            const distToThreshold = thresholdY - n.y;
            if (distToThreshold < 80) {
                n.wilt = Math.min(1, (80 - distToThreshold) / 80);
            }

            if (n.y > thresholdY + 20) {
                // Reset as a fresh flower at top
                n.y = -20;
                n.x = Math.random() * width;
                n.wilt = 0;
                n.opacity = Math.random() * 0.5 + 0.3;
            }
        }
    }

    function updatePetals() {
        for (const p of petals) {
            p.y += p.speed;
            p.swayPhase += p.swaySpeed;
            p.x += Math.sin(p.swayPhase) * 0.5;
            p.rotation += p.rotSpeed;

            if (p.y > thresholdY + 30) {
                p.y = -15;
                p.x = Math.random() * width;
            }
        }
    }

    function updatePollens() {
        for (const p of pollens) {
            p.y += p.speed;
            p.x += p.drift;
            p.twinklePhase += p.twinkleSpeed;
            p.currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.twinklePhase));

            if (p.y > thresholdY) {
                p.y = 0;
                p.x = Math.random() * width;
            }
        }
    }

    function updateSixSeeds() {
        for (const s of sixSeeds) {
            if (s.settled) {
                s.glowPhase += s.glowSpeed;
                continue;
            }

            s.y += s.speed;
            s.wobblePhase += s.wobbleSpeed;
            s.x += Math.sin(s.wobblePhase) * 0.8;
            s.glowPhase += s.glowSpeed;

            if (s.y >= s.settleY) {
                s.settled = true;
                s.y = s.settleY;
            }
        }
    }

    function updateVines() {
        for (const v of underworldVines) {
            v.phase += v.speed;
            v.points = [];
            for (let i = 0; i <= v.segments; i++) {
                const y = height - (i / v.segments) * (height - thresholdY + 40);
                const x = v.xBase + Math.sin((height - y) * v.frequency + v.phase) * v.amplitude * (i / v.segments);
                v.points.push({ x, y });
            }
        }
    }

    function updateAshMotes() {
        for (const a of ashMotes) {
            a.y += a.speed;
            a.x += a.drift + Math.sin(time * 0.001 + a.y * 0.01) * 0.1;
            a.fadePhase += a.fadeSpeed;
            a.currentOpacity = a.opacity * (0.4 + 0.6 * Math.sin(a.fadePhase));

            if (a.y > height + 10) {
                a.y = thresholdY;
                a.x = Math.random() * width;
            }
        }
    }

    // === DRAW FUNCTIONS ===
    function drawBackground() {
        // Three-zone gradient: spring → pomegranate threshold → underworld
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#F5EDE8');
        grad.addColorStop(0.25, '#F0E0E0');
        grad.addColorStop(thresholdY / height - 0.05, '#E8D0D0');
        grad.addColorStop(thresholdY / height, '#8B1538');
        grad.addColorStop(thresholdY / height + 0.08, '#3D0514');
        grad.addColorStop(0.7, '#1A0A12');
        grad.addColorStop(1, '#0D0408');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawThreshold() {
        // The pomegranate line — where worlds divide
        ctx.save();
        ctx.strokeStyle = 'rgba(196, 30, 58, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(width, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Faint pulse along the threshold
        const pulse = 0.1 + 0.1 * Math.sin(time * 0.002);
        ctx.strokeStyle = `rgba(196, 30, 58, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, thresholdY);
        ctx.lineTo(width, thresholdY);
        ctx.stroke();
        ctx.restore();
    }

    function drawPomegranateHeart() {
        // Deep pulsing glow in the underworld center
        heartPulse += 0.015;
        const pulseIntensity = 0.06 + 0.04 * Math.sin(heartPulse);
        const glow = ctx.createRadialGradient(width * 0.5, height * 0.72, 0, width * 0.5, height * 0.72, Math.max(width, height) * 0.35);
        glow.addColorStop(0, `rgba(196, 30, 58, ${pulseIntensity})`);
        glow.addColorStop(0.4, `rgba(139, 21, 56, ${pulseIntensity * 0.5})`);
        glow.addColorStop(1, 'rgba(196, 30, 58, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }

    function drawNarcissus() {
        for (const n of narcissus) {
            if (n.y > thresholdY + 10) continue;

            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.rotate(n.rotation);

            // Wilt color shift: creamy white → gray-purple
            const wiltR = n.color.r * (1 - n.wilt * 0.6) + 80 * n.wilt;
            const wiltG = n.color.g * (1 - n.wilt * 0.6) + 60 * n.wilt;
            const wiltB = n.color.b * (1 - n.wilt * 0.5) + 90 * n.wilt;
            const op = n.opacity * (1 - n.wilt * 0.5);

            // Narcissus shape — six white petals around a yellow cup
            ctx.fillStyle = `rgba(${wiltR}, ${wiltG}, ${wiltB}, ${op})`;
            for (let p = 0; p < 6; p++) {
                const angle = (p / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.ellipse(
                    Math.cos(angle) * n.size * 0.5,
                    Math.sin(angle) * n.size * 0.5,
                    n.size * 0.35,
                    n.size * 0.2,
                    angle,
                    0, Math.PI * 2
                );
                ctx.fill();
            }

            // Yellow cup center
            const cupR = 255 * (1 - n.wilt * 0.7) + 60 * n.wilt;
            const cupG = 220 * (1 - n.wilt * 0.6) + 50 * n.wilt;
            const cupB = 80 * (1 - n.wilt * 0.5) + 70 * n.wilt;
            ctx.fillStyle = `rgba(${cupR}, ${cupG}, ${cupB}, ${op})`;
            ctx.beginPath();
            ctx.arc(0, 0, n.size * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawPetals() {
        for (const p of petals) {
            if (p.y > thresholdY) continue;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.bezierCurveTo(p.size * 0.5, -p.size * 0.3, p.size * 0.5, p.size * 0.3, 0, p.size);
            ctx.bezierCurveTo(-p.size * 0.5, p.size * 0.3, -p.size * 0.5, -p.size * 0.3, 0, -p.size);
            ctx.fill();

            ctx.restore();
        }
    }

    function drawPollens() {
        for (const p of pollens) {
            ctx.fillStyle = `rgba(212, 175, 55, ${p.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawSixSeeds() {
        for (let i = 0; i < sixSeeds.length; i++) {
            const s = sixSeeds[i];
            const glowIntensity = 0.5 + 0.5 * Math.sin(s.glowPhase);

            // Deep ruby glow
            const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 5);
            glow.addColorStop(0, `rgba(196, 30, 58, ${glowIntensity * 0.35})`);
            glow.addColorStop(0.5, `rgba(139, 21, 56, ${glowIntensity * 0.15})`);
            glow.addColorStop(1, 'rgba(196, 30, 58, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 5, 0, Math.PI * 2);
            ctx.fill();

            // Seed body — jewel-like
            ctx.fillStyle = `rgba(180, 20, 50, ${0.85 + glowIntensity * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.size * 0.8, s.size, Math.sin(s.wobblePhase) * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Seed highlight — wet/jewel look
            ctx.fillStyle = `rgba(255, 180, 180, ${0.4 + glowIntensity * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(s.x - s.size * 0.2, s.y - s.size * 0.25, s.size * 0.3, s.size * 0.2, -0.3, 0, Math.PI * 2);
            ctx.fill();

            // Number indicator for the six seeds (subtle)
            if (s.settled) {
                ctx.fillStyle = `rgba(255, 200, 200, ${0.2 * glowIntensity})`;
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(String(i + 1), s.x, s.y + s.size + 12);
            }
        }
    }

    function drawVines() {
        for (const v of underworldVines) {
            if (v.points.length < 2) continue;

            ctx.strokeStyle = `rgba(60, 10, 35, ${v.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(v.points[0].x, v.points[0].y);
            for (let i = 1; i < v.points.length; i++) {
                ctx.lineTo(v.points[i].x, v.points[i].y);
            }
            ctx.stroke();

            // Thorns
            for (let i = 3; i < v.points.length; i += 6) {
                const p = v.points[i];
                const prev = v.points[i - 1];
                const angle = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
                ctx.strokeStyle = `rgba(80, 15, 45, ${v.opacity * 1.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(angle) * 5, p.y + Math.sin(angle) * 5);
                ctx.stroke();
            }

            // Dark leaves
            for (let i = 4; i < v.points.length; i += 8) {
                const p = v.points[i];
                ctx.fillStyle = `rgba(40, 20, 40, ${v.opacity * 2})`;
                ctx.beginPath();
                ctx.ellipse(p.x + 5, p.y, 5, 3, 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawAshMotes() {
        for (const a of ashMotes) {
            ctx.fillStyle = `rgba(160, 140, 150, ${a.currentOpacity})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawOverlay() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'rgba(26, 10, 18, 0)');
        gradient.addColorStop(1, 'rgba(13, 4, 8, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // === MAIN LOOP ===
    function animateCanvas() {
        drawBackground();

        time += 16;

        updateNarcissus();
        updatePetals();
        updatePollens();
        updateSixSeeds();
        updateVines();
        updateAshMotes();

        drawPomegranateHeart();
        drawThreshold();
        drawVines();
        drawAshMotes();
        drawNarcissus();
        drawPetals();
        drawPollens();
        drawSixSeeds();
        drawOverlay();

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    resizeCanvas();
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
    const res = await fetch(`${API_BASE}/api/slots/?site=persephone`);
    const data = await res.json();
    slotsData = data.slots || [];
    updateSlotUI();
  } catch (err) {
    console.error('[PUNICODEX] loadSlots failed:', err);
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
          fetch(`${API_BASE}/api/analytics/viewability/`, {
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
    const hasOwnCreative = isBundleMember ? slot.has_slot_creative : !!slot.creative_path;

    if (slot.status === 'live' && hasOwnCreative) {
      // LIVE: render actual creative with click tracking. slot.public_id is a
      // write-only tracking identifier; the secret management token is never
      // shipped to the browser.
      const pixelUrl = `${API_BASE}/api/analytics/pixel.gif/?b=${slot.public_id}`;
      const clickUrl = `${API_BASE}/api/analytics/click/?b=${slot.public_id}&url=${encodeURIComponent(slot.website_url || '#')}`;
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
      trackViewability(frame, slot.public_id);
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
    console.error('[PUNICODEX] openModal failed:', err);
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

function buildSlotFromDom(slotEl) {
  const nameEl = slotEl.querySelector('.space-name');
  const dimsEl = slotEl.querySelector('.space-dims');
  const dimsMatch = dimsEl ? dimsEl.textContent.match(/(\d+)\s*×\s*(\d+)/) : null;
  const isBundle = slotEl.dataset.bundle === '1';
  const sortOrder = parseInt(slotEl.dataset.space, 10) || 0;
  return {
    id: isBundle ? 'bundle' : sortOrder,
    name: nameEl ? nameEl.textContent.trim() : 'Ad Space',
    width: dimsMatch ? parseInt(dimsMatch[1], 10) : 0,
    height: dimsMatch ? parseInt(dimsMatch[2], 10) : 0,
    price_cents: parseInt(slotEl.dataset.priceCents, 10) || 0,
    is_bundle: isBundle ? 1 : 0,
    sort_order: sortOrder,
  };
}

// Event: Click anywhere on an available frame to open booking
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

  // Fallback to DOM data when API slots are not loaded/available.
  if (!slot) {
    slot = buildSlotFromDom(slotEl);
  }

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
      if (els.dashboardLink) {
        els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${data.token}`;
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
      showStep('apply');
      return;
    }

    // Code verified — create booking and redirect to Stripe
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
      els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${token}`;
      await loadSlots();
      return;
    }

    if (paid && (booking.status === 'pending_upload' || booking.status === 'live')) {
      openModal(slot);
      if (booking.status === 'pending_upload') {
        setupUploadStep(slot);
        showStep('2');
        const dashLink2 = document.getElementById('booking-dash-link-2');
        if (dashLink2) dashLink2.href = `${API_BASE}/sites/persephone/dashboard/?token=${token}`;
      } else {
        showStep('3');
        els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${token}`;
      }
      await loadSlots(); // refresh UI so button disappears
    } else if (booking.status === 'pending_approval') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${token}`;
    } else if (booking.status === 'rejected') {
      openModal(slot);
      showRejected(booking);
    } else if (booking.status === 'live') {
      openModal(slot);
      showStep('3');
      els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${token}`;
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
      els.dashboardLink.href = `${API_BASE}/sites/persephone/dashboard/?token=${currentBooking.analytics_token}`;
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

  const templeId = 'persephone';
  const siteName = 'Persephonē';
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
