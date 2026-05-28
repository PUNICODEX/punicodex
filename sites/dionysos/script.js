/* ===== DIONYSOS CANVAS - The Ecstasy Unfolds ===== */
/* Canvas layers:
 * 1. Deep wine background
 * 2. Wine mist at bottom
 * 3. Growing grape vines
 * 4. Falling wine droplets
 * 5. Grape clusters
 * 6. Theatre masks
 * 7. Golden sparkles
 * 8. Purple ecstasy particles
 */

const canvas = document.getElementById('ecstasy-canvas');
const ctx = canvas.getContext('2d');

let width, height, dpr;
let mouseX = 0, mouseY = 0;
let frameCount = 0;

function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initElements();
}

/* ========== CLASSES ========== */

class WineDroplet {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = -10;
        this.size = Math.random() * 3 + 1.5;
        this.vy = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.splash = false;
    }
    update() {
        this.y += this.vy;
        this.x += this.vx;
        if (this.y > height - Math.random() * 80) {
            this.splash = true;
            this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        grad.addColorStop(0, 'rgba(91, 26, 62, 0.8)');
        grad.addColorStop(0.5, 'rgba(123, 45, 142, 0.5)');
        grad.addColorStop(1, 'rgba(91, 26, 62, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class GrapeVine {
    constructor(x) {
        this.baseX = x;
        this.segments = [];
        this.maxSegments = Math.floor(Math.random() * 8 + 5);
        this.growthSpeed = Math.random() * 0.3 + 0.1;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swayFreq = Math.random() * 0.008 + 0.003;
        this.color = Math.random() < 0.5 ? '#4a1a3c' : '#3a1530';
        this.leafColor = Math.random() < 0.7 ? '#2d5a1e' : '#1a4a15';
        this.hasGrapes = Math.random() < 0.4;
        this.reset();
    }
    reset() {
        this.segments = [{ x: this.baseX, y: height, angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.3 }];
        this.growth = 0;
        this.leaves = [];
        this.grapes = [];
    }
    update() {
        this.swayPhase += this.swayFreq;
        this.growth += this.growthSpeed;
        
        if (this.segments.length < this.maxSegments && this.growth > this.segments.length * 8) {
            const last = this.segments[this.segments.length - 1];
            const newAngle = last.angle + (Math.random() - 0.5) * 0.4;
            const len = Math.random() * 15 + 10;
            this.segments.push({
                x: last.x + Math.cos(newAngle) * len,
                y: last.y + Math.sin(newAngle) * len,
                angle: newAngle
            });
            
            if (Math.random() < 0.5) {
                this.leaves.push({
                    segIndex: this.segments.length - 1,
                    side: Math.random() < 0.5 ? -1 : 1,
                    size: Math.random() * 8 + 5,
                    angle: newAngle + (Math.random() - 0.5) * 0.8
                });
            }
            
            if (this.hasGrapes && this.segments.length > 3 && Math.random() < 0.3) {
                this.grapes.push({
                    segIndex: this.segments.length - 1,
                    size: Math.random() * 4 + 3,
                    color: Math.random() < 0.5 ? '#5B1A3E' : '#7B2D8E'
                });
            }
        }
        
        if (this.segments.length >= this.maxSegments && Math.random() < 0.002) {
            this.reset();
        }
    }
    draw() {
        ctx.save();
        const sway = Math.sin(this.swayPhase) * 8;
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x + sway * 0.1, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            const s = this.segments[i];
            ctx.lineTo(s.x + sway * (i / this.segments.length), s.y);
        }
        ctx.stroke();
        
        for (let leaf of this.leaves) {
            const s = this.segments[leaf.segIndex];
            if (!s) continue;
            const lx = s.x + sway * (leaf.segIndex / this.segments.length) + Math.cos(leaf.angle) * leaf.size * 0.5 * leaf.side;
            const ly = s.y + Math.sin(leaf.angle) * leaf.size * 0.5;
            ctx.fillStyle = this.leafColor;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.ellipse(lx, ly, leaf.size, leaf.size * 0.5, leaf.angle, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let g of this.grapes) {
            const s = this.segments[g.segIndex];
            if (!s) continue;
            const gx = s.x + sway * (g.segIndex / this.segments.length);
            const gy = s.y + 5;
            ctx.fillStyle = g.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(gx, gy, g.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#D4AF37';
            ctx.beginPath();
            ctx.arc(gx - g.size * 0.3, gy - g.size * 0.3, g.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class TheatreMask {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = height + 50;
        this.vy = -(Math.random() * 0.8 + 0.3);
        this.vx = (Math.random() - 0.5) * 0.3;
        this.scale = Math.random() * 0.4 + 0.3;
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 500 + 400;
        this.type = Math.random() < 0.5 ? 'comedy' : 'tragedy';
        this.rotation = (Math.random() - 0.5) * 0.2;
        this.rotSpeed = (Math.random() - 0.5) * 0.002;
    }
    update() {
        this.life++;
        this.y += this.vy;
        this.x += this.vx;
        this.rotation += this.rotSpeed;
        
        if (this.state === 'fading_in') {
            this.alpha += 0.008;
            if (this.alpha >= 0.25) this.state = 'holding';
        } else if (this.state === 'holding') {
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.008;
            if (this.alpha <= 0) this.reset();
        }
        
        if (this.y < -100) this.reset();
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        const color = this.type === 'comedy' ? '#D4AF37' : '#8B4513';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillStyle = this.type === 'comedy' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(139, 69, 19, 0.1)';
        
        // Mask face
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Eyes
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-10, -8, 6, this.type === 'comedy' ? 4 : 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, -8, 6, this.type === 'comedy' ? 4 : 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth
        ctx.beginPath();
        if (this.type === 'comedy') {
            ctx.arc(0, 12, 10, 0.2, Math.PI - 0.2);
        } else {
            ctx.arc(0, 20, 10, Math.PI + 0.2, -0.2);
        }
        ctx.stroke();
        
        ctx.restore();
    }
}

class EcstasySparkle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.alpha = 0;
        this.state = 'fading_in';
        this.life = 0;
        this.maxLife = Math.random() * 200 + 150;
        this.pulseSpeed = Math.random() * 0.04 + 0.02;
        this.color = Math.random() < 0.5 ? 'gold' : 'purple';
    }
    update() {
        this.life++;
        if (this.state === 'fading_in') {
            this.alpha += 0.02;
            if (this.alpha >= 0.7) this.state = 'holding';
        } else if (this.state === 'holding') {
            this.alpha = 0.7 + Math.sin(this.life * this.pulseSpeed) * 0.2;
            if (this.life > this.maxLife * 0.6) this.state = 'fading_out';
        } else {
            this.alpha -= 0.015;
            if (this.alpha <= 0) this.reset();
        }
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        if (this.color === 'gold') {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
            ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
        } else {
            ctx.fillStyle = 'rgba(168, 91, 181, 0.9)';
            ctx.shadowColor = 'rgba(168, 91, 181, 0.6)';
        }
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class WineMist {
    constructor() {
        this.particles = [];
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: height - Math.random() * height * 0.15,
                radius: Math.random() * 70 + 40,
                speed: Math.random() * 0.15 + 0.05,
                alpha: Math.random() * 0.05 + 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    update() {
        for (let p of this.particles) {
            p.x += Math.sin(frameCount * 0.003 + p.phase) * p.speed;
        }
    }
    draw() {
        for (let p of this.particles) {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, `rgba(91, 26, 62, ${p.alpha})`);
            grad.addColorStop(0.5, `rgba(123, 45, 142, ${p.alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(91, 26, 62, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class FloatingGrape {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = height + 20;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -(Math.random() * 0.6 + 0.2);
        this.size = Math.random() * 5 + 3;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
        this.alpha = Math.random() * 0.4 + 0.2;
        this.color = Math.random() < 0.5 ? '#5B1A3E' : '#7B2D8E';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        if (this.y < -20) this.reset();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = this.alpha * 0.5;
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/* ========== STATE ========== */
let droplets = [];
let vines = [];
let masks = [];
let sparkles = [];
let mist;
let grapes = [];

function initElements() {
    droplets = [];
    const dropCount = Math.min(30, Math.floor(width * height / 25000));
    for (let i = 0; i < dropCount; i++) droplets.push(new WineDroplet());
    
    vines = [];
    const vineCount = Math.min(12, Math.floor(width / 100));
    for (let i = 0; i < vineCount; i++) {
        vines.push(new GrapeVine((i / vineCount) * width + Math.random() * 40));
    }
    
    masks = [];
    masks.push(new TheatreMask());
    masks.push(new TheatreMask());
    
    sparkles = [];
    const sparkleCount = Math.min(40, Math.floor(width * height / 20000));
    for (let i = 0; i < sparkleCount; i++) sparkles.push(new EcstasySparkle());
    
    mist = new WineMist();
    
    grapes = [];
    const grapeCount = Math.min(15, Math.floor(width * height / 45000));
    for (let i = 0; i < grapeCount; i++) grapes.push(new FloatingGrape());
}

/* ========== BACKGROUND ========== */
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0c0610');
    grad.addColorStop(0.4, '#100818');
    grad.addColorStop(0.7, '#140c18');
    grad.addColorStop(1, '#180e1c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    const bottomGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
    bottomGrad.addColorStop(0, 'rgba(91, 26, 62, 0)');
    bottomGrad.addColorStop(1, 'rgba(91, 26, 62, 0.04)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height * 0.5, width, height * 0.5);
}

/* ========== MAIN LOOP ========== */
function animate() {
    ctx.clearRect(0, 0, width, height);
    frameCount++;
    
    drawBackground();
    
    mist.update();
    mist.draw();
    
    for (let v of vines) {
        v.update();
        v.draw();
    }
    
    for (let d of droplets) {
        d.update();
        d.draw();
    }
    
    for (let g of grapes) {
        g.update();
        g.draw();
    }
    
    for (let m of masks) {
        m.update();
        m.draw();
    }
    
    for (let s of sparkles) {
        s.update();
        s.draw();
    }
    
    requestAnimationFrame(animate);
}

/* ========== MOUSE TRACKING ========== */
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    const mascot = document.querySelector('.hero-mascot');
    if (mascot) {
        const rect = mascot.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = (mouseX - centerX) / 40;
        const offsetY = (mouseY - centerY) / 40;
        mascot.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
});

/* ========== SCROLL REVEALS ========== */
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
});

/* ========== NAV SCROLL EFFECT ========== */
const nav = document.getElementById('main-nav');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
        nav.style.background = 'rgba(10, 4, 8, 0.98)';
        nav.style.borderColor = 'rgba(212, 175, 55, 0.12)';
    } else {
        nav.style.background = 'var(--bg-nav)';
        nav.style.borderColor = 'rgba(212, 175, 55, 0.08)';
    }
    lastScrollY = scrollY;
}, { passive: true });

/* ========== MOBILE NAV TOGGLE ========== */
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

/* ========== 3D TILT ON CARDS ========== */
function initTilt() {
    const cards = document.querySelectorAll('.name-card, .domain-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

/* ========== INITIALIZATION ========== */
window.addEventListener('resize', resize);
resize();
initTilt();
animate();
