// bedwyr
(function() {
    'use strict';
    const canvas = document.getElementById('ninelance-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8CCD8');
    const S = readColor('data-secondary', '#6A7080');
    const GLYPHS = 'ᚁᚓᚇ';
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
        for(let i=0;i<9;i++){ const a=-Math.PI/3+i*(Math.PI/13.5); const x1=width*0.5, y1=height*0.7; const x2=x1+Math.cos(a)*height*0.5, y2=y1+Math.sin(a)*height*0.5; const pulse=0.5+0.5*Math.sin(t*1.5-i*0.4); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.15*pulse)+")"; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.3+0.3*pulse)+")"; ctx.beginPath(); ctx.arc(x2,y2,2,0,Math.PI*2); ctx.fill(); }
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
