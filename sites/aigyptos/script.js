(function() {
    const canvas = document.getElementById('desert-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    // Golden particles floating like desert dust
    const particles = [];
    const PARTICLE_COUNT = 60;

    // Sunbeams
    const beams = [];
    const BEAM_COUNT = 5;

    // Sand dunes at bottom
    let duneOffset = 0;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: -Math.random() * 0.4 - 0.1,
                alpha: Math.random() * 0.4 + 0.1,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    function initBeams() {
        beams.length = 0;
        for (let i = 0; i < BEAM_COUNT; i++) {
            beams.push({
                x: Math.random() * width,
                width: Math.random() * 80 + 40,
                angle: Math.random() * 0.3 - 0.15,
                alpha: 0,
                targetAlpha: Math.random() * 0.03 + 0.01,
                speed: Math.random() * 0.001 + 0.0005,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function drawDunes() {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
        for (let d = 0; d < 3; d++) {
            ctx.beginPath();
            const baseY = height - 40 - d * 30;
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 10) {
                const y = baseY + Math.sin((x + duneOffset + d * 200) * 0.003) * 25
                              + Math.sin((x + duneOffset * 0.5 + d * 100) * 0.007) * 15;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawBeams() {
        beams.forEach(beam => {
            beam.phase += beam.speed;
            beam.alpha = beam.targetAlpha * (0.5 + 0.5 * Math.sin(beam.phase));

            ctx.save();
            ctx.translate(beam.x, -50);
            ctx.rotate(beam.angle);

            const grad = ctx.createLinearGradient(0, 0, 0, height + 100);
            grad.addColorStop(0, `rgba(255, 223, 128, ${beam.alpha})`);
            grad.addColorStop(0.5, `rgba(212, 175, 55, ${beam.alpha * 0.5})`);
            grad.addColorStop(1, 'rgba(212, 175, 55, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(-beam.width / 2, 0, beam.width, height + 100);
            ctx.restore();
        });
    }

    function drawParticles() {
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.twinkle += 0.02;

            if (p.y < -10) {
                p.y = height + 10;
                p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;

            const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.twinkle));
            ctx.fillStyle = `rgba(255, 223, 128, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Very dark base
        ctx.fillStyle = 'rgba(8, 6, 4, 0.15)';
        ctx.fillRect(0, 0, width, height);

        drawBeams();
        drawParticles();
        drawDunes();

        duneOffset += 0.2;

        requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    initBeams();
    window.addEventListener('resize', () => { resize(); initParticles(); initBeams(); });
    draw();
})();
