// Brigid — The Flame of Kildare (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('kildare-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8B45A');
    const S = readColor('data-secondary', '#9A7A4A');
    const GLYPHS = 'ᚁᚏᚔᚌᚔᚈ';
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
        const cx=width/2, fy=height*0.62; for(let i=0;i<19;i++){ const a=(i/19)*Math.PI*2+t*0.05; const R=Math.min(width,height)*0.3; const x=cx+Math.cos(a)*R, y=fy+Math.sin(a)*R*0.5; const pulse=0.5+0.5*Math.sin(t*1.2-i*0.7); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.1+0.2*pulse)+")"; ctx.beginPath(); ctx.arc(x,y,1.6+pulse*1.6,0,Math.PI*2); ctx.fill(); } for(let k=0;k<4;k++){ const h=height*(0.1+0.02*Math.sin(t*3+k)); const lean=8*Math.sin(t*2.2+k); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.25-k*0.05)+")"; ctx.lineWidth=4-k; ctx.beginPath(); ctx.moveTo(cx,fy); ctx.bezierCurveTo(cx+lean*0.4,fy-h*0.4,cx+lean,fy-h*0.75,cx+lean*0.8,fy-h); ctx.stroke(); }
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
