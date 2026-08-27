// Pryderi — The Vanished Child (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('stableborn-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#B8C8D8');
    const S = readColor('data-secondary', '#5A6A78');
    const GLYPHS = 'ᚕᚏᚤ';
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
        const cx=width/2, sy=height*0.62; ctx.strokeStyle="rgba("+P.r+","+P.g+","+P.b+",0.3)"; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(cx-width*0.14,sy); ctx.lineTo(cx-width*0.14,sy-height*0.14); ctx.lineTo(cx+width*0.14,sy-height*0.14); ctx.lineTo(cx+width*0.14,sy); ctx.stroke(); const g=ctx.createRadialGradient(cx,sy-height*0.07,0,cx,sy-height*0.07,40); g.addColorStop(0,"rgba(232,214,140,"+(0.2+0.15*Math.sin(t*1.3))+")"); g.addColorStop(1,"rgba(232,214,140,0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,sy-height*0.07,40,0,Math.PI*2); ctx.fill(); for(let i=0;i<4;i++){ const z=((t*0.08+i/4)%1); ctx.strokeStyle="rgba("+S.r+","+S.g+","+S.b+","+(0.2-z*0.1)+")"; ctx.beginPath(); ctx.arc(cx,sy-height*0.07,50+z*30,0,Math.PI*2); ctx.stroke(); }
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
