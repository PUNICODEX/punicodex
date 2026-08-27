// Syn — The Hall Door (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('halldoor-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8B49A');
    const S = readColor('data-secondary', '#6E6258');
    const GLYPHS = 'ᛋᚢᚾ';
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
        const cx=width/2, cy=height*0.55, dw=120, dh=170;
        const glow=0.22+0.08*Math.sin(t*1.1);
        ctx.fillStyle="rgba(232,214,140,"+glow*0.5+")"; ctx.fillRect(cx-2,cy-dh,4,dh);
        ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.4+0.08*Math.sin(t*0.9))+")"; ctx.lineWidth=2.2;
        ctx.strokeRect(cx-dw,cy-dh,dw,dh); ctx.strokeRect(cx,cy-dh,dw,dh);
        for(let i=0;i<4;i++){ const px=cx-dw+30+i*20; ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+",0.25)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(px,cy-dh+6); ctx.lineTo(px,cy-6); ctx.stroke(); const qx=cx+30+i*20; ctx.beginPath(); ctx.moveTo(qx,cy-dh+6); ctx.lineTo(qx,cy-6); ctx.stroke(); }
        ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+","+(0.5+0.15*Math.sin(t*1.3))+")"; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(cx-dw-8,cy-dh*0.45); ctx.lineTo(cx+dw+8,cy-dh*0.45); ctx.stroke();
        for(let i=0;i<7;i++){ const seed=i*0.618; const mx=cx-14+((seed*311)%1)*28; const my=cy-dh+((seed*197+t*0.05)%1)*dh; ctx.fillStyle="rgba(232,214,140,"+(0.16+0.1*Math.sin(t*1.6+i))+")"; ctx.beginPath(); ctx.arc(mx,my,1.4,0,Math.PI*2); ctx.fill(); }
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
