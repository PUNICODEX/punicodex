// bestla
(function() {
    'use strict';
    const canvas = document.getElementById('frostroot-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#A8C8D8');
    const S = readColor('data-secondary', '#4A6A7A');
    const GLYPHS = 'ᛒᛖᛋᛏᛚᛅ';
    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);
    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,11,14,0.97)');
        lg.addColorStop(1, 'rgba(14,16,20,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx=width/2; for(let i=0;i<5;i++){ const y=height*(0.25+i*0.12); const branches=Math.pow(2,i); for(let b=0;b<branches;b++){ const x=cx+(b-(branches-1)/2)*width*0.14/(i*0.5+0.8); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.16-i*0.02)+0.04*Math.sin(t+b)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(cx+(Math.floor(b/2)-((branches/2)-1)/2)*width*0.14/(i*0.5+0.8), y-height*0.12); ctx.lineTo(x,y); ctx.stroke(); const frost=0.5+0.5*Math.sin(t*0.9+i+b); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.2+0.3*frost)+")"; ctx.beginPath(); ctx.arc(x,y,1.6+frost,0,Math.PI*2); ctx.fill(); } }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
