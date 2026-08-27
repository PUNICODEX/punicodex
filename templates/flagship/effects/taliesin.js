// Taliesin — The Three Drops of Awen (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('threedrops-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D8C87A');
    const S = readColor('data-secondary', '#6A7A8A');
    const GLYPHS = 'TALIESIN';
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
        const cx=width/2, apexY=height*0.16, fanY=height*0.42; for(let i=-1;i<=1;i++){ const g=0.10+0.05*Math.sin(t*1.1+i*1.7); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+g+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx+i*width*0.05,apexY); ctx.lineTo(cx+i*width*0.11,fanY); ctx.stroke(); }
        const rimY=height*0.62; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(cx,rimY,width*0.14,height*0.04,0,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx,rimY+height*0.06,width*0.11,height*0.03,0,0,Math.PI); ctx.stroke(); for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2+t*0.25; ctx.fillStyle="rgba("+S.r+","+S.g+","+S.b+",0.35)"; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*width*0.14,rimY+Math.sin(a)*height*0.04,1.5,0,Math.PI*2); ctx.fill(); }
        for(let i=0;i<3;i++){ const z=((t*0.09+i/3)%1); const y=rimY-z*(rimY-fanY-height*0.04); const x=cx+(i-1)*width*0.045+Math.sin(t*1.4+i*2.1)*4; const a=0.15+0.55*(1-z); ctx.fillStyle="rgba("+P.r+","+P.g+","+P.b+","+a+")"; ctx.beginPath(); ctx.arc(x,y,3.2-z,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(a*0.4)+")"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x,y+6); ctx.lineTo(x,y+14+z*10); ctx.stroke(); }
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
